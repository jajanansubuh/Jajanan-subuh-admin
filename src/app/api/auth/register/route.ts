import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { cors } from "@/lib/cors";
// prismadb will be dynamically imported inside the request handler to avoid
// initializing @prisma/client at build-time which can cause build errors.

export async function OPTIONS(req: Request) {
  const headers = await cors(req);
  return NextResponse.json({}, { headers });
}

export async function POST(req: Request) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    const headers = await cors(req);

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return new NextResponse("Missing fields", { status: 400, headers });
    }

    const existingUser = await prismadb.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return new NextResponse("Email already exists", { status: 400, headers });
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
      { headers }
    );
  } catch (error) {
    console.error("[REGISTRATION_ERROR]", error);
    const headers = await cors(req);
    return new NextResponse("Internal Error", { status: 500, headers });
  }
}