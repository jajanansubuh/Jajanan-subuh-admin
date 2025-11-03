/*
Script: fill-order-numbers.ts
Purpose: Assign persistent orderNumber to existing orders that have orderNumber IS NULL.
Usage (from project root):
  - Install dependencies if needed: `npm install` (project already has Prisma client generated in `generated/prisma`)
  - Run with ts-node or compile with tsc. Example using ts-node:
      npx ts-node --transpile-only scripts/fill-order-numbers.ts

Notes:
  - This script uses the generated Prisma client that's used by the project.
  - It will ensure a Postgres sequence `order_number_seq` exists and use nextval to generate values.
  - It updates orders one-by-one inside short transactions to avoid long locks.
  - Backup DB before running in production.
*/

import db from "../src/lib/db";

async function ensureSequence() {
  try {
    await db.$executeRaw`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1`;
    console.log("Ensured sequence order_number_seq exists");
  } catch (err) {
    console.error("Failed to ensure sequence:", err);
    throw err;
  }
}

async function nextSequenceValue() {
  const res =
    (await db.$queryRaw`SELECT nextval('order_number_seq') as nextval`) as Array<{
      nextval: string;
    }>; // Postgres returns as string
  const v = res && res[0] ? Number(res[0].nextval) : undefined;
  if (typeof v !== "number" || Number.isNaN(v))
    throw new Error("Invalid sequence nextval");
  return v;
}

async function fillMissingOrderNumbers(batchSize = 100) {
  console.log("Searching orders with null orderNumber...");
  const totalMissing = await db.order.count({ where: { orderNumber: null } });
  console.log(`Found ${totalMissing} orders without orderNumber`);
  if (totalMissing === 0) return;

  let processed = 0;
  while (true) {
    const orders = await db.order.findMany({
      where: { orderNumber: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });
    if (!orders || orders.length === 0) break;

    for (const o of orders) {
      // reserve next sequence
      const val = await nextSequenceValue();
      try {
        // update in a short transaction
        await db.$transaction(async (tx) => {
          // double-check still null to avoid races
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

async function main() {
  try {
    await ensureSequence();
    await fillMissingOrderNumbers(100);
    console.log("All done, disconnecting...");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await db.$disconnect();
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
