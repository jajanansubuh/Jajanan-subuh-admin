import { NextResponse } from "next/server";
import db from "@/lib/db";
import { Prisma } from "@prisma/client";
// local minimal type for create payload (avoid importing generated types to prevent TS path issues)
type OrderUncheckedCreateInputLocal = {
  id?: string;
  storeId: string;
  total: number | string;
  customerName?: string | null;
  address?: string | null;
  paymentMethod?: string | null;
  orderNumber?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  items?: unknown;
};

type Item = { productId: string; quantity: number; name?: string };

type Resolved = {
  ok: boolean;
  reason: string;
  requestedProductId: string;
  requestedName: string | null;
  resolvedProductId?: string;
  name?: string | null;
  available?: number;
  price?: string | number | null;
  quantity?: number;
  storeId?: string;
};

function isResolvedOk(r: Resolved): r is Resolved & {
  resolvedProductId: string;
  quantity: number;
  price: string | number;
  storeId: string;
} {
  return Boolean(r.ok && typeof r.resolvedProductId === "string");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // DEBUG: log payload yang diterima
    console.log("[ADMIN_CHECKOUT] payload received:", JSON.stringify(body));
    const itemsRaw: Item[] = body.items || [];
    const items: Item[] = itemsRaw.map((it) => ({
      productId: String(it.productId).trim(),
      quantity: Number(it.quantity) || 0,
    }));

    if (!items || !items.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    // validate quantities
    for (const it of items) {
      if (!it.productId) {
        return NextResponse.json(
          { error: "Invalid productId" },
          { status: 400 }
        );
      }
      if (it.quantity <= 0) {
        return NextResponse.json(
          { error: "Invalid quantity" },
          { status: 400 }
        );
      }
    }

    // --- VALIDASI PAYMENT & SHIPPING METHOD AKTIF ---
    // Ambil storeId dari payload
    const storeId = body.storeId;
    if (!storeId) {
      return NextResponse.json(
        { error: "StoreId dibutuhkan" },
        { status: 400 }
      );
    }
    // Ambil data store dari DB
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { paymentMethods: true, shippingMethods: true },
    });
    if (!store) {
      return NextResponse.json(
        { error: "Store tidak ditemukan" },
        { status: 404 }
      );
    }
    // Validasi paymentMethod (tolerant matching by method/value/label, case-insensitive)
    if (body.paymentMethod) {
      type RawPM = unknown;
      let rawPaymentMethods: RawPM[] = [];
      if (Array.isArray(store.paymentMethods)) {
        rawPaymentMethods = store.paymentMethods as RawPM[];
      } else if (typeof store.paymentMethods === "string") {
        try {
          rawPaymentMethods = JSON.parse(store.paymentMethods) as RawPM[];
        } catch {
          rawPaymentMethods = [];
        }
      } else if (
        typeof store.paymentMethods === "object" &&
        store.paymentMethods
      ) {
        rawPaymentMethods = store.paymentMethods as unknown as RawPM[];
      }

      const normalizePM = (pm: RawPM) => {
        const obj = (pm as Record<string, unknown>) || {};
        return {
          method: String(obj.method ?? obj.value ?? obj ?? "").trim(),
          label: String(
            obj.label ?? obj.method ?? obj.value ?? obj ?? ""
          ).trim(),
          status: String(obj.status ?? "Nonaktif").trim(),
        };
      };

      const paymentMethods = rawPaymentMethods.map(normalizePM);
      console.debug(
        "[ADMIN_CHECKOUT] paymentMethods for store:",
        paymentMethods
      );
      console.debug(
        "[ADMIN_CHECKOUT] requested paymentMethod:",
        body.paymentMethod
      );

      const reqPmLower = String(body.paymentMethod).toLowerCase();
      const foundPayment = paymentMethods.find((pm) => {
        return (
          (pm.method && pm.method.toLowerCase() === reqPmLower) ||
          (pm.label && pm.label.toLowerCase() === reqPmLower)
        );
      });

      if (!foundPayment || foundPayment.status !== "Aktif") {
        console.warn(
          "[ADMIN_CHECKOUT] payment method not active or not found",
          { requested: body.paymentMethod, found: foundPayment }
        );
        return NextResponse.json(
          { error: "Metode pembayaran tidak aktif/tidak ditemukan" },
          { status: 400 }
        );
      }
    }
    // Validasi shippingMethod jika ada
    if (body.shippingMethod) {
      type RawSM = unknown;
      let rawShippingMethods: RawSM[] = [];
      if (Array.isArray(store.shippingMethods)) {
        rawShippingMethods = store.shippingMethods as RawSM[];
      } else if (typeof store.shippingMethods === "string") {
        try {
          rawShippingMethods = JSON.parse(store.shippingMethods) as RawSM[];
        } catch {
          rawShippingMethods = [];
        }
      } else if (
        typeof store.shippingMethods === "object" &&
        store.shippingMethods
      ) {
        rawShippingMethods = store.shippingMethods as unknown as RawSM[];
      }

      const normalizeSM = (sm: RawSM) => {
        const obj = (sm as Record<string, unknown>) || {};
        return {
          method: String(obj.method ?? obj.value ?? obj ?? "").trim(),
          label: String(
            obj.label ?? obj.method ?? obj.value ?? obj ?? ""
          ).trim(),
          status: String(obj.status ?? "Nonaktif").trim(),
        };
      };

      const shippingMethods = rawShippingMethods.map(normalizeSM);
      console.debug(
        "[ADMIN_CHECKOUT] shippingMethods for store:",
        shippingMethods
      );
      console.debug(
        "[ADMIN_CHECKOUT] requested shippingMethod:",
        body.shippingMethod
      );

      const reqSmLower = String(body.shippingMethod).toLowerCase();
      const foundShipping = shippingMethods.find((sm) => {
        return (
          (sm.method && sm.method.toLowerCase() === reqSmLower) ||
          (sm.label && sm.label.toLowerCase() === reqSmLower)
        );
      });

      if (!foundShipping || foundShipping.status !== "Aktif") {
        console.warn(
          "[ADMIN_CHECKOUT] shipping method not active or not found",
          { requested: body.shippingMethod, found: foundShipping }
        );
        return NextResponse.json(
          { error: "Metode pengiriman tidak aktif/tidak ditemukan" },
          { status: 400 }
        );
      }
    }

    // Resolve products by id first, then try name fallback for missing ones.
    const productIds = items.map((i) => i.productId);
    // Ambil produk yang tidak diarsipkan
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        isArchived: false,
      },
    });
    // DEBUG: log produk yang ditemukan
    console.log("[ADMIN_CHECKOUT] products found from DB:", products);

    // If some products not found by id, try to lookup by provided name fallback
    const foundIds = new Set(products.map((p) => p.id));
    const missing = items.filter((it) => !foundIds.has(it.productId));
    if (missing.length > 0) {
      // for each missing item, try a case-insensitive lookup by provided name
      for (const m of missing) {
        const nameToTry = String(m.name ?? "").trim();
        if (!nameToTry) continue;
        try {
          const byName = await db.product.findFirst({
            where: {
              name: { equals: nameToTry, mode: "insensitive" },
            },
          });
          if (byName && !foundIds.has(byName.id)) {
            products.push(byName);
            foundIds.add(byName.id);
          }
        } catch (err) {
          // ignore per-item lookup errors and continue
          console.warn(
            "[ADMIN_CHECKOUT] name lookup failed for",
            nameToTry,
            err
          );
        }
      }
    }

    console.log(
      "[ADMIN_CHECKOUT] items (requested):",
      items.map((i) => ({ id: i.productId, name: i.name, qty: i.quantity }))
    );
    console.log(
      "[ADMIN_CHECKOUT] products found:",
      products.map((p) => ({ id: p.id, name: p.name, qty: p.quantity }))
    );

    // Build resolved items: for each requested item, try to find product by id OR by name.
    const resolved = items.map((it) => {
      // DEBUG: log pencocokan produk untuk setiap item
      console.log("[ADMIN_CHECKOUT] resolving item:", it);
      const byId = products.find((x) => x.id === it.productId);
      const byName = products.find((x) =>
        it.name
          ? String(x.name).trim().toLowerCase() ===
            String(it.name).trim().toLowerCase()
          : false
      );
      const product = byId ?? byName ?? null;
      if (!product) {
        console.warn("[ADMIN_CHECKOUT] product not found for item:", it);
        return {
          ok: false,
          reason: "not_found",
          requestedProductId: it.productId,
          requestedName: it.name ?? null,
          available: 0,
          price: null,
        } as const;
      }
      let availableQty = 0;
      // small type guard for Decimal-like values (Prisma Decimal)
      const isDecimalLike = (v: unknown): v is { toNumber: () => number } => {
        if (typeof v !== "object" || v === null) return false;
        const obj = v as Record<string, unknown>;
        return typeof obj.toNumber === "function";
      };

      try {
        if (typeof product.quantity === "number") {
          availableQty = product.quantity;
        } else if (isDecimalLike(product.quantity)) {
          // Prisma Decimal or similar
          const qtyLike = product.quantity as unknown as {
            toNumber: () => number;
          };
          availableQty = Number(qtyLike.toNumber());
        } else if (typeof product.quantity === "string") {
          availableQty = parseInt(product.quantity, 10) || 0;
        } else {
          availableQty = Number(product.quantity) || 0;
        }
      } catch (err) {
        console.warn(
          "[ADMIN_CHECKOUT] failed to coerce product.quantity:",
          product.quantity,
          err
        );
        availableQty = 0;
      }
      if (typeof availableQty !== "number" || isNaN(availableQty)) {
        console.warn(
          "[ADMIN_CHECKOUT] product quantity coercion resulted in invalid number:",
          product
        );
        availableQty = 0;
      }
      return {
        ok: availableQty >= it.quantity,
        reason: availableQty >= it.quantity ? "ok" : "insufficient",
        requestedProductId: it.productId,
        requestedName: it.name ?? null,
        resolvedProductId: product.id,
        name: product.name,
        available: availableQty,
        price: product.price,
        quantity: it.quantity,
        storeId: product.storeId,
      } as const;
    });

    const failed = resolved.filter((r) => !r.ok);
    if (failed.length > 0) {
      // Normalize failed entries so client always receives helpful fields
      const failedVerbose = failed.map((r) => {
        const maybeResolved = r as Resolved;
        return {
          reason: r.reason,
          requestedProductId: r.requestedProductId,
          requestedName: r.requestedName ?? null,
          resolvedProductId:
            "resolvedProductId" in maybeResolved
              ? maybeResolved.resolvedProductId ?? null
              : null,
          available:
            typeof maybeResolved.available === "number"
              ? maybeResolved.available
              : 0,
          storeId:
            "storeId" in maybeResolved ? maybeResolved.storeId ?? null : null,
        } as const;
      });
      return NextResponse.json(
        { ok: false, failed: failedVerbose },
        { status: 400 }
      );
    }

    // narrow to ensured-ok resolved entries and compute total
    const resolvedOk = (resolved as Resolved[]).filter(isResolvedOk);
    // if client asks for validation only, return here without making changes
    try {
      if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        if (b.validateOnly) {
          return NextResponse.json({ ok: true, validated: true, failed: [] });
        }
      }
    } catch {
      // ignore and continue
    }
    const total = resolvedOk.reduce(
      (s, r) => s + Number(r.price) * r.quantity,
      0
    );

    // make sure the sequence exists (best-effort). If DB user lacks permission this will fail silently later.
    try {
      await db.$executeRaw`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1`;
    } catch (err) {
      console.warn(
        "[ADMIN_CHECKOUT] could not ensure order_number_seq exists:",
        err
      );
    }

  const created = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // attempt to reserve an order number at the start of the transaction
      let reservedOrderNum: number | undefined = undefined;
      try {
        const seqRes = (await tx.$queryRaw`
          SELECT nextval('order_number_seq') as nextval
        `) as unknown as Array<{ nextval: string }>;
        const nextNum =
          seqRes && seqRes[0] ? Number(seqRes[0].nextval) : undefined;
        if (typeof nextNum === "number" && !Number.isNaN(nextNum)) {
          reservedOrderNum = nextNum;
        }
      } catch (err) {
        console.warn(
          "[ADMIN_CHECKOUT] failed to reserve next order_number_seq value at tx start",
          err
        );
      }
      // decrement each resolved product quantity using conditional update to avoid races
      for (const r of resolvedOk) {
        const updateRes = await tx.product.updateMany({
          where: { id: r.resolvedProductId, quantity: { gte: r.quantity } },
          data: { quantity: { decrement: r.quantity } },
        });
        if (!updateRes || updateRes.count === 0) {
          throw new Error(
            `Insufficient stock for product ${r.resolvedProductId}`
          );
        }
      }

      // choose storeId from first resolvedOk (they should belong to same store)
      const storeId = resolvedOk[0].storeId as string;

      const itemsToCreate = resolvedOk.map((r) => ({
        productId: r.resolvedProductId,
        name: r.name ?? r.requestedName ?? "",
        price: String(r.price),
        quantity: r.quantity,
      }));

      type OrderCreateData = {
        storeId: string;
        total: number;
        items: { createMany: { data: Array<Record<string, unknown>> } };
        customerName?: string;
        address?: string;
        paymentMethod?: string;
      };

      const orderData: OrderCreateData = {
        storeId,
        total: total,
        items: {
          createMany: {
            data: itemsToCreate,
          },
        },
      };

      // optional customer metadata
      if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        if (typeof b.customerName === "string")
          orderData.customerName = b.customerName;
        if (typeof b.address === "string") orderData.address = b.address;
        if (typeof b.paymentMethod === "string")
          orderData.paymentMethod = b.paymentMethod;
      }

      // attach reserved order number if we reserved one earlier
      if (typeof reservedOrderNum === "number") {
        (orderData as unknown as Record<string, unknown>)["orderNumber"] =
          reservedOrderNum;
      }

      // create the order (orderData may include orderNumber)
      const createData = orderData as unknown as OrderUncheckedCreateInputLocal;
      // adapt createData to the tx.order.create parameter type without importing Prisma types
  // Cast createData to the generated Prisma unchecked input type which matches nested createMany
  // adapt createData to the generated Prisma unchecked input type
  const order = await tx.order.create({ data: createData as unknown as Prisma.OrderUncheckedCreateInput });

      return order;
    });

    return NextResponse.json({ ok: true, order: created });
  } catch (e) {
    console.error("[ADMIN_CHECKOUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
