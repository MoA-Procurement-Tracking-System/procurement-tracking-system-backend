-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_supplierId_fkey";

-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "supplierId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
