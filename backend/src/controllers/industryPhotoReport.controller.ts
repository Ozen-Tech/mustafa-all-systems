import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { scopedPromoterWhere } from '../utils/supervisorScope';
import { dayRangeBRT, toISODateBRT } from './dayBoard.controller';

const MAX_PHOTOS = 2000;

const querySchema = z.object({
  industryId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  state: z.string().length(2).optional(),
  storeId: z.string().uuid().optional(),
});

/**
 * Relatório de fotos de uma indústria no período, agrupado por loja,
 * com as lojas que deveriam ter foto e não tiveram (e justificativas).
 */
export async function getIndustryPhotoReport(req: AuthRequest, res: Response) {
  try {
    const q = querySchema.parse(req.query);
    if (q.startDate > q.endDate) {
      return res.status(400).json({ message: 'A data inicial deve ser anterior à final' });
    }
    const isAdmin = req.userRole === UserRole.ADMIN;
    const state = q.state?.toUpperCase();

    const industry = await prisma.industry.findUnique({
      where: { id: q.industryId },
      select: { id: true, name: true, code: true, abbreviation: true },
    });
    if (!industry) return res.status(404).json({ message: 'Indústria não encontrada' });

    const { start } = dayRangeBRT(q.startDate);
    const { endExclusive } = dayRangeBRT(q.endDate);

    const promoters = await prisma.user.findMany({
      where: scopedPromoterWhere({ isAdmin, supervisorId: req.userId }),
      select: { id: true },
    });
    const promoterIds = promoters.map((p) => p.id);

    const storeFilter = {
      ...(state ? { state } : {}),
      ...(q.storeId ? { id: q.storeId } : {}),
    };
    const storeSel = { id: true, name: true, address: true, state: true, code: true } as const;

    const [rows, total, expectedRows, misses] = await Promise.all([
      prisma.photoIndustry.findMany({
        where: {
          industryId: q.industryId,
          promoterId: { in: promoterIds },
          createdAt: { gte: start, lt: endExclusive },
          ...(Object.keys(storeFilter).length ? { store: storeFilter } : {}),
        },
        select: {
          id: true,
          createdAt: true,
          hasRupture: true,
          qualityScore: true,
          visitId: true,
          photo: { select: { url: true, createdAt: true } },
          store: { select: storeSel },
          promoter: { select: { id: true, name: true } },
          visit: { select: { checkInAt: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_PHOTOS,
      }),
      prisma.photoIndustry.count({
        where: {
          industryId: q.industryId,
          promoterId: { in: promoterIds },
          createdAt: { gte: start, lt: endExclusive },
          ...(Object.keys(storeFilter).length ? { store: storeFilter } : {}),
        },
      }),
      prisma.storeIndustry.findMany({
        where: {
          industryId: q.industryId,
          isActive: true,
          store: {
            ...storeFilter,
            ...(isAdmin
              ? {}
              : {
                  routeAssignments: {
                    some: { isActive: true, promoterId: { in: promoterIds } },
                  },
                }),
          },
        },
        select: { store: { select: storeSel } },
      }),
      prisma.industryMiss.findMany({
        where: {
          industryId: q.industryId,
          promoterId: { in: promoterIds },
          createdAt: { gte: start, lt: endExclusive },
          ...(Object.keys(storeFilter).length ? { store: storeFilter } : {}),
        },
        select: {
          storeId: true,
          reason: true,
          note: true,
          createdAt: true,
          promoter: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    type StoreGroup = {
      store: (typeof rows)[number]['store'];
      photos: {
        id: string;
        url: string;
        takenAt: string;
        visitDate: string;
        promoterName: string;
        hasRupture: boolean;
        qualityScore: number | null;
      }[];
      promoters: Set<string>;
      visits: Set<string>;
    };
    const groups = new Map<string, StoreGroup>();
    const promotersSeen = new Set<string>();
    const visitsSeen = new Set<string>();
    let ruptures = 0;
    let qualitySum = 0;
    let qualityCount = 0;

    for (const r of rows) {
      let g = groups.get(r.store.id);
      if (!g) {
        g = { store: r.store, photos: [], promoters: new Set(), visits: new Set() };
        groups.set(r.store.id, g);
      }
      g.photos.push({
        id: r.id,
        url: r.photo.url,
        takenAt: r.photo.createdAt.toISOString(),
        visitDate: toISODateBRT(r.visit.checkInAt),
        promoterName: r.promoter.name,
        hasRupture: r.hasRupture,
        qualityScore: r.qualityScore,
      });
      g.promoters.add(r.promoter.name);
      g.visits.add(r.visitId);
      promotersSeen.add(r.promoter.id);
      visitsSeen.add(r.visitId);
      if (r.hasRupture) ruptures++;
      if (r.qualityScore != null) {
        qualitySum += r.qualityScore;
        qualityCount++;
      }
    }

    const stores = Array.from(groups.values())
      .map((g) => ({
        store: g.store,
        photoCount: g.photos.length,
        visitCount: g.visits.size,
        ruptures: g.photos.filter((p) => p.hasRupture).length,
        promoters: Array.from(g.promoters).sort(),
        lastPhotoAt: g.photos[g.photos.length - 1]?.takenAt ?? null,
        photos: g.photos,
      }))
      .sort((a, b) => a.store.name.localeCompare(b.store.name, 'pt-BR'));

    const missesByStore = new Map<string, typeof misses>();
    for (const m of misses) {
      const list = missesByStore.get(m.storeId) ?? [];
      list.push(m);
      missesByStore.set(m.storeId, list);
    }

    const expectedStores = new Map(expectedRows.map((r) => [r.store.id, r.store]));
    const storesWithoutPhotos = Array.from(expectedStores.values())
      .filter((s) => !groups.has(s.id))
      .map((store) => ({
        store,
        misses: (missesByStore.get(store.id) ?? []).map((m) => ({
          reason: m.reason,
          note: m.note,
          date: toISODateBRT(m.createdAt),
          promoterName: m.promoter.name,
        })),
      }))
      .sort((a, b) => a.store.name.localeCompare(b.store.name, 'pt-BR'));

    const coveredExpected = Array.from(expectedStores.keys()).filter((id) => groups.has(id)).length;

    res.json({
      industry,
      startDate: q.startDate,
      endDate: q.endDate,
      state: state ?? null,
      summary: {
        photos: total,
        stores: stores.length,
        visits: visitsSeen.size,
        promoters: promotersSeen.size,
        ruptures,
        averageQuality: qualityCount ? Math.round(qualitySum / qualityCount) : null,
        expectedStores: expectedStores.size,
        coveredExpectedStores: coveredExpected,
        storesWithoutPhotos: storesWithoutPhotos.length,
      },
      truncated: total > rows.length,
      stores,
      storesWithoutPhotos,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Industry photo report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
