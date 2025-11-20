import { NextResponse } from "next/server";
import { cors } from "@/lib/cors";

export async function GET(req: Request) {
  const headers = await cors(req);
  try {
    // Import the prismadb singleton which contains our robust loading logic
    const { default: prismadb } = await import("@/lib/prismadb");

    type DebugResult = {
      prismaLoaded: boolean;
      hasDatabaseUrl: boolean;
      dbReachable?: boolean;
      dbError?: string;
    };

    const result: DebugResult = {
      prismaLoaded: !!prismadb,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    };

    // Try a lightweight connectivity check if client exposes $queryRaw
    if (prismadb && typeof (prismadb as { $queryRaw?: Function }).$queryRaw === "function") {
      try {
        // run a safe simple query depending on DB; use raw to avoid model dependency
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await (prismadb as { $queryRaw: (...args: unknown[]) => Promise<unknown> }).$queryRaw`SELECT 1`;
        result.dbReachable = true;
      } catch (err: unknown) {
        result.dbReachable = false;
        const msg = err instanceof Error ? err.message : String(err);
        result.dbError = msg;
      }
    }

    return NextResponse.json(result, { headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DEBUG_PRISMA_ERROR]", msg);
    return NextResponse.json({ prismaLoaded: false, error: msg }, { status: 500, headers });
  }
}
