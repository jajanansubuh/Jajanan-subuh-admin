/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("../generated/prisma");
const db = new PrismaClient();

async function main() {
  try {
    const p = await db.product.findFirst();
    console.log(
      "Product sample:",
      p ? { id: p.id, name: p.name, quantity: p.quantity } : "no products"
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
