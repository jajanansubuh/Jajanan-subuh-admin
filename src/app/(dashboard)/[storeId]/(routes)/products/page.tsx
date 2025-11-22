import db from "@/lib/db";
import { ProductClient } from "./components/client";
import { ProductColumn } from "./components/columns";

import { format } from "date-fns";
import { formatter } from "@/lib/utils";

const ProductsPage = async ({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) => {
  const { storeId } = await params;
  const products = await db.product.findMany({
    where: {
      storeId: storeId,
    },
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedProducts: ProductColumn[] = products.map((item: { id: string; name?: string | null; isFeatured?: boolean; isArchived?: boolean; price: { toNumber: () => number } | number | string; quantity?: number; category: { name: string }; createdAt: Date | string }) => {
    let priceNumber: number;
    if (
      typeof item.price === 'object' &&
      item.price !== null &&
      'toNumber' in item.price &&
      typeof (item.price as { toNumber?: unknown }).toNumber === 'function'
    ) {
      priceNumber = (item.price as { toNumber: () => number }).toNumber();
    } else {
      priceNumber = Number(item.price ?? 0);
    }

    return {
      id: item.id,
      name: item.name ?? "",
      isFeatured: item.isFeatured,
      isArchived: item.isArchived,
      price: formatter.format(priceNumber),
      quantity: String(item.quantity ?? 0),
      category: item.category.name,
      createdAt: format(item.createdAt, "MMM do, yyyy"),
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProductClient data={formattedProducts} />
      </div>
    </div>
  );
};

export default ProductsPage;
