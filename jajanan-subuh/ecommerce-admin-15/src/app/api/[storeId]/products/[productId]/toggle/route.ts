import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  const { storeId, productId } = await params;

  try {
    const { userId } = await auth();
    const body = await req.json();

    const { isFeatured, isArchived } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!productId) {
      return new NextResponse("Product id dibutuhkan", { status: 400 });
    }

    if (!storeId) {
      return new NextResponse("Store id URL dibutuhkan", { status: 400 });
    }

    const storeByUserId = await db.store.findFirst({
      where: {
        id: storeId,
        userId,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Basic validation: ensure flags are present (booleans expected)
    if (typeof isFeatured !== "boolean" || typeof isArchived !== "boolean") {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const product = await db.product.update({
      where: { id: productId },
      data: {
        isFeatured,
        isArchived,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.log("[PRODUCT_TOGGLE_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
