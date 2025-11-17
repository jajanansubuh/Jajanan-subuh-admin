import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { sign } from "jsonwebtoken";
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

    // Cek apakah origin diizinkan
    if (!headers["Access-Control-Allow-Origin"] || headers["Access-Control-Allow-Origin"] === "") {
      return NextResponse.json({ error: "CORS: Origin not allowed" }, { status: 403, headers });
    }

    const body = await req.json();
    let { email } = body;
    const password = body.password;
    const name = body.name;
    // Optional customer fields
    const phone = body.phone;
    const address = body.address;
    const gender = body.gender;
    const storeId = body.storeId;

    // Basic required fields
    if (!email || !password || !name) {
      console.warn("[REGISTER] Missing fields:", { email: !!email, password: !!password, name: !!name });
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers });
    }

    // Normalize email for lookups/storage
    email = String(email).toLowerCase().trim();

    const existingUser = await prismadb.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.warn("[REGISTER] Email already exists:", email);
      return NextResponse.json({ error: "Email already exists" }, { status: 400, headers });
    }

    const hashedPassword = await hash(password, 10);

    const user = await prismadb.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER", // Default role for store users
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        storeId: storeId || null,
      }
    });

    // Sign JWT and set cookie so new users are authenticated immediately
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[REGISTER] Missing JWT_SECRET env var');
      const headers = await cors(req);
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500, headers });
    }

    const token = sign({ userId: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { headers });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    console.log("[REGISTER] User created successfully:", { id: user.id, email: user.email });
    return response;
  } catch (error) {
    console.error("[REGISTRATION_ERROR]", error);
    console.error("[REGISTRATION_ERROR] Request origin:", req.headers.get("origin"));
    const headers = await cors(req);
    return new NextResponse(`Internal Error: ${error instanceof Error ? error.message : 'Unknown'}`, { status: 500, headers });
  }
}