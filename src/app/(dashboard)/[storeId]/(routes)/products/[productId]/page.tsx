import db from "@/lib/db";
// Import the generated types from the local generated Prisma client.
// The project generates the client into `generated/prisma`, not into node_modules/@prisma/client,
// so import via the src alias to resolve to `./generated/prisma`.
import { ProductForm } from "./components/product-form";
import ReviewsListClient from "./components/reviews-list-client";

const ProductPage = async ({
  params,
}: {
  params: Promise<{ productId: string; storeId: string }>;
}) => {
  const { productId, storeId } = await params;
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      images: true,
    },
  });

  const categories = await db.category.findMany({
    where: {
      storeId: storeId,
    },
  });

  // don't rely on the generated model type here because the introspected
  // generated client may not include optional fields consistently during
  // iterative schema changes. Use a permissive `any[]` and coerce values
  // into a safe shape below.
  let reviews: Array<Record<string, unknown>> = [];
  try {
    reviews = await db.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    // If the Review table doesn't exist yet (migration not run), avoid crashing the page.
    // Log the error so developers can notice and run migrations.
    console.error("[REVIEWS_FETCH]", err);
    reviews = [];
  }

  // Convert Prisma Decimal and Date objects to plain serializable values
  const safeProduct = product
    ? (() => {
        function isDecimalLike(v: unknown): v is { toNumber: () => number } {
          return (
            typeof v === "object" &&
            v !== null &&
            typeof (v as { toNumber?: unknown }).toNumber === "function"
          );
        }

        const priceUnknown = (product as unknown as { price?: unknown }).price;
        const convertedPrice: string | number | undefined = isDecimalLike(
          priceUnknown
        )
          ? priceUnknown.toNumber()
          : typeof priceUnknown === "number" || typeof priceUnknown === "string"
          ? priceUnknown
          : undefined;

        return {
          ...product,
          price: convertedPrice,
          // ensure name is a string for UI/forms (schema has nullable name)
          name: (product.name ?? "") as string,
          createdAt: product.createdAt
            ? product.createdAt.toISOString()
            : product.createdAt,
          updatedAt: product.updatedAt
            ? product.updatedAt.toISOString()
            : product.updatedAt,
          images: product.images?.map((img: { id: string; url: string; productId?: string; createdAt?: Date | string; updatedAt?: Date | string }) => ({ ...img })),
        };
      })()
    : null;

  const safeCategories = categories.map((c: { createdAt?: Date | string; updatedAt?: Date | string }) => ({
    ...c,
    createdAt: (c.createdAt as Date | undefined)
      ? (c.createdAt as Date).toISOString()
      : c.createdAt,
    updatedAt: (c.updatedAt as Date | undefined)
      ? (c.updatedAt as Date).toISOString()
      : c.updatedAt,
  }));

  type SafeReview = {
    id: string;
    productId: string;
    name: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    createdAtFormatted?: string | null;
  };

  const safeReviews: SafeReview[] = reviews.map((r) => {
    const id = (r["id"] as string) ?? "";
    const productId = (r["productId"] as string) ?? "";
    const rating = (r["rating"] as number) ?? 0;
    const comment = (r["comment"] as string | null) ?? null;
    const name = (r["name"] as string) ?? "Anonymous";
    const createdAtRaw = r["createdAt"] as Date | string | undefined;
    const createdAt = createdAtRaw
      ? (createdAtRaw as Date).toISOString?.() ?? String(createdAtRaw)
      : "";
    const createdAtFormatted = createdAtRaw
      ? new Date(createdAtRaw as string).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : null;

    return {
      id,
      productId,
      name,
      rating,
      comment,
      createdAt,
      createdAtFormatted,
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProductForm initialData={safeProduct} categories={safeCategories} />
        {/* client-side reviews list (with delete) */}
        <ReviewsListClient initialReviews={safeReviews} />
      </div>
    </div>
  );
};

export default ProductPage;
