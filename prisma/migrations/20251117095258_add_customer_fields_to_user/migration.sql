-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_storeId_fkey";

-- DropIndex
DROP INDEX "public"."User_storeId_idx";
