import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// Development CORS headers (allow any origin). In production, restrict this.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  // parse URL safely (handle relative internal requests)
  let urlForParse = String(request.url);
  try {
    new URL(urlForParse);
  } catch {
    const port = process.env.PORT || "3000";
    urlForParse = `http://localhost:${port}${urlForParse}`;
  }

  const { searchParams } = new URL(urlForParse);
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
    // parse id from query or body
    let urlForParse = String(request.url);
    try {
      new URL(urlForParse);
    } catch {
      const port = process.env.PORT || "3000";
      urlForParse = `http://localhost:${port}${urlForParse}`;
    }
    const { searchParams } = new URL(urlForParse);
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
