-- CreateEnum
CREATE TYPE "DayAbsenceReason" AS ENUM ('MEDICAL_CERTIFICATE', 'PERSONAL', 'OTHER');

-- CreateTable
CREATE TABLE "PromoterDayAbsence" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" "DayAbsenceReason" NOT NULL,
    "note" TEXT,
    "documentUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoterDayAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoterDayAbsence_promoterId_idx" ON "PromoterDayAbsence"("promoterId");

-- CreateIndex
CREATE INDEX "PromoterDayAbsence_date_idx" ON "PromoterDayAbsence"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PromoterDayAbsence_promoterId_date_key" ON "PromoterDayAbsence"("promoterId", "date");

-- AddForeignKey
ALTER TABLE "PromoterDayAbsence" ADD CONSTRAINT "PromoterDayAbsence_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
