import { NextResponse } from "next/server";

// Lazy import prismadb inside handlers to avoid initializing Prisma at module import time

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
  const prismadb = (await import('@/lib/prismadb')).default;
  const users = await prismadb.user.findMany({
      where: {
        storeId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.log('[CUSTOMERS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  // Customers management is read-only - no new customers can be added from admin
  // Customers come from the store application only
  return new NextResponse("Method not allowed", { status: 405 });
}