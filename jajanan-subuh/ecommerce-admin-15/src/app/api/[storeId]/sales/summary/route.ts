import { NextResponse } from "next/server";
import db from "@/lib/db";

// Returns monthly aggregated sales for the given store.
// Query params: from, to (ISO dates). If absent, defaults to last 6 months.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    if (!storeId)
      return new NextResponse("Store id dibutuhkan", { status: 400 });

    const url = new URL(req.url);
    const qFrom = url.searchParams.get("from");
    const qTo = url.searchParams.get("to");

    const toDate = qTo ? new Date(qTo) : new Date();
    const fromDate = qFrom
      ? new Date(qFrom)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

    // clamp invalid
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return new NextResponse("Invalid date range", { status: 400 });
    }

    // fetch orders in range
    const orders = await db.order.findMany({
      where: {
        storeId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: { createdAt: true, total: true },
    });

    // aggregate per month (YYYY-MM)
    const map = new Map<
      string,
      { month: string; revenue: number; count: number }
    >();

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const cur = map.get(key) ?? { month: key, revenue: 0, count: 0 };
      cur.revenue += Number(o.total ?? 0);
      cur.count += 1;
      map.set(key, cur);
    });

    // ensure months with zero are present between from..to
    const results: Array<{ month: string; revenue: number; count: number }> =
      [];
    const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const v = map.get(key) ?? { month: key, revenue: 0, count: 0 };
      results.push(v);
    }

    return NextResponse.json({ ok: true, data: results });
  } catch (e) {
    console.error("[SALES_SUMMARY_GET]", e);
    return new NextResponse("Internal error", { status: 500 });
  }
}
