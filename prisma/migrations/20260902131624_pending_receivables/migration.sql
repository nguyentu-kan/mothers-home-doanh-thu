-- CreateEnum
CREATE TYPE "PendingReceivableStatus" AS ENUM ('PENDING', 'COLLECTED');

-- CreateTable
CREATE TABLE "PendingReceivable" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "status" "PendingReceivableStatus" NOT NULL DEFAULT 'PENDING',
    "collectedMethod" "CashMethod",
    "collectedTransferAccount" "TransferAccount",
    "collectedAt" TIMESTAMP(3),
    "collectedByUserId" TEXT,
    "roomRevenueEntryId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingReceivable_roomRevenueEntryId_key" ON "PendingReceivable"("roomRevenueEntryId");

-- CreateIndex
CREATE INDEX "PendingReceivable_status_idx" ON "PendingReceivable"("status");

-- AddForeignKey
ALTER TABLE "PendingReceivable" ADD CONSTRAINT "PendingReceivable_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingReceivable" ADD CONSTRAINT "PendingReceivable_roomRevenueEntryId_fkey" FOREIGN KEY ("roomRevenueEntryId") REFERENCES "RoomRevenueEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingReceivable" ADD CONSTRAINT "PendingReceivable_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
