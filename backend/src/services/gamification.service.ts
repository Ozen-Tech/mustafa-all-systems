import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import {
  buildDaySnapshot,
  computeStreak,
  dayRangeBRT,
  shiftDateISO,
  toISODateBRT,
} from '../controllers/dayBoard.controller';

/** XP é separado dos pontos do ranking semanal: baús e conquistas nunca mudam a classificação. */
export const XP = {
  STORE_DONE: 30,
  INDUSTRY_BASE: 5,
  PRICE_RESEARCH: 3,
  PRICE_NEW_PRODUCT: 5,
  ON_TIME: 15,
  PHOTO_QUOTA: 10,
  DAY_CLOSED: 40,
} as const;

type Rarity = 'COMMON' | 'RARE' | 'EPIC';
type ChestKind = 'STORE' | 'DAY';

/** Chances publicadas no app (tela do baú mostra esta tabela). */
export const CHEST_TABLE: Record<ChestKind, Array<{ rarity: Rarity; weight: number; min: number; max: number }>> = {
  STORE: [
    { rarity: 'COMMON', weight: 70, min: 5, max: 10 },
    { rarity: 'RARE', weight: 25, min: 15, max: 25 },
    { rarity: 'EPIC', weight: 5, min: 40, max: 50 },
  ],
  DAY: [
    { rarity: 'COMMON', weight: 50, min: 15, max: 25 },
    { rarity: 'RARE', weight: 35, min: 30, max: 45 },
    { rarity: 'EPIC', weight: 15, min: 60, max: 80 },
  ],
};

const RARITY_LABEL: Record<Rarity, string> = { COMMON: 'comum', RARE: 'raro', EPIC: 'épico' };
const ACHIEVEMENT_XP: Record<Rarity, number> = { COMMON: 20, RARE: 50, EPIC: 100 };

const LEVEL_TITLES: Array<[number, string]> = [
  [1, 'Novato'],
  [3, 'Promotor Raiz'],
  [5, 'Caçador de Gôndola'],
  [8, 'Ás do PDV'],
  [12, 'Mestre da Gôndola'],
  [16, 'Lenda do Varejo'],
  [20, 'Mito Mustafa'],
];

type AchievementCtx = {
  storesDone: number;
  daysClosed: number;
  priceResearch: number;
  streak: number;
  maxCombo: number;
  earlyBird: boolean;
  epicChest: boolean;
  level: number;
};

type AchievementDef = {
  code: string;
  icon: string;
  title: string;
  description: string;
  rarity: Rarity;
  secret?: boolean;
  goal?: (ctx: AchievementCtx) => { value: number; target: number };
  check: (ctx: AchievementCtx) => boolean;
};

const count = (value: number, target: number) => ({ value: Math.min(value, target), target });

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'FIRST_STORE', icon: '🏁', title: 'Primeira loja', description: 'Conclua sua primeira loja no app', rarity: 'COMMON', goal: (c) => count(c.storesDone, 1), check: (c) => c.storesDone >= 1 },
  { code: 'STORES_50', icon: '🏪', title: 'Rodado', description: 'Conclua 50 lojas', rarity: 'RARE', goal: (c) => count(c.storesDone, 50), check: (c) => c.storesDone >= 50 },
  { code: 'STORES_200', icon: '🏬', title: 'Dono da rota', description: 'Conclua 200 lojas', rarity: 'EPIC', goal: (c) => count(c.storesDone, 200), check: (c) => c.storesDone >= 200 },
  { code: 'STREAK_3', icon: '🔥', title: 'Esquentando', description: '3 dias seguidos com a rota fechada', rarity: 'COMMON', goal: (c) => count(c.streak, 3), check: (c) => c.streak >= 3 },
  { code: 'STREAK_7', icon: '🔥', title: 'Semana perfeita', description: '7 dias seguidos com a rota fechada', rarity: 'RARE', goal: (c) => count(c.streak, 7), check: (c) => c.streak >= 7 },
  { code: 'STREAK_30', icon: '🌋', title: 'Imparável', description: '30 dias seguidos com a rota fechada', rarity: 'EPIC', goal: (c) => count(c.streak, 30), check: (c) => c.streak >= 30 },
  { code: 'DAYS_CLOSED_10', icon: '✅', title: 'Dia fechado x10', description: 'Feche a rota inteira em 10 dias', rarity: 'RARE', goal: (c) => count(c.daysClosed, 10), check: (c) => c.daysClosed >= 10 },
  { code: 'PRICE_10', icon: '🏷️', title: 'Olho no preço', description: 'Registre 10 pesquisas de preço', rarity: 'COMMON', goal: (c) => count(c.priceResearch, 10), check: (c) => c.priceResearch >= 10 },
  { code: 'PRICE_100', icon: '💰', title: 'Radar de preços', description: 'Registre 100 pesquisas de preço', rarity: 'RARE', goal: (c) => count(c.priceResearch, 100), check: (c) => c.priceResearch >= 100 },
  { code: 'COMBO_5', icon: '⚡', title: 'Combo x2', description: 'Fotografe 5 ou mais indústrias numa mesma visita', rarity: 'RARE', goal: (c) => count(c.maxCombo, 5), check: (c) => c.maxCombo >= 5 },
  { code: 'LEVEL_5', icon: '⭐', title: 'Nível 5', description: 'Alcance o nível 5', rarity: 'COMMON', goal: (c) => count(c.level, 5), check: (c) => c.level >= 5 },
  { code: 'LEVEL_10', icon: '🌟', title: 'Nível 10', description: 'Alcance o nível 10', rarity: 'EPIC', goal: (c) => count(c.level, 10), check: (c) => c.level >= 10 },
  { code: 'EARLY_BIRD', icon: '🌅', title: 'Madrugador', description: 'Envie uma evidência antes das 8h', rarity: 'RARE', secret: true, check: (c) => c.earlyBird },
  { code: 'EPIC_CHEST', icon: '💎', title: 'Sortudo', description: 'Abra um baú épico', rarity: 'RARE', secret: true, check: (c) => c.epicChest },
];

const ACHIEVEMENT_BY_CODE = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

export function levelFloorXp(level: number): number {
  return 50 * (level - 1) * level;
}

export function levelInfo(xp: number) {
  let level = 1;
  while (levelFloorXp(level + 1) <= xp) level += 1;
  const floor = levelFloorXp(level);
  const next = levelFloorXp(level + 1);
  const title = [...LEVEL_TITLES].reverse().find(([min]) => level >= min)?.[1] ?? 'Novato';
  return {
    level,
    title,
    xp,
    levelStartXp: floor,
    nextLevelXp: next,
    progress: next > floor ? (xp - floor) / (next - floor) : 0,
  };
}

function comboMultiplier(position: number): number {
  if (position >= 5) return 2;
  if (position >= 3) return 1.5;
  return 1;
}

export function comboXp(industries: number): number {
  let total = 0;
  for (let i = 1; i <= industries; i++) total += Math.round(XP.INDUSTRY_BASE * comboMultiplier(i));
  return total;
}

function rollChest(kind: ChestKind): { rarity: Rarity; xp: number } {
  const table = CHEST_TABLE[kind];
  const totalWeight = table.reduce((s, t) => s + t.weight, 0);
  let pick = crypto.randomInt(totalWeight);
  for (const t of table) {
    if (pick < t.weight) return { rarity: t.rarity, xp: crypto.randomInt(t.min, t.max + 1) };
    pick -= t.weight;
  }
  const last = table[table.length - 1];
  return { rarity: last.rarity, xp: last.min };
}

export function xpEventLabel(source: string, meta: any): string {
  switch (source) {
    case 'STORE_DONE':
      return meta?.storeName ? `Loja concluída · ${meta.storeName}` : 'Loja concluída';
    case 'INDUSTRY_COMBO':
      return `Combo x${meta?.multiplier ?? 1} · ${meta?.count ?? 0} indústria(s)`;
    case 'PRICE_RESEARCH':
      return meta?.productName ? `Pesquisa · ${meta.productName}` : 'Pesquisa de preço';
    case 'PRICE_NEW_PRODUCT':
      return 'Bônus: produto novo na pesquisa';
    case 'ON_TIME':
      return 'Evidência no prazo';
    case 'PHOTO_QUOTA':
      return 'Cota de fotos batida';
    case 'DAY_CLOSED':
      return 'Dia fechado!';
    case 'CHEST':
      return `Baú ${RARITY_LABEL[(meta?.rarity as Rarity) || 'COMMON']}`;
    case 'ACHIEVEMENT':
      return `Conquista · ${meta?.title ?? ''}`;
    default:
      return source;
  }
}

type XpCandidate = { source: string; refKey: string; amount: number; meta?: Record<string, unknown> };

async function totalXp(promoterId: string): Promise<number> {
  const agg = await prisma.promoterXpEvent.aggregate({ where: { promoterId }, _sum: { amount: true } });
  return agg._sum.amount || 0;
}

/** Grava só o que ainda não existe e devolve exatamente os eventos novos. */
async function grantXp(promoterId: string, candidates: XpCandidate[]): Promise<XpCandidate[]> {
  if (candidates.length === 0) return [];
  const existing = await prisma.promoterXpEvent.findMany({
    where: { promoterId, refKey: { in: [...new Set(candidates.map((c) => c.refKey))] } },
    select: { source: true, refKey: true },
  });
  const seen = new Set(existing.map((e) => `${e.source}:${e.refKey}`));
  const fresh = candidates.filter((c) => c.amount > 0 && !seen.has(`${c.source}:${c.refKey}`));
  if (fresh.length === 0) return [];
  await prisma.promoterXpEvent.createMany({
    data: fresh.map((c) => ({
      promoterId,
      source: c.source,
      refKey: c.refKey,
      amount: c.amount,
      meta: (c.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
    skipDuplicates: true,
  });
  return fresh;
}

async function grantChests(promoterId: string, wanted: Array<{ kind: ChestKind; refKey: string }>): Promise<number> {
  if (wanted.length === 0) return 0;
  const existing = await prisma.promoterChest.findMany({
    where: { promoterId, refKey: { in: wanted.map((w) => w.refKey) } },
    select: { kind: true, refKey: true },
  });
  const seen = new Set(existing.map((e) => `${e.kind}:${e.refKey}`));
  const fresh = wanted.filter((w) => !seen.has(`${w.kind}:${w.refKey}`));
  if (fresh.length === 0) return 0;
  const result = await prisma.promoterChest.createMany({
    data: fresh.map((w) => ({ promoterId, kind: w.kind, refKey: w.refKey, ...rollChest(w.kind) })),
    skipDuplicates: true,
  });
  return result.count;
}

async function buildAchievementCtx(promoterId: string, xp: number): Promise<AchievementCtx> {
  const today = toISODateBRT(new Date());
  const [storesDone, priceResearch, daysClosed, comboEvents, epicChest, earlyBirdEvent, streak] = await Promise.all([
    prisma.visit.count({ where: { promoterId, checkOutAt: { not: null } } }),
    prisma.priceResearch.count({ where: { visit: { promoterId } } }),
    prisma.promoterXpEvent.count({ where: { promoterId, source: 'DAY_CLOSED' } }),
    prisma.promoterXpEvent.findMany({ where: { promoterId, source: 'INDUSTRY_COMBO' }, select: { meta: true } }),
    prisma.promoterChest.count({ where: { promoterId, rarity: 'EPIC', openedAt: { not: null } } }),
    prisma.promoterXpEvent.count({ where: { promoterId, source: 'ON_TIME', meta: { path: ['earlyBird'], equals: true } } }),
    computeStreak(promoterId, today),
  ]);
  const maxCombo = comboEvents.reduce((m, e) => Math.max(m, Number((e.meta as any)?.count) || 0), 0);
  return {
    storesDone,
    priceResearch,
    daysClosed,
    maxCombo,
    epicChest: epicChest > 0,
    earlyBird: earlyBirdEvent > 0,
    streak,
    level: levelInfo(xp).level,
  };
}

/** Desbloqueia conquistas pendentes (e o XP delas); repete enquanto subir de nível destravar mais. */
async function unlockAchievements(promoterId: string): Promise<AchievementDef[]> {
  const unlocked: AchievementDef[] = [];
  for (let round = 0; round < 3; round++) {
    const xp = await totalXp(promoterId);
    const [ctx, owned] = await Promise.all([
      buildAchievementCtx(promoterId, xp),
      prisma.promoterAchievement.findMany({ where: { promoterId }, select: { code: true } }),
    ]);
    const ownedSet = new Set(owned.map((o) => o.code));
    const fresh = ACHIEVEMENTS.filter((a) => !ownedSet.has(a.code) && a.check(ctx));
    if (fresh.length === 0) break;
    await prisma.promoterAchievement.createMany({
      data: fresh.map((a) => ({ promoterId, code: a.code })),
      skipDuplicates: true,
    });
    await grantXp(
      promoterId,
      fresh.map((a) => ({
        source: 'ACHIEVEMENT',
        refKey: a.code,
        amount: ACHIEVEMENT_XP[a.rarity],
        meta: { title: a.title, icon: a.icon, rarity: a.rarity },
      }))
    );
    unlocked.push(...fresh);
  }
  return unlocked;
}

function publicAchievement(a: AchievementDef) {
  return { code: a.code, icon: a.icon, title: a.title, description: a.description, rarity: a.rarity, xp: ACHIEVEMENT_XP[a.rarity] };
}

export async function getGamificationProfile(promoterId: string) {
  const todayStart = dayRangeBRT(toISODateBRT(new Date())).start;
  const xp = await totalXp(promoterId);
  const [chests, owned, recent, todayAgg] = await Promise.all([
    prisma.promoterChest.findMany({
      where: { promoterId, openedAt: null },
      select: { id: true, kind: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.promoterAchievement.findMany({ where: { promoterId }, select: { code: true, unlockedAt: true } }),
    prisma.promoterXpEvent.findMany({
      where: { promoterId },
      select: { source: true, amount: true, meta: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.promoterXpEvent.aggregate({
      where: { promoterId, createdAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
  ]);
  const ownedMap = new Map(owned.map((o) => [o.code, o.unlockedAt]));
  const needsCtx = ACHIEVEMENTS.some((a) => !ownedMap.has(a.code) && a.goal);
  const ctx = needsCtx ? await buildAchievementCtx(promoterId, xp) : null;

  return {
    ...levelInfo(xp),
    todayXp: todayAgg._sum.amount || 0,
    pendingChests: chests,
    chestOdds: CHEST_TABLE,
    achievements: ACHIEVEMENTS.map((a) => {
      const unlockedAt = ownedMap.get(a.code) ?? null;
      const hidden = a.secret && !unlockedAt;
      return {
        code: a.code,
        icon: hidden ? '❔' : a.icon,
        title: hidden ? 'Conquista secreta' : a.title,
        description: hidden ? 'Continue jogando para descobrir' : a.description,
        rarity: a.rarity,
        xp: ACHIEVEMENT_XP[a.rarity],
        secret: !!a.secret,
        unlockedAt,
        progress: !unlockedAt && a.goal && ctx ? a.goal(ctx) : null,
      };
    }),
    recent: recent.map((r) => ({
      label: xpEventLabel(r.source, r.meta),
      amount: r.amount,
      source: r.source,
      createdAt: r.createdAt,
    })),
  };
}

/**
 * Concede (de forma idempotente) o XP, baús e conquistas devidos por ontem e hoje.
 * Pode ser chamado a qualquer momento: checkout, pesquisa sincronizada, abrir o app.
 */
export async function syncRewards(promoterId: string) {
  const today = toISODateBRT(new Date());
  const yesterday = shiftDateISO(today, -1);
  const dates = [yesterday, today];
  const rangeStart = dayRangeBRT(yesterday).start;
  const rangeEnd = dayRangeBRT(today).endExclusive;
  const xpBefore = await totalXp(promoterId);

  const [visits, research] = await Promise.all([
    prisma.visit.findMany({
      where: { promoterId, checkInAt: { gte: rangeStart, lt: rangeEnd }, checkOutAt: { not: null } },
      select: { id: true, store: { select: { name: true } } },
    }),
    prisma.priceResearch.findMany({
      where: { visit: { promoterId }, createdAt: { gte: rangeStart, lt: rangeEnd } },
      select: { id: true, storeId: true, productName: true, createdAt: true },
      take: 300,
    }),
  ]);

  const industryRows = visits.length
    ? await prisma.photoIndustry.findMany({
        where: { visitId: { in: visits.map((v) => v.id) } },
        select: { visitId: true, industryId: true },
      })
    : [];
  const industriesByVisit = new Map<string, Set<string>>();
  for (const r of industryRows) {
    const set = industriesByVisit.get(r.visitId) || new Set();
    set.add(r.industryId);
    industriesByVisit.set(r.visitId, set);
  }

  const candidates: XpCandidate[] = [];
  const chestsWanted: Array<{ kind: ChestKind; refKey: string }> = [];

  for (const v of visits) {
    candidates.push({ source: 'STORE_DONE', refKey: v.id, amount: XP.STORE_DONE, meta: { storeName: v.store.name } });
    const n = industriesByVisit.get(v.id)?.size || 0;
    if (n > 0) {
      candidates.push({
        source: 'INDUSTRY_COMBO',
        refKey: v.id,
        amount: comboXp(n),
        meta: { count: n, multiplier: comboMultiplier(n) },
      });
    }
    chestsWanted.push({ kind: 'STORE', refKey: v.id });
  }

  for (const r of research) {
    candidates.push({
      source: 'PRICE_RESEARCH',
      refKey: r.id,
      amount: XP.PRICE_RESEARCH,
      meta: { productName: r.productName },
    });
    const weekAgo = new Date(r.createdAt.getTime() - 7 * 24 * 3600 * 1000);
    const earlier = await prisma.priceResearch.count({
      where: {
        storeId: r.storeId,
        productName: { equals: r.productName.trim(), mode: 'insensitive' },
        createdAt: { gte: weekAgo, lt: r.createdAt },
      },
    });
    if (earlier === 0) {
      candidates.push({ source: 'PRICE_NEW_PRODUCT', refKey: r.id, amount: XP.PRICE_NEW_PRODUCT });
    }
  }

  for (const date of dates) {
    const snapshot = await buildDaySnapshot(promoterId, date);
    if (snapshot.indicators.onTime.complete) {
      const { start } = dayRangeBRT(date);
      const earlyLimit = new Date(start.getTime() + 8 * 3600 * 1000);
      const early = await prisma.photo.count({
        where: { visit: { promoterId }, type: 'OTHER', createdAt: { gte: start, lt: earlyLimit } },
      });
      candidates.push({ source: 'ON_TIME', refKey: date, amount: XP.ON_TIME, meta: { earlyBird: early > 0 } });
    }
    if ('photos' in snapshot.indicators && snapshot.indicators.photos?.complete) {
      candidates.push({ source: 'PHOTO_QUOTA', refKey: date, amount: XP.PHOTO_QUOTA });
    }
    if (snapshot.streakEligible) {
      candidates.push({ source: 'DAY_CLOSED', refKey: date, amount: XP.DAY_CLOSED });
      chestsWanted.push({ kind: 'DAY', refKey: date });
    }
  }

  const gained = await grantXp(promoterId, candidates);
  const newChests = await grantChests(promoterId, chestsWanted);
  const newAchievements = await unlockAchievements(promoterId);
  const xpAfter = await totalXp(promoterId);

  return {
    gained: gained.map((g) => ({ source: g.source, amount: g.amount, label: xpEventLabel(g.source, g.meta) })),
    xpGained: xpAfter - xpBefore,
    newChests,
    newAchievements: newAchievements.map(publicAchievement),
    levelBefore: levelInfo(xpBefore).level,
    levelAfter: levelInfo(xpAfter).level,
    profile: await getGamificationProfile(promoterId),
  };
}

export async function openChest(promoterId: string, chestId: string) {
  const chest = await prisma.promoterChest.findFirst({ where: { id: chestId, promoterId } });
  if (!chest) return { error: 'not_found' as const };
  if (chest.openedAt) return { error: 'already_opened' as const };

  const xpBefore = await totalXp(promoterId);
  const updated = await prisma.promoterChest.updateMany({
    where: { id: chest.id, openedAt: null },
    data: { openedAt: new Date() },
  });
  if (updated.count === 0) return { error: 'already_opened' as const };

  await grantXp(promoterId, [
    { source: 'CHEST', refKey: chest.id, amount: chest.xp, meta: { rarity: chest.rarity, kind: chest.kind } },
  ]);
  const newAchievements = await unlockAchievements(promoterId);
  const xpAfter = await totalXp(promoterId);

  return {
    chest: { id: chest.id, kind: chest.kind, rarity: chest.rarity, xp: chest.xp },
    newAchievements: newAchievements.map(publicAchievement),
    levelBefore: levelInfo(xpBefore).level,
    levelAfter: levelInfo(xpAfter).level,
    profile: await getGamificationProfile(promoterId),
  };
}

export async function levelsForPromoters(promoterIds: string[]): Promise<Map<string, { level: number; title: string }>> {
  const map = new Map<string, { level: number; title: string }>();
  if (promoterIds.length === 0) return map;
  const rows = await prisma.promoterXpEvent.groupBy({
    by: ['promoterId'],
    where: { promoterId: { in: promoterIds } },
    _sum: { amount: true },
  });
  const xpById = new Map(rows.map((r) => [r.promoterId, r._sum.amount || 0]));
  for (const id of promoterIds) {
    const info = levelInfo(xpById.get(id) || 0);
    map.set(id, { level: info.level, title: info.title });
  }
  return map;
}

export { ACHIEVEMENT_BY_CODE };
