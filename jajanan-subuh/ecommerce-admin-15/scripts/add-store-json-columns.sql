ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "paymentMethods" jsonb;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "shippingMethods" jsonb;
