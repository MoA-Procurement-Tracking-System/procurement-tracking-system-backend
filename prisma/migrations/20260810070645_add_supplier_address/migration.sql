/*
  Warnings:

  - Made the column `supplierId` on table `Contract` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_supplierId_fkey";

-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "supplierId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "address" TEXT;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
