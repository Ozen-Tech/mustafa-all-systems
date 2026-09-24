-- CreateEnum
CREATE TYPE "OrderImportStatus" AS ENUM ('PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('ORDER_VALUE', 'ORDER_QTY');

-- CreateEnum
CREATE TYPE "FeedEntryType" AS ENUM ('IMPORT', 'GOAL', 'PENDING', 'NOTE');

-- CreateEnum
CREATE TYPE "FeedEntryStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "RetailChain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderLayout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailChain_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "chainId" TEXT;

-- CreateTable
CREATE TABLE "OrderImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "periodLabel" TEXT,
    "status" "OrderImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "errorMessage" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "importId" TEXT,
    "chainId" TEXT NOT NULL,
    "industryId" TEXT,
    "industryName" TEXT NOT NULL,
    "storeId" TEXT,
    "filialCode" TEXT NOT NULL,
    "filialName" TEXT NOT NULL,
    "orderNumber" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "state" TEXT,
    "totalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitValue" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "industryId" TEXT,
    "chainId" TEXT,
    "storeId" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedEntry" (
    "id" TEXT NOT NULL,
    "type" "FeedEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "industryId" TEXT,
    "chainId" TEXT,
    "storeId" TEXT,
    "authorId" TEXT NOT NULL,
    "status" "FeedEntryStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetailChain_code_key" ON "RetailChain"("code");
CREATE INDEX "RetailChain_isActive_idx" ON "RetailChain"("isActive");
CREATE INDEX "Store_chainId_idx" ON "Store"("chainId");

CREATE INDEX "OrderImport_status_idx" ON "OrderImport"("status");
CREATE INDEX "OrderImport_chainId_idx" ON "OrderImport"("chainId");
CREATE INDEX "OrderImport_createdAt_idx" ON "OrderImport"("createdAt");

CREATE UNIQUE INDEX "PurchaseOrder_sourceHash_key" ON "PurchaseOrder"("sourceHash");
CREATE INDEX "PurchaseOrder_chainId_idx" ON "PurchaseOrder"("chainId");
CREATE INDEX "PurchaseOrder_industryId_idx" ON "PurchaseOrder"("industryId");
CREATE INDEX "PurchaseOrder_storeId_idx" ON "PurchaseOrder"("storeId");
CREATE INDEX "PurchaseOrder_orderDate_idx" ON "PurchaseOrder"("orderDate");
CREATE INDEX "PurchaseOrder_filialCode_idx" ON "PurchaseOrder"("filialCode");
CREATE INDEX "PurchaseOrder_importId_idx" ON "PurchaseOrder"("importId");
CREATE INDEX "PurchaseOrder_industryName_idx" ON "PurchaseOrder"("industryName");

CREATE INDEX "PurchaseOrderItem_orderId_idx" ON "PurchaseOrderItem"("orderId");
CREATE INDEX "PurchaseOrderItem_productCode_idx" ON "PurchaseOrderItem"("productCode");

CREATE UNIQUE INDEX "Goal_period_metric_industryId_chainId_storeId_key" ON "Goal"("period", "metric", "industryId", "chainId", "storeId");
CREATE INDEX "Goal_period_idx" ON "Goal"("period");
CREATE INDEX "Goal_industryId_idx" ON "Goal"("industryId");
CREATE INDEX "Goal_chainId_idx" ON "Goal"("chainId");
CREATE INDEX "Goal_storeId_idx" ON "Goal"("storeId");

CREATE INDEX "FeedEntry_type_idx" ON "FeedEntry"("type");
CREATE INDEX "FeedEntry_status_idx" ON "FeedEntry"("status");
CREATE INDEX "FeedEntry_createdAt_idx" ON "FeedEntry"("createdAt");
CREATE INDEX "FeedEntry_authorId_idx" ON "FeedEntry"("authorId");
CREATE INDEX "FeedEntry_assigneeId_idx" ON "FeedEntry"("assigneeId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "RetailChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderImport" ADD CONSTRAINT "OrderImport_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "RetailChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderImport" ADD CONSTRAINT "OrderImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_importId_fkey" FOREIGN KEY ("importId") REFERENCES "OrderImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "RetailChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "RetailChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedEntry" ADD CONSTRAINT "FeedEntry_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeedEntry" ADD CONSTRAINT "FeedEntry_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "RetailChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeedEntry" ADD CONSTRAINT "FeedEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeedEntry" ADD CONSTRAINT "FeedEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedEntry" ADD CONSTRAINT "FeedEntry_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
