-- CreateEnum
CREATE TYPE "TaskAlertType" AS ENUM ('RUPTURA_COM_CD', 'CD_ZERADO', 'PARADO_30D', 'NEGATIVO', 'EXCESSO_DDE90', 'COBERTURA_BAIXA');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TaskAction" AS ENUM ('NA_GONDOLA', 'RUPTURA', 'DEPOSITO', 'PRECO_OK', 'PRECO_DIVERGENTE');

-- CreateEnum
CREATE TYPE "RuptureReason" AS ENUM ('TEM_CD', 'CD_ZERADO', 'SEM_PEDIDO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "ActionTaken" AS ENUM ('PEDIDO', 'PONTO_EXTRA', 'CARTAZ', 'TROCA_PRECO');

-- CreateEnum
CREATE TYPE "GpsStatus" AS ENUM ('OK', 'TIMEOUT', 'DENIED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "industryId" TEXT,
    "industryName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "alertType" "TaskAlertType" NOT NULL,
    "stockLoja" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockCD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSale" TIMESTAMP(3),
    "dde" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "action" "TaskAction" NOT NULL,
    "priceFound" DOUBLE PRECISION,
    "ruptureReason" "RuptureReason",
    "actionTaken" "ActionTaken",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "industryId" TEXT,
    "storeId" TEXT,
    "weekStart" TEXT NOT NULL,
    "weekEnd" TEXT NOT NULL,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionCompletion" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "storeId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInReview" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "gpsStatus" "GpsStatus" NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "approved" BOOLEAN,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_date_idx" ON "Task"("date");

-- CreateIndex
CREATE INDEX "Task_storeId_idx" ON "Task"("storeId");

-- CreateIndex
CREATE INDEX "Task_industryId_idx" ON "Task"("industryId");

-- CreateIndex
CREATE INDEX "Task_alertType_idx" ON "Task"("alertType");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Task_date_storeId_sku_key" ON "Task"("date", "storeId", "sku");

-- CreateIndex
CREATE INDEX "TaskCompletion_visitId_idx" ON "TaskCompletion"("visitId");

-- CreateIndex
CREATE INDEX "TaskCompletion_promoterId_idx" ON "TaskCompletion"("promoterId");

-- CreateIndex
CREATE INDEX "TaskCompletion_createdAt_idx" ON "TaskCompletion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCompletion_taskId_visitId_key" ON "TaskCompletion"("taskId", "visitId");

-- CreateIndex
CREATE INDEX "Mission_weekStart_idx" ON "Mission"("weekStart");

-- CreateIndex
CREATE INDEX "Mission_industryId_idx" ON "Mission"("industryId");

-- CreateIndex
CREATE INDEX "Mission_storeId_idx" ON "Mission"("storeId");

-- CreateIndex
CREATE INDEX "MissionCompletion_promoterId_idx" ON "MissionCompletion"("promoterId");

-- CreateIndex
CREATE INDEX "MissionCompletion_missionId_idx" ON "MissionCompletion"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionCompletion_missionId_promoterId_storeId_key" ON "MissionCompletion"("missionId", "promoterId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInReview_visitId_key" ON "CheckInReview"("visitId");

-- CreateIndex
CREATE INDEX "CheckInReview_gpsStatus_idx" ON "CheckInReview"("gpsStatus");

-- CreateIndex
CREATE INDEX "CheckInReview_reviewedAt_idx" ON "CheckInReview"("reviewedAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInReview" ADD CONSTRAINT "CheckInReview_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInReview" ADD CONSTRAINT "CheckInReview_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
