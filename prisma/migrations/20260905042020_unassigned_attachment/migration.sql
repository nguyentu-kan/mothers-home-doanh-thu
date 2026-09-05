-- CreateTable
CREATE TABLE "UnassignedAttachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnassignedAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnassignedAttachment_time_idx" ON "UnassignedAttachment"("time");

-- AddForeignKey
ALTER TABLE "UnassignedAttachment" ADD CONSTRAINT "UnassignedAttachment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
