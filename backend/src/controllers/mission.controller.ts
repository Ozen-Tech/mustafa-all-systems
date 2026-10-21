import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';

/**
 * GET /missions?weekStart=
 * Lista missões da semana para o promotor
 */
export async function getMissions(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;
    const weekStart = req.query.weekStart as string | undefined;

    // Se não informado, calcula início da semana atual (segunda-feira)
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    const currentWeekStart = weekStart || monday.toISOString().split('T')[0];

    // Busca lojas do promotor
    const routes = await prisma.routeAssignment.findMany({
      where: { promoterId, isActive: true },
      select: { storeId: true }
    });
    const promoterStoreIds = routes.map(r => r.storeId);

    // Busca missões da semana
    const missions = await prisma.mission.findMany({
      where: {
        weekStart: currentWeekStart,
        OR: [
          { storeId: null }, // Missões para todas as lojas
          { storeId: { in: promoterStoreIds } }, // Missões específicas das lojas do promotor
        ]
      },
      include: {
        industry: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        completions: {
          where: { promoterId },
          select: { id: true, done: true, photoUrl: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const mapped = missions.map(mission => ({
      id: mission.id,
      title: mission.title,
      description: mission.description,
      industryId: mission.industryId,
      industryName: mission.industry?.name,
      storeId: mission.storeId,
      storeName: mission.store?.name,
      weekStart: mission.weekStart,
      weekEnd: mission.weekEnd,
      requiresPhoto: mission.requiresPhoto,
      completed: mission.completions.some(c => c.done),
      photoUrl: mission.completions.find(c => c.photoUrl)?.photoUrl,
    }));

    res.json({ missions: mapped });
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

const completeMissionSchema = z.object({
  missionId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  done: z.boolean(),
  photoUrl: z.string().url().optional(),
  note: z.string().max(500).optional(),
});

/**
 * POST /missions/complete
 * Marca missão como concluída/não concluída
 */
export async function completeMission(req: AuthRequest, res: Response) {
  try {
    const data = completeMissionSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verifica se a missão existe
    const mission = await prisma.mission.findUnique({
      where: { id: data.missionId },
    });

    if (!mission) {
      return res.status(404).json({ message: 'Missão não encontrada' });
    }

    // Se missão requer foto e está sendo marcada como done, verifica se tem foto
    if (mission.requiresPhoto && data.done && !data.photoUrl) {
      return res.status(400).json({ message: 'Esta missão requer foto comprovante' });
    }

    // Upsert completion
    const completion = await prisma.missionCompletion.upsert({
      where: {
        missionId_promoterId_storeId: {
          missionId: data.missionId,
          promoterId,
          storeId: data.storeId ?? '',
        }
      },
      update: {
        done: data.done,
        photoUrl: data.photoUrl,
        note: data.note,
      },
      create: {
        missionId: data.missionId,
        promoterId,
        storeId: data.storeId,
        done: data.done,
        photoUrl: data.photoUrl,
        note: data.note,
      },
    });

    res.json({ success: true, completionId: completion.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Complete mission error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * POST /admin/missions
 * Cria nova missão (admin/supervisor)
 */
const createMissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  industryId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requiresPhoto: z.boolean().default(false),
});

export async function createMission(req: AuthRequest, res: Response) {
  try {
    if (req.userRole !== 'ADMIN' && req.userRole !== 'SUPERVISOR') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const data = createMissionSchema.parse(req.body);

    const mission = await prisma.mission.create({
      data: {
        title: data.title,
        description: data.description,
        industryId: data.industryId,
        storeId: data.storeId,
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        requiresPhoto: data.requiresPhoto,
      },
    });

    res.json({ mission });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Create mission error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
