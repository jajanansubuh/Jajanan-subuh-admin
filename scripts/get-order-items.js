/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("../generated/prisma");
const db = new PrismaClient();

const id = process.argv[2];
if (!id) {
  console.error("Usage: node ./scripts/get-order-items.js <orderId>");
  process.exit(1);
}

async function main() {
  try {
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        store: true,
      },
    });

    if (!order) {
      console.error("Order not found:", id);
      process.exit(2);
    }

    console.log(JSON.stringify(order, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
