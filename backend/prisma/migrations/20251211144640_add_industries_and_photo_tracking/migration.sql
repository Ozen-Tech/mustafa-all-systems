-- AlterTable: Add expectedHours to RouteAssignment
ALTER TABLE "RouteAssignment" ADD COLUMN "expectedHours" DOUBLE PRECISION;

-- AlterTable: Add industry fields to Photo
ALTER TABLE "Photo" ADD COLUMN "industryId" TEXT;
ALTER TABLE "Photo" ADD COLUMN "selectedIndustryId" TEXT;

-- CreateIndex for Photo industry fields
CREATE INDEX "Photo_industryId_idx" ON "Photo"("industryId");
CREATE INDEX "Photo_selectedIndustryId_idx" ON "Photo"("selectedIndustryId");

-- CreateTable: Industry
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Industry
CREATE UNIQUE INDEX "Industry_code_key" ON "Industry"("code");
CREATE INDEX "Industry_code_idx" ON "Industry"("code");
CREATE INDEX "Industry_isActive_idx" ON "Industry"("isActive");

-- CreateTable: Product
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Product
CREATE UNIQUE INDEX "Product_industryId_code_key" ON "Product"("industryId", "code");
CREATE INDEX "Product_industryId_idx" ON "Product"("industryId");

-- CreateTable: IndustryAssignment
CREATE TABLE "IndustryAssignment" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "storeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for IndustryAssignment
CREATE UNIQUE INDEX "IndustryAssignment_promoterId_industryId_storeId_key" ON "IndustryAssignment"("promoterId", "industryId", "storeId");
CREATE INDEX "IndustryAssignment_promoterId_idx" ON "IndustryAssignment"("promoterId");
CREATE INDEX "IndustryAssignment_industryId_idx" ON "IndustryAssignment"("industryId");
CREATE INDEX "IndustryAssignment_storeId_idx" ON "IndustryAssignment"("storeId");
CREATE INDEX "IndustryAssignment_isActive_idx" ON "IndustryAssignment"("isActive");

-- CreateTable: PhotoIndustry
CREATE TABLE "PhotoIndustry" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "qualityAnalysis" JSONB,
    "hasRupture" BOOLEAN NOT NULL DEFAULT false,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for PhotoIndustry
CREATE UNIQUE INDEX "PhotoIndustry_photoId_industryId_key" ON "PhotoIndustry"("photoId", "industryId");
CREATE INDEX "PhotoIndustry_photoId_idx" ON "PhotoIndustry"("photoId");
CREATE INDEX "PhotoIndustry_industryId_idx" ON "PhotoIndustry"("industryId");
CREATE INDEX "PhotoIndustry_promoterId_idx" ON "PhotoIndustry"("promoterId");
CREATE INDEX "PhotoIndustry_storeId_idx" ON "PhotoIndustry"("storeId");
CREATE INDEX "PhotoIndustry_visitId_idx" ON "PhotoIndustry"("visitId");
CREATE INDEX "PhotoIndustry_hasRupture_idx" ON "PhotoIndustry"("hasRupture");
CREATE INDEX "PhotoIndustry_createdAt_idx" ON "PhotoIndustry"("createdAt");

-- CreateTable: PhotoQualityAnalysis
CREATE TABLE "PhotoQualityAnalysis" (
    "id" TEXT NOT NULL,
    "photoIndustryId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "technicalScore" DOUBLE PRECISION,
    "contentScore" DOUBLE PRECISION,
    "complianceScore" DOUBLE PRECISION,
    "ruptureDetected" BOOLEAN NOT NULL DEFAULT false,
    "analysisDetails" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoQualityAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for PhotoQualityAnalysis
CREATE UNIQUE INDEX "PhotoQualityAnalysis_photoIndustryId_key" ON "PhotoQualityAnalysis"("photoIndustryId");
CREATE INDEX "PhotoQualityAnalysis_overallScore_idx" ON "PhotoQualityAnalysis"("overallScore");
CREATE INDEX "PhotoQualityAnalysis_ruptureDetected_idx" ON "PhotoQualityAnalysis"("ruptureDetected");
CREATE INDEX "PhotoQualityAnalysis_analyzedAt_idx" ON "PhotoQualityAnalysis"("analyzedAt");

-- CreateTable: InformationDistribution
CREATE TABLE "InformationDistribution" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "industryId" TEXT,
    "storeId" TEXT,
    "promoterId" TEXT,
    "type" TEXT NOT NULL,
    "sourceData" JSONB,
    "geminiSummary" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformationDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for InformationDistribution
CREATE INDEX "InformationDistribution_industryId_idx" ON "InformationDistribution"("industryId");
CREATE INDEX "InformationDistribution_storeId_idx" ON "InformationDistribution"("storeId");
CREATE INDEX "InformationDistribution_promoterId_idx" ON "InformationDistribution"("promoterId");
CREATE INDEX "InformationDistribution_type_idx" ON "InformationDistribution"("type");
CREATE INDEX "InformationDistribution_isActive_idx" ON "InformationDistribution"("isActive");

-- CreateTable: WhatsAppReport
CREATE TABLE "WhatsAppReport" (
    "id" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "promoterId" TEXT,
    "industryId" TEXT,
    "dateRange" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for WhatsAppReport
CREATE INDEX "WhatsAppReport_promoterId_idx" ON "WhatsAppReport"("promoterId");
CREATE INDEX "WhatsAppReport_industryId_idx" ON "WhatsAppReport"("industryId");
CREATE INDEX "WhatsAppReport_status_idx" ON "WhatsAppReport"("status");
CREATE INDEX "WhatsAppReport_createdAt_idx" ON "WhatsAppReport"("createdAt");

-- AddForeignKey: Product -> Industry
ALTER TABLE "Product" ADD CONSTRAINT "Product_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IndustryAssignment -> User
ALTER TABLE "IndustryAssignment" ADD CONSTRAINT "IndustryAssignment_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IndustryAssignment -> Industry
ALTER TABLE "IndustryAssignment" ADD CONSTRAINT "IndustryAssignment_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IndustryAssignment -> Store
ALTER TABLE "IndustryAssignment" ADD CONSTRAINT "IndustryAssignment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PhotoIndustry -> Photo
ALTER TABLE "PhotoIndustry" ADD CONSTRAINT "PhotoIndustry_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PhotoIndustry -> Industry
ALTER TABLE "PhotoIndustry" ADD CONSTRAINT "PhotoIndustry_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PhotoIndustry -> User
ALTER TABLE "PhotoIndustry" ADD CONSTRAINT "PhotoIndustry_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PhotoIndustry -> Store
ALTER TABLE "PhotoIndustry" ADD CONSTRAINT "PhotoIndustry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PhotoIndustry -> Visit
ALTER TABLE "PhotoIndustry" ADD CONSTRAINT "PhotoIndustry_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PhotoQualityAnalysis -> PhotoIndustry
ALTER TABLE "PhotoQualityAnalysis" ADD CONSTRAINT "PhotoQualityAnalysis_photoIndustryId_fkey" FOREIGN KEY ("photoIndustryId") REFERENCES "PhotoIndustry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InformationDistribution -> Industry
ALTER TABLE "InformationDistribution" ADD CONSTRAINT "InformationDistribution_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InformationDistribution -> Store
ALTER TABLE "InformationDistribution" ADD CONSTRAINT "InformationDistribution_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InformationDistribution -> User
ALTER TABLE "InformationDistribution" ADD CONSTRAINT "InformationDistribution_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: WhatsAppReport -> User
ALTER TABLE "WhatsAppReport" ADD CONSTRAINT "WhatsAppReport_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: WhatsAppReport -> Industry
ALTER TABLE "WhatsAppReport" ADD CONSTRAINT "WhatsAppReport_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

