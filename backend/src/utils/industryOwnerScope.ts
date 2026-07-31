import prisma from '../prisma/client';
import { UserRole } from '../types';

let ensureTablePromise: Promise<void> | null = null;

/**
 * Garante a tabela IndustryOwnerAssignment em produção quando o migrate do CI
 * não chegou a criar (evita 500 contínuos no admin).
 */
export async function ensureIndustryOwnerAssignmentTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "IndustryOwnerAssignment" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "industryId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "IndustryOwnerAssignment_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IndustryOwnerAssignment_userId_key"
        ON "IndustryOwnerAssignment"("userId")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "IndustryOwnerAssignment_industryId_idx"
        ON "IndustryOwnerAssignment"("industryId")
      `);
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "IndustryOwnerAssignment"
            ADD CONSTRAINT "IndustryOwnerAssignment_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "IndustryOwnerAssignment"
            ADD CONSTRAINT "IndustryOwnerAssignment_industryId_fkey"
            FOREIGN KEY ("industryId") REFERENCES "Industry"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
      // Marca a migration como aplicada se a tabela de histórico existir
      await prisma
        .$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        SELECT
          gen_random_uuid()::text,
          'manual-ensure-industry-owner-assignment',
          NOW(),
          '20260730180000_industry_owner_assignment',
          NULL,
          NULL,
          NOW(),
          1
        WHERE EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations"
          WHERE "migration_name" = '20260730180000_industry_owner_assignment'
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

export async function getOwnedIndustryId(userId: string): Promise<string | null> {
  const row = await prisma.industryOwnerAssignment.findUnique({
    where: { userId },
    select: { industryId: true },
  });
  return row?.industryId ?? null;
}

export async function getOwnedIndustry(userId: string) {
  const row = await prisma.industryOwnerAssignment.findUnique({
    where: { userId },
    include: {
      industry: {
        select: {
          id: true,
          name: true,
          code: true,
          abbreviation: true,
          isActive: true,
        },
      },
    },
  });
  return row;
}

/**
 * Owner só acessa a indústria vinculada.
 * ADMIN bypass (uso interno / suporte).
 */
export async function assertOwnsIndustry(
  userId: string,
  userRole: UserRole | undefined,
  industryId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (userRole === UserRole.ADMIN) {
    const exists = await prisma.industry.findUnique({
      where: { id: industryId },
      select: { id: true },
    });
    if (!exists) {
      return { ok: false, status: 404, message: 'Indústria não encontrada' };
    }
    return { ok: true };
  }

  if (userRole !== UserRole.INDUSTRY_OWNER) {
    return { ok: false, status: 403, message: 'Industry owner access required' };
  }

  const owned = await getOwnedIndustryId(userId);
  if (!owned) {
    return { ok: false, status: 403, message: 'Nenhuma indústria vinculada a esta conta' };
  }
  if (owned !== industryId) {
    return { ok: false, status: 403, message: 'Acesso negado a esta indústria' };
  }
  return { ok: true };
}
