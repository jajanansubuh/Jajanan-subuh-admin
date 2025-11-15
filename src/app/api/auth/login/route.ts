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
  let { email } = body;
  const password = body.password;

    if (!email || !password) {
      console.warn("[LOGIN] Missing fields:", { email: !!email, password: !!password });
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers });
    }

    // Normalize email for lookup
    email = String(email).toLowerCase().trim();

    const user = await prismadb.user.findUnique({
      where: { email }
    });

    // The User model uses `password` (hashed) field in Prisma schema
    if (!user || !user.password) {
      console.warn("[LOGIN] User not found or no password:", email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers });
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      console.warn("[LOGIN] Password mismatch for:", email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers });
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[LOGIN] Missing JWT_SECRET env var');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500, headers });
    }

    const token = sign({ userId: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { headers });

    // Set JWT token in HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log("[LOGIN] User logged in successfully:", email);
    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    console.error("[LOGIN_ERROR] Request origin:", req.headers.get("origin"));
    const headers = await cors(req);
    return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : 'Unknown'}`, { status: 500, headers });
  }
}