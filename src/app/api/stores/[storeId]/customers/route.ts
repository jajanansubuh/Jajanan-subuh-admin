import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

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

    const users = await prismadb.user.findMany({
      where: { storeId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users);
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