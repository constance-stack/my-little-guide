/*
  Warnings:

  - You are about to drop the column `priceId` on the `OrderLine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderLine" DROP COLUMN "priceId",
ADD COLUMN     "priceKey" TEXT;
