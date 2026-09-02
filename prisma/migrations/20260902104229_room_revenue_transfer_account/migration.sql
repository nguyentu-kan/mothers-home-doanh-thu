-- CreateEnum
CREATE TYPE "TransferAccount" AS ENUM ('TIEN', 'VAN');

-- AlterTable
ALTER TABLE "RoomRevenueEntry" ADD COLUMN     "transferAccount" "TransferAccount";
