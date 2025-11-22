/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!globalForPrisma.prisma) {
  // Override datasource URL at runtime so PrismaClient can connect even when
  // schema.prisma does not include the `url` property (Prisma v6+ recommendation).
  const dbUrl = (process.env as any).DATABASE_URL;
  if (dbUrl) {
    globalForPrisma.prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  } else {
    // Fall back to default constructor; this will work in environments where
    // the schema still provides the URL or Prisma is configured differently.
    globalForPrisma.prisma = new PrismaClient();
  }
}

const prismadb = globalForPrisma.prisma;

export default prismadb;