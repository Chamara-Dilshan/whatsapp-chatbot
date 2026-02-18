-- DropIndex
DROP INDEX "Product_description_trgm_idx";

-- DropIndex
DROP INDEX "Product_name_trgm_idx";

-- DropIndex
DROP INDEX "ReplyTemplate_tenantId_intent_key";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TenantPolicies" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TenantQuotaOverride" ADD COLUMN     "maxAiCallsPerMonth" INTEGER,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TenantSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UsageCounter" ALTER COLUMN "updatedAt" DROP DEFAULT;
