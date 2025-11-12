import { NextResponse } from "next/server";

// Lazy import prismadb inside handlers to avoid initializing Prisma at module import time

export async function PATCH(
  req: Request,
  props: unknown
) {
  const { params } = props as { params: { storeId: string; customerId: string } };
  try {
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return new NextResponse("Name and email are required", { status: 400 });
    }

    if (!params.customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

  const prismadb = (await import('@/lib/prismadb')).default;
  const customer = await prismadb.user.update({
      where: {
        id: params.customerId,
      },
      data: {
        name,
        email,
        role,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMER_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  props: unknown
) {
  const { params } = props as { params: { storeId: string; customerId: string } };
  try {
    if (!params.customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

  const prismadb = (await import('@/lib/prismadb')).default;
  const customer = await prismadb.user.delete({
      where: {
        id: params.customerId,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}