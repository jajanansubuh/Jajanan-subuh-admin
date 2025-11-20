import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    const { storeId, customerId } = await params;

    if (!storeId || !customerId) {
      return NextResponse.json({ error: 'storeId and customerId dibutuhkan' }, { status: 400 });
    }

    const user = await prismadb.user.findFirst({ where: { id: customerId, storeId } });
    if (!user) return NextResponse.json({ error: 'Customer tidak ditemukan' }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.log('[CUSTOMER_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    const { storeId, customerId } = await params;

    if (!storeId || !customerId) {
      return NextResponse.json({ error: 'storeId and customerId dibutuhkan' }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, role, password } = body;

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prismadb.user.updateMany({ where: { id: customerId, storeId }, data });
    if (updated.count === 0) return NextResponse.json({ error: 'Customer tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log('[CUSTOMER_PATCH]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { default: prismadb } = await import("@/lib/prismadb");
    const { storeId, customerId } = await params;

    if (!storeId || !customerId) {
      return NextResponse.json({ error: 'storeId and customerId dibutuhkan' }, { status: 400 });
    }

    const deleted = await prismadb.user.deleteMany({ where: { id: customerId, storeId } });
    if (deleted.count === 0) return NextResponse.json({ error: 'Customer tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log('[CUSTOMER_DELETE]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
