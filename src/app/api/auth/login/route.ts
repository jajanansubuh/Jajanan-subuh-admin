import { NextResponse } from "next/server";
import { compare } from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { cors } from "@/lib/cors";
import { sign } from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    await cors(req);
    
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const user = await prisma.user.findUnique({
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

    const response = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { 
        headers: { 
          "Access-Control-Allow-Credentials": "true",
        }
      }
    );

    // Set JWT token in HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}