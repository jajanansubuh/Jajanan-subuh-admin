import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string; orderId: string }> }
) {
  const { storeId, orderId } = await params;
  try {
    if (!storeId || !orderId)
      return new NextResponse("storeId and orderId dibutuhkan", {
        status: 400,
      });

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order)
      return new NextResponse("Order tidak ditemukan", { status: 404 });
    if (order.storeId !== storeId)
      return new NextResponse("Order tidak ditemukan untuk store ini", {
        status: 404,
      });

    return NextResponse.json({ ok: true, order });
  } catch (e) {
    console.error("[ORDER_GET]", e);
    return new NextResponse("Internal error", { status: 500 });
  }
}
