import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

// Lazy import prismadb inside handlers to avoid initializing Prisma at module import time

export async function GET(
  _req: Request,
  props: unknown
) {
  const { params: { storeId } } = props as { params: { storeId: string } };
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
  req: Request,
  props: unknown
) {
  const { params: { storeId } } = props as { params: { storeId: string } };
  try {
    const body = await req.json();
    const { name, email, role, password = "password123" } = body;

    if (!name || !email) {
      return new NextResponse("Name and email are required", { status: 400 });
    }

  const hashedPassword = await bcrypt.hash(password, 10);

  const prismadb = (await import('@/lib/prismadb')).default;
  const customer = await prismadb.user.create({
      data: {
        name,
        email,
        role: role as "ADMIN" | "CUSTOMER",
        password: hashedPassword,
        storeId
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMERS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};