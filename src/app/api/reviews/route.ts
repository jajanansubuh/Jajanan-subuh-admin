import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// CORS headers configuration
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
  "Access-Control-Max-Age": "86400"
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
    }
  });
}

export async function GET(request: NextRequest) {
  // Parse URL - this will work both locally and in production
  const url = new URL(request.url);
  const { searchParams } = url;
  const productId = searchParams.get("productId");

  try {
    if (productId) {
      const list = await db.review.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(list, { headers: CORS_HEADERS });
    }

    const all = await db.review.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(all, { headers: CORS_HEADERS });
  } catch (error) {
    // If the Review table doesn't exist yet, return an empty list instead of erroring.
    const msg =
      error && (error as Error).message
        ? (error as Error).message
        : String(error);
    console.error("[REVIEWS_GET]", msg);
    // detect common Prisma missing-table message
    if (
      msg.includes("does not exist") ||
      msg.includes('relation "Review" does not exist')
    ) {
      return NextResponse.json([], { headers: CORS_HEADERS });
    }
    return new NextResponse("Internal error", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, name, rating, comment } = body;

    if (!productId || !name) {
      return new NextResponse("productId and name are required", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    try {
      const created = await db.review.create({
        data: {
          productId,
          name,
          rating: Number(rating) || 5,
          comment: comment || null,
        },
      });

      return NextResponse.json(created, { status: 201, headers: CORS_HEADERS });
    } catch (dbErr) {
      const msg =
        dbErr && (dbErr as Error).message
          ? (dbErr as Error).message
          : String(dbErr);
      console.error("[REVIEWS_POST_DB]", msg);
      if (msg.includes("does not exist")) {
        return new NextResponse("Review table not available", {
          status: 503,
          headers: CORS_HEADERS,
        });
      }
      return new NextResponse("Internal error", {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    return new NextResponse("Invalid request", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Parse URL to get the id parameter
    const url = new URL(request.url);
    const { searchParams } = url;
    let id = searchParams.get("id");

    if (!id) {
      // try body
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // ignore
      }
    }

    if (!id) {
      return new NextResponse("id is required", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    try {
      const deleted = await db.review.delete({ where: { id } });
      return NextResponse.json(deleted, { headers: CORS_HEADERS });
    } catch (err) {
      const msg =
        err && (err as Error).message ? (err as Error).message : String(err);
      console.error("[REVIEWS_DELETE_DB]", msg);
      if (
        msg.includes("Record to delete does not exist") ||
        msg.includes("does not exist")
      ) {
        return new NextResponse("Not found", {
          status: 404,
          headers: CORS_HEADERS,
        });
      }
      return new NextResponse("Internal error", {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  } catch (error) {
    console.error("[REVIEWS_DELETE]", error);
    return new NextResponse("Invalid request", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }
}
