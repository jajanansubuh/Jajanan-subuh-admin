import { NextResponse } from "next/server";
import { compare } from "bcrypt";
// prismadb will be dynamically imported inside the request handler to avoid
// initializing @prisma/client at build-time which can cause build errors.
import { sign } from "jsonwebtoken";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
  return NextResponse.json({}, { headers });
}

export async function POST(req: Request) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const user = await prismadb.user.findUnique({
      where: {
        email
      }
    });

    if (!user) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    // Create JWT token
    const token = sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    const origin = req.headers.get("origin") || "";
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };

    const response = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { 
        headers
      }
    );

    // Set JWT token in HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // For cross-site cookie support in production (HTTPS), use 'none'
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}