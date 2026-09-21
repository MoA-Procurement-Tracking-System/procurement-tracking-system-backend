-- AlterTable Contract: add missing fields
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "purchaseOrderNo" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "priceAdjustmentAmount" DECIMAL(15,2);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "revisedCompletionDate" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "budgetType" TEXT;

-- AlterTable Plan: add missing fields
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "parentPlanId" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "planType" TEXT DEFAULT 'ANNUAL';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "additionalPlanReason" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Plan_parentPlanId_idx" ON "Plan"("parentPlanId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Plan_parentPlanId_fkey'
  ) THEN
    ALTER TABLE "Plan" ADD CONSTRAINT "Plan_parentPlanId_fkey"
    FOREIGN KEY ("parentPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
