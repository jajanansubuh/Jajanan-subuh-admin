/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}

const prismadb = globalForPrisma.prisma;

export default prismadb;