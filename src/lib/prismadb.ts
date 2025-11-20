/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

// Try to load PrismaClient from the regular package first. In some build/deploy
// setups (custom generator output or unusual package layouts) the generated
// client may be available under a different path. This fallback strategy makes
// the server more robust in environments where `@prisma/client` wasn't
// resolved the usual way.
let PrismaClient: any;
try {
  // prefer ESM/TS import equivalent via require to keep runtime simple
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (err) {
  try {
    // fallback: try loading the generated client package placed under
    // `generated/prisma` (this repo uses prisma generator output to ../generated)
    const generated = require('../../generated/prisma');
    PrismaClient = generated.PrismaClient || generated.default || generated;
  } catch (err2) {
    console.error('[PRISMA_IMPORT_ERROR] Could not load PrismaClient from @prisma/client or generated/prisma', err, err2);
    // Re-throw so calling code receives a clear error and can return 500
    throw err2 || err;
  }
}

const globalForPrisma = globalThis as { prisma?: any };

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
  // attempt to eagerly connect so the client is initialized early; catch errors
  // so deployment doesn't fail on environments where connection isn't ready at build
  if (typeof globalForPrisma.prisma.$connect === 'function') {
    globalForPrisma.prisma.$connect().catch((e: unknown) => {
      console.error('[PRISMA_CONNECT_ERROR]', e);
    });
  }
}

const prismadb = globalForPrisma.prisma;

export default prismadb;