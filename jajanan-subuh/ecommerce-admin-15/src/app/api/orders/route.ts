import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  // Ambil semua order beserta item dan produk terkait
  const orders = await db.order.findMany({
    include: {
      items: {
        include: {
          product: true,
        },
      },
      store: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}
