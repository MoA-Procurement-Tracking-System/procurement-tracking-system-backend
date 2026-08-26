-- The merged branches introduced incompatible procurement schemas. The
-- transformation below is intentionally limited to databases that have not
-- accumulated procurement-domain data; authentication data is unaffected.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Project" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "UserProject" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Plan" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "PlanReview" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Activity" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "ActivityStage" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "StageTemplate" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Supplier" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Contract" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "ContractAmendment" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "ContractSecurity" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "ContractMilestone" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Payment" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Document" LIMIT 1)
        OR EXISTS (SELECT 1 FROM "Revision" LIMIT 1)
    THEN
        RAISE EXCEPTION USING
            MESSAGE = 'The merged-schema reconciliation requires empty procurement-domain tables.',
            HINT = 'Back up the database and create an explicit data-mapping migration before deploying this migration.';
    END IF;
END $$;

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'CLOSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RevisionChangeType" AS ENUM ('CREATE', 'UPDATE', 'REPLAN', 'APPROVE', 'REJECT', 'SOFT_DELETE');

-- CreateEnum
CREATE TYPE "RevisionEntityType" AS ENUM ('PROJECT', 'PLAN', 'ACTIVITY', 'STAGE');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "VoteDecision" AS ENUM ('APPROVE', 'REJECT');

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityStatus_new" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CONTRACTED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."ActivityStage" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Activity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Activity" ALTER COLUMN "status" TYPE "ActivityStatus_new" USING ("status"::text::"ActivityStatus_new");
ALTER TABLE "ActivityStage" ALTER COLUMN "status" TYPE "ActivityStatus_new" USING ("status"::text::"ActivityStatus_new");
ALTER TYPE "ActivityStatus" RENAME TO "ActivityStatus_old";
ALTER TYPE "ActivityStatus_new" RENAME TO "ActivityStatus";
DROP TYPE "public"."ActivityStatus_old";
ALTER TABLE "Activity" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PlanStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'WITH_COMMITTEE', 'APPROVED', 'REJECTED', 'UPDATE_REQUESTED');
ALTER TABLE "public"."Plan" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Plan" ALTER COLUMN "status" TYPE "PlanStatus_new" USING ("status"::text::"PlanStatus_new");
ALTER TYPE "PlanStatus" RENAME TO "PlanStatus_old";
ALTER TYPE "PlanStatus_new" RENAME TO "PlanStatus";
DROP TYPE "public"."PlanStatus_old";
ALTER TABLE "Plan" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_fundingSourceId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_methodId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_officerId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_reviewStatusId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_reviewTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_sectorId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityStage" DROP CONSTRAINT "ActivityStage_activityId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_activityId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_statusId_fkey";

-- DropForeignKey
ALTER TABLE "ContractAmendment" DROP CONSTRAINT "ContractAmendment_amendedById_fkey";

-- DropForeignKey
ALTER TABLE "ContractAmendment" DROP CONSTRAINT "ContractAmendment_contractId_fkey";

-- DropForeignKey
ALTER TABLE "ContractMilestone" DROP CONSTRAINT "ContractMilestone_contractId_fkey";

-- DropForeignKey
ALTER TABLE "ContractMilestone" DROP CONSTRAINT "ContractMilestone_statusId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT "ContractSecurity_contractId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT "ContractSecurity_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT "ContractSecurity_statusId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT "ContractSecurity_typeId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_stageId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_statusId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_typeId_fkey";

-- DropForeignKey
ALTER TABLE "Plan" DROP CONSTRAINT "Plan_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Revision" DROP CONSTRAINT "Revision_changedById_fkey";

-- DropForeignKey
ALTER TABLE "StageTemplate" DROP CONSTRAINT "StageTemplate_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "StageTemplate" DROP CONSTRAINT "StageTemplate_methodId_fkey";

-- DropIndex
DROP INDEX "Activity_categoryId_idx";

-- DropIndex
DROP INDEX "Activity_currencyId_idx";

-- DropIndex
DROP INDEX "Activity_dueDate_idx";

-- DropIndex
DROP INDEX "Activity_fundingSourceId_idx";

-- DropIndex
DROP INDEX "Activity_methodId_idx";

-- DropIndex
DROP INDEX "Activity_officerId_idx";

-- DropIndex
DROP INDEX "Activity_referenceNumber_key";

-- DropIndex
DROP INDEX "Activity_regionId_idx";

-- DropIndex
DROP INDEX "Activity_reviewStatusId_idx";

-- DropIndex
DROP INDEX "Activity_reviewTypeId_idx";

-- DropIndex
DROP INDEX "Activity_reviewedById_idx";

-- DropIndex
DROP INDEX "Activity_sectorId_idx";

-- DropIndex
DROP INDEX "Contract_activityId_idx";

-- DropIndex
DROP INDEX "Contract_completionDate_idx";

-- DropIndex
DROP INDEX "Contract_contractNumber_key";

-- DropIndex
DROP INDEX "Contract_currencyId_idx";

-- DropIndex
DROP INDEX "Contract_regionId_idx";

-- DropIndex
DROP INDEX "Contract_statusId_idx";

-- DropIndex
DROP INDEX "Contract_supplierId_idx";

-- DropIndex
DROP INDEX "Payment_contractId_idx";

-- DropIndex
DROP INDEX "Payment_paymentDate_idx";

-- DropIndex
DROP INDEX "Payment_statusId_idx";

-- DropIndex
DROP INDEX "Payment_typeId_idx";

-- DropIndex
DROP INDEX "Plan_budgetYear_idx";

-- DropIndex
DROP INDEX "Plan_referenceNo_key";

-- DropIndex
DROP INDEX "Revision_changedAt_idx";

-- DropIndex
DROP INDEX "Revision_entityType_entityId_idx";

-- DropIndex
DROP INDEX "StageTemplate_categoryId_methodId_idx";

-- DropIndex
DROP INDEX "StageTemplate_categoryId_methodId_order_key";

-- DropIndex
DROP INDEX "StageTemplate_isActive_idx";

-- DropIndex
DROP INDEX "Supplier_isActive_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "categoryId",
DROP COLUMN "currencyId",
DROP COLUMN "dueDate",
DROP COLUMN "estimatedAmount",
DROP COLUMN "fundingSourceId",
DROP COLUMN "methodId",
DROP COLUMN "officerId",
DROP COLUMN "referenceNumber",
DROP COLUMN "regionId",
DROP COLUMN "reviewNotes",
DROP COLUMN "reviewStatusId",
DROP COLUMN "reviewTypeId",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById",
DROP COLUMN "sectorId",
ADD COLUMN     "bidReferenceNo" TEXT,
ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "contractType" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "domesticPreference" TEXT,
ADD COLUMN     "estimatedBudget" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "evaluationOptions" TEXT[],
ADD COLUMN     "highSeaShRisk" BOOLEAN,
ADD COLUMN     "isImport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "lotRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketApproach" TEXT,
ADD COLUMN     "oversightClassification" TEXT,
ADD COLUMN     "performancePct" DOUBLE PRECISION,
ADD COLUMN     "pricingBasis" TEXT,
ADD COLUMN     "processStatus" TEXT,
ADD COLUMN     "procurementClassificationCode" TEXT,
ADD COLUMN     "procurementClassificationDesc" TEXT,
ADD COLUMN     "procurementDocumentType" TEXT,
ADD COLUMN     "procurementMethodId" TEXT NOT NULL,
ADD COLUMN     "procurementProcess" TEXT,
ADD COLUMN     "qualificationApproach" TEXT,
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "requiresUnAgencyContracting" BOOLEAN,
ADD COLUMN     "reviewType" TEXT,
ADD COLUMN     "scopeNotes" TEXT,
ADD COLUMN     "specificMethod" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "completionDate",
DROP COLUMN "contractNumber",
DROP COLUMN "currencyId",
DROP COLUMN "currentAmount",
DROP COLUMN "isActive",
DROP COLUMN "originalAmount",
DROP COLUMN "regionId",
DROP COLUMN "signingDate",
DROP COLUMN "startDate",
DROP COLUMN "statusId",
ADD COLUMN     "contractNo" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ETB',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "remainingValue" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "totalValue" DECIMAL(15,2) NOT NULL,
ALTER COLUMN "activityId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "isActive",
DROP COLUMN "requestDate",
DROP COLUMN "statusId",
DROP COLUMN "typeId",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "referenceNo" TEXT NOT NULL,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "paymentDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "name",
DROP COLUMN "referenceNo",
ADD COLUMN     "committeeRound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "committeeVoteDeadline" TIMESTAMP(3),
ADD COLUMN     "gpnDate" TIMESTAMP(3),
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "procurementCategory" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "budgetYear" DROP NOT NULL,
ALTER COLUMN "budgetYear" SET DATA TYPE TEXT,
ALTER COLUMN "projectId" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "components" TEXT[],
ADD COLUMN     "country" TEXT,
ADD COLUMN     "executingAgency" TEXT,
ADD COLUMN     "fundingSourceId" TEXT NOT NULL,
ADD COLUMN     "fundingType" TEXT,
ADD COLUMN     "loanGrantNumbers" TEXT[],
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "projectEndDate" TIMESTAMP(3),
ADD COLUMN     "projectStartDate" TIMESTAMP(3),
ADD COLUMN     "sapIdentificationNo" TEXT,
ADD COLUMN     "sectorId" TEXT NOT NULL,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subcomponents" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Revision" DROP COLUMN "changedAt",
DROP COLUMN "entityId",
DROP COLUMN "field",
DROP COLUMN "newValue",
DROP COLUMN "oldValue",
DROP COLUMN "reason",
ADD COLUMN     "activityId" TEXT,
ADD COLUMN     "changeType" "RevisionChangeType" NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "previousValues" JSONB,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "stageId" TEXT,
ADD COLUMN     "userId" TEXT,
DROP COLUMN "entityType",
ADD COLUMN     "entityType" "RevisionEntityType" NOT NULL;

-- AlterTable
ALTER TABLE "StageTemplate" DROP COLUMN "categoryId",
DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "isMandatory",
DROP COLUMN "methodId",
DROP COLUMN "order",
DROP COLUMN "stageName",
ADD COLUMN     "conditionField" TEXT,
ADD COLUMN     "isConditional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "procurementMethodId" TEXT NOT NULL,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "stageTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "contact",
DROP COLUMN "isActive",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tinNumber" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ActivityStage";

-- DropTable
DROP TABLE "ContractAmendment";

-- DropTable
DROP TABLE "ContractMilestone";

-- DropTable
DROP TABLE "ContractSecurity";

-- CreateTable
CREATE TABLE "ActivityLot" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "description" TEXT,
    "estimatedAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityFunding" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "fundingSource" TEXT NOT NULL,
    "loanGrantNumber" TEXT,
    "allocationPct" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityFunding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityComponent" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "subcomponent" TEXT,
    "allocationPct" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeVote" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "memberId" TEXT NOT NULL,
    "decision" "VoteDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitteeVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "stageTypeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "plannedDays" INTEGER,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "currentTargetStartDate" TIMESTAMP(3),
    "currentTargetEndDate" TIMESTAMP(3),
    "isNotApplicable" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageRevision" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "revisedStartDate" TIMESTAMP(3) NOT NULL,
    "revisedEndDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "revisedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLot_activityId_idx" ON "ActivityLot"("activityId");

-- CreateIndex
CREATE INDEX "ActivityFunding_activityId_idx" ON "ActivityFunding"("activityId");

-- CreateIndex
CREATE INDEX "ActivityComponent_activityId_idx" ON "ActivityComponent"("activityId");

-- CreateIndex
CREATE INDEX "CommitteeVote_planId_idx" ON "CommitteeVote"("planId");

-- CreateIndex
CREATE INDEX "CommitteeVote_memberId_idx" ON "CommitteeVote"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeVote_planId_round_memberId_key" ON "CommitteeVote"("planId", "round", "memberId");

-- CreateIndex
CREATE INDEX "Stage_activityId_idx" ON "Stage"("activityId");

-- CreateIndex
CREATE INDEX "Stage_stageTypeId_idx" ON "Stage"("stageTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_activityId_sequence_key" ON "Stage"("activityId", "sequence");

-- CreateIndex
CREATE INDEX "StageRevision_stageId_idx" ON "StageRevision"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "StageRevision_stageId_revisionNo_key" ON "StageRevision"("stageId", "revisionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_reference_key" ON "Activity"("reference");

-- CreateIndex
CREATE INDEX "Activity_procurementMethodId_idx" ON "Activity"("procurementMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_fundingSourceId_idx" ON "Project"("fundingSourceId");

-- CreateIndex
CREATE INDEX "Project_sectorId_idx" ON "Project"("sectorId");

-- CreateIndex
CREATE INDEX "Revision_projectId_idx" ON "Revision"("projectId");

-- CreateIndex
CREATE INDEX "Revision_planId_idx" ON "Revision"("planId");

-- CreateIndex
CREATE INDEX "Revision_activityId_idx" ON "Revision"("activityId");

-- CreateIndex
CREATE INDEX "Revision_stageId_idx" ON "Revision"("stageId");

-- CreateIndex
CREATE INDEX "StageTemplate_procurementMethodId_idx" ON "StageTemplate"("procurementMethodId");

-- CreateIndex
CREATE INDEX "StageTemplate_stageTypeId_idx" ON "StageTemplate"("stageTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "StageTemplate_procurementMethodId_sequence_key" ON "StageTemplate"("procurementMethodId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tinNumber_key" ON "Supplier"("tinNumber");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_procurementMethodId_fkey" FOREIGN KEY ("procurementMethodId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLot" ADD CONSTRAINT "ActivityLot_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityFunding" ADD CONSTRAINT "ActivityFunding_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityComponent" ADD CONSTRAINT "ActivityComponent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeVote" ADD CONSTRAINT "CommitteeVote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTemplate" ADD CONSTRAINT "StageTemplate_procurementMethodId_fkey" FOREIGN KEY ("procurementMethodId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTemplate" ADD CONSTRAINT "StageTemplate_stageTypeId_fkey" FOREIGN KEY ("stageTypeId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_stageTypeId_fkey" FOREIGN KEY ("stageTypeId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRevision" ADD CONSTRAINT "StageRevision_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRevision" ADD CONSTRAINT "StageRevision_revisedById_fkey" FOREIGN KEY ("revisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
