-- CreateEnum
CREATE TYPE "StockImportType" AS ENUM ('STOCK', 'SALES', 'BOTH');

-- CreateEnum
CREATE TYPE "StockImportStatus" AS ENUM ('PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "StockLocationType" AS ENUM ('LOJA', 'CD');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "filialCode" TEXT;

-- CreateTable
CREATE TABLE "StockImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "weekLabel" TEXT,
    "type" "StockImportType" NOT NULL DEFAULT 'STOCK',
    "status" "StockImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "stockRowCount" INTEGER NOT NULL DEFAULT 0,
    "salesRowCount" INTEGER NOT NULL DEFAULT 0,
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meta" JSONB,
    "errorMessage" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreStockItem" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "industryName" TEXT NOT NULL,
    "supplierName" TEXT,
    "filialCode" TEXT NOT NULL,
    "filialName" TEXT NOT NULL,
    "filialRaw" TEXT NOT NULL,
    "storeId" TEXT,
    "state" TEXT,
    "locationType" "StockLocationType",
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valueRs" DOUBLE PRECISION,
    "idade" DOUBLE PRECISION,
    "dde" DOUBLE PRECISION,
    "status" TEXT,
    "lowTurn" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreStockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "industryName" TEXT NOT NULL,
    "filialCode" TEXT NOT NULL,
    "filialName" TEXT NOT NULL,
    "storeId" TEXT,
    "state" TEXT,
    "bandeira" TEXT,
    "qtyCurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtyPrevious" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valueCurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valuePrevious" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockImport_status_idx" ON "StockImport"("status");

-- CreateIndex
CREATE INDEX "StockImport_createdAt_idx" ON "StockImport"("createdAt");

-- CreateIndex
CREATE INDEX "StoreStockItem_industryName_idx" ON "StoreStockItem"("industryName");

-- CreateIndex
CREATE INDEX "StoreStockItem_filialCode_idx" ON "StoreStockItem"("filialCode");

-- CreateIndex
CREATE INDEX "StoreStockItem_storeId_idx" ON "StoreStockItem"("storeId");

-- CreateIndex
CREATE INDEX "StoreStockItem_productCode_idx" ON "StoreStockItem"("productCode");

-- CreateIndex
CREATE INDEX "StoreStockItem_locationType_idx" ON "StoreStockItem"("locationType");

-- CreateIndex
CREATE INDEX "StoreStockItem_importId_idx" ON "StoreStockItem"("importId");

-- CreateIndex
CREATE INDEX "StoreStockItem_storeId_industryName_idx" ON "StoreStockItem"("storeId", "industryName");

-- CreateIndex
CREATE INDEX "SalesRecord_industryName_idx" ON "SalesRecord"("industryName");

-- CreateIndex
CREATE INDEX "SalesRecord_filialCode_idx" ON "SalesRecord"("filialCode");

-- CreateIndex
CREATE INDEX "SalesRecord_storeId_idx" ON "SalesRecord"("storeId");

-- CreateIndex
CREATE INDEX "SalesRecord_importId_idx" ON "SalesRecord"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_filialCode_key" ON "Store"("filialCode");

-- CreateIndex
CREATE INDEX "Store_filialCode_idx" ON "Store"("filialCode");

-- AddForeignKey
ALTER TABLE "StockImport" ADD CONSTRAINT "StockImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStockItem" ADD CONSTRAINT "StoreStockItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StockImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStockItem" ADD CONSTRAINT "StoreStockItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StockImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
