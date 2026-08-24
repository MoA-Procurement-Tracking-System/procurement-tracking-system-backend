-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'INTERIM_1', 'INTERIM_2', 'FINAL', 'RETENTION_WITHHOLDING', 'RETENTION_PAYMENT', 'OTHER');

-- AlterTable — Contract: add VAT fields, lifecycle dates, subcomponent, remarks (all nullable)
ALTER TABLE "Contract" ADD COLUMN     "actualCompletionDate" TIMESTAMP(3),
ADD COLUMN     "awardDate" TIMESTAMP(3),
ADD COLUMN     "contractAmountWithVat" DECIMAL(15,2),
ADD COLUMN     "contractNetOfVat" DECIMAL(15,2),
ADD COLUMN     "plannedEndDate" TIMESTAMP(3),
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "signatureDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "subcomponent" TEXT,
ADD COLUMN     "vatRate" DOUBLE PRECISION;

-- AlterTable — Payment: add paymentType (nullable, enforced at API layer) and remarks
ALTER TABLE "Payment" ADD COLUMN     "paymentType" "PaymentType",
ADD COLUMN     "remarks" TEXT;

-- CreateIndex
CREATE INDEX "Contract_awardDate_idx" ON "Contract"("awardDate");

-- CreateIndex
CREATE INDEX "Contract_signatureDate_idx" ON "Contract"("signatureDate");

-- CreateIndex
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");
