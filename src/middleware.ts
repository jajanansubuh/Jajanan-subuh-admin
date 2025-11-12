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
    const headers = await cors(request as unknown as Request);
    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }
  // clerkMiddleware bisa async, pastikan resolve
  const response = await clerkMiddleware()(request, event);
  if (response) {
    const headers = await cors(request as unknown as Request);
    Object.entries(headers).forEach(([k, v]) => {
      response.headers.set(k, v as string);
    });
  }
  return response;
}

export const config = {
  // Match all routes except Next internals/static assets and the favicon.
  // This simpler matcher ensures the middleware runs for app routes and API routes
  // (including routes under dynamic/dashboard segments).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
