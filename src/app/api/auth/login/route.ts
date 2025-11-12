import { NextResponse } from "next/server";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { cors } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  const headers = await cors(req);
  return NextResponse.json({}, { headers });
}

export async function POST(req: Request) {
  const headers = await cors(req);

  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400, headers }
      );
    }
    
    const user = await prismadb.user.findUnique({
      where: {
        email
      }
    });

    // The users table stores the hashed password in the `password` column.
    // Some older code expected `hashedPassword` — normalize to the DB column.
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers }
      );
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers }
      );
    }

    // Create JWT token
    const token = sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { headers }
    );

    // Set JWT token in HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500, headers }
    );
  }
}