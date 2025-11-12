import { NextResponse } from "next/server";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { cors } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  const headers = await cors(req);
  return NextResponse.json({}, { headers });
}

export async function POST(req: Request) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    const headers = await cors(req);
    
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400, headers });
    }
    
    const user = await prismadb.user.findUnique({
      where: {
        email
      }
    });

    // The users table stores the hashed password in the `password` column.
    // Some older code expected `hashedPassword` — normalize to the DB column.
    if (!user || !user.password) {
      return new NextResponse("Invalid credentials", { status: 401, headers });
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return new NextResponse("Invalid credentials", { status: 401, headers });
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
    const headers = await cors(req);
    return new NextResponse("Internal Error", { status: 500, headers });
  }
}