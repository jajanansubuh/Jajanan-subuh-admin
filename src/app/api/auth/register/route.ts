import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { cors } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  const headers = await cors(req);
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...headers,
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: Request) {
  const headers = await cors(req);

  try {
  const prismadb = (await import("@/lib/prismadb")).default;

    const body = await req.json();
    const { email, password, name, storeId, address, phone, gender } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400, headers }
      );
    }

    const existingUser = await prismadb.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400, headers }
      );
    }

    // If a storeId is provided, ensure the referenced store exists to avoid
    // a foreign-key constraint failure when creating the user.
    if (storeId) {
      const store = await prismadb.store.findUnique({ where: { id: storeId } });
      if (!store) {
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404, headers }
        );
      }
    }

    const hashedPassword = await hash(password, 10);

    // Strongly type the payload we send to Prisma to satisfy lint rules
    const userData: {
      name: string;
      email: string;
      password: string;
      role: "CUSTOMER" | "ADMIN";
      storeId?: string;
      address?: string;
      phone?: string;
      gender?: string;
    } = {
      name,
      email,
      password: hashedPassword,
      role: "CUSTOMER",
    };

    if (storeId) {
      userData.storeId = storeId;
    }

    if (address) {
      userData.address = address;
    }
    if (phone) {
      userData.phone = phone;
    }
    if (gender) {
      userData.gender = gender;
    }

    const user = await prismadb.user.create({ data: userData });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { headers }
    );
  } catch (error) {
    // Always log the full error server-side for debugging
    console.error("[REGISTRATION_ERROR]", error);

    // Safely extract message/stack when available
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error && error.stack ? error.stack : undefined;

    // If the caller explicitly requests debug info (header x-debug: true or ?debug=1),
    // include the error detail in the JSON response. This is temporary and should be
    // used only for debugging in a secure environment.
    const url = new URL(req.url);
    const wantDebug = req.headers.get("x-debug") === "true" || url.searchParams.get("debug") === "1";

    if (wantDebug) {
      return NextResponse.json(
        { error: "Internal Error", detail: errMessage, stack: errStack },
        { status: 500, headers }
      );
    }

    return NextResponse.json({ error: "Internal Error" }, { status: 500, headers });
  }
}