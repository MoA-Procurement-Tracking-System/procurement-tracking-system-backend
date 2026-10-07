-- AlterEnum: add CANCELLATION_REQUESTED and CANCELLED to PlanStatus
ALTER TYPE "PlanStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';
ALTER TYPE "PlanStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable Plan: add cancellation tracking fields
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "cancellationRequestedById" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "cancellationRequestedAt" TIMESTAMP(3);
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "cancellationApprovedById" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "cancellationApprovedAt" TIMESTAMP(3);
