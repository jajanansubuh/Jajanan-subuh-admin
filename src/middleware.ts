import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { cors } from "@/lib/cors";

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  // CORS preflight
  if (request.method === "OPTIONS") {
    // Use same CORS logic as API routes so we return the incoming origin
    const headers = await cors(request as unknown as Request);
    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }
  // clerkMiddleware bisa async, pastikan resolve
  const response = await clerkMiddleware()(request, event);
  if (response) {
    // Apply CORS headers dynamically to match allowed origins and credentials
    const headers = await cors(request as unknown as Request);
    for (const [k, v] of Object.entries(headers)) {
      // only set when value is non-empty
      if (v !== undefined && v !== "") response.headers.set(k, v);
    }
  }
  return response;
}

export const config = {
  // Match all routes except Next internals/static assets and the favicon.
  // This simpler matcher ensures the middleware runs for app routes and API routes
  // (including routes under dynamic/dashboard segments).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
