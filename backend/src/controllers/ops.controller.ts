import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { isPromoterInSupervisorScope, scopedPromoterWhere } from '../utils/supervisorScope';

// BRT helper (fixed offset). Keep simple and explicit: date strings are treated as BRT.
function dayRangeBRT(dateISO: string): { start: Date; endExclusive: Date; cutoff: Date } {
  const start = new Date(`${dateISO}T00:00:00-03:00`);
  const endExclusive = new Date(`${dateISO}T00:00:00-03:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const cutoff = new Date(`${dateISO}T20:00:00-03:00`);
  return { start, endExclusive, cutoff };
}

function toISODateBRT(d: Date): string {
  // Convert to BRT date label without libs
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

type StatusLabel = 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' | 'Sem envio';
type DeliveryStatus = 'enviado' | 'sem_envio';
type DeadlineStatus = 'no_prazo' | 'fora_do_prazo' | 'sem_envio';

function promoterStatus(params: {
  sent: boolean;
  executionPct: number; // 0-100
  evidenceQualityPct: number; // 0-100
}): { label: StatusLabel; bucket: 'excellent' | 'good' | 'attention' | 'critical' | 'no_send' } {
  if (!params.sent) return { label: 'Sem envio', bucket: 'no_send' };
  const exec = params.executionPct;
  const qual = params.evidenceQualityPct;
  if (exec >= 90 && qual >= 70) return { label: 'Excelente', bucket: 'excellent' };
  if (exec >= 80) return { label: 'Bom', bucket: 'good' };
  if (exec >= 70 || qual < 70) return { label: 'Atenção', bucket: 'attention' };
  return { label: 'Crítico', bucket: 'critical' };
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

const teamTodayQuerySchema = z.object({
  state: z.string().min(1).max(2).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function opsTeamToday(req: AuthRequest, res: Response) {
  try {
    if (req.userRole !== UserRole.SUPERVISOR && req.userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Supervisor or Admin access required' });
    }

    const { state, date } = teamTodayQuerySchema.parse(req.query);
    const targetDate = date ?? toISODateBRT(new Date());
    const { start, endExclusive, cutoff } = dayRangeBRT(targetDate);
    const isAdmin = req.userRole === UserRole.ADMIN;

    const promoters = await prisma.user.findMany({
      where: scopedPromoterWhere({ isAdmin, supervisorId: req.userId, state }),
      select: { id: true, name: true, email: true, state: true },
      orderBy: { name: 'asc' },
    });
    const promoterIds = promoters.map((p) => p.id);

    // Visits in day (for store linkage)
    const visits = await prisma.visit.findMany({
      where: {
        promoterId: { in: promoterIds },
        checkInAt: { gte: start, lt: endExclusive },
      },
      select: {
        id: true,
        promoterId: true,
        storeId: true,
        checkInAt: true,
        checkOutAt: true,
        store: { select: { id: true, name: true, address: true } },
      },
      orderBy: { checkInAt: 'asc' },
    });

    const visitIds = visits.map((v) => v.id);
    const storeIds = Array.from(new Set(visits.map((v) => v.storeId)));

    // Work photos (OTHER) in day
    const photos = await prisma.photo.findMany({
      where: {
        visitId: { in: visitIds },
        type: 'OTHER',
        createdAt: { gte: start, lt: endExclusive },
      },
      select: {
        id: true,
        visitId: true,
        url: true,
        createdAt: true,
        industryId: true,
        selectedIndustryId: true,
        photoIndustries: { select: { industryId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Required industries (prefer IndustryAssignment per promoter+store, else StoreIndustry)
    const [assignments, storeIndustries] = await Promise.all([
      prisma.industryAssignment.findMany({
        where: {
          promoterId: { in: promoterIds },
          storeId: { in: storeIds },
          isActive: true,
        },
        select: { promoterId: true, storeId: true, industry: { select: { id: true, name: true, code: true } } },
      }),
      prisma.storeIndustry.findMany({
        where: { storeId: { in: storeIds }, isActive: true },
        select: { storeId: true, industry: { select: { id: true, name: true, code: true } } },
      }),
    ]);

    const assignByPromoterStore = new Map<string, Array<{ id: string; name: string; code: string }>>();
    for (const a of assignments) {
      if (!a.storeId) continue;
      const key = `${a.promoterId}:${a.storeId}`;
      assignByPromoterStore.set(key, [...(assignByPromoterStore.get(key) || []), a.industry]);
    }
    const storeIndByStore = new Map<string, Array<{ id: string; name: string; code: string }>>();
    for (const si of storeIndustries) {
      storeIndByStore.set(si.storeId, [...(storeIndByStore.get(si.storeId) || []), si.industry]);
    }

    const photosByVisit = new Map<string, typeof photos>();
    for (const p of photos) {
      photosByVisit.set(p.visitId, [...(photosByVisit.get(p.visitId) || []), p]);
    }

    // Compute per promoter aggregates
    const promoterAgg = new Map<
      string,
      {
        firstSentAt: Date | null;
        photoCount: number;
        validPhotoCount: number;
        visitsCount: number;
        coveredStores: Set<string>;
        executionNumerator: number;
        executionDenominator: number;
      }
    >();
    for (const pr of promoters) {
      promoterAgg.set(pr.id, {
        firstSentAt: null,
        photoCount: 0,
        validPhotoCount: 0,
        visitsCount: 0,
        coveredStores: new Set(),
        executionNumerator: 0,
        executionDenominator: 0,
      });
    }

    const rows: Array<{
      promoter: { id: string; name: string; email: string; state: string | null };
      store: { id: string; name: string; address: string } | null;
      industry: { id: string; name: string; code: string } | null;
      deliveryStatus: DeliveryStatus;
      deadlineStatus: DeadlineStatus;
      firstSentAt: string | null;
      photoCount: number;
      executionPct: number | null; // per store/industry row, we can show store execution or promoter execution
      statusLabel: StatusLabel;
      statusBucket: string;
    }> = [];

    // Per visit: compute coverage and build rows per required industry
    for (const v of visits) {
      const promoter = promoters.find((p) => p.id === v.promoterId);
      if (!promoter) continue;
      const agg = promoterAgg.get(promoter.id)!;
      agg.visitsCount += 1;

      const vPhotos = photosByVisit.get(v.id) || [];
      if (vPhotos.length > 0) agg.coveredStores.add(v.storeId);

      const firstSentAt = vPhotos.length > 0 ? vPhotos[0].createdAt : null;
      if (firstSentAt && (!agg.firstSentAt || firstSentAt.getTime() < agg.firstSentAt.getTime())) {
        agg.firstSentAt = firstSentAt;
      }
      agg.photoCount += vPhotos.length;

      const valid = vPhotos.filter((p) => {
        if (!p.url || p.url.includes('placeholder.com')) return false;
        if (p.photoIndustries?.length && p.photoIndustries.length > 0) return true;
        if (p.selectedIndustryId) return true;
        if (p.industryId) return true;
        return false;
      }).length;
      agg.validPhotoCount += valid;

      const requiredIndustries =
        assignByPromoterStore.get(`${promoter.id}:${v.storeId}`) ??
        storeIndByStore.get(v.storeId) ??
        [];
      const requiredUnique = Array.from(new Map(requiredIndustries.map((i) => [i.id, i])).values());

      const coveredIndustryIds = new Set<string>();
      for (const p of vPhotos) {
        for (const pi of p.photoIndustries || []) coveredIndustryIds.add(pi.industryId);
        if (p.selectedIndustryId) coveredIndustryIds.add(p.selectedIndustryId);
        if (p.industryId) coveredIndustryIds.add(p.industryId);
      }

      const coveredCount = requiredUnique.filter((i) => coveredIndustryIds.has(i.id)).length;
      if (requiredUnique.length > 0) {
        agg.executionNumerator += coveredCount;
        agg.executionDenominator += requiredUnique.length;
      }

      const storeExecutionPct =
        requiredUnique.length > 0 ? Math.round((coveredCount / requiredUnique.length) * 100) : null;

      for (const ind of requiredUnique) {
        const indPhotoCount = vPhotos.filter((p) => {
          if (p.photoIndustries?.some((pi) => pi.industryId === ind.id)) return true;
          if (p.selectedIndustryId === ind.id) return true;
          if (p.industryId === ind.id) return true;
          return false;
        }).length;

        const deliveryStatus: DeliveryStatus = indPhotoCount > 0 ? 'enviado' : 'sem_envio';

        rows.push({
          promoter,
          store: v.store,
          industry: ind,
          deliveryStatus,
          deadlineStatus: 'sem_envio',
          firstSentAt: firstSentAt ? firstSentAt.toISOString() : null,
          photoCount: indPhotoCount,
          executionPct: storeExecutionPct,
          statusLabel: 'Atenção',
          statusBucket: 'attention',
        });
      }
    }

    // Promoters without visits today -> one row for fast ops view
    for (const p of promoters) {
      const agg = promoterAgg.get(p.id)!;
      if (agg.visitsCount > 0) continue;
      rows.push({
        promoter: p,
        store: null,
        industry: null,
        deliveryStatus: 'sem_envio',
        deadlineStatus: 'sem_envio',
        firstSentAt: null,
        photoCount: 0,
        executionPct: null,
        statusLabel: 'Sem envio',
        statusBucket: 'no_send',
      });
    }

    // Final status per promoter, apply to each row
    const promoterStatusById = new Map<string, ReturnType<typeof promoterStatus> & { executionPct: number; qualityPct: number; deadlineStatus: DeadlineStatus }>();
    for (const p of promoters) {
      const agg = promoterAgg.get(p.id)!;
      const sent = (agg.photoCount || 0) > 0;
      const executionPct =
        agg.executionDenominator > 0 ? Math.round((agg.executionNumerator / agg.executionDenominator) * 100) : sent ? 100 : 0;
      const qualityPct = agg.photoCount > 0 ? Math.round((agg.validPhotoCount / agg.photoCount) * 100) : 0;
      const ps = promoterStatus({ sent, executionPct, evidenceQualityPct: qualityPct });
      const deadlineStatus: DeadlineStatus =
        !sent ? 'sem_envio' : agg.firstSentAt && agg.firstSentAt.getTime() <= cutoff.getTime() ? 'no_prazo' : 'fora_do_prazo';
      promoterStatusById.set(p.id, { ...ps, executionPct, qualityPct, deadlineStatus });
    }

    const rowsEnriched = rows.map((r) => {
      const st = promoterStatusById.get(r.promoter.id)!;
      return {
        ...r,
        deadlineStatus: st.deadlineStatus,
        executionPct: r.executionPct ?? st.executionPct,
        statusLabel: st.label,
        statusBucket: st.bucket,
      };
    });

    const nonSenders = promoters
      .filter((p) => {
        const agg = promoterAgg.get(p.id)!;
        return (agg.photoCount || 0) === 0;
      })
      .map((p) => ({
        promoter: p,
        badge: 'COBRAR',
      }));

    const sentPromotersCount = promoters.filter((p) => (promoterAgg.get(p.id)!.photoCount || 0) > 0).length;
    const onTimeCount = promoters.filter((p) => promoterStatusById.get(p.id)!.deadlineStatus === 'no_prazo').length;
    const lateCount = promoters.filter((p) => promoterStatusById.get(p.id)!.deadlineStatus === 'fora_do_prazo').length;
    const coveredStores = new Set<string>();
    for (const p of promoters) {
      for (const sid of promoterAgg.get(p.id)!.coveredStores) coveredStores.add(sid);
    }

    const allPhotosCount = photos.length;
    const allValidPhotosCount = photos.filter((p) => {
      if (!p.url || p.url.includes('placeholder.com')) return false;
      if (p.photoIndustries?.length && p.photoIndustries.length > 0) return true;
      if (p.selectedIndustryId) return true;
      if (p.industryId) return true;
      return false;
    }).length;
    const avgQuality = allPhotosCount > 0 ? Math.round((allValidPhotosCount / allPhotosCount) * 100) : 0;

    res.json({
      date: targetDate,
      state: state ?? null,
      cutoffTime: '20:00 BRT',
      summary: {
        promotersScheduledToday: promoters.length,
        promotersSentPhoto: sentPromotersCount,
        promotersNoSend: promoters.length - sentPromotersCount,
        promotersOnTime: onTimeCount,
        promotersLate: lateCount,
        storesCovered: coveredStores.size,
        averageEvidenceQuality: avgQuality,
      },
      rows: rowsEnriched,
      nonSenders,
      promoterStats: Array.from(promoterStatusById.entries()).map(([promoterId, st]) => ({
        promoterId,
        executionPct: st.executionPct,
        qualityPct: st.qualityPct,
        deadlineStatus: st.deadlineStatus,
        statusLabel: st.label,
        statusBucket: st.bucket,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('opsTeamToday error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const tradeMetricsQuerySchema = teamTodayQuerySchema;

export async function opsTradeMetrics(req: AuthRequest, res: Response) {
  try {
    if (req.userRole !== UserRole.SUPERVISOR && req.userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Supervisor or Admin access required' });
    }

    const { state, date } = tradeMetricsQuerySchema.parse(req.query);
    const targetDate = date ?? toISODateBRT(new Date());
    const { start, endExclusive, cutoff } = dayRangeBRT(targetDate);
    const isAdmin = req.userRole === UserRole.ADMIN;

    const promoters = await prisma.user.findMany({
      where: scopedPromoterWhere({ isAdmin, supervisorId: req.userId, state }),
      select: { id: true, name: true, email: true, state: true },
      orderBy: { name: 'asc' },
    });
    const promoterIds = promoters.map((p) => p.id);

    const visits = await prisma.visit.findMany({
      where: {
        promoterId: { in: promoterIds },
        checkInAt: { gte: start, lt: endExclusive },
      },
      select: { id: true, promoterId: true, store: { select: { id: true, name: true } } },
    });
    const visitIds = visits.map((v) => v.id);

    const photos = await prisma.photo.findMany({
      where: {
        visitId: { in: visitIds },
        type: 'OTHER',
        createdAt: { gte: start, lt: endExclusive },
      },
      select: {
        id: true,
        visitId: true,
        url: true,
        createdAt: true,
        industryId: true,
        selectedIndustryId: true,
        photoIndustries: { select: { industryId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const priceResearch = await prisma.priceResearch.findMany({
      where: {
        visitId: { in: visitIds },
        createdAt: { gte: start, lt: endExclusive },
      },
      select: { id: true, visitId: true },
    });
    const priceByVisit = new Map<string, number>();
    for (const pr of priceResearch) {
      priceByVisit.set(pr.visitId, (priceByVisit.get(pr.visitId) || 0) + 1);
    }

    const photosByPromoter = new Map<string, typeof photos>();
    const visitsById = new Map(visits.map((v) => [v.id, v]));
    for (const p of photos) {
      const v = visitsById.get(p.visitId);
      if (!v) continue;
      photosByPromoter.set(v.promoterId, [...(photosByPromoter.get(v.promoterId) || []), p]);
    }

    const visitsByPromoter = new Map<string, typeof visits>();
    for (const v of visits) {
      visitsByPromoter.set(v.promoterId, [...(visitsByPromoter.get(v.promoterId) || []), v]);
    }

    // Execution proxy: evidence coverage over required industries across visits
    const storeIds = Array.from(new Set(visits.map((v) => v.store.id)));
    const [assignments, storeIndustries] = await Promise.all([
      prisma.industryAssignment.findMany({
        where: {
          promoterId: { in: promoterIds },
          storeId: { in: storeIds },
          isActive: true,
        },
        select: { promoterId: true, storeId: true, industryId: true },
      }),
      prisma.storeIndustry.findMany({
        where: { storeId: { in: storeIds }, isActive: true },
        select: { storeId: true, industryId: true },
      }),
    ]);
    const assignIdsByPromoterStore = new Map<string, string[]>();
    for (const a of assignments) {
      if (!a.storeId) continue;
      const k = `${a.promoterId}:${a.storeId}`;
      assignIdsByPromoterStore.set(k, [...(assignIdsByPromoterStore.get(k) || []), a.industryId]);
    }
    const storeIndIdsByStore = new Map<string, string[]>();
    for (const si of storeIndustries) {
      storeIndIdsByStore.set(si.storeId, [...(storeIndIdsByStore.get(si.storeId) || []), si.industryId]);
    }

    const photoIndustries = await prisma.photoIndustry.findMany({
      where: { visitId: { in: visitIds } },
      select: { visitId: true, industryId: true },
    });
    const coveredByVisit = new Map<string, Set<string>>();
    for (const pi of photoIndustries) {
      if (!coveredByVisit.has(pi.visitId)) coveredByVisit.set(pi.visitId, new Set());
      coveredByVisit.get(pi.visitId)!.add(pi.industryId);
    }

    const promoterScores = promoters.map((p) => {
      const pVisits = visitsByPromoter.get(p.id) || [];
      const pPhotos = photosByPromoter.get(p.id) || [];
      const sent = pPhotos.length > 0;
      const firstSentAt = sent ? pPhotos[0].createdAt : null;
      const onTime = sent && firstSentAt!.getTime() <= cutoff.getTime();

      // execution
      let num = 0;
      let den = 0;
      for (const v of pVisits) {
        const required =
          assignIdsByPromoterStore.get(`${p.id}:${v.store.id}`) ??
          storeIndIdsByStore.get(v.store.id) ??
          [];
        const reqUnique = Array.from(new Set(required));
        if (reqUnique.length === 0) continue;
        const covered = coveredByVisit.get(v.id) || new Set<string>();
        num += reqUnique.filter((id) => covered.has(id)).length;
        den += reqUnique.length;
      }
      const executionPct = den > 0 ? Math.round((num / den) * 100) : sent ? 100 : 0;

      // quality
      const valid = pPhotos.filter((ph) => {
        if (!ph.url || ph.url.includes('placeholder.com')) return false;
        if (ph.photoIndustries?.length && ph.photoIndustries.length > 0) return true;
        if (ph.selectedIndustryId) return true;
        if (ph.industryId) return true;
        return false;
      }).length;
      const qualityPct = pPhotos.length > 0 ? Math.round((valid / pPhotos.length) * 100) : 0;

      // price audit proxy
      const priceCount = pVisits.reduce((acc, v) => acc + (priceByVisit.get(v.id) || 0), 0);

      // normalize pieces
      const adherenceScore = sent ? (onTime ? 1 : 0.6) : 0;
      const executionScore = clamp01(executionPct / 100);
      const qualityScore = clamp01(qualityPct / 100);
      const priceScore = clamp01(priceCount / 3); // 3+ researches ~ max for the day (heuristic)

      const score = Math.round((0.3 * adherenceScore + 0.3 * executionScore + 0.2 * qualityScore + 0.2 * priceScore) * 100);

      const risk =
        !sent ||
        !onTime ||
        executionPct < 75 ||
        (pPhotos.length > 0 && valid / pPhotos.length < 0.5);

      const mainStore = pVisits[0]?.store ?? null;

      return {
        promoter: p,
        store: mainStore,
        sent,
        onTime,
        firstSentAt: firstSentAt?.toISOString() ?? null,
        photosValid: valid,
        photosTotal: pPhotos.length,
        executionPct,
        priceAuditCount: priceCount,
        pointExtraActive: 0,
        shelfSharePct: null as number | null,
        ruptureCount: 0,
        score,
        risk,
      };
    });

    promoterScores.sort((a, b) => b.score - a.score);

    const avgExecution =
      promoterScores.length > 0
        ? Math.round(promoterScores.reduce((acc, p) => acc + p.executionPct, 0) / promoterScores.length)
        : 0;
    const photosUsefulPct =
      promoterScores.reduce((acc, p) => acc + p.photosTotal, 0) > 0
        ? Math.round(
            (promoterScores.reduce((acc, p) => acc + p.photosValid, 0) /
              promoterScores.reduce((acc, p) => acc + p.photosTotal, 0)) *
              100
          )
        : 0;

    res.json({
      date: targetDate,
      state: state ?? null,
      cutoffTime: '20:00 BRT',
      cards: {
        averageStoreExecutionPct: avgExecution,
        rupturesIdentified: 0,
        priceAudits: promoterScores.reduce((acc, p) => acc + p.priceAuditCount, 0),
        storesWithPointExtra: 0,
        shelfShareAvgPct: null,
        usablePhotosPct: photosUsefulPct,
      },
      ranking: promoterScores.map((p, idx) => ({
        position: idx + 1,
        promoter: p.promoter,
        store: p.store,
        status: p.score >= 85 ? 'Bom' : p.score >= 70 ? 'Atenção' : 'Crítico',
        executionPct: p.executionPct,
        photosValid: p.photosValid,
        photosTotal: p.photosTotal,
        priceAuditCount: p.priceAuditCount,
        pointExtraActive: p.pointExtraActive,
        shelfSharePct: p.shelfSharePct,
        ruptureCount: p.ruptureCount,
        score: p.score,
      })),
      riskPromoters: promoterScores
        .filter((p) => p.risk)
        .map((p) => ({
          promoter: p.promoter,
          store: p.store,
          executionPct: p.executionPct,
          photosValid: p.photosValid,
          ruptureCount: p.ruptureCount,
        })),
      notes: {
        placeholders: ['rupture', 'pointExtra', 'shelfShare'],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('opsTradeMetrics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const promoterDaySchema = z.object({
  promoterId: z.string().uuid(),
});
const promoterDayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function opsPromoterDayDetail(req: AuthRequest, res: Response) {
  try {
    if (req.userRole !== UserRole.SUPERVISOR && req.userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Supervisor or Admin access required' });
    }

    const { promoterId } = promoterDaySchema.parse(req.params);
    const { date } = promoterDayQuerySchema.parse(req.query);
    const targetDate = date ?? toISODateBRT(new Date());
    const { start, endExclusive, cutoff } = dayRangeBRT(targetDate);

    const promoter = await prisma.user.findUnique({
      where: { id: promoterId },
      select: { id: true, name: true, email: true, state: true, role: true },
    });
    if (!promoter || promoter.role !== UserRole.PROMOTER) {
      return res.status(404).json({ message: 'Promotor não encontrado' });
    }

    const isAdmin = req.userRole === UserRole.ADMIN;
    if (!isAdmin && req.userId) {
      const inScope = await isPromoterInSupervisorScope(req.userId, promoterId);
      if (!inScope) {
        return res.status(403).json({ message: 'Promotor fora da sua equipe' });
      }
    }

    const visits = await prisma.visit.findMany({
      where: { promoterId, checkInAt: { gte: start, lt: endExclusive } },
      include: {
        store: { select: { id: true, name: true, address: true } },
      },
      orderBy: { checkInAt: 'asc' },
    });
    const visitIds = visits.map((v) => v.id);
    const storeIds = Array.from(new Set(visits.map((v) => v.storeId)));

    const photos = await prisma.photo.findMany({
      where: { visitId: { in: visitIds }, type: 'OTHER', createdAt: { gte: start, lt: endExclusive } },
      select: {
        id: true,
        visitId: true,
        url: true,
        createdAt: true,
        industryId: true,
        selectedIndustryId: true,
        photoIndustries: { select: { industryId: true, industry: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const [assignments, storeIndustries] = await Promise.all([
      prisma.industryAssignment.findMany({
        where: { promoterId, storeId: { in: storeIds }, isActive: true },
        select: { storeId: true, industry: { select: { id: true, name: true, code: true } } },
      }),
      prisma.storeIndustry.findMany({
        where: { storeId: { in: storeIds }, isActive: true },
        select: { storeId: true, industry: { select: { id: true, name: true, code: true } } },
      }),
    ]);
    const assignByStore = new Map<string, Array<{ id: string; name: string; code: string }>>();
    for (const a of assignments) {
      if (!a.storeId) continue;
      assignByStore.set(a.storeId, [...(assignByStore.get(a.storeId) || []), a.industry]);
    }
    const storeIndByStore = new Map<string, Array<{ id: string; name: string; code: string }>>();
    for (const si of storeIndustries) {
      storeIndByStore.set(si.storeId, [...(storeIndByStore.get(si.storeId) || []), si.industry]);
    }

    const photosByVisit = new Map<string, typeof photos>();
    for (const p of photos) {
      photosByVisit.set(p.visitId, [...(photosByVisit.get(p.visitId) || []), p]);
    }

    let firstSentAt: Date | null = null;
    let totalPhotos = 0;
    let validPhotos = 0;
    let execNum = 0;
    let execDen = 0;

    const visitDetails: Array<{
      visitId: string;
      store: { id: string; name: string; address: string };
      checkInAt: Date;
      checkOutAt: Date | null;
      requiredIndustries: Array<{ id: string; name: string; code: string }>;
      coveredIndustries: Array<{ id: string; name: string; code: string }>;
      pendingIndustries: Array<{ id: string; name: string; code: string }>;
      photoCount: number;
    }> = [];

    for (const v of visits) {
      const vPhotos = photosByVisit.get(v.id) || [];
      if (vPhotos.length > 0) {
        const candidate = vPhotos[0]!.createdAt;
        if (!firstSentAt || candidate.getTime() < firstSentAt.getTime()) firstSentAt = candidate;
      }

      totalPhotos += vPhotos.length;
      validPhotos += vPhotos.filter((p) => {
        if (!p.url || p.url.includes('placeholder.com')) return false;
        if (p.photoIndustries?.length && p.photoIndustries.length > 0) return true;
        if (p.selectedIndustryId) return true;
        if (p.industryId) return true;
        return false;
      }).length;

      const required = assignByStore.get(v.storeId) ?? storeIndByStore.get(v.storeId) ?? [];
      const requiredUnique = Array.from(new Map(required.map((i) => [i.id, i])).values());

      const covered = new Set<string>();
      for (const p of vPhotos) {
        for (const pi of p.photoIndustries || []) covered.add(pi.industryId);
        if (p.selectedIndustryId) covered.add(p.selectedIndustryId);
        if (p.industryId) covered.add(p.industryId);
      }
      const coveredCount = requiredUnique.filter((i) => covered.has(i.id)).length;
      if (requiredUnique.length > 0) {
        execNum += coveredCount;
        execDen += requiredUnique.length;
      }

      visitDetails.push({
        visitId: v.id,
        store: v.store,
        checkInAt: v.checkInAt,
        checkOutAt: v.checkOutAt,
        requiredIndustries: requiredUnique,
        coveredIndustries: requiredUnique.filter((i) => covered.has(i.id)),
        pendingIndustries: requiredUnique.filter((i) => !covered.has(i.id)),
        photoCount: vPhotos.length,
      });
    }

    const sent = totalPhotos > 0;
    const executionPct = execDen > 0 ? Math.round((execNum / execDen) * 100) : sent ? 100 : 0;
    const qualityPct = totalPhotos > 0 ? Math.round((validPhotos / totalPhotos) * 100) : 0;
    const ps = promoterStatus({ sent, executionPct, evidenceQualityPct: qualityPct });
    const onTime = sent && firstSentAt != null && firstSentAt.getTime() <= cutoff.getTime();
    const deadlineStatus: DeadlineStatus = !sent ? 'sem_envio' : onTime ? 'no_prazo' : 'fora_do_prazo';

    const priceAudits = await prisma.priceResearch.findMany({
      where: { visitId: { in: visitIds }, createdAt: { gte: start, lt: endExclusive } },
      select: { id: true, visitId: true, storeId: true, productName: true, price: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      date: targetDate,
      cutoffTime: '20:00 BRT',
      promoter,
      headline: {
        sentToday: sent,
        onTime,
        firstSentAt: firstSentAt ? firstSentAt.toISOString() : null,
        deadlineStatus,
        statusLabel: ps.label,
        statusBucket: ps.bucket,
      },
      cards: {
        photosValid: validPhotos,
        photosTotal: totalPhotos,
        evidenceQualityPct: qualityPct,
        executionPct,
        priceAuditCount: priceAudits.length,
        rupture: 0,
        pointExtra: 0,
        shelfSharePct: null as number | null,
      },
      visits: visitDetails,
      photos: photos.map((p) => ({
        id: p.id,
        url: p.url,
        createdAt: p.createdAt,
        industries: (p.photoIndustries || []).map((pi) => pi.industry),
        isValid: !!p.url && !p.url.includes('placeholder.com') && ((p.photoIndustries?.length || 0) > 0 || !!p.selectedIndustryId || !!p.industryId),
      })),
      priceAudits,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('opsPromoterDayDetail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

