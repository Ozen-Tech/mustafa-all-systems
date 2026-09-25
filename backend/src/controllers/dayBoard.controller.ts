import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { storeSelect } from '../utils/storeSelect';

const POINTS = {
  STORE_DONE: 20,
  INDUSTRIES: 20,
  ON_TIME: 15,
  PHOTO_QUOTA: 10,
} as const;

const CUTOFF_HOUR_BRT = 20;

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

function dayRangeBRT(dateISO: string): { start: Date; endExclusive: Date; cutoff: Date } {
  const start = new Date(`${dateISO}T00:00:00-03:00`);
  const endExclusive = new Date(`${dateISO}T00:00:00-03:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const cutoff = new Date(`${dateISO}T${String(CUTOFF_HOUR_BRT).padStart(2, '0')}:00:00-03:00`);
  return { start, endExclusive, cutoff };
}

function shiftDateISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00-03:00`);
  d.setDate(d.getDate() + days);
  return toISODateBRT(d);
}

type TrailStatus = 'done' | 'skipped' | 'active' | 'pending';

const skipSchema = z.object({
  reason: z.enum(['STORE_CLOSED', 'NO_TIME', 'REDIRECTED', 'OTHER']),
  note: z.string().max(300).optional(),
});

async function assertStoreOnActiveRoute(promoterId: string, storeId: string): Promise<boolean> {
  const assignment = await prisma.routeAssignment.findFirst({
    where: { promoterId, storeId, isActive: true },
    select: { id: true },
  });
  return !!assignment;
}

/**
 * POST /promoters/me/stores/:storeId/skip-today
 */
export async function skipStoreToday(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;
    const { storeId } = req.params;
    const body = skipSchema.parse(req.body);
    const date = toISODateBRT(new Date());
    const { start, endExclusive } = dayRangeBRT(date);

    const onRoute = await assertStoreOnActiveRoute(promoterId, storeId);
    if (!onRoute) {
      return res.status(400).json({ message: 'Esta loja não está na sua rota ativa.' });
    }

    const visitToday = await prisma.visit.findFirst({
      where: {
        promoterId,
        storeId,
        checkInAt: { gte: start, lt: endExclusive },
      },
      select: { id: true, checkOutAt: true },
    });
    if (visitToday) {
      return res.status(400).json({
        message: visitToday.checkOutAt
          ? 'Você já concluiu esta loja hoje.'
          : 'Há visita aberta nesta loja. Finalize ou continue a visita.',
      });
    }

    const skip = await prisma.promoterStoreDaySkip.upsert({
      where: {
        promoterId_storeId_date: { promoterId, storeId, date },
      },
      create: {
        promoterId,
        storeId,
        date,
        reason: body.reason,
        note: body.note?.trim() || null,
      },
      update: {
        reason: body.reason,
        note: body.note?.trim() || null,
      },
      select: {
        id: true,
        storeId: true,
        date: true,
        reason: true,
        note: true,
        store: { select: { id: true, name: true } },
      },
    });

    return res.json({ skip });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('skipStoreToday error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * DELETE /promoters/me/stores/:storeId/skip-today
 */
export async function unskipStoreToday(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;
    const { storeId } = req.params;
    const date = toISODateBRT(new Date());

    const existing = await prisma.promoterStoreDaySkip.findUnique({
      where: {
        promoterId_storeId_date: { promoterId, storeId, date },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Marca não encontrada para hoje.' });
    }

    await prisma.promoterStoreDaySkip.delete({
      where: { id: existing.id },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('unskipStoreToday error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function industriesCompleteForVisits(
  promoterId: string,
  visits: Array<{ id: string; storeId: string; checkOutAt: Date | null }>
): Promise<boolean> {
  const doneVisits = visits.filter((v) => v.checkOutAt);
  if (doneVisits.length === 0) return false;

  const visitIds = doneVisits.map((v) => v.id);
  const storeIds = [...new Set(doneVisits.map((v) => v.storeId))];

  const [assignments, storeIndustries, photoIndustries, misses] = await Promise.all([
    prisma.industryAssignment.findMany({
      where: { promoterId, storeId: { in: storeIds }, isActive: true },
      select: { storeId: true, industryId: true },
    }),
    prisma.storeIndustry.findMany({
      where: { storeId: { in: storeIds }, isActive: true },
      select: { storeId: true, industryId: true },
    }),
    prisma.photoIndustry.findMany({
      where: { visitId: { in: visitIds } },
      select: { visitId: true, industryId: true },
    }),
    prisma.industryMiss.findMany({
      where: { visitId: { in: visitIds } },
      select: { visitId: true, industryId: true },
    }),
  ]);

  const requiredByStore = new Map<string, Set<string>>();
  for (const a of assignments) {
    if (!a.storeId) continue;
    const set = requiredByStore.get(a.storeId) || new Set();
    set.add(a.industryId);
    requiredByStore.set(a.storeId, set);
  }
  for (const si of storeIndustries) {
    if (requiredByStore.has(si.storeId) && (requiredByStore.get(si.storeId)?.size || 0) > 0) continue;
    const set = requiredByStore.get(si.storeId) || new Set();
    set.add(si.industryId);
    requiredByStore.set(si.storeId, set);
  }

  const coveredByVisit = new Map<string, Set<string>>();
  for (const pi of photoIndustries) {
    const set = coveredByVisit.get(pi.visitId) || new Set();
    set.add(pi.industryId);
    coveredByVisit.set(pi.visitId, set);
  }
  for (const m of misses) {
    const set = coveredByVisit.get(m.visitId) || new Set();
    set.add(m.industryId);
    coveredByVisit.set(m.visitId, set);
  }

  for (const v of doneVisits) {
    const required = requiredByStore.get(v.storeId);
    if (!required || required.size === 0) continue;
    const covered = coveredByVisit.get(v.id) || new Set();
    for (const id of required) {
      if (!covered.has(id)) return false;
    }
  }
  return true;
}

async function buildDaySnapshot(promoterId: string, dateISO: string) {
  const { start, endExclusive, cutoff } = dayRangeBRT(dateISO);

  const [route, visits, skips, quota, dayAbsence] = await Promise.all([
    prisma.routeAssignment.findMany({
      where: { promoterId, isActive: true },
      orderBy: { order: 'asc' },
      select: {
        storeId: true,
        order: true,
        store: { select: storeSelect },
      },
    }),
    prisma.visit.findMany({
      where: {
        promoterId,
        checkInAt: { gte: start, lt: endExclusive },
      },
      select: {
        id: true,
        storeId: true,
        checkInAt: true,
        checkOutAt: true,
        photos: {
          where: { type: 'OTHER' },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.promoterStoreDaySkip.findMany({
      where: { promoterId, date: dateISO },
      select: { storeId: true, reason: true, note: true },
    }),
    prisma.photoQuota.findUnique({
      where: { promoterId },
      select: { expectedPhotos: true },
    }),
    prisma.promoterDayAbsence.findUnique({
      where: { promoterId_date: { promoterId, date: dateISO } },
      select: { id: true },
    }),
  ]);

  const skipByStore = new Map(skips.map((s) => [s.storeId, s]));
  const visitsByStore = new Map<string, typeof visits>();
  for (const v of visits) {
    const list = visitsByStore.get(v.storeId) || [];
    list.push(v);
    visitsByStore.set(v.storeId, list);
  }

  type TrailItem = {
    storeId: string;
    storeName: string;
    address: string;
    order: number;
    status: TrailStatus;
    skipReason: string | null;
  };

  const trail: TrailItem[] = route.map((r) => {
    const storeVisits = visitsByStore.get(r.storeId) || [];
    const open = storeVisits.find((v) => !v.checkOutAt);
    const done = storeVisits.some((v) => !!v.checkOutAt);
    const skip = skipByStore.get(r.storeId);
    let status: TrailStatus = 'pending';
    if (open) status = 'active';
    else if (done) status = 'done';
    else if (skip) status = 'skipped';
    return {
      storeId: r.storeId,
      storeName: r.store.name,
      address: r.store.address,
      order: r.order,
      status,
      skipReason: skip?.reason ?? null,
    };
  });

  const storesTotal = trail.length;
  const storesDone = trail.filter((t) => t.status === 'done').length;
  const storesSkipped = trail.filter((t) => t.status === 'skipped').length;
  const storesActive = trail.filter((t) => t.status === 'active').length;
  const storesResolved = storesDone + storesSkipped;
  const storesPending = storesTotal - storesResolved - storesActive;
  const dayClosed = storesTotal > 0 && storesPending === 0 && storesActive === 0;

  const evidencePhotos = visits.flatMap((v) => v.photos);
  const firstEvidence = evidencePhotos[0]?.createdAt;
  const onTime = !!firstEvidence && firstEvidence.getTime() <= cutoff.getTime();
  const photoCount = evidencePhotos.length;
  const photoExpected = quota?.expectedPhotos ?? null;
  const photoQuotaMet = photoExpected != null && photoExpected > 0 && photoCount >= photoExpected;

  const industriesOk = await industriesCompleteForVisits(
    promoterId,
    visits.map((v) => ({ id: v.id, storeId: v.storeId, checkOutAt: v.checkOutAt }))
  );

  let points = storesDone * POINTS.STORE_DONE;
  if (industriesOk) points += POINTS.INDUSTRIES;
  if (onTime) points += POINTS.ON_TIME;
  if (photoQuotaMet) points += POINTS.PHOTO_QUOTA;

  const pointsMax =
    storesTotal * POINTS.STORE_DONE +
    POINTS.INDUSTRIES +
    POINTS.ON_TIME +
    (photoExpected != null && photoExpected > 0 ? POINTS.PHOTO_QUOTA : 0);

  const streakEligible = dayClosed && storesDone >= 1;

  const nextPending = trail.find((t) => t.status === 'pending');
  const nextActive = trail.find((t) => t.status === 'active');
  let nextAction: {
    type: 'continue_visit' | 'go_store' | 'day_closed' | 'no_route' | 'day_absence';
    label: string;
    storeId?: string;
    storeName?: string;
  };
  if (dayAbsence) {
    nextAction = { type: 'day_absence', label: 'Falta justificada hoje' };
  } else if (storesTotal === 0) {
    nextAction = { type: 'no_route', label: 'Configure sua rota' };
  } else if (dayClosed) {
    nextAction = { type: 'day_closed', label: 'Dia fechado' };
  } else if (nextActive) {
    nextAction = {
      type: 'continue_visit',
      label: `Continuar · ${nextActive.storeName}`,
      storeId: nextActive.storeId,
      storeName: nextActive.storeName,
    };
  } else if (nextPending) {
    nextAction = {
      type: 'go_store',
      label: `Ir para · ${nextPending.storeName}`,
      storeId: nextPending.storeId,
      storeName: nextPending.storeName,
    };
  } else {
    nextAction = { type: 'day_closed', label: 'Dia fechado' };
  }

  return {
    date: dateISO,
    hasDayAbsence: !!dayAbsence,
    ring: {
      resolved: storesResolved,
      total: storesTotal,
      percent: storesTotal > 0 ? Math.round((storesResolved / storesTotal) * 100) : 0,
    },
    indicators: {
      stores: {
        label: 'Lojas',
        done: storesResolved,
        total: storesTotal,
        detail: `${storesDone} feitas · ${storesSkipped} não feitas`,
        complete: dayClosed,
      },
      industries: {
        label: 'Indústrias',
        done: industriesOk ? 1 : 0,
        total: 1,
        detail: industriesOk
          ? 'Cobertura completa nas visitas'
          : storesDone === 0
            ? 'Conclua uma visita com indústrias'
            : 'Falta foto ou justificativa',
        complete: industriesOk,
      },
      onTime: {
        label: 'Prazo',
        done: onTime ? 1 : 0,
        total: 1,
        detail: onTime ? `Evidência até ${CUTOFF_HOUR_BRT}:00` : `Envie evidência até ${CUTOFF_HOUR_BRT}:00`,
        complete: onTime,
      },
      ...(photoExpected != null && photoExpected > 0
        ? {
            photos: {
              label: 'Fotos',
              done: Math.min(photoCount, photoExpected),
              total: photoExpected,
              detail: `${photoCount}/${photoExpected} fotos`,
              complete: photoQuotaMet,
            },
          }
        : {}),
    },
    trail,
    points,
    pointsMax,
    streakEligible,
    nextAction,
    stats: {
      storesDone,
      storesSkipped,
      storesActive,
      storesPending: Math.max(0, storesPending),
      photoCount,
    },
  };
}

async function isStreakDay(promoterId: string, dateISO: string): Promise<boolean | 'no_route'> {
  const { start, endExclusive } = dayRangeBRT(dateISO);
  const [routeCount, skips, visits] = await Promise.all([
    prisma.routeAssignment.count({ where: { promoterId, isActive: true } }),
    prisma.promoterStoreDaySkip.findMany({
      where: { promoterId, date: dateISO },
      select: { storeId: true },
    }),
    prisma.visit.findMany({
      where: {
        promoterId,
        checkInAt: { gte: start, lt: endExclusive },
      },
      select: { storeId: true, checkOutAt: true },
    }),
  ]);
  if (routeCount === 0) return 'no_route';

  const route = await prisma.routeAssignment.findMany({
    where: { promoterId, isActive: true },
    select: { storeId: true },
  });
  const skipSet = new Set(skips.map((s) => s.storeId));
  const doneSet = new Set(visits.filter((v) => v.checkOutAt).map((v) => v.storeId));
  const activeSet = new Set(visits.filter((v) => !v.checkOutAt).map((v) => v.storeId));

  for (const r of route) {
    if (activeSet.has(r.storeId)) return false;
    if (!doneSet.has(r.storeId) && !skipSet.has(r.storeId)) return false;
  }
  return doneSet.size >= 1;
}

async function computeStreak(promoterId: string, todayISO: string): Promise<number> {
  let streak = 0;
  let cursor = todayISO;
  const today = await isStreakDay(promoterId, todayISO);
  if (today === false) {
    cursor = shiftDateISO(todayISO, -1);
  } else if (today === true) {
    streak = 1;
    cursor = shiftDateISO(todayISO, -1);
  } else {
    // no_route today — start from yesterday
    cursor = shiftDateISO(todayISO, -1);
  }

  for (let i = 0; i < 29; i++) {
    const result = await isStreakDay(promoterId, cursor);
    if (result === 'no_route') {
      cursor = shiftDateISO(cursor, -1);
      continue;
    }
    if (!result) break;
    streak += 1;
    cursor = shiftDateISO(cursor, -1);
  }
  return streak;
}

/**
 * GET /promoters/me/day-board
 */
export async function getDayBoard(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;
    const date = toISODateBRT(new Date());
    const board = await buildDaySnapshot(promoterId, date);
    const streakDays = await computeStreak(promoterId, date);
    return res.json({ ...board, streakDays });
  } catch (error) {
    console.error('getDayBoard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
