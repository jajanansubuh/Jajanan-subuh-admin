import Navbar from "@/components/navbar";
import db from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const authResult = await auth();
  const userId = authResult?.userId;

  if (!userId) {
    redirect("/sign-in");
  }

  const store = await db.store.findFirst({
    where: {
      id: storeId,
      userId: userId,
    },
    select: {
      id: true,
      name: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!store) {
    redirect("/");
  }
  return (
    <>
      <Navbar />
      <main className="p-6">
        <div className="container mx-auto space-y-6">{children}</div>
      </main>
    </>
  );
}
