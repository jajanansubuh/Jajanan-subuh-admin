import { NextResponse } from "next/server";
import { cors } from "@/lib/cors";

export async function GET(req: Request) {
  const headers = await cors(req);
  try {
    // Import the prismadb singleton which contains our robust loading logic
    const { default: prismadb } = await import("@/lib/prismadb");

    const result: any = {
      prismaLoaded: !!prismadb,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    };

    // Try a lightweight connectivity check if client exposes $queryRaw
    if (prismadb && typeof prismadb.$queryRaw === "function") {
      try {
        // run a safe simple query depending on DB; use raw to avoid model dependency
        await prismadb.$queryRaw`SELECT 1`;
        result.dbReachable = true;
      } catch (err: any) {
        result.dbReachable = false;
        result.dbError = String(err?.message || err);
      }
    }

    return NextResponse.json(result, { headers });
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error('[DEBUG_PRISMA_ERROR]', msg);
    return NextResponse.json({ prismaLoaded: false, error: msg }, { status: 500, headers });
  }
}
