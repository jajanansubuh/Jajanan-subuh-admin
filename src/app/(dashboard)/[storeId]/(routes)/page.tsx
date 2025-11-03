import db from "@/lib/db";
import DashboardChart from "@/components/dashboard/chart";

const DashboardPage = async ({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) => {
  const { storeId } = await params;
  const store = await db.store.findFirst({
    where: {
      id: storeId,
    },
    select: {
      id: true,
      name: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-lg font-semibold">Active Store: {store?.name}</div>
      <DashboardChart />
    </div>
  );
};

export default DashboardPage;
