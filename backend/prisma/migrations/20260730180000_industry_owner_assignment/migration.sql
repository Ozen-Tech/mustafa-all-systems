-- CreateTable
CREATE TABLE "IndustryOwnerAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryOwnerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndustryOwnerAssignment_userId_key" ON "IndustryOwnerAssignment"("userId");

-- CreateIndex
CREATE INDEX "IndustryOwnerAssignment_industryId_idx" ON "IndustryOwnerAssignment"("industryId");

-- AddForeignKey
ALTER TABLE "IndustryOwnerAssignment" ADD CONSTRAINT "IndustryOwnerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndustryOwnerAssignment" ADD CONSTRAINT "IndustryOwnerAssignment_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
