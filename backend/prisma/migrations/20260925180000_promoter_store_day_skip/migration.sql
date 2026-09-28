-- CreateEnum
CREATE TYPE "StoreDaySkipReason" AS ENUM ('STORE_CLOSED', 'NO_TIME', 'REDIRECTED', 'OTHER');

-- CreateTable
CREATE TABLE "PromoterStoreDaySkip" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" "StoreDaySkipReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoterStoreDaySkip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoterStoreDaySkip_promoterId_date_idx" ON "PromoterStoreDaySkip"("promoterId", "date");

-- CreateIndex
CREATE INDEX "PromoterStoreDaySkip_storeId_idx" ON "PromoterStoreDaySkip"("storeId");

-- CreateIndex
CREATE INDEX "PromoterStoreDaySkip_date_idx" ON "PromoterStoreDaySkip"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PromoterStoreDaySkip_promoterId_storeId_date_key" ON "PromoterStoreDaySkip"("promoterId", "storeId", "date");

-- AddForeignKey
ALTER TABLE "PromoterStoreDaySkip" ADD CONSTRAINT "PromoterStoreDaySkip_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterStoreDaySkip" ADD CONSTRAINT "PromoterStoreDaySkip_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
