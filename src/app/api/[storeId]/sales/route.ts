import { NextResponse } from "next/server";
import db from "@/lib/db";

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
    const qSearch = url.searchParams.get("search") || undefined;
    const qPage = Number(url.searchParams.get("page") || "1");
    const qPageSize = Number(url.searchParams.get("pageSize") || "20");

    // building a dynamic where object for Prisma - widen typing for convenience
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { storeId };
    if (qFrom || qTo) {
      where.createdAt = {};
      if (qFrom) {
        const fromDate = new Date(qFrom);
        if (!isNaN(fromDate.getTime())) where.createdAt.gte = fromDate;
      }
      if (qTo) {
        const toDate = new Date(qTo);
        if (!isNaN(toDate.getTime())) where.createdAt.lte = toDate;
      }
    }

    if (qSearch) {
      // search by order id or item name
      where.OR = [
        { id: { contains: qSearch } },
        { items: { some: { name: { contains: qSearch } } } },
      ];
    }

    const totalCount = await db.order.count({ where });

    // compute overall revenue for the given filters (not limited by pagination)
    const revenueAgg = await db.order.aggregate({
      where,
      _sum: { total: true },
    });
    const revenueAll = Number(revenueAgg._sum.total ?? 0);

    // If export CSV requested, return all matching orders as CSV (no pagination)
    const qExport = url.searchParams.get("export");
    const qSort = url.searchParams.get("sort") || "newest";

    // map sort param to Prisma orderBy
    // supported values from UI: newest, oldest, total_desc, total_asc
    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
    if (qSort === "oldest") orderBy = { createdAt: "asc" };
    else if (qSort === "total_desc") orderBy = { total: "desc" };
    else if (qSort === "total_asc") orderBy = { total: "asc" };
    if (qExport === "1" || qExport === "true") {
      // fetch store metadata for CSV header
      const store = await db.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true },
      });
      const storeName = store?.name ?? "";
      const currency = "IDR"; // default; update if you store per-store currency
      // streaming CSV export (one row per order-item) to avoid loading all orders in memory
      const batchSize = 500; // tune as needed
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          // metadata header (comment lines)
          controller.enqueue(encoder.encode(`# storeId:${storeId}\n`));
          controller.enqueue(encoder.encode(`# storeName:${storeName}\n`));
          controller.enqueue(encoder.encode(`# currency:${currency}\n`));
          // header columns now include currency
          controller.enqueue(
            encoder.encode(
              "orderId,createdAt,orderTotal,currency,itemIndex,productId,itemName,quantity,price,itemTotal\n"
            )
          );

          let page = 0;
          while (true) {
            const orders = await db.order.findMany({
              where,
              include: { items: true },
              orderBy,
              skip: page * batchSize,
              take: batchSize,
            });

            if (!orders || orders.length === 0) break;

            for (const o of orders) {
              const createdAtIso =
                o.createdAt instanceof Date
                  ? o.createdAt.toISOString()
                  : new Date(o.createdAt).toISOString();
              const orderTotal = o.total ?? 0;
              const items = o.items || [];
              if (items.length === 0) {
                // emit a row with empty item fields
                const row =
                  [
                    o.id,
                    createdAtIso,
                    String(orderTotal),
                    currency,
                    "",
                    "",
                    "",
                    "",
                    "",
                  ]
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(",") + "\n";
                controller.enqueue(encoder.encode(row));
              } else {
                for (let idx = 0; idx < items.length; idx++) {
                  const it = items[idx];
                  const itemTotal =
                    Number(it.price ?? 0) * Number(it.quantity ?? 0);
                  const row =
                    [
                      o.id,
                      createdAtIso,
                      String(orderTotal),
                      currency,
                      String(idx + 1),
                      it.productId ?? "",
                      it.name ?? "",
                      String(it.quantity ?? ""),
                      String(it.price ?? ""),
                      String(itemTotal),
                    ]
                      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                      .join(",") + "\n";
                  controller.enqueue(encoder.encode(row));
                }
              }
            }

            // next page
            page += 1;
          }

          controller.close();
        },
        cancel() {
          // noop
        },
      });

      const headers = new Headers({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-${storeId}.csv"`,
      });

      return new Response(stream, { status: 200, headers });
    }

    // XLSX export
    if (qExport === "xlsx" || qExport === "excel") {
      // collect orders in batches and append to workbook
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Sales");

      // metadata rows
      sheet.addRow([`storeId: ${storeId}`]);
      const store = await db.store.findUnique({
        where: { id: storeId },
        select: { name: true },
      });
      sheet.addRow([`storeName: ${store?.name ?? ""}`]);
      sheet.addRow([`currency: IDR`]);
      sheet.addRow([]);

      // header
      sheet.addRow([
        "orderId",
        "createdAt",
        "orderTotal",
        "currency",
        "itemIndex",
        "productId",
        "itemName",
        "quantity",
        "price",
        "itemTotal",
      ]);

      const batchSize = 500;
      let page = 0;
      while (true) {
        const orders = await db.order.findMany({
          where,
          include: { items: true },
          orderBy,
          skip: page * batchSize,
          take: batchSize,
        });
        if (!orders || orders.length === 0) break;
        for (const o of orders) {
          const createdAtIso =
            o.createdAt instanceof Date
              ? o.createdAt.toISOString()
              : new Date(o.createdAt).toISOString();
          const orderTotal = o.total ?? 0;
          const items = o.items || [];
          if (items.length === 0) {
            sheet.addRow([
              o.id,
              createdAtIso,
              String(orderTotal),
              "IDR",
              "",
              "",
              "",
              "",
              "",
              "",
            ]);
          } else {
            for (let idx = 0; idx < items.length; idx++) {
              const it = items[idx];
              const itemTotal =
                Number(it.price ?? 0) * Number(it.quantity ?? 0);
              sheet.addRow([
                o.id,
                createdAtIso,
                String(orderTotal),
                "IDR",
                String(idx + 1),
                it.productId ?? "",
                it.name ?? "",
                it.quantity ?? "",
                String(it.price ?? ""),
                String(itemTotal),
              ]);
            }
          }
        }
        page += 1;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer, {
        status: 200,
        headers: new Headers({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="sales-${storeId}.xlsx"`,
        }),
      });
    }

    const orders = await db.order.findMany({
      where,
      include: { items: true },
      orderBy,
      skip: (Math.max(qPage, 1) - 1) * qPageSize,
      take: qPageSize,
    });

    const totalRevenue = orders.reduce((s: number, o: { total?: number | string }) => s + Number(o.total ?? 0), 0);

    return NextResponse.json({
      ok: true,
      page: qPage,
      pageSize: qPageSize,
      total: totalCount,
      revenue: totalRevenue,
      revenueAll,
      orders,
    });
  } catch (e) {
    console.error("[SALES_GET]", e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    if (!storeId)
      return new NextResponse("Store id dibutuhkan", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId || body.id;
    if (!orderId)
      return new NextResponse("orderId dibutuhkan", { status: 400 });

    // ensure order belongs to store
    const existing = await db.order.findUnique({ where: { id: orderId } });
    if (!existing)
      return NextResponse.json(
        { ok: false, error: "Order tidak ditemukan" },
        { status: 404 }
      );
    if (existing.storeId !== storeId)
      return new NextResponse("Order tidak ditemukan untuk store ini", {
        status: 404,
      });

    // delete order and its items via prisma cascade (if configured) or explicit delete
    // attempt explicit delete of items first to be safe
    try {
      await db.orderItem.deleteMany({ where: { orderId } });
    } catch {
      // ignore if model name differs or relation handled by cascade
    }

    await db.order.delete({ where: { id: orderId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[SALES_DELETE]", e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
