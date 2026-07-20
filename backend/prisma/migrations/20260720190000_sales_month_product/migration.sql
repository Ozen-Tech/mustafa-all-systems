-- Vendas: granularidade por mês + produto (evita somar YTD / todos os meses).
ALTER TABLE "SalesRecord" ADD COLUMN IF NOT EXISTS "month" TEXT;
ALTER TABLE "SalesRecord" ADD COLUMN IF NOT EXISTS "productCode" TEXT;
ALTER TABLE "SalesRecord" ADD COLUMN IF NOT EXISTS "productName" TEXT;
ALTER TABLE "SalesRecord" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "SalesRecord" ADD COLUMN IF NOT EXISTS "qtyTrend" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SalesRecord" ADD COLUMN IF NOT EXISTS "valueTrend" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "SalesRecord_month_idx" ON "SalesRecord"("month");
CREATE INDEX IF NOT EXISTS "SalesRecord_state_idx" ON "SalesRecord"("state");
CREATE INDEX IF NOT EXISTS "SalesRecord_productCode_idx" ON "SalesRecord"("productCode");
CREATE INDEX IF NOT EXISTS "SalesRecord_industryName_month_idx" ON "SalesRecord"("industryName", "month");

-- Dados antigos misturam todos os meses numa linha — zerar para forçar reimportação correta.
DELETE FROM "SalesRecord";
