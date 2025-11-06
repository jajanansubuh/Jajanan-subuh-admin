-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "paymentMethods" JSONB,
ADD COLUMN     "shippingMethods" JSONB;
