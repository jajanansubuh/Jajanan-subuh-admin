import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    const { storeId } = await params;
    // Temporary debug log to trace incoming requests and storeId
    console.log('[CUSTOMERS_GET_REQUEST] storeId=', storeId);

    if (!storeId) {
      return NextResponse.json({ error: 'Store id dibutuhkan' }, { status: 400 });
    }

    // Fetch persisted users for this store
    const users = await prismadb.user.findMany({
      where: { storeId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Also fetch customer names that appear on orders as a fallback
    // (some customers may have placed orders without having a user record)
    const orders = await prismadb.order.findMany({
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

    const existingNames = new Set(users.map((u: { name?: string | null }) => (u.name || '').trim()));

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
    console.log('[CUSTOMERS_GET]', error);
    // In development, include the error message in the JSON to aid debugging.
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: 'Internal error', detail: message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
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