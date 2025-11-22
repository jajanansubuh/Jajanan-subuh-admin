import { NextResponse } from "next/server";
import type { PrismaClient } from '@prisma/client';

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: string | null;
  createdAt?: string | Date | null;
};

type OrderRow = {
  customerName?: string | null;
  address?: string | null;
  createdAt?: string | Date | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    let prismadb: PrismaClient | undefined;
    try {
      const imported = await import("@/lib/prismadb");
      prismadb = imported?.default;
    } catch (impErr) {
      console.error('[CUSTOMERS_GET] prismadb import failed at runtime:', String(impErr));
      prismadb = undefined;
    }

    const { storeId } = await params;
    // Temporary debug log to trace incoming requests and storeId
    console.log('[CUSTOMERS_GET_REQUEST] storeId=', storeId);

    if (!storeId) {
      return NextResponse.json({ error: 'Store id dibutuhkan' }, { status: 400 });
    }

    // Fetch persisted users for this store (use Prisma if available, otherwise fallback to pg)
    let users: UserRow[] = [];
    let orders: OrderRow[] = [];

    if (prismadb) {
      users = await prismadb.user.findMany({
        where: { storeId },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Also fetch customer names that appear on orders as a fallback
      // (some customers may have placed orders without having a user record)
      orders = await prismadb.order.findMany({
        where: {
          storeId,
          NOT: { customerName: null }
        },
        select: {
          customerName: true,
          address: true,
          createdAt: true
        }
      });
    } else {
      // Fallback: query Postgres directly to gather the same data
      const { Client } = await import('pg');
      const client = new Client({ connectionString: (process.env as any).DATABASE_URL });
      try {
        await client.connect();
        const usersRes = await client.query(
          'SELECT id, name, email, phone, address, role, "createdAt" FROM "User" WHERE "storeId" = $1 ORDER BY "createdAt" DESC',
          [storeId]
        );
        users = usersRes.rows || [];

        const ordersRes = await client.query(
          'SELECT "customerName", address, "createdAt" FROM "Order" WHERE "storeId" = $1 AND "customerName" IS NOT NULL',
          [storeId]
        );
        orders = ordersRes.rows || [];
      } finally {
        await client.end();
      }
    }

    const existingNames = new Set(users.map((u) => (u.name || '').trim()));

    const inferredFromOrders: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    for (const o of orders) {
      const name = o.customerName?.trim();
      if (!name) continue;
      if (existingNames.has(name)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      inferredFromOrders.push({
        id: `order:${encodeURIComponent(name)}`,
        name,
        email: null,
        phone: null,
        address: o.address ?? null,
        role: 'CUSTOMER',
        createdAt: o.createdAt ?? null,
      });
    }

    // Return persisted users first, then inferred customers from orders
    return NextResponse.json([...users, ...inferredFromOrders]);
  } catch (error) {
    console.error('[CUSTOMERS_GET]', error);

    // Allow controlled debugging in production: if the request includes the
    // special header `x-debug` that matches `DEBUG_SECRET` env var, include
    // the error detail in the JSON response so we can inspect runtime errors
    // without exposing details to all clients. Set `DEBUG_SECRET` in Vercel.
    try {
      const debugHeader = req.headers.get('x-debug');
      const debugSecret = (process.env as any).DEBUG_SECRET;
      if (debugHeader && debugSecret && debugHeader === debugSecret) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error && error.stack ? error.stack : undefined;
        return NextResponse.json({ error: 'Internal error', detail: message, stack }, { status: 500 });
      }
    } catch {
      // ignore any error while attempting to compute debug output
    }

    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const imported = await import("@/lib/prismadb");
    const prismadb = imported?.default as PrismaClient;
    const { storeId } = await params;

    if (!storeId) {
      return NextResponse.json({ error: 'Store id dibutuhkan' }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, role, password = "password123" } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

  // Dynamically import bcrypt to avoid native import-time failures on GET requests
  const { default: bcrypt } = await import("bcrypt");
  const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await prismadb.user.create({
      data: {
        name,
        email,
        role: role as "ADMIN" | "CUSTOMER",
        password: hashedPassword,
        storeId,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMERS_POST]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
};