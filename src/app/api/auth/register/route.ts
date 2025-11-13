import { NextResponse } from "next/server";
import { hash } from "bcrypt";
// prismadb will be dynamically imported inside the request handler to avoid
// initializing @prisma/client at build-time which can cause build errors.

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

    const origin = req.headers.get("origin") || "";
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { headers }
    );
  } catch (error) {
    console.error("[REGISTRATION_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}