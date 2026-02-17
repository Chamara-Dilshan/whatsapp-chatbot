-- Phase 5: Billing, Language/Tone, Orders & Productionization

-- ── 1. Add language & tone to Conversation ──────────────────────────
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "language" TEXT;

-- ── 2. Add language & tone to TenantPolicies ────────────────────────
ALTER TABLE "TenantPolicies" ADD COLUMN IF NOT EXISTS "defaultLanguage" TEXT NOT NULL DEFAULT 'EN';
ALTER TABLE "TenantPolicies" ADD COLUMN IF NOT EXISTS "tone" TEXT NOT NULL DEFAULT 'FRIENDLY';
ALTER TABLE "TenantPolicies" ADD COLUMN IF NOT EXISTS "autoDetectLanguage" BOOLEAN NOT NULL DEFAULT false;

-- ── 3. Migrate ReplyTemplate: add language & tone, update unique ─────
ALTER TABLE "ReplyTemplate" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'EN';
ALTER TABLE "ReplyTemplate" ADD COLUMN IF NOT EXISTS "tone" TEXT NOT NULL DEFAULT 'FRIENDLY';

-- Drop old unique constraint (tenantId, intent)
ALTER TABLE "ReplyTemplate" DROP CONSTRAINT IF EXISTS "ReplyTemplate_tenantId_intent_key";

-- Add new unique constraint (tenantId, intent, language, tone)
ALTER TABLE "ReplyTemplate" ADD CONSTRAINT "ReplyTemplate_tenantId_intent_language_tone_key"
  UNIQUE ("tenantId", "intent", "language", "tone");

-- Add language index
CREATE INDEX IF NOT EXISTS "ReplyTemplate_tenantId_language_idx" ON "ReplyTemplate"("tenantId", "language");

-- ── 4. Additional indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Message_tenantId_createdAt_idx" ON "Message"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Conversation_tenantId_status_updatedAt_idx" ON "Conversation"("tenantId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Case_tenantId_status_priority_idx" ON "Case"("tenantId", "status", "priority");

-- ── 5. Billing: TenantSubscription ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantSubscription_status_idx" ON "TenantSubscription"("status");
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 6. Billing: UsageCounter ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UsageCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "inboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
    "outboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
    "automationEventsCount" INTEGER NOT NULL DEFAULT 0,
    "aiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UsageCounter_tenantId_period_key" ON "UsageCounter"("tenantId", "period");
CREATE INDEX IF NOT EXISTS "UsageCounter_tenantId_idx" ON "UsageCounter"("tenantId");
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 7. Billing: TenantQuotaOverride ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "TenantQuotaOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maxAgents" INTEGER,
    "maxInboundPerMonth" INTEGER,
    "maxOutboundPerDay" INTEGER,
    "maxProducts" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantQuotaOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantQuotaOverride_tenantId_key" ON "TenantQuotaOverride"("tenantId");
ALTER TABLE "TenantQuotaOverride" ADD CONSTRAINT "TenantQuotaOverride_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 8. Orders: Order ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");
CREATE INDEX IF NOT EXISTS "Order_tenantId_status_idx" ON "Order"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_tenantId_customerPhone_idx" ON "Order"("tenantId", "customerPhone");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 9. Orders: OrderItem ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 10. Orders: Shipment ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Shipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "latestStatusText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_orderId_key" ON "Shipment"("orderId");
CREATE INDEX IF NOT EXISTS "Shipment_tenantId_orderId_idx" ON "Shipment"("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
