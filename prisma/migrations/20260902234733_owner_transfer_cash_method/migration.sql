-- AlterTable
ALTER TABLE "OwnerTransfer" ADD COLUMN     "method" "CashMethod" NOT NULL DEFAULT 'CHUYEN_KHOAN';

-- AlterTable
ALTER TABLE "ShiftHandover" ADD COLUMN     "ownerCashOut" INTEGER NOT NULL DEFAULT 0;
