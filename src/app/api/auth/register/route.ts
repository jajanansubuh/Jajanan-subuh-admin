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
    let prismadb: any | undefined;
    try {
      const imported = await import("@/lib/prismadb");
      prismadb = imported?.default;
    } catch (impErr) {
      // log import error and proceed to fallback
      console.error('[REGISTER] prismadb import failed at runtime:', String(impErr));
      prismadb = undefined;
    }

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

    // Try via Prisma client if available, otherwise fall back to pg queries
    let existingUser: any | null = null;
    if (prismadb) {
      existingUser = await prismadb.user.findUnique({ where: { email } });
    } else {
      console.warn('[REGISTER] USING_PG_FALLBACK: attempting direct pg queries');
      // Fallback: use node-postgres to query the users table directly
      const { Client } = await import('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      // add a short connect timeout to avoid Vercel function hang
      const connectWithTimeout = async (ms: number) => {
        return await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('pg connect timeout')), ms)),
        ]);
      };
      try {
        await connectWithTimeout(7000);
        const res = await client.query('SELECT id, name, email, password, role FROM "User" WHERE email = $1', [email]);
        const rc = res.rowCount ?? 0;
        if (rc > 0) existingUser = res.rows[0];
      } finally {
        await client.end();
      }
    }

    if (existingUser) {
      console.warn("[REGISTER] Email already exists:", email);
      return NextResponse.json({ error: "Email already exists" }, { status: 400, headers });
    }

    const hashedPassword = await hash(password, 10);

    let user: any;
    if (prismadb) {
      user = await prismadb.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "CUSTOMER",
          phone: phone || null,
          address: address || null,
          gender: gender || null,
          storeId: storeId || null,
        }
      });
    } else {
      // Fallback insertion via pg
      console.warn('[REGISTER] USING_PG_FALLBACK: attempting direct pg insert');
      const { Client } = await import('pg');
      const { randomUUID } = await import('crypto');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      const connectWithTimeout = async (ms: number) => {
        return await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('pg connect timeout')), ms)),
        ]);
      };
      try {
        await connectWithTimeout(7000);
        const id = randomUUID();
        const insert = await client.query(
          'INSERT INTO "User" ("id","name","email","password","role","phone","address","gender","storeId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now()) RETURNING id, name, email, role',
          [id, name, email, hashedPassword, 'CUSTOMER', phone || null, address || null, gender || null, storeId || null]
        );
        user = insert.rows[0];
      } finally {
        await client.end();
      }
    }

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