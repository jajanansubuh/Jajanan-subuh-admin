/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';

declare global {
  // attach a Prisma client to the globalThis to prevent exhausting connections
  // during hot-reload in development
  // eslint-disable-next-line vars-on-top, no-var
  var __prismaClient: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as { __prismaClient?: PrismaClient };

const getPrismaOptions = () => {
  const url = process.env.DATABASE_URL as string | undefined;
  if (url) {
    return { datasources: { db: { url } } };
  }
  return undefined;
};

if (!globalForPrisma.__prismaClient) {
  globalForPrisma.__prismaClient = new PrismaClient(getPrismaOptions() as any);
}

const prisma = globalForPrisma.__prismaClient as PrismaClient;
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prismaClient = prisma;

export default prisma;