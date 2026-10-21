import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { supervisorScope } from '../utils/supervisorScope';

/**
 * GET /supervisor/day-status
 * Status do dia por promotor
 */
export async function getDayStatus(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Obtém escopo do supervisor (quais promotores/estados ele vê)
    const scope = await supervisorScope(supervisorId);

    // Busca promotores do escopo
    const promoters = await prisma.user.findMany({
      where: {
        role: 'PROMOTER',
        ...(scope.promoterIds?.length ? { id: { in: scope.promoterIds } } : {}),
        ...(scope.states?.length ? { state: { in: scope.states } } : {}),
      },
      select: {
        id: true,
        name: true,
        state: true,
      },
    });

    // Busca rotas de cada promotor
    const routes = await prisma.routeAssignment.findMany({
      where: {
        promoterId: { in: promoters.map(p => p.id) },
        isActive: true,
      },
      select: {
        promoterId: true,
        storeId: true,
      },
    });

    // Agrupa lojas por promotor
    const storesByPromoter = new Map<string, Set<string>>();
    for (const route of routes) {
      if (!storesByPromoter.has(route.promoterId)) {
        storesByPromoter.set(route.promoterId, new Set());
      }
      storesByPromoter.get(route.promoterId)!.add(route.storeId);
    }

    // Busca visitas do dia
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const visits = await prisma.visit.findMany({
      where: {
        promoterId: { in: promoters.map(p => p.id) },
        checkInAt: { gte: dayStart, lt: dayEnd },
      },
      select: {
        promoterId: true,
        storeId: true,
        checkInAt: true,
        checkOutAt: true,
      },
    });

    // Agrupa visitas por promotor
    const visitsByPromoter = new Map<string, typeof visits>();
    for (const visit of visits) {
      if (!visitsByPromoter.has(visit.promoterId)) {
        visitsByPromoter.set(visit.promoterId, []);
      }
      visitsByPromoter.get(visit.promoterId)!.push(visit);
    }

    // Monta resposta
    const result = promoters.map(promoter => {
      const stores = storesByPromoter.get(promoter.id) || new Set();
      const promoterVisits = visitsByPromoter.get(promoter.id) || [];
      const visitedStores = new Set(promoterVisits.map(v => v.storeId));
      const lastCheckIn = promoterVisits
        .filter(v => v.checkInAt)
        .sort((a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime())[0];

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (promoterVisits.length > 0) {
        const hasActiveVisit = promoterVisits.some(v => !v.checkOutAt);
        if (visitedStores.size >= stores.size && !hasActiveVisit) {
          status = 'completed';
        } else {
          status = 'in_progress';
        }
      }

      return {
        id: promoter.id,
        name: promoter.name,
        state: promoter.state,
        storesTotal: stores.size,
        storesVisited: visitedStores.size,
        lastCheckIn: lastCheckIn?.checkInAt.toISOString(),
        status,
      };
    });

    // Ordena por status (not_started primeiro, depois in_progress, depois completed)
    const statusOrder = { not_started: 0, in_progress: 1, completed: 2 };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    res.json({ promoters: result });
  } catch (error) {
    console.error('Get day status error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * GET /supervisor/check-in-reviews
 * Lista check-ins pendentes de revisão (sem GPS)
 */
export async function getCheckInReviews(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const scope = await supervisorScope(supervisorId);

    const reviews = await prisma.checkInReview.findMany({
      where: {
        reviewedAt: null,
        gpsStatus: { not: 'OK' },
        visit: {
          promoter: {
            ...(scope.promoterIds?.length ? { id: { in: scope.promoterIds } } : {}),
            ...(scope.states?.length ? { state: { in: scope.states } } : {}),
          },
        },
      },
      include: {
        visit: {
          include: {
            promoter: { select: { id: true, name: true } },
            store: { select: { id: true, name: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      reviews: reviews.map(r => ({
        id: r.id,
        visitId: r.visitId,
        gpsStatus: r.gpsStatus,
        promoter: r.visit.promoter,
        store: r.visit.store,
        checkInAt: r.visit.checkInAt,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get check-in reviews error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

const reviewCheckInSchema = z.object({
  reviewId: z.string().uuid(),
  approved: z.boolean(),
  note: z.string().max(500).optional(),
});

/**
 * POST /supervisor/review-check-in
 * Aprova ou rejeita check-in sem GPS
 */
export async function reviewCheckIn(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const data = reviewCheckInSchema.parse(req.body);

    const review = await prisma.checkInReview.update({
      where: { id: data.reviewId },
      data: {
        approved: data.approved,
        note: data.note,
        reviewedAt: new Date(),
        reviewedBy: supervisorId,
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Review check-in error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

const reassignStoreSchema = z.object({
  storeId: z.string().uuid(),
  fromPromoterId: z.string().uuid(),
  toPromoterId: z.string().uuid(),
});

/**
 * POST /supervisor/reassign-store
 * Troca promotor de uma loja
 */
export async function reassignStore(req: AuthRequest, res: Response) {
  try {
    const data = reassignStoreSchema.parse(req.body);

    // Remove assignment antigo
    await prisma.routeAssignment.deleteMany({
      where: {
        storeId: data.storeId,
        promoterId: data.fromPromoterId,
      },
    });

    // Cria novo assignment
    await prisma.routeAssignment.create({
      data: {
        storeId: data.storeId,
        promoterId: data.toPromoterId,
        isActive: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Reassign store error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * GET /supervisor/stores-without-promoter
 * Lista lojas sem promotor atribuído
 */
export async function getStoresWithoutPromoter(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const scope = await supervisorScope(supervisorId);

    const stores = await prisma.store.findMany({
      where: {
        ...(scope.states?.length ? { state: { in: scope.states } } : {}),
        routeAssignments: { none: { isActive: true } },
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        state: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ stores });
  } catch (error) {
    console.error('Get stores without promoter error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
