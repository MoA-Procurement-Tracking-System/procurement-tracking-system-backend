-- =============================================================
-- Add ALL missing columns that exist in Prisma schema but are
-- absent from the current database
-- =============================================================

-- ---------------------------------------------------------------
-- Activity: add createdById and updatedById tracking fields
-- ---------------------------------------------------------------
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- CreateIndex for Activity tracking fields
CREATE INDEX IF NOT EXISTS "Activity_createdById_idx" ON "Activity"("createdById");
CREATE INDEX IF NOT EXISTS "Activity_updatedById_idx" ON "Activity"("updatedById");
CREATE INDEX IF NOT EXISTS "Activity_createdAt_id_idx" ON "Activity"("createdAt", "id");

-- AddForeignKey: Activity.createdById -> User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Activity_createdById_fkey'
  ) THEN
    ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Activity.updatedById -> User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Activity_updatedById_fkey'
  ) THEN
    ALTER TABLE "Activity" ADD CONSTRAINT "Activity_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
