import db from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./components/settings-form";

const SettingsPage = async ({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) => {
  const { storeId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const store = await db.store.findFirst({
    where: {
      id: storeId,
      userId,
    },
    select: {
      id: true,
      name: true,
      // include persisted json fields so the client receives saved lists
      paymentMethods: true,
      shippingMethods: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!store) {
    redirect("/");
  }

  // Normalize persisted JSON to MethodObj[] for the client form.
  const parseMethods = (
    v: unknown
  ): { method: string; status: string }[] | undefined => {
    if (!v) return undefined;
    // If DB stored a JSON string (older records), try to parse it
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed))
          return parsed as { method: string; status: string }[];
        return undefined;
      } catch {
        return undefined;
      }
    }
    if (Array.isArray(v)) return v as { method: string; status: string }[];
    return undefined;
  };

  const initialData = {
    id: store.id,
    name: store.name,
    paymentMethods: parseMethods(store.paymentMethods),
    shippingMethods: parseMethods(store.shippingMethods),
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SettingsForm initialData={initialData} />
      </div>
    </div>
  );
};

export default SettingsPage;
