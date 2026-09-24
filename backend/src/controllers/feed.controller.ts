import { Response } from 'express';
import { z } from 'zod';
import { FeedEntryStatus, FeedEntryType, Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

const createSchema = z.object({
  type: z.nativeEnum(FeedEntryType).default(FeedEntryType.NOTE),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).nullable().optional(),
  industryId: z.string().uuid().nullable().optional(),
  chainId: z.string().uuid().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

const patchSchema = z.object({
  status: z.nativeEnum(FeedEntryStatus).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function listFeed(req: AuthRequest, res: Response) {
  try {
    const status = (req.query.status as string | undefined)?.trim();
    const type = (req.query.type as string | undefined)?.trim();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const where: Prisma.FeedEntryWhereInput = {};
    if (status === 'OPEN' || status === 'DONE') where.status = status;
    if (type && Object.values(FeedEntryType).includes(type as FeedEntryType)) {
      where.type = type as FeedEntryType;
    }

    const entries = await prisma.feedEntry.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true } },
        industry: { select: { id: true, name: true } },
        chain: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });

    res.json({ entries });
  } catch (error) {
    console.error('listFeed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function createFeedEntry(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Não autenticado' });
    if (req.userRole !== UserRole.ADMIN && req.userRole !== UserRole.SUPERVISOR) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const data = createSchema.parse(req.body);
    const entry = await prisma.feedEntry.create({
      data: {
        type: data.type,
        title: data.title.trim(),
        body: data.body ?? null,
        industryId: data.industryId ?? null,
        chainId: data.chainId ?? null,
        storeId: data.storeId ?? null,
        authorId: req.userId,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.type === FeedEntryType.PENDING ? FeedEntryStatus.OPEN : FeedEntryStatus.OPEN,
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        industry: { select: { id: true, name: true } },
        chain: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('createFeedEntry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function patchFeedEntry(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Não autenticado' });
    if (req.userRole !== UserRole.ADMIN && req.userRole !== UserRole.SUPERVISOR) {
      return res.status(403).json({ message: 'Sem permissão' });
    }

    const data = patchSchema.parse(req.body);
    const entry = await prisma.feedEntry.update({
      where: { id: req.params.id },
      data: {
        ...(data.title != null ? { title: data.title.trim() } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.dueDate !== undefined
          ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
          : {}),
        ...(data.status != null
          ? {
              status: data.status,
              resolvedAt: data.status === FeedEntryStatus.DONE ? new Date() : null,
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    res.json({ entry });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Entrada não encontrada' });
    }
    console.error('patchFeedEntry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/** Resumo do painel do dono: metas + pedidos + pendências + últimas importações. */
export async function getOwnerDashboard(req: AuthRequest, res: Response) {
  try {
    const now = new Date();
    const period =
      (req.query.period as string | undefined)?.trim() ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const [y, m] = period.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));

    const [goals, orderAgg, byIndustry, byChain, openPendings, recentImports, recentFeed] =
      await Promise.all([
        prisma.goal.findMany({
          where: { period },
          include: {
            industry: { select: { id: true, name: true } },
            chain: { select: { id: true, name: true } },
            store: { select: { id: true, name: true } },
          },
        }),
        prisma.purchaseOrder.aggregate({
          where: { orderDate: { gte: start, lt: end } },
          _sum: { totalValue: true, totalQty: true },
          _count: { _all: true },
        }),
        prisma.purchaseOrder.groupBy({
          by: ['industryName'],
          where: { orderDate: { gte: start, lt: end } },
          _sum: { totalValue: true, totalQty: true },
          _count: { _all: true },
          orderBy: { _sum: { totalValue: 'desc' } },
          take: 10,
        }),
        prisma.purchaseOrder.groupBy({
          by: ['chainId'],
          where: { orderDate: { gte: start, lt: end } },
          _sum: { totalValue: true, totalQty: true },
          _count: { _all: true },
          orderBy: { _sum: { totalValue: 'desc' } },
          take: 10,
        }),
        prisma.feedEntry.findMany({
          where: { status: 'OPEN' },
          include: {
            author: { select: { name: true } },
            assignee: { select: { name: true } },
            chain: { select: { name: true } },
            industry: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.orderImport.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            chain: { select: { name: true, code: true } },
            uploadedBy: { select: { name: true } },
          },
        }),
        prisma.feedEntry.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            author: { select: { name: true } },
            chain: { select: { name: true } },
            industry: { select: { name: true } },
          },
        }),
      ]);

    const chainIds = byChain.map((c) => c.chainId);
    const chains = chainIds.length
      ? await prisma.retailChain.findMany({
          where: { id: { in: chainIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const chainName = new Map(chains.map((c) => [c.id, c.name]));

    const goalProgress = [];
    for (const g of goals) {
      const where: Prisma.PurchaseOrderWhereInput = {
        orderDate: { gte: start, lt: end },
      };
      if (g.industryId) where.industryId = g.industryId;
      if (g.chainId) where.chainId = g.chainId;
      if (g.storeId) where.storeId = g.storeId;
      const agg = await prisma.purchaseOrder.aggregate({
        where,
        _sum: { totalValue: true, totalQty: true },
      });
      const realized =
        g.metric === 'ORDER_QTY' ? agg._sum.totalQty || 0 : agg._sum.totalValue || 0;
      goalProgress.push({
        goal: g,
        realized,
        pct: g.targetValue > 0 ? (realized / g.targetValue) * 100 : 0,
      });
    }

    res.json({
      period,
      totals: {
        orderCount: orderAgg._count._all,
        totalValue: orderAgg._sum.totalValue || 0,
        totalQty: orderAgg._sum.totalQty || 0,
      },
      byIndustry: byIndustry.map((r) => ({
        label: r.industryName,
        orderCount: r._count._all,
        totalValue: r._sum.totalValue || 0,
        totalQty: r._sum.totalQty || 0,
      })),
      byChain: byChain.map((r) => ({
        chainId: r.chainId,
        label: chainName.get(r.chainId) || r.chainId,
        orderCount: r._count._all,
        totalValue: r._sum.totalValue || 0,
        totalQty: r._sum.totalQty || 0,
      })),
      goalProgress,
      openPendings,
      recentImports,
      recentFeed,
    });
  } catch (error) {
    console.error('getOwnerDashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
