import db from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    if (!storeId) {
      return new NextResponse("Store id dibutuhkan", { status: 400 });
    }

    // Public endpoint: return minimal store info for storefront use.
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        paymentMethods: true,
        shippingMethods: true,
      },
    });

    if (!store) {
      return new NextResponse("Store not found", { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.log("[STORE_GET]", error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { name, paymentMethods, shippingMethods } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) {
      return new NextResponse("Harus menginput nama", { status: 400 });
    }

    if (!storeId) {
      return new NextResponse("Store id dibutuhkan", { status: 400 });
    }

    // ensure the store exists and belongs to the user
    const existing = await db.store.findFirst({
      where: { id: storeId, userId },
    });
    if (!existing) {
      return new NextResponse("Store not found or unauthorized", {
        status: 404,
      });
    }

    // Persist JSON values directly. Passing already-stringified JSON results in
    // storing a string in the Json column which breaks reads on refresh.
    const updated = await db.store.update({
      where: { id: storeId },
      data: {
        name,
        paymentMethods: paymentMethods ?? undefined,
        shippingMethods: shippingMethods ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[STORE_PATCH]", error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!storeId) {
      return new NextResponse("Store id dibutuhkan", { status: 400 });
    }

    const store = await db.store.deleteMany({
      where: {
        id: storeId,
        userId,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.log("[STORE_DELETE]", error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
