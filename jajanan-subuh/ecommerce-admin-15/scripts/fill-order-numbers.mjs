// ESM migration script: fill-order-numbers.mjs
// Usage: set DATABASE_URL env, then run from project root:
//   node scripts/fill-order-numbers.mjs
// Node 16+ supports .mjs; this project uses Node 22.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in environment. Aborting.");
  process.exit(2);
}

// load generated Prisma client robustly via dynamic import
let db;
async function initPrisma() {
  try {
    // Try importing package entry which may resolve to generated/prisma/index.js
    const gen = await import("../generated/prisma/index.js").catch(() => null);
    if (
      gen &&
      gen.default &&
      typeof gen.default === "object" &&
      typeof gen.default.$connect === "function"
    ) {
      // If the generated package exported a default client instance
      return gen.default;
    }
    if (gen && typeof gen.PrismaClient === "function") {
      // If package exported PrismaClient constructor
      return new gen.PrismaClient();
    }
  } catch {
    // ignore and fallback
  }

  try {
    // Try common client path
    const clientModule = await import("../generated/prisma/client.js");
    const GenClient =
      clientModule?.PrismaClient ?? clientModule?.default ?? clientModule;
    if (typeof GenClient === "function") return new GenClient();
  } catch {
    // ignore, will throw below
  }

  throw new Error("Could not initialize Prisma client from generated files");
}

async function ensureSequence(prisma) {
  try {
    await prisma.$executeRawUnsafe(
      "CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1"
    );
    console.log("Ensured sequence order_number_seq exists");
  } catch (err) {
    console.error("Failed to ensure sequence:", err);
    throw err;
  }
}

async function nextSequenceValue(prisma) {
  const res = await prisma.$queryRawUnsafe(
    "SELECT nextval('order_number_seq') as nextval"
  );
  const v = res && res[0] ? Number(res[0].nextval) : undefined;
  if (typeof v !== "number" || Number.isNaN(v))
    throw new Error("Invalid sequence nextval");
  return v;
}

async function fillMissingOrderNumbers(prisma, batchSize = 100) {
  console.log("Searching orders with null orderNumber...");
  const totalMissing = await prisma.order.count({
    where: { orderNumber: null },
  });
  console.log(`Found ${totalMissing} orders without orderNumber`);
  if (totalMissing === 0) return;

  let processed = 0;
  while (true) {
    const orders = await prisma.order.findMany({
      where: { orderNumber: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });
    if (!orders || orders.length === 0) break;

    for (const o of orders) {
      const val = await nextSequenceValue(prisma);
      try {
        await prisma.$transaction(async (tx) => {
          const current = await tx.order.findUnique({
            where: { id: o.id },
            select: { orderNumber: true },
          });
          if (current && current.orderNumber == null) {
            await tx.order.update({
              where: { id: o.id },
              data: { orderNumber: val },
            });
            console.log(`Assigned orderNumber=${val} to order id=${o.id}`);
          } else {
            console.log(
              `Skipping order id=${o.id} because orderNumber already set`
            );
          }
        });
      } catch (err) {
        console.error(`Failed to set orderNumber for order id=${o.id}:`, err);
        throw err;
      }
      processed += 1;
    }

    console.log(`Processed ${processed}/${totalMissing}`);
  }

  console.log(`Done. Assigned ${processed} order numbers.`);
}

// main
try {
  (async () => {
    db = await initPrisma();
    await ensureSequence(db);
    await fillMissingOrderNumbers(db, 100);
    console.log("All done.");
  })()
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        if (db && typeof db.$disconnect === "function") await db.$disconnect();
      } catch {
        // ignore
      }
    });
} catch (err) {
  console.error("Unexpected error:", err);
  process.exit(1);
}
