-- CreateTable
CREATE TABLE "ContractAmendment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amendmentNo" INTEGER NOT NULL,
    "previousValue" DECIMAL(15,2) NOT NULL,
    "newValue" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "amendedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanStatusHistory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fromStatus" "PlanStatus",
    "toStatus" "PlanStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractAmendment_contractId_idx" ON "ContractAmendment"("contractId");

-- CreateIndex
CREATE INDEX "ContractAmendment_amendedById_idx" ON "ContractAmendment"("amendedById");

-- CreateIndex
CREATE UNIQUE INDEX "ContractAmendment_contractId_amendmentNo_key" ON "ContractAmendment"("contractId", "amendmentNo");

-- CreateIndex
CREATE INDEX "PlanStatusHistory_planId_idx" ON "PlanStatusHistory"("planId");

-- CreateIndex
CREATE INDEX "PlanStatusHistory_changedById_idx" ON "PlanStatusHistory"("changedById");

-- CreateIndex
CREATE INDEX "PlanStatusHistory_createdAt_idx" ON "PlanStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Contract_activityId_idx" ON "Contract"("activityId");

-- CreateIndex
CREATE INDEX "Contract_supplierId_idx" ON "Contract"("supplierId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Payment_contractId_idx" ON "Payment"("contractId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_amendedById_fkey" FOREIGN KEY ("amendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStatusHistory" ADD CONSTRAINT "PlanStatusHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStatusHistory" ADD CONSTRAINT "PlanStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
