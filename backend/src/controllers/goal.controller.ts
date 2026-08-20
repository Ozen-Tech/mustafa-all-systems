import { Response } from 'express';
import { z } from 'zod';
import { GoalMetric, Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

const periodRegex = /^\d{4}-\d{2}$/;

const upsertSchema = z.object({
  period: z.string().regex(periodRegex),
  metric: z.nativeEnum(GoalMetric),
  industryId: z.string().uuid().nullable().optional(),
  chainId: z.string().uuid().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  targetValue: z.number().positive(),
  note: z.string().max(2000).nullable().optional(),
});

function monthRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
}

function daysInPeriod(period: string): { elapsed: number; total: number; remaining: number } {
  const [y, m] = period.split('-').map(Number);
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const now = new Date();
  const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  if (period < currentPeriod) return { elapsed: total, total, remaining: 0 };
  if (period > currentPeriod) return { elapsed: 0, total, remaining: total };
  const elapsed = Math.min(now.getUTCDate(), total);
  return { elapsed, total, remaining: Math.max(total - elapsed, 0) };
}

export async function listGoals(req: AuthRequest, res: Response) {
  try {
    const period = (req.query.period as string | undefined)?.trim();
    const industryId = (req.query.industryId as string | undefined)?.trim();
    const chainId = (req.query.chainId as string | undefined)?.trim();
    const where: Prisma.GoalWhereInput = {};
    if (period) where.period = period;
    if (industryId) where.industryId = industryId;
    if (chainId) where.chainId = chainId;

    const goals = await prisma.goal.findMany({
      where,
      include: {
        industry: { select: { id: true, name: true, code: true } },
        chain: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    res.json({ goals });
  } catch (error) {
    console.error('listGoals error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function upsertGoal(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Apenas admin pode definir metas' });
    }
    const data = upsertSchema.parse(req.body);
    const industryId = data.industryId ?? null;
    const chainId = data.chainId ?? null;
    const storeId = data.storeId ?? null;

    // Prisma unique com nulls: busca manual + upsert por id se existir
    const existing = await prisma.goal.findFirst({
      where: {
        period: data.period,
        metric: data.metric,
        industryId,
        chainId,
        storeId,
      },
    });

    let goal;
    if (existing) {
      goal = await prisma.goal.update({
        where: { id: existing.id },
        data: {
          targetValue: data.targetValue,
          note: data.note ?? null,
        },
        include: {
          industry: { select: { id: true, name: true, code: true } },
          chain: { select: { id: true, name: true, code: true } },
          store: { select: { id: true, name: true } },
        },
      });
    } else {
      goal = await prisma.goal.create({
        data: {
          period: data.period,
          metric: data.metric,
          industryId,
          chainId,
          storeId,
          targetValue: data.targetValue,
          note: data.note ?? null,
          createdById: req.userId,
        },
        include: {
          industry: { select: { id: true, name: true, code: true } },
          chain: { select: { id: true, name: true, code: true } },
          store: { select: { id: true, name: true } },
        },
      });
    }

    await prisma.feedEntry.create({
      data: {
        type: 'GOAL',
        title: `Meta ${data.period} — ${data.metric === 'ORDER_VALUE' ? 'valor' : 'volume'}`,
        body: `Alvo: ${data.targetValue}${goal.industry ? ` · ${goal.industry.name}` : ''}${
          goal.chain ? ` · ${goal.chain.name}` : ''
        }`,
        industryId,
        chainId,
        storeId,
        authorId: req.userId,
        status: 'DONE',
        resolvedAt: new Date(),
      },
    });

    res.status(existing ? 200 : 201).json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('upsertGoal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteGoal(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Apenas admin pode remover metas' });
    }
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Meta não encontrada' });
    }
    console.error('deleteGoal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function realizedForGoal(goal: {
  period: string;
  metric: GoalMetric;
  industryId: string | null;
  chainId: string | null;
  storeId: string | null;
}): Promise<number> {
  const { start, end } = monthRange(goal.period);
  const where: Prisma.PurchaseOrderWhereInput = {
    orderDate: { gte: start, lt: end },
  };
  if (goal.industryId) where.industryId = goal.industryId;
  if (goal.chainId) where.chainId = goal.chainId;
  if (goal.storeId) where.storeId = goal.storeId;

  const agg = await prisma.purchaseOrder.aggregate({
    where,
    _sum: {
      totalValue: true,
      totalQty: true,
    },
  });
  if (goal.metric === 'ORDER_QTY') return agg._sum.totalQty || 0;
  return agg._sum.totalValue || 0;
}

export async function getGoalsProgress(req: AuthRequest, res: Response) {
  try {
    const now = new Date();
    const period =
      (req.query.period as string | undefined)?.trim() ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    if (!periodRegex.test(period)) {
      return res.status(400).json({ message: 'period inválido (YYYY-MM)' });
    }

    const goals = await prisma.goal.findMany({
      where: { period },
      include: {
        industry: { select: { id: true, name: true, code: true } },
        chain: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const timing = daysInPeriod(period);
    const rows = [];
    for (const g of goals) {
      const realized = await realizedForGoal(g);
      const pct = g.targetValue > 0 ? (realized / g.targetValue) * 100 : 0;
      const paceExpected =
        timing.total > 0 ? g.targetValue * (timing.elapsed / timing.total) : g.targetValue;
      const projection =
        timing.elapsed > 0 ? (realized / timing.elapsed) * timing.total : realized;

      rows.push({
        goal: g,
        realized,
        pct,
        paceExpected,
        projection,
        onTrack: projection >= g.targetValue * 0.95,
        days: timing,
      });
    }

    res.json({ period, days: timing, rows });
  } catch (error) {
    console.error('getGoalsProgress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/** Metas das indústrias/lojas da rota do promotor (somente leitura). */
export async function getPromoterGoals(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores' });
    }

    const now = new Date();
    const period =
      (req.query.period as string | undefined)?.trim() ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const [routeStores, assignments] = await Promise.all([
      prisma.routeAssignment.findMany({
        where: { promoterId: req.userId, isActive: true },
        select: { storeId: true, store: { select: { chainId: true } } },
      }),
      prisma.industryAssignment.findMany({
        where: { promoterId: req.userId, isActive: true },
        select: { industryId: true },
      }),
    ]);

    const storeIds = routeStores.map((r) => r.storeId);
    const chainIds = Array.from(
      new Set(routeStores.map((r) => r.store.chainId).filter(Boolean) as string[])
    );
    const industryIds = Array.from(new Set(assignments.map((a) => a.industryId)));

    const goals = await prisma.goal.findMany({
      where: {
        period,
        OR: [
          ...(industryIds.length ? [{ industryId: { in: industryIds } }] : []),
          ...(chainIds.length ? [{ chainId: { in: chainIds } }] : []),
          ...(storeIds.length ? [{ storeId: { in: storeIds } }] : []),
        ],
      },
      include: {
        industry: { select: { id: true, name: true, code: true } },
        chain: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true } },
      },
      take: 50,
    });

    const timing = daysInPeriod(period);
    const rows = [];
    for (const g of goals) {
      const realized = await realizedForGoal(g);
      const pct = g.targetValue > 0 ? (realized / g.targetValue) * 100 : 0;
      rows.push({
        goal: g,
        realized,
        pct,
        days: timing,
      });
    }

    res.json({ period, rows });
  } catch (error) {
    console.error('getPromoterGoals error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
