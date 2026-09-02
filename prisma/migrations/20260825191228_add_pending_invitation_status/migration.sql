/*
  Warnings:

  - The values [NotStarted,InProgress,Completed,Delayed,NotApplicable,Cancelled] on the enum `ActivityStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [Draft,Submitted,Approved,Rejected] on the enum `PlanStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [INVITED] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `categoryId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `currencyId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedAmount` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `fundingSourceId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `methodId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `officerId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `referenceNumber` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `regionId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `reviewNotes` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `reviewStatusId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `reviewTypeId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `completionDate` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `contractNumber` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `currencyId` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `currentAmount` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `originalAmount` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `regionId` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `signingDate` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `requestDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `typeId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `referenceNo` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `changedAt` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the column `field` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the column `newValue` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the column `oldValue` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `isMandatory` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `methodId` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `stageName` on the `StageTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the `ActivityStage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractMilestone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractSecurity` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[reference]` on the table `Activity` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contractNo]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[procurementMethodId,sequence]` on the table `StageTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tinNumber]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `estimatedBudget` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `procurementMethodId` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractNo` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingValue` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalValue` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceNo` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `paymentDate` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `periodEnd` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStart` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Made the column `projectId` on table `Plan` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `fundingSourceId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sectorId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `changeType` to the `Revision` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `entityType` on the `Revision` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `procurementMethodId` to the `StageTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `StageTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stageTypeId` to the `StageTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tinNumber` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'CLOSED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "RevisionChangeType" AS ENUM ('CREATE', 'UPDATE', 'REPLAN', 'APPROVE', 'REJECT', 'SOFT_DELETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "RevisionEntityType" AS ENUM ('PROJECT', 'PLAN', 'ACTIVITY', 'STAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'NOT_APPLICABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "VoteDecision" AS ENUM ('APPROVE', 'REJECT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "ActivityStatus_new" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CONTRACTED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Activity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Activity" ALTER COLUMN "status" TYPE "ActivityStatus_new" USING ("status"::text::"ActivityStatus_new");
ALTER TYPE "ActivityStatus" RENAME TO "ActivityStatus_old";
ALTER TYPE "ActivityStatus_new" RENAME TO "ActivityStatus";
DROP TYPE "public"."ActivityStatus_old";
ALTER TABLE "Activity" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PlanStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'WITH_COMMITTEE', 'APPROVED', 'REJECTED', 'UPDATE_REQUESTED');
ALTER TABLE "public"."Plan" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PlanStatusHistory" ALTER COLUMN "fromStatus" TYPE "PlanStatus_new" USING ("fromStatus"::text::"PlanStatus_new");
ALTER TABLE "PlanStatusHistory" ALTER COLUMN "toStatus" TYPE "PlanStatus_new" USING ("toStatus"::text::"PlanStatus_new");
ALTER TABLE "Plan" ALTER COLUMN "status" TYPE "PlanStatus_new" USING ("status"::text::"PlanStatus_new");
ALTER TYPE "PlanStatus" RENAME TO "PlanStatus_old";
ALTER TYPE "PlanStatus_new" RENAME TO "PlanStatus";
DROP TYPE "public"."PlanStatus_old";
ALTER TABLE "Plan" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('PENDING_INVITATION', 'ACTIVE', 'INACTIVE');
ALTER TABLE "public"."User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_fundingSourceId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_methodId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_officerId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_reviewStatusId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_reviewTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_sectorId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityStage" DROP CONSTRAINT IF EXISTS "ActivityStage_activityId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_activityId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_statusId_fkey";

-- DropForeignKey
ALTER TABLE "ContractMilestone" DROP CONSTRAINT IF EXISTS "ContractMilestone_contractId_fkey";

-- DropForeignKey
ALTER TABLE "ContractMilestone" DROP CONSTRAINT IF EXISTS "ContractMilestone_statusId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT IF EXISTS "ContractSecurity_contractId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT IF EXISTS "ContractSecurity_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT IF EXISTS "ContractSecurity_statusId_fkey";

-- DropForeignKey
ALTER TABLE "ContractSecurity" DROP CONSTRAINT IF EXISTS "ContractSecurity_typeId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_stageId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_statusId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_typeId_fkey";

-- DropForeignKey
ALTER TABLE "Plan" DROP CONSTRAINT IF EXISTS "Plan_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Revision" DROP CONSTRAINT IF EXISTS "Revision_changedById_fkey";

-- DropForeignKey
ALTER TABLE "StageTemplate" DROP CONSTRAINT IF EXISTS "StageTemplate_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "StageTemplate" DROP CONSTRAINT IF EXISTS "StageTemplate_methodId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Activity_categoryId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_currencyId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_dueDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_fundingSourceId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_methodId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_officerId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_referenceNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "Activity_regionId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_reviewStatusId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_reviewTypeId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_reviewedById_idx";

-- DropIndex
DROP INDEX IF EXISTS "Activity_sectorId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Contract_completionDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "Contract_contractNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "Contract_currencyId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Contract_regionId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Contract_statusId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Payment_statusId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Payment_typeId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Plan_budgetYear_idx";

-- DropIndex
DROP INDEX IF EXISTS "Plan_referenceNo_key";

-- DropIndex
DROP INDEX IF EXISTS "Revision_changedAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Revision_entityType_entityId_idx";

-- DropIndex
DROP INDEX IF EXISTS "StageTemplate_categoryId_methodId_idx";

-- DropIndex
DROP INDEX IF EXISTS "StageTemplate_categoryId_methodId_order_key";

-- DropIndex
DROP INDEX IF EXISTS "StageTemplate_isActive_idx";

-- DropIndex
DROP INDEX IF EXISTS "Supplier_isActive_idx";

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
ALTER TABLE "Supplier" DROP COLUMN "address",
DROP COLUMN "contact",
DROP COLUMN "isActive",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tinNumber" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE IF EXISTS "ActivityStage";

-- DropTable
DROP TABLE IF EXISTS "ContractMilestone";

-- DropTable
DROP TABLE IF EXISTS "ContractSecurity";

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
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

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
