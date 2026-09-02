-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NHAN_VIEN', 'QUAN_LY', 'CHU_SO_HUU');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CA_PHE', 'SPA');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('GHI_PHONG', 'TIEN_MAT', 'CHUYEN_KHOAN');

-- CreateEnum
CREATE TYPE "CashMethod" AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('SANG', 'CHIEU', 'DEM');

-- CreateEnum
CREATE TYPE "OtaPlatform" AS ENUM ('AGODA', 'CTRIP', 'BOOKING', 'KHAC');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MAT_BANG', 'LUONG', 'MUA_HANG', 'KHAC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'NHAN_VIEN',
    "canManageCashbook" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ServiceCategory" NOT NULL,
    "roomOrGuest" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "menuItemId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomRevenueEntry" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "method" "CashMethod" NOT NULL,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomRevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtaReceivable" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platform" "OtaPlatform" NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtaReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "CashMethod" NOT NULL,
    "note" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftType" "ShiftType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "handoverUserId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "cashStart" INTEGER NOT NULL,
    "roomRevenue" INTEGER NOT NULL DEFAULT 0,
    "cafeRevenue" INTEGER NOT NULL DEFAULT 0,
    "spaRevenue" INTEGER NOT NULL DEFAULT 0,
    "otherExpense" INTEGER NOT NULL DEFAULT 0,
    "cashEndCalculated" INTEGER NOT NULL DEFAULT 0,
    "cashEndCounted" INTEGER,
    "pendingNotes" TEXT,
    "handoverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "handoverConfirmedAt" TIMESTAMP(3),
    "receiverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "receiverConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "ServiceRecord_time_idx" ON "ServiceRecord"("time");

-- CreateIndex
CREATE INDEX "ServiceRecord_recordedByUserId_idx" ON "ServiceRecord"("recordedByUserId");

-- CreateIndex
CREATE INDEX "RoomRevenueEntry_time_idx" ON "RoomRevenueEntry"("time");

-- CreateIndex
CREATE INDEX "OtaReceivable_date_idx" ON "OtaReceivable"("date");

-- CreateIndex
CREATE INDEX "Expense_time_idx" ON "Expense"("time");

-- CreateIndex
CREATE INDEX "ShiftHandover_date_idx" ON "ShiftHandover"("date");

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomRevenueEntry" ADD CONSTRAINT "RoomRevenueEntry_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtaReceivable" ADD CONSTRAINT "OtaReceivable_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_handoverUserId_fkey" FOREIGN KEY ("handoverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
