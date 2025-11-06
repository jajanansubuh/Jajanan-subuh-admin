import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  // clerkMiddleware bisa async, pastikan resolve
  const response = await clerkMiddleware()(request, event);
  if (response) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }
  return response;
}

export const config = {
  // Match all routes except Next internals/static assets and the favicon.
  // This simpler matcher ensures the middleware runs for app routes and API routes
  // (including routes under dynamic/dashboard segments).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
