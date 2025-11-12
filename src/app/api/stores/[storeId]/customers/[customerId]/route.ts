import { NextResponse } from "next/server";

// Lazy import prismadb inside handlers to avoid initializing Prisma at module import time

export async function PATCH() {
  // Customers management is read-only - no updates allowed from admin
  return new NextResponse("Method not allowed", { status: 405 });
}

export async function DELETE() {
  // Customers management is read-only - no deletions allowed from admin
  return new NextResponse("Method not allowed", { status: 405 });
}