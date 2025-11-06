/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("../generated/prisma");
const db = new PrismaClient();

const [productId, qtyRaw] = process.argv.slice(2);
if (!productId || qtyRaw === undefined) {
  console.error(
    "Usage: node ./scripts/set-product-quantity.js <productId> <quantity>"
  );
  process.exit(1);
}

const quantity = Number(qtyRaw);
if (Number.isNaN(quantity) || quantity < 0) {
  console.error("Quantity must be a non-negative number");
  process.exit(1);
}

async function main() {
  try {
    const updated = await db.product.update({
      where: { id: productId },
      data: { quantity },
    });
    console.log("Updated product:", {
      id: updated.id,
      name: updated.name,
      quantity: updated.quantity,
    });
  } catch (e) {
    console.error("Failed to update product:", e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
