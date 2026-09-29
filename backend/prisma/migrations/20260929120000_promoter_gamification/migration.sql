-- CreateTable
CREATE TABLE "PromoterXpEvent" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoterXpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoterChest" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoterChest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoterAchievement" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "PromoterAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoterXpEvent_promoterId_createdAt_idx" ON "PromoterXpEvent"("promoterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoterXpEvent_promoterId_source_refKey_key" ON "PromoterXpEvent"("promoterId", "source", "refKey");

-- CreateIndex
CREATE INDEX "PromoterChest_promoterId_openedAt_idx" ON "PromoterChest"("promoterId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoterChest_promoterId_kind_refKey_key" ON "PromoterChest"("promoterId", "kind", "refKey");

-- CreateIndex
CREATE INDEX "PromoterAchievement_promoterId_idx" ON "PromoterAchievement"("promoterId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoterAchievement_promoterId_code_key" ON "PromoterAchievement"("promoterId", "code");

-- AddForeignKey
ALTER TABLE "PromoterXpEvent" ADD CONSTRAINT "PromoterXpEvent_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterChest" ADD CONSTRAINT "PromoterChest_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoterAchievement" ADD CONSTRAINT "PromoterAchievement_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

