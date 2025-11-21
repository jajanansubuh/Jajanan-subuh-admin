// Minimal Prisma config for Migrate when using Prisma v6+.
// This file is CommonJS so the Prisma CLI can parse it reliably.
module.exports = {
  schema: 'prisma/schema.prisma',
  migrate: {
    url: process.env.DATABASE_URL,
  },
};
