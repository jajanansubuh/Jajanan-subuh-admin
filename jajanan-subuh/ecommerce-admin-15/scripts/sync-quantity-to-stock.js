/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("../generated/prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Update semua produk: pastikan quantity tidak null dan >= 0
  const products = await prisma.product.findMany();
  for (const product of products) {
    if (typeof product.quantity !== "number" || product.quantity < 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { quantity: 0 },
      });
      console.log(`Updated product ${product.name}: quantity set to 0`);
    }
  }
  console.log("Selesai update semua produk.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
