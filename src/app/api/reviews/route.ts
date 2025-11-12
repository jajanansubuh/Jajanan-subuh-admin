import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { cors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  const headers = await cors(request as unknown as Request);
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...headers,
      "Access-Control-Max-Age": "86400",
    },
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
  const headers = await cors(request as unknown as Request);
  return NextResponse.json(list, { headers });
    }

    const all = await db.review.findMany({ orderBy: { createdAt: "desc" } });
  const headers = await cors(request as unknown as Request);
  return NextResponse.json(all, { headers });
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
  const headers = await cors(request as unknown as Request);
  return NextResponse.json([], { headers });
    }
    const headers = await cors(request as unknown as Request);
    return new NextResponse("Internal error", {
      status: 500,
      headers,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, name, rating, comment } = body;

    if (!productId || !name) {
      const headers = await cors(request as unknown as Request);
      return new NextResponse("productId and name are required", {
        status: 400,
        headers,
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

  const headers = await cors(request as unknown as Request);
  return NextResponse.json(created, { status: 201, headers });
    } catch (dbErr) {
      const msg =
        dbErr && (dbErr as Error).message
          ? (dbErr as Error).message
          : String(dbErr);
      console.error("[REVIEWS_POST_DB]", msg);
      if (msg.includes("does not exist")) {
        const headers = await cors(request as unknown as Request);
        return new NextResponse("Review table not available", {
          status: 503,
          headers,
        });
      }
      const headers = await cors(request as unknown as Request);
      return new NextResponse("Internal error", {
        status: 500,
        headers,
      });
    }
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    const headers = await cors(request as unknown as Request);
    return new NextResponse("Invalid request", {
      status: 400,
      headers,
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
      const headers = await cors(request as unknown as Request);
      return new NextResponse("id is required", {
        status: 400,
        headers,
      });
    }

    try {
      const deleted = await db.review.delete({ where: { id } });
  const headers = await cors(request as unknown as Request);
  return NextResponse.json(deleted, { headers });
    } catch (err) {
      const msg =
        err && (err as Error).message ? (err as Error).message : String(err);
      console.error("[REVIEWS_DELETE_DB]", msg);
      if (
        msg.includes("Record to delete does not exist") ||
        msg.includes("does not exist")
      ) {
        const headers = await cors(request as unknown as Request);
        return new NextResponse("Not found", {
          status: 404,
          headers,
        });
      }
      const headers = await cors(request as unknown as Request);
      return new NextResponse("Internal error", {
        status: 500,
        headers,
      });
    }
  } catch (error) {
    console.error("[REVIEWS_DELETE]", error);
    const headers = await cors(request as unknown as Request);
    return new NextResponse("Invalid request", {
      status: 400,
      headers,
    });
  }
}
