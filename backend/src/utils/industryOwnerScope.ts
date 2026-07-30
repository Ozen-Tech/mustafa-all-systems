import prisma from '../prisma/client';
import { UserRole } from '../types';

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
