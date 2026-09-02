/*
  Warnings:

  - You are about to drop the column `attachmentUrl` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentUrl` on the `OtaReceivable` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentUrl` on the `RoomRevenueEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "attachmentUrl",
ADD COLUMN     "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "OtaReceivable" DROP COLUMN "attachmentUrl",
ADD COLUMN     "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "RoomRevenueEntry" DROP COLUMN "attachmentUrl",
ADD COLUMN     "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
