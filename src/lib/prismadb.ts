import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as { prisma?: PrismaClient };

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
  // attempt to eagerly connect so the client is initialized early; catch errors
  // so deployment doesn't fail on environments where connection isn't ready at build
  globalForPrisma.prisma.$connect().catch((e: unknown) => {
    console.error('[PRISMA_CONNECT_ERROR]', e);
  });
}

const prismadb = globalForPrisma.prisma;

export default prismadb;