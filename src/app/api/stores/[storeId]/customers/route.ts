import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import prismadb from "@/lib/prismadb";

export async function GET(
  _req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const users = await prismadb.user.findMany({
      where: {
        stores: {
          some: {
            id: params.storeId
          }
        }
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
  { params }: { params: { storeId: string } }
) {
  try {
    const body = await req.json();
    const { name, email, role, password = "password123" } = body;

    if (!name || !email) {
      return new NextResponse("Name and email are required", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await prismadb.user.create({
      data: {
        name,
        email,
        role: role as "ADMIN" | "CUSTOMER",
        password: hashedPassword,
        stores: {
          connect: {
            id: params.storeId
          }
        }
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log('[CUSTOMERS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};