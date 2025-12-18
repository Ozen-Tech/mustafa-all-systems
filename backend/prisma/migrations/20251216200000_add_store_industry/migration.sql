-- CreateTable
CREATE TABLE "StoreIndustry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreIndustry_storeId_idx" ON "StoreIndustry"("storeId");

-- CreateIndex
CREATE INDEX "StoreIndustry_industryId_idx" ON "StoreIndustry"("industryId");

-- CreateIndex
CREATE INDEX "StoreIndustry_isActive_idx" ON "StoreIndustry"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StoreIndustry_storeId_industryId_key" ON "StoreIndustry"("storeId", "industryId");

-- AddForeignKey
ALTER TABLE "StoreIndustry" ADD CONSTRAINT "StoreIndustry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIndustry" ADD CONSTRAINT "StoreIndustry_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;


