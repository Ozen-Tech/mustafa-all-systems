import { Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { assertOwnsIndustry, getOwnedIndustry } from '../utils/industryOwnerScope';

const MISS_REASON_LABEL: Record<string, string> = {
  STORE_CLOSED: 'Loja fechada',
  NO_STOCK: 'Sem estoque / produto',
  NO_AUTHORIZATION: 'Sem autorização',
  NO_MATERIAL: 'Sem material no PDV',
  PROMOTER_ERROR: 'Erro do promotor',
  OTHER: 'Sem foto disponível',
};

function dayRangeBRT(dateISO: string): { start: Date; endExclusive: Date } {
  const start = new Date(`${dateISO}T00:00:00-03:00`);
  const endExclusive = new Date(`${dateISO}T00:00:00-03:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
}

function toISODateBRT(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

function parseMonthRange(month: string): { start: Date; endExclusive: Date } | null {
  const m = month.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const yyyy = Number(m[2]);
  if (mm < 1 || mm > 12) return null;
  const start = new Date(`${yyyy}-${String(mm).padStart(2, '0')}-01T00:00:00-03:00`);
  const endExclusive = new Date(start);
  endExclusive.setMonth(endExclusive.getMonth() + 1);
  return { start, endExclusive };
}

async function guardIndustry(req: AuthRequest, industryId: string, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  const check = await assertOwnsIndustry(req.userId, req.userRole, industryId);
  if (!check.ok) {
    res.status(check.status).json({ message: check.message });
    return false;
  }
  return true;
}

const filtersQuerySchema = z.object({
  state: z.string().min(1).max(2).optional(),
});

const listQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  promoterId: z.string().uuid().optional(),
  state: z.string().min(1).max(2).optional(),
  month: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const auditQuerySchema = z.object({
  state: z.string().min(1).max(2).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeJustified: z.string().optional(),
});

const metricsQuerySchema = z.object({
  state: z.string().min(1).max(2).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  type: z.enum(['audit', 'coverage']).default('audit'),
  state: z.string().min(1).max(2).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeJustified: z.string().optional(),
});

function resolveDateRange(q: {
  month?: string;
  startDate?: string;
  endDate?: string;
}): { start?: Date; endExclusive?: Date } {
  if (q.month) {
    const r = parseMonthRange(q.month);
    if (r) return r;
  }
  if (q.startDate || q.endDate) {
    const start = q.startDate ? dayRangeBRT(q.startDate).start : undefined;
    const endExclusive = q.endDate ? dayRangeBRT(q.endDate).endExclusive : undefined;
    return { start, endExclusive };
  }
  return {};
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });

    if (req.userRole === UserRole.ADMIN) {
      return res.json({
        industryId: null,
        industry: null,
        message: 'Admin: use industryId nos endpoints',
      });
    }

    const owned = await getOwnedIndustry(req.userId);
    if (!owned) {
      return res.status(403).json({ message: 'Nenhuma indústria vinculada a esta conta' });
    }

    res.json({
      industryId: owned.industryId,
      industry: owned.industry,
    });
  } catch (error) {
    console.error('industryOwner.getMe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getFilters(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const { state } = filtersQuerySchema.parse(req.query);

    const storeIndustries = await prisma.storeIndustry.findMany({
      where: {
        industryId,
        isActive: true,
        ...(state ? { store: { state: state.toUpperCase() } } : {}),
      },
      select: {
        store: { select: { id: true, name: true, state: true } },
      },
    });

    const assignments = await prisma.industryAssignment.findMany({
      where: {
        industryId,
        isActive: true,
        ...(state ? { promoter: { state: state.toUpperCase() } } : {}),
      },
      select: {
        promoter: { select: { id: true, name: true, state: true } },
        store: { select: { id: true, name: true, state: true } },
      },
    });

    const storeMap = new Map<string, { id: string; name: string; state: string | null }>();
    const promoterMap = new Map<string, { id: string; name: string; state: string | null }>();
    const states = new Set<string>();

    for (const si of storeIndustries) {
      storeMap.set(si.store.id, si.store);
      if (si.store.state) states.add(si.store.state.toUpperCase());
    }
    for (const a of assignments) {
      if (a.promoter) {
        promoterMap.set(a.promoter.id, a.promoter);
        if (a.promoter.state) states.add(a.promoter.state.toUpperCase());
      }
      if (a.store) {
        storeMap.set(a.store.id, a.store);
        if (a.store.state) states.add(a.store.state.toUpperCase());
      }
    }

    res.json({
      states: Array.from(states).sort(),
      stores: Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      promoters: Array.from(promoterMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.getFilters error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPhotos(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const q = listQuerySchema.parse(req.query);
    const range = resolveDateRange(q);

    const where: any = {
      industryId,
      ...(q.storeId ? { storeId: q.storeId } : {}),
      ...(q.promoterId ? { promoterId: q.promoterId } : {}),
      ...(q.state ? { store: { state: q.state.toUpperCase() } } : {}),
      ...(range.start || range.endExclusive
        ? {
            createdAt: {
              ...(range.start ? { gte: range.start } : {}),
              ...(range.endExclusive ? { lt: range.endExclusive } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.photoIndustry.count({ where }),
      prisma.photoIndustry.findMany({
        where,
        include: {
          photo: { select: { id: true, url: true, type: true, createdAt: true } },
          store: { select: { id: true, name: true, state: true, address: true } },
          promoter: { select: { id: true, name: true, state: true } },
          visit: { select: { id: true, checkInAt: true, checkOutAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    const photos = rows.map((r) => ({
      id: r.id,
      photoId: r.photoId,
      url: r.photo.url,
      type: r.photo.type,
      createdAt: r.createdAt.toISOString(),
      qualityScore: r.qualityScore,
      hasRupture: r.hasRupture,
      store: r.store,
      promoter: r.promoter,
      visit: {
        id: r.visit.id,
        checkInAt: r.visit.checkInAt.toISOString(),
        checkOutAt: r.visit.checkOutAt?.toISOString() ?? null,
      },
    }));

    res.json({ photos, total, page: q.page, limit: q.limit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.getPhotos error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getVisits(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const q = listQuerySchema.parse(req.query);
    const range = resolveDateRange(q);

    const photoWhere: any = {
      industryId,
      ...(q.storeId ? { storeId: q.storeId } : {}),
      ...(q.promoterId ? { promoterId: q.promoterId } : {}),
      ...(q.state ? { store: { state: q.state.toUpperCase() } } : {}),
    };

    const missWhere: any = {
      industryId,
      ...(q.storeId ? { storeId: q.storeId } : {}),
      ...(q.promoterId ? { promoterId: q.promoterId } : {}),
      ...(q.state ? { store: { state: q.state.toUpperCase() } } : {}),
    };

    const [photoVisitIds, missVisitIds] = await Promise.all([
      prisma.photoIndustry.findMany({
        where: photoWhere,
        select: { visitId: true },
        distinct: ['visitId'],
      }),
      prisma.industryMiss.findMany({
        where: missWhere,
        select: { visitId: true },
        distinct: ['visitId'],
      }),
    ]);

    const visitIdSet = new Set([
      ...photoVisitIds.map((p) => p.visitId),
      ...missVisitIds.map((m) => m.visitId),
    ]);
    const visitIds = Array.from(visitIdSet);

    if (visitIds.length === 0) {
      return res.json({ visits: [], total: 0, page: q.page, limit: q.limit });
    }

    const visitWhere: any = {
      id: { in: visitIds },
      ...(range.start || range.endExclusive
        ? {
            checkInAt: {
              ...(range.start ? { gte: range.start } : {}),
              ...(range.endExclusive ? { lt: range.endExclusive } : {}),
            },
          }
        : {}),
    };

    const [total, visits] = await Promise.all([
      prisma.visit.count({ where: visitWhere }),
      prisma.visit.findMany({
        where: visitWhere,
        include: {
          store: { select: { id: true, name: true, state: true, address: true } },
          promoter: { select: { id: true, name: true, state: true } },
          photoIndustries: {
            where: { industryId },
            select: { id: true, photoId: true },
          },
          industryMisses: {
            where: { industryId },
            select: { reason: true, note: true },
          },
        },
        orderBy: { checkInAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    res.json({
      visits: visits.map((v) => ({
        id: v.id,
        checkInAt: v.checkInAt.toISOString(),
        checkOutAt: v.checkOutAt?.toISOString() ?? null,
        store: v.store,
        promoter: v.promoter,
        photoCount: v.photoIndustries.length,
        miss: v.industryMisses[0]
          ? {
              reason: v.industryMisses[0].reason,
              reasonLabel:
                MISS_REASON_LABEL[v.industryMisses[0].reason] || v.industryMisses[0].reason,
              note: v.industryMisses[0].note,
            }
          : null,
      })),
      total,
      page: q.page,
      limit: q.limit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.getVisits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

type AuditStatus = 'sem_foto' | 'justificado' | 'sem_visita';

async function buildNationalAudit(opts: {
  industryId: string;
  state?: string;
  date: string;
  includeJustified: boolean;
}) {
  const { industryId, state, date, includeJustified } = opts;
  const { start, endExclusive } = dayRangeBRT(date);

  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    select: { id: true, name: true, code: true, abbreviation: true, isActive: true },
  });
  if (!industry) return null;

  const promoters = await prisma.user.findMany({
    where: {
      role: UserRole.PROMOTER,
      ...(state ? { state: state.toUpperCase() } : {}),
    },
    select: { id: true, name: true, email: true, state: true },
    orderBy: { name: 'asc' },
  });
  const promoterIds = promoters.map((p) => p.id);

  if (promoterIds.length === 0) {
    return {
      date,
      industry,
      stats: { pending: 0, semFoto: 0, justificado: 0, semVisita: 0, feitos: 0 },
      rows: [] as any[],
    };
  }

  const [routeAssignments, industryAssignments, storeIndustries] = await Promise.all([
    prisma.routeAssignment.findMany({
      where: { promoterId: { in: promoterIds }, isActive: true },
      select: {
        promoterId: true,
        storeId: true,
        store: { select: { id: true, name: true, address: true, state: true } },
      },
    }),
    prisma.industryAssignment.findMany({
      where: {
        promoterId: { in: promoterIds },
        industryId,
        isActive: true,
        storeId: { not: null },
      },
      select: {
        promoterId: true,
        storeId: true,
        store: { select: { id: true, name: true, address: true, state: true } },
      },
    }),
    prisma.storeIndustry.findMany({
      where: { industryId, isActive: true },
      select: {
        storeId: true,
        store: { select: { id: true, name: true, address: true, state: true } },
      },
    }),
  ]);

  const storeIndustryIds = new Set(storeIndustries.map((s) => s.storeId));
  type Expected = {
    promoterId: string;
    store: { id: string; name: string; address: string; state: string | null };
  };
  const expectedMap = new Map<string, Expected>();

  for (const a of industryAssignments) {
    if (!a.storeId || !a.store) continue;
    if (state && a.store.state && a.store.state.toUpperCase() !== state.toUpperCase()) continue;
    expectedMap.set(`${a.promoterId}:${a.storeId}`, {
      promoterId: a.promoterId,
      store: a.store,
    });
  }

  for (const ra of routeAssignments) {
    if (!storeIndustryIds.has(ra.storeId)) continue;
    if (state && ra.store.state && ra.store.state.toUpperCase() !== state.toUpperCase()) continue;
    const key = `${ra.promoterId}:${ra.storeId}`;
    if (!expectedMap.has(key)) {
      expectedMap.set(key, { promoterId: ra.promoterId, store: ra.store });
    }
  }

  const storeIds = Array.from(new Set(Array.from(expectedMap.values()).map((e) => e.store.id)));

  const visits =
    storeIds.length === 0
      ? []
      : await prisma.visit.findMany({
          where: {
            promoterId: { in: promoterIds },
            storeId: { in: storeIds },
            checkInAt: { gte: start, lt: endExclusive },
          },
          select: {
            id: true,
            promoterId: true,
            storeId: true,
            checkInAt: true,
            checkOutAt: true,
          },
        });

  const visitIds = visits.map((v) => v.id);

  const [photos, misses] = await Promise.all([
    visitIds.length
      ? prisma.photo.findMany({
          where: {
            visitId: { in: visitIds },
            type: 'OTHER',
            createdAt: { gte: start, lt: endExclusive },
          },
          select: {
            visitId: true,
            industryId: true,
            selectedIndustryId: true,
            photoIndustries: { select: { industryId: true } },
          },
        })
      : [],
    visitIds.length
      ? prisma.industryMiss.findMany({
          where: { visitId: { in: visitIds }, industryId },
          select: {
            visitId: true,
            promoterId: true,
            storeId: true,
            reason: true,
            note: true,
          },
        })
      : [],
  ]);

  const visitsByKey = new Map<string, typeof visits>();
  for (const v of visits) {
    const key = `${v.promoterId}:${v.storeId}`;
    visitsByKey.set(key, [...(visitsByKey.get(key) || []), v]);
  }

  const coveredVisitIds = new Set<string>();
  for (const p of photos) {
    const ids = new Set<string>();
    for (const pi of p.photoIndustries || []) ids.add(pi.industryId);
    if (p.selectedIndustryId) ids.add(p.selectedIndustryId);
    if (p.industryId) ids.add(p.industryId);
    if (ids.has(industryId)) coveredVisitIds.add(p.visitId);
  }

  const missByKey = new Map<string, { reason: string; note: string | null }>();
  for (const m of misses) {
    missByKey.set(`${m.promoterId}:${m.storeId}`, { reason: m.reason, note: m.note });
  }

  const promoterById = new Map(promoters.map((p) => [p.id, p]));
  const rows: Array<{
    promoter: { id: string; name: string; email: string; state: string | null };
    store: { id: string; name: string; address: string; state: string | null };
    status: AuditStatus;
    visitId: string | null;
    checkInAt: string | null;
    checkOutAt: string | null;
    missReason: string | null;
    missReasonLabel: string | null;
    missNote: string | null;
  }> = [];

  let feitos = 0;
  let semFoto = 0;
  let justificado = 0;
  let semVisita = 0;

  for (const exp of expectedMap.values()) {
    const promoter = promoterById.get(exp.promoterId);
    if (!promoter) continue;

    const key = `${exp.promoterId}:${exp.store.id}`;
    const dayVisits = visitsByKey.get(key) || [];
    const hasPhoto = dayVisits.some((v) => coveredVisitIds.has(v.id));
    if (hasPhoto) {
      feitos += 1;
      continue;
    }

    const miss = missByKey.get(key);
    const latestVisit = dayVisits.length
      ? [...dayVisits].sort((a, b) => b.checkInAt.getTime() - a.checkInAt.getTime())[0]
      : null;

    let status: AuditStatus;
    if (miss) {
      status = 'justificado';
      justificado += 1;
      if (!includeJustified) continue;
    } else if (!latestVisit) {
      status = 'sem_visita';
      semVisita += 1;
    } else {
      status = 'sem_foto';
      semFoto += 1;
    }

    rows.push({
      promoter,
      store: exp.store,
      status,
      visitId: latestVisit?.id ?? null,
      checkInAt: latestVisit?.checkInAt?.toISOString() ?? null,
      checkOutAt: latestVisit?.checkOutAt?.toISOString() ?? null,
      missReason: miss?.reason ?? null,
      missReasonLabel: miss ? MISS_REASON_LABEL[miss.reason] || miss.reason : null,
      missNote: miss?.note ?? null,
    });
  }

  const statusRank = (s: AuditStatus) => (s === 'sem_foto' ? 0 : s === 'sem_visita' ? 1 : 2);
  rows.sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      a.promoter.name.localeCompare(b.promoter.name) ||
      a.store.name.localeCompare(b.store.name)
  );

  return {
    date,
    industry,
    stats: { pending: rows.length, semFoto, justificado, semVisita, feitos },
    rows,
  };
}

export async function getAudit(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const parsed = auditQuerySchema.parse(req.query);
    const targetDate = parsed.date ?? toISODateBRT(new Date());
    const includeJustified =
      parsed.includeJustified === undefined ||
      parsed.includeJustified === '1' ||
      parsed.includeJustified === 'true';

    const result = await buildNationalAudit({
      industryId,
      state: parsed.state,
      date: targetDate,
      includeJustified,
    });
    if (!result) return res.status(404).json({ message: 'Indústria não encontrada' });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.getAudit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getCoverage(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const q = metricsQuerySchema.parse(req.query);
    const endDate = q.endDate ?? toISODateBRT(new Date());
    const startDate =
      q.startDate ??
      (() => {
        const d = new Date(`${endDate}T12:00:00-03:00`);
        d.setDate(d.getDate() - 30);
        return toISODateBRT(d);
      })();
    const { start } = dayRangeBRT(startDate);
    const { endExclusive } = dayRangeBRT(endDate);

    const storeIndustries = await prisma.storeIndustry.findMany({
      where: {
        industryId,
        isActive: true,
        ...(q.state ? { store: { state: q.state.toUpperCase() } } : {}),
      },
      select: {
        store: { select: { id: true, name: true, state: true, address: true } },
      },
    });

    const storeIds = storeIndustries.map((s) => s.store.id);
    const [photoAgg, missAgg, visitAgg] = await Promise.all([
      storeIds.length
        ? prisma.photoIndustry.groupBy({
            by: ['storeId'],
            where: {
              industryId,
              storeId: { in: storeIds },
              createdAt: { gte: start, lt: endExclusive },
            },
            _count: { _all: true },
            _max: { createdAt: true },
          })
        : [],
      storeIds.length
        ? prisma.industryMiss.groupBy({
            by: ['storeId'],
            where: {
              industryId,
              storeId: { in: storeIds },
              createdAt: { gte: start, lt: endExclusive },
            },
            _count: { _all: true },
          })
        : [],
      storeIds.length
        ? prisma.visit.groupBy({
            by: ['storeId'],
            where: {
              storeId: { in: storeIds },
              checkInAt: { gte: start, lt: endExclusive },
            },
            _count: { _all: true },
          })
        : [],
    ]);

    const photosByStore = new Map(photoAgg.map((p) => [p.storeId, p]));
    const missesByStore = new Map(missAgg.map((m) => [m.storeId, m._count._all]));
    const visitsByStore = new Map(visitAgg.map((v) => [v.storeId, v._count._all]));

    const byState = new Map<
      string,
      { stores: number; withPhoto: number; withMissOnly: number; noActivity: number }
    >();

    const rows = storeIndustries.map((si) => {
      const store = si.store;
      const uf = (store.state || '??').toUpperCase();
      const photoInfo = photosByStore.get(store.id);
      const photoCount = photoInfo?._count._all ?? 0;
      const missCount = missesByStore.get(store.id) ?? 0;
      const visitCount = visitsByStore.get(store.id) ?? 0;
      let status: 'com_foto' | 'apenas_justificado' | 'sem_atividade';
      if (photoCount > 0) status = 'com_foto';
      else if (missCount > 0) status = 'apenas_justificado';
      else status = 'sem_atividade';

      const st = byState.get(uf) || {
        stores: 0,
        withPhoto: 0,
        withMissOnly: 0,
        noActivity: 0,
      };
      st.stores += 1;
      if (status === 'com_foto') st.withPhoto += 1;
      else if (status === 'apenas_justificado') st.withMissOnly += 1;
      else st.noActivity += 1;
      byState.set(uf, st);

      return {
        store,
        status,
        photoCount,
        missCount,
        visitCount,
        lastPhotoAt: photoInfo?._max.createdAt?.toISOString() ?? null,
      };
    });

    rows.sort((a, b) => a.store.name.localeCompare(b.store.name));

    res.json({
      startDate,
      endDate,
      summary: {
        stores: rows.length,
        withPhoto: rows.filter((r) => r.status === 'com_foto').length,
        withMissOnly: rows.filter((r) => r.status === 'apenas_justificado').length,
        noActivity: rows.filter((r) => r.status === 'sem_atividade').length,
      },
      byState: Array.from(byState.entries())
        .map(([state, s]) => ({ state, ...s }))
        .sort((a, b) => a.state.localeCompare(b.state)),
      rows,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.getCoverage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMetrics(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const q = metricsQuerySchema.parse(req.query);
    const endDate = q.endDate ?? toISODateBRT(new Date());
    const startDate =
      q.startDate ??
      (() => {
        const d = new Date(`${endDate}T12:00:00-03:00`);
        d.setDate(d.getDate() - 13);
        return toISODateBRT(d);
      })();
    const { start } = dayRangeBRT(startDate);
    const { endExclusive } = dayRangeBRT(endDate);

    const storeFilter = q.state ? { state: q.state.toUpperCase() } : undefined;

    const [photoCount, missCount, photoByDay, missByDay, photoByState] = await Promise.all([
      prisma.photoIndustry.count({
        where: {
          industryId,
          createdAt: { gte: start, lt: endExclusive },
          ...(storeFilter ? { store: storeFilter } : {}),
        },
      }),
      prisma.industryMiss.count({
        where: {
          industryId,
          createdAt: { gte: start, lt: endExclusive },
          ...(storeFilter ? { store: storeFilter } : {}),
        },
      }),
      prisma.photoIndustry.findMany({
        where: {
          industryId,
          createdAt: { gte: start, lt: endExclusive },
          ...(storeFilter ? { store: storeFilter } : {}),
        },
        select: { createdAt: true },
      }),
      prisma.industryMiss.findMany({
        where: {
          industryId,
          createdAt: { gte: start, lt: endExclusive },
          ...(storeFilter ? { store: storeFilter } : {}),
        },
        select: { createdAt: true },
      }),
      prisma.photoIndustry.groupBy({
        by: ['storeId'],
        where: {
          industryId,
          createdAt: { gte: start, lt: endExclusive },
          ...(storeFilter ? { store: storeFilter } : {}),
        },
        _count: { _all: true },
      }),
    ]);

    const storeIds = photoByState.map((p) => p.storeId);
    const stores = storeIds.length
      ? await prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, state: true },
        })
      : [];
    const storeState = new Map(stores.map((s) => [s.id, (s.state || '??').toUpperCase()]));
    const byUf = new Map<string, number>();
    for (const p of photoByState) {
      const uf = storeState.get(p.storeId) || '??';
      byUf.set(uf, (byUf.get(uf) || 0) + p._count._all);
    }

    const dayMap = new Map<string, { photos: number; misses: number }>();
    const cursor = new Date(start);
    while (cursor < endExclusive) {
      const key = toISODateBRT(cursor);
      dayMap.set(key, { photos: 0, misses: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const p of photoByDay) {
      const key = toISODateBRT(p.createdAt);
      const row = dayMap.get(key) || { photos: 0, misses: 0 };
      row.photos += 1;
      dayMap.set(key, row);
    }
    for (const m of missByDay) {
      const key = toISODateBRT(m.createdAt);
      const row = dayMap.get(key) || { photos: 0, misses: 0 };
      row.misses += 1;
      dayMap.set(key, row);
    }

    const totalEvidence = photoCount + missCount;
    const executionRate = totalEvidence > 0 ? Math.round((photoCount / totalEvidence) * 100) : 0;

    // Audit snapshot today for "feitos vs pending"
    const todayAudit = await buildNationalAudit({
      industryId,
      state: q.state,
      date: endDate,
      includeJustified: true,
    });

    res.json({
      startDate,
      endDate,
      summary: {
        photos: photoCount,
        misses: missCount,
        executionRate,
        storesWithPhotos: storeIds.length,
        todayFeitos: todayAudit?.stats.feitos ?? 0,
        todayPending: todayAudit?.stats.pending ?? 0,
        todaySemFoto: todayAudit?.stats.semFoto ?? 0,
        todaySemVisita: todayAudit?.stats.semVisita ?? 0,
        todayJustificado: todayAudit?.stats.justificado ?? 0,
      },
      series: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
      byState: Array.from(byUf.entries())
        .map(([state, photos]) => ({ state, photos }))
        .sort((a, b) => b.photos - a.photos),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.getMetrics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportReport(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    if (!(await guardIndustry(req, industryId, res))) return;

    const q = exportQuerySchema.parse(req.query);
    const targetDate = q.date ?? toISODateBRT(new Date());
    const includeJustified =
      q.includeJustified === undefined ||
      q.includeJustified === '1' ||
      q.includeJustified === 'true';

    let headers: string[];
    let dataRows: string[][];

    if (q.type === 'coverage') {
      const endDate = targetDate;
      const d = new Date(`${endDate}T12:00:00-03:00`);
      d.setDate(d.getDate() - 30);
      const startDate = toISODateBRT(d);
      const { start } = dayRangeBRT(startDate);
      const { endExclusive } = dayRangeBRT(endDate);

      const storeIndustries = await prisma.storeIndustry.findMany({
        where: {
          industryId,
          isActive: true,
          ...(q.state ? { store: { state: q.state.toUpperCase() } } : {}),
        },
        select: {
          store: { select: { id: true, name: true, state: true, address: true } },
        },
      });
      const storeIds = storeIndustries.map((s) => s.store.id);
      const photoAgg = storeIds.length
        ? await prisma.photoIndustry.groupBy({
            by: ['storeId'],
            where: {
              industryId,
              storeId: { in: storeIds },
              createdAt: { gte: start, lt: endExclusive },
            },
            _count: { _all: true },
          })
        : [];
      const photosByStore = new Map(photoAgg.map((p) => [p.storeId, p._count._all]));
      headers = ['Loja', 'UF', 'Endereço', 'Fotos (30d)', 'Status'];
      dataRows = storeIndustries.map((si) => {
        const count = photosByStore.get(si.store.id) ?? 0;
        return [
          si.store.name,
          si.store.state || '',
          si.store.address || '',
          String(count),
          count > 0 ? 'com_foto' : 'sem_atividade',
        ];
      });
    } else {
      const audit = await buildNationalAudit({
        industryId,
        state: q.state,
        date: targetDate,
        includeJustified,
      });
      if (!audit) return res.status(404).json({ message: 'Indústria não encontrada' });
      headers = [
        'Data',
        'Promotor',
        'Email',
        'UF Promotor',
        'Loja',
        'UF Loja',
        'Status',
        'Motivo',
        'Nota',
        'Check-in',
      ];
      dataRows = audit.rows.map((r) => [
        audit.date,
        r.promoter.name,
        r.promoter.email,
        r.promoter.state || '',
        r.store.name,
        r.store.state || '',
        r.status,
        r.missReasonLabel || '',
        r.missNote || '',
        r.checkInAt || '',
      ]);
    }

    const filenameBase = `industria-${q.type}-${targetDate}`;

    if (q.format === 'csv') {
      const body = [headers, ...dataRows].map((row) => row.map(csvEscape).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      return res.send('\uFEFF' + body);
    }

    if (q.format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(q.type === 'coverage' ? 'Cobertura' : 'Vistoria');
      ws.addRow(headers);
      for (const row of dataRows) ws.addRow(row);
      ws.getRow(1).font = { bold: true };
      const buf = await wb.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
      return res.send(Buffer.from(buf));
    }

    // PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(14).text(`Relatório — ${q.type === 'coverage' ? 'Cobertura' : 'Vistoria'}`, {
      underline: true,
    });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Data referência: ${targetDate}`);
    doc.moveDown();
    doc.fontSize(8);
    for (const row of dataRows.slice(0, 80)) {
      doc.text(row.join(' | '), { width: 520 });
      doc.moveDown(0.2);
    }
    if (dataRows.length > 80) {
      doc.moveDown();
      doc.text(`… +${dataRows.length - 80} linhas (use CSV/Excel para o completo)`);
    }
    doc.end();
    const pdfBuf = await done;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
    return res.send(pdfBuf);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('industryOwner.exportReport error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
