import db from "@/lib/db";
import { BannerForm } from "./components/banner-form";

const BannerPage = async ({
  params,
}: {
  params: Promise<{ bannerId: string }>;
}) => {
  const { bannerId } = await params;
  const banner = await db.banner.findUnique({
    where: {
      id: bannerId,
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BannerForm initialData={banner} />
      </div>
    </div>
  );
};

export default BannerPage;
