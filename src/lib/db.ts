import { PrismaClient } from "../../generated/prisma/client";

// Create and export a single PrismaClient instance.
// In development hot-reloading can create multiple instances, so we cache
// the client on the global object. This follows the recommended pattern
// from the Prisma docs.

declare global {
  // We intentionally use a `var` on the global object to cache the PrismaClient
  // across module reloads in development. This is safe and recommended by
  // Prisma's docs to avoid creating multiple instances during HMR.
  var prisma: PrismaClient | undefined;
}

type GlobalWithPrisma = { prisma?: PrismaClient };
const g = globalThis as unknown as GlobalWithPrisma;
const prisma = g.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") g.prisma = prisma;

export default prisma;
