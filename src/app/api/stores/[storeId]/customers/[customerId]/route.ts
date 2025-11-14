import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return new NextResponse("Name and email are required", { status: 400 });
    }

    if (!customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const customer = await prismadb.user.update({
      where: {
        id: customerId,
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
  { params }: { params: Promise<{ storeId: string; customerId: string }> }
) {
  try {
    const { customerId } = await params;
    if (!customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const customer = await prismadb.user.delete({
      where: {
        id: customerId,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}