/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("../generated/prisma");
const db = new PrismaClient();
(async () => {
  try {
    const cols =
      await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Product'`;
    console.log(
      "columns:",
      cols.map((c) => c.column_name)
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();
