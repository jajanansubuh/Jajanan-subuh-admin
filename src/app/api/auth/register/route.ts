import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import prismadb from "@/lib/prismadb";
import { cors } from "@/lib/cors";

export async function POST(req: Request) {
  try {
    await cors(req);
    
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const existingUser = await prismadb.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return new NextResponse("Email already exists", { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    const user = await prismadb.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER" // Default role for store users
      }
    });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { headers: { "Access-Control-Allow-Credentials": "true" } }
    );
  } catch (error) {
    console.error("[REGISTRATION_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}