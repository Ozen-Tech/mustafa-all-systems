import prisma from '../prisma/client';

let ensureTablePromise: Promise<void> | null = null;

/**
 * Garante a tabela PromoterDayAbsence em produção quando o migrate do CI
 * não chegou a criar (evita 500 contínuos em /day-absences/today).
 */
export async function ensurePromoterDayAbsenceTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "DayAbsenceReason" AS ENUM ('MEDICAL_CERTIFICATE', 'PERSONAL', 'OTHER');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PromoterDayAbsence" (
          "id" TEXT NOT NULL,
          "promoterId" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "reason" "DayAbsenceReason" NOT NULL,
          "note" TEXT,
          "documentUrl" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "PromoterDayAbsence_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PromoterDayAbsence_promoterId_idx"
        ON "PromoterDayAbsence"("promoterId")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PromoterDayAbsence_date_idx"
        ON "PromoterDayAbsence"("date")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "PromoterDayAbsence_promoterId_date_key"
        ON "PromoterDayAbsence"("promoterId", "date")
      `);
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "PromoterDayAbsence"
            ADD CONSTRAINT "PromoterDayAbsence_promoterId_fkey"
            FOREIGN KEY ("promoterId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
      await prisma
        .$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        SELECT
          gen_random_uuid()::text,
          'manual-ensure-promoter-day-absence',
          NOW(),
          '20260731180000_promoter_day_absence',
          NULL,
          NULL,
          NOW(),
          1
        WHERE EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations"
          WHERE "migration_name" = '20260731180000_promoter_day_absence'
        )
      `)
        .catch(() => undefined);
    })().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  await ensureTablePromise;
}
