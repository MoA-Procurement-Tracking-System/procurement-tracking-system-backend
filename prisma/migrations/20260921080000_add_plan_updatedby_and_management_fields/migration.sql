-- AlterTable Plan: add updatedById tracking field
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- AlterTable Plan: add management decision fields
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "managementDecision" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "managementComment" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "managementById" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "managementAt" TIMESTAMP(3);
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "directorRevisionComment" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Plan_updatedById_idx" ON "Plan"("updatedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Plan_managementById_idx" ON "Plan"("managementById");

-- AddForeignKey: updatedById -> User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Plan_updatedById_fkey'
  ) THEN
    ALTER TABLE "Plan" ADD CONSTRAINT "Plan_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: managementById -> User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Plan_managementById_fkey'
  ) THEN
    ALTER TABLE "Plan" ADD CONSTRAINT "Plan_managementById_fkey"
    FOREIGN KEY ("managementById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
