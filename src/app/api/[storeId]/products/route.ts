import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    const { userId } = await auth();
    const body = await req.json();

    const {
      name,
      price,
      categoryId,
      images,
      isFeatured,
      isArchived,
      quantity,
    } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!name) {
      return new NextResponse("Nama perlu diinput", { status: 400 });
    }

    if (!images || !images.length) {
      return new NextResponse("Image perlu diinput", { status: 400 });
    }

    if (!price && price !== 0) {
      return new NextResponse("Harga perlu diinput", { status: 400 });
    }

    if (quantity === undefined || quantity === null) {
      return new NextResponse("Quantity perlu diinput", { status: 400 });
    }

    if (!categoryId) {
      return new NextResponse("Kategori perlu diinput", { status: 400 });
    }

    if (!storeId) {
      return new NextResponse("Store id URL dibutuhkan");
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

    const product = await db.product.create({
      data: {
        name,
        price,
        quantity: Number(quantity),
        categoryId,
        isFeatured,
        isArchived,
        storeId: storeId,
        images: {
          createMany: {
            data: [...images.map((image: { url: string }) => image)],
          },
        },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.log("[PRODUCTS_POST]", error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    // req.url can be relative when called internally; ensure safe parsing
    let urlForParse = String(req.url);
    try {
      new URL(urlForParse);
    } catch {
      const port = process.env.PORT || "3000";
      urlForParse = `http://localhost:${port}${urlForParse}`;
    }
    const { searchParams } = new URL(urlForParse);
    const categoryId = searchParams.get("categoryId") || undefined;
    const isFeatured = searchParams.get("isFeatured");

    if (!storeId) {
      return new NextResponse("Store id URL dibutuhkan");
    }

    const products = await db.product.findMany({
      where: {
        storeId: storeId,
        categoryId,
        isFeatured: isFeatured ? true : undefined,
        isArchived: false,
      },
      include: {
        images: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Hitung jumlah terjual per produk dari tabel OrderItem
    const productIds = products.map((p) => p.id);

    const soldRows = await db.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
      },
      _sum: {
        quantity: true,
      },
    });

    const soldMap: Record<string, number> = {};
    for (const row of soldRows) {
      soldMap[row.productId] = Number(row._sum.quantity ?? 0);
    }

    // Attach `sold` field to product objects for the client
    const productsWithSold = products.map((p) => ({
      ...p,
      sold: soldMap[p.id] ?? 0,
    }));

    // Hitung rating rata-rata dan jumlah ulasan per produk
    const ratingRows = await db.review.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const ratingMap: Record<
      string,
      { avgRating: number; ratingCount: number }
    > = {};
    for (const row of ratingRows) {
      ratingMap[row.productId] = {
        avgRating: Number(row._avg.rating ?? 0),
        ratingCount: Number(row._count.rating ?? 0),
      };
    }

    const productsWithSoldAndRating = productsWithSold.map((p) => ({
      ...p,
      avgRating: ratingMap[p.id]?.avgRating ?? 0,
      ratingCount: ratingMap[p.id]?.ratingCount ?? 0,
    }));

    return NextResponse.json(productsWithSoldAndRating);
  } catch (error) {
    console.log("[PRODUCTS_GET]", error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
