-- Drop unique constraint on Project code so multiple projects can share program acronyms (e.g. BREFONS)
DROP INDEX IF EXISTS "Project_code_key";

-- Add World Bank STEP alignment columns
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "pNumber" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "totalBudget" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "effectivenessDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "closingDate" TIMESTAMP(3);

-- Create new indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Project_pNumber_key" ON "Project"("pNumber");
CREATE INDEX IF NOT EXISTS "Project_code_idx" ON "Project"("code");
CREATE INDEX IF NOT EXISTS "Project_pNumber_idx" ON "Project"("pNumber");
