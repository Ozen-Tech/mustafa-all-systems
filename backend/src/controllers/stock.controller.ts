import { Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import {
  parseMateusWorkbook,
  normalizeFilialCode,
  normalizeSalesMonth,
  latestSalesMonth,
  SALES_MONTH_ORDER,
  StockRow,
  SalesRow,
} from '../services/pivotCacheParser';

const uploadDir = path.join(os.tmpdir(), 'stock-imports');
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {
  // ignore
}

export const stockUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`),
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
});

function deriveWeekLabel(fileName: string): string | null {
  const m = fileName.match(/(\d{1,2}-\d{1,2})/);
  if (m) return m[1];
  const fechamento = fileName.match(/FECHAMENTO\s+([A-Za-zÇçÃãÉé] +)?\w+/i);
  if (fechamento) return fechamento[0].replace(/\.xlsx$/i, '').trim();
  return null;
}

async function buildFilialToStoreMap(): Promise<Map<string, string>> {
  const stores = await prisma.store.findMany({
    select: { id: true, code: true, filialCode: true },
  });
  const map = new Map<string, string>();
  for (const s of stores) {
    if (s.filialCode) map.set(normalizeFilialCode(s.filialCode), s.id);
    if (s.code) {
      const norm = normalizeFilialCode(s.code);
      if (norm && !map.has(norm)) map.set(norm, s.id);
    }
  }
  return map;
}

async function createManyChunked<T>(
  insert: (rows: T[]) => Promise<unknown>,
  rows: T[],
  chunkSize = 1000
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insert(rows.slice(i, i + chunkSize));
  }
}

interface SalesAgg {
  industryName: string;
  filialCode: string;
  filialName: string;
  state: string | null;
  bandeira: string | null;
  month: string | null;
  productCode: string;
  productName: string;
  category: string | null;
  qtyCurrent: number;
  qtyPrevious: number;
  qtyTrend: number;
  valueCurrent: number;
  valuePrevious: number;
  valueTrend: number;
  productCount: number;
}

/**
 * Processa o arquivo: faz parse do cache da pivot, casa filiais com lojas e
 * substitui (por indústria) os dados de estoque e vendas.
 * Vendas ficam por indústria + filial + produto + mês (não soma o ano inteiro).
 */
export async function processImport(importId: string, filePath: string): Promise<void> {
  // Estoque: dedup por (industria, filial, produto, tipo) mantendo o último.
  const stockMap = new Map<string, StockRow>();
  // Vendas: agrega por (industria, filial, produto, mês).
  const salesMap = new Map<string, SalesAgg>();

  const result = await parseMateusWorkbook(filePath, {
    batchSize: 2000,
    onStockBatch: async (rows) => {
      for (const r of rows) {
        const key = `${r.industryName}||${r.filialCode}||${r.productCode}||${r.locationType}`;
        stockMap.set(key, r);
      }
    },
    onSalesBatch: async (rows) => {
      for (const r of rows) {
        if (!r.industryName || !r.productCode) continue;
        // Descarta meses futuros sem movimento (ex.: ago–dez com 0).
        if (!(r.qtyCurrent || r.qtyPrevious || r.valueCurrent || r.valuePrevious)) continue;
        const month = normalizeSalesMonth(r.month);
        const key = `${r.industryName}||${r.filialCode}||${r.productCode}||${month || ''}`;
        let agg = salesMap.get(key);
        if (!agg) {
          agg = {
            industryName: r.industryName,
            filialCode: r.filialCode,
            filialName: r.filialName,
            state: r.state,
            bandeira: r.bandeira,
            month,
            productCode: r.productCode,
            productName: r.productName,
            category: r.category,
            qtyCurrent: 0,
            qtyPrevious: 0,
            qtyTrend: 0,
            valueCurrent: 0,
            valuePrevious: 0,
            valueTrend: 0,
            productCount: 0,
          };
          salesMap.set(key, agg);
        }
        agg.qtyCurrent += r.qtyCurrent ?? 0;
        agg.qtyPrevious += r.qtyPrevious ?? 0;
        agg.qtyTrend += r.qtyTrend ?? (r.qtyCurrent ?? 0) * 2;
        agg.valueCurrent += r.valueCurrent ?? 0;
        agg.valuePrevious += r.valuePrevious ?? 0;
        agg.valueTrend += r.valueTrend ?? (r.valueCurrent ?? 0) * 2;
        agg.productCount = 1;
        if (r.productName) agg.productName = r.productName;
        if (r.category) agg.category = r.category;
        if (r.state) agg.state = r.state;
      }
    },
  });

  const filialMap = await buildFilialToStoreMap();
  const industries = result.industries;

  const stockData = Array.from(stockMap.values()).map((r) => ({
    importId,
    industryName: r.industryName ?? 'DESCONHECIDA',
    supplierName: r.supplier,
    filialCode: r.filialCode,
    filialName: r.filialName,
    filialRaw: r.filialRaw,
    storeId: filialMap.get(normalizeFilialCode(r.filialCode)) ?? null,
    state: r.state,
    locationType: r.locationType,
    productCode: r.productCode,
    productName: r.productName,
    qty: r.qty,
    valueRs: r.valueRs,
    idade: r.idade,
    dde: r.dde,
    status: r.status,
    lowTurn: r.lowTurn,
  }));

  const salesData = Array.from(salesMap.values()).map((a) => ({
    importId,
    industryName: a.industryName,
    filialCode: a.filialCode,
    filialName: a.filialName,
    storeId: filialMap.get(normalizeFilialCode(a.filialCode)) ?? null,
    state: a.state,
    bandeira: a.bandeira,
    month: a.month,
    productCode: a.productCode,
    productName: a.productName,
    category: a.category,
    qtyCurrent: a.qtyCurrent,
    qtyPrevious: a.qtyPrevious,
    qtyTrend: a.qtyTrend,
    valueCurrent: a.valueCurrent,
    valuePrevious: a.valuePrevious,
    valueTrend: a.valueTrend,
    productCount: a.productCount,
  }));

  // Substituição por escopo: remove dados anteriores das indústrias presentes.
  if (industries.length > 0) {
    await prisma.storeStockItem.deleteMany({ where: { industryName: { in: industries } } });
    await prisma.salesRecord.deleteMany({ where: { industryName: { in: industries } } });
  }

  await createManyChunked(
    (rows) => prisma.storeStockItem.createMany({ data: rows }),
    stockData,
    1000
  );
  await createManyChunked(
    (rows) => prisma.salesRecord.createMany({ data: rows }),
    salesData,
    1000
  );

  const importType = stockData.length > 0 && salesData.length > 0 ? 'BOTH' : salesData.length > 0 ? 'SALES' : 'STOCK';

  await prisma.stockImport.update({
    where: { id: importId },
    data: {
      status: 'DONE',
      type: importType as any,
      stockRowCount: stockData.length,
      salesRowCount: salesData.length,
      industries,
      meta: {
        matchedStock: stockData.filter((d) => d.storeId).length,
        matchedSales: salesData.filter((d) => d.storeId).length,
        months: Array.from(new Set(salesData.map((d) => d.month).filter(Boolean))),
      },
    },
  });
}

export async function createStockImport(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  }
  const filePath = req.file.path;
  const fileName = req.file.originalname || 'relatorio.xlsx';

  let created;
  try {
    created = await prisma.stockImport.create({
      data: {
        fileName,
        weekLabel: deriveWeekLabel(fileName),
        status: 'PROCESSING',
        uploadedById: req.userId ?? null,
      },
    });
  } catch (error) {
    fs.promises.unlink(filePath).catch(() => {});
    console.error('Create stock import error:', error);
    return res.status(500).json({ message: 'Erro ao registrar importação' });
  }

  try {
    await processImport(created.id, filePath);
    const fresh = await prisma.stockImport.findUnique({ where: { id: created.id } });
    return res.status(201).json({ import: fresh });
  } catch (error: any) {
    console.error('Process stock import error:', error);
    await prisma.stockImport
      .update({
        where: { id: created.id },
        data: { status: 'FAILED', errorMessage: error?.message?.slice(0, 480) || 'Erro ao processar arquivo' },
      })
      .catch(() => {});
    return res.status(500).json({ message: 'Erro ao processar arquivo', importId: created.id });
  } finally {
    fs.promises.unlink(filePath).catch(() => {});
  }
}

export async function listStockImports(_req: AuthRequest, res: Response) {
  const imports = await prisma.stockImport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { uploadedBy: { select: { name: true, email: true } } },
  });
  res.json({ imports });
}

export async function getStockImport(req: AuthRequest, res: Response) {
  const item = await prisma.stockImport.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: 'Importação não encontrada' });
  res.json({ import: item });
}

/** Itens de estoque de uma loja (usado pelo PWA e pelo web). */
export async function getStoreStock(req: AuthRequest, res: Response) {
  const { storeId } = req.params;
  const industryName = (req.query.industryName as string | undefined)?.trim();
  const search = (req.query.search as string | undefined)?.trim();

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, code: true, filialCode: true },
  });
  if (!store) return res.status(404).json({ message: 'Loja não encontrada' });

  const orConditions: any[] = [{ storeId: store.id }];
  const norm = normalizeFilialCode(store.filialCode || store.code || '');
  if (norm) orConditions.push({ filialCode: { in: [norm, norm.padStart(4, '0')] } });

  const where: any = {
    locationType: 'LOJA',
    OR: orConditions,
  };
  if (industryName) where.industryName = { equals: industryName, mode: 'insensitive' };
  if (search) {
    where.AND = [
      {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { productCode: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const items = await prisma.storeStockItem.findMany({
    where,
    orderBy: [{ industryName: 'asc' }, { qty: 'asc' }],
    take: 2000,
  });

  const industries = Array.from(new Set(items.map((i) => i.industryName))).sort();
  const rupturas = items.filter((i) => i.qty <= 0).length;
  const baixoGiro = items.filter((i) => i.lowTurn).length;

  res.json({
    store,
    industries,
    totals: { items: items.length, rupturas, baixoGiro },
    items,
  });
}

/** Agregados para supervisores/admin. */
export async function getStockOverview(req: AuthRequest, res: Response) {
  const industryName = (req.query.industryName as string | undefined)?.trim();
  const state = (req.query.state as string | undefined)?.trim();
  const baseWhere: any = {};
  if (industryName) baseWhere.industryName = { equals: industryName, mode: 'insensitive' };
  if (state) baseWhere.state = { contains: state, mode: 'insensitive' };

  const [byIndustry, cdItems, lojaAgg, rupturas, baixoGiro, lastImport] = await Promise.all([
    prisma.storeStockItem.groupBy({
      by: ['industryName'],
      where: baseWhere,
      _sum: { qty: true, valueRs: true },
      _count: { _all: true },
    }),
    prisma.storeStockItem.groupBy({
      by: ['filialName'],
      where: { ...baseWhere, locationType: 'CD' },
      _sum: { qty: true, valueRs: true },
      _count: { _all: true },
    }),
    prisma.storeStockItem.aggregate({
      where: { ...baseWhere, locationType: 'LOJA' },
      _sum: { qty: true, valueRs: true },
      _count: { _all: true },
    }),
    prisma.storeStockItem.count({ where: { ...baseWhere, locationType: 'LOJA', qty: { lte: 0 } } }),
    prisma.storeStockItem.count({ where: { ...baseWhere, locationType: 'LOJA', lowTurn: true } }),
    prisma.stockImport.findFirst({ where: { status: 'DONE' }, orderBy: { createdAt: 'desc' } }),
  ]);

  res.json({
    byIndustry: byIndustry
      .map((r) => ({
        industryName: r.industryName,
        qty: r._sum.qty ?? 0,
        valueRs: r._sum.valueRs ?? 0,
        items: r._count._all,
      }))
      .sort((a, b) => b.valueRs - a.valueRs),
    byCd: cdItems
      .map((r) => ({
        cd: r.filialName,
        qty: r._sum.qty ?? 0,
        valueRs: r._sum.valueRs ?? 0,
        items: r._count._all,
      }))
      .sort((a, b) => b.qty - a.qty),
    loja: {
      qty: lojaAgg._sum.qty ?? 0,
      valueRs: lojaAgg._sum.valueRs ?? 0,
      items: lojaAgg._count._all,
      rupturas,
      baixoGiro,
    },
    lastImport,
  });
}

/** Estoque por loja (lista filiais com agregados) para o supervisor. */
export async function getStockByStore(req: AuthRequest, res: Response) {
  const industryName = (req.query.industryName as string | undefined)?.trim();
  const where: any = { locationType: 'LOJA' };
  if (industryName) where.industryName = { equals: industryName, mode: 'insensitive' };

  const grouped = await prisma.storeStockItem.groupBy({
    by: ['filialCode', 'filialName', 'state'],
    where,
    _sum: { qty: true, valueRs: true },
    _count: { _all: true },
    orderBy: { _sum: { valueRs: 'desc' } },
    take: 500,
  });

  res.json({
    stores: grouped.map((g) => ({
      filialCode: g.filialCode,
      filialName: g.filialName,
      state: g.state,
      qty: g._sum.qty ?? 0,
      valueRs: g._sum.valueRs ?? 0,
      items: g._count._all,
    })),
  });
}

type SalesGroupBy = 'industry' | 'store' | 'product';

function growthPct(cur: number, prev: number): number | null {
  if (prev > 0) return ((cur - prev) / prev) * 100;
  return null;
}

function buildSalesWhere(query: {
  industryName?: string;
  storeId?: string;
  state?: string;
  month?: string;
  product?: string;
  filialCode?: string;
}) {
  const where: any = {};
  if (query.industryName) where.industryName = { equals: query.industryName, mode: 'insensitive' };
  if (query.storeId) where.storeId = query.storeId;
  if (query.state) where.state = { equals: query.state, mode: 'insensitive' };
  if (query.filialCode) {
    const norm = normalizeFilialCode(query.filialCode);
    where.OR = [{ filialCode: query.filialCode }, { filialCode: norm }, { filialCode: norm.padStart(4, '0') }];
  }
  if (query.month) where.month = { equals: normalizeSalesMonth(query.month) || query.month, mode: 'insensitive' };
  if (query.product?.trim()) {
    const q = query.product.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { productCode: { contains: q, mode: 'insensitive' } },
          { productName: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }
  return where;
}

export async function getSales(req: AuthRequest, res: Response) {
  const industryName = (req.query.industryName as string | undefined)?.trim();
  const storeId = (req.query.storeId as string | undefined)?.trim();
  const state = (req.query.state as string | undefined)?.trim();
  const product = (req.query.product as string | undefined)?.trim();
  const filialCode = (req.query.filialCode as string | undefined)?.trim();
  let month = (req.query.month as string | undefined)?.trim();
  const groupBy = ((req.query.groupBy as string | undefined) || 'industry') as SalesGroupBy;
  const allMonths = req.query.allMonths === '1' || req.query.allMonths === 'true';

  // Opções de filtro (antes de aplicar mês padrão).
  const baseForOptions = buildSalesWhere({ industryName, storeId, state, product, filialCode });
  const [monthRows, stateRows, industryRows, storeRows] = await Promise.all([
    prisma.salesRecord.groupBy({
      by: ['month'],
      where: { ...baseForOptions, month: { not: null } },
      _sum: { valueCurrent: true },
    }),
    prisma.salesRecord.groupBy({
      by: ['state'],
      where: { ...baseForOptions, state: { not: null } },
      _count: { _all: true },
    }),
    prisma.salesRecord.groupBy({
      by: ['industryName'],
      where: baseForOptions,
      _sum: { valueCurrent: true },
      orderBy: { industryName: 'asc' },
    }),
    prisma.salesRecord.groupBy({
      by: ['storeId', 'filialCode', 'filialName', 'state'],
      where: { ...baseForOptions, storeId: { not: null } },
      _sum: { valueCurrent: true },
      orderBy: { filialName: 'asc' },
      take: 500,
    }),
  ]);

  const monthsWithValue = monthRows
    .filter((m) => (m._sum.valueCurrent ?? 0) > 0 && m.month)
    .map((m) => m.month as string);
  const monthsSorted = [...SALES_MONTH_ORDER.filter((m) => monthsWithValue.includes(m)), ...monthsWithValue.filter((m) => !SALES_MONTH_ORDER.includes(m as any))];

  if (!allMonths && !month) {
    month = latestSalesMonth(monthsWithValue) || undefined;
  }

  const where = buildSalesWhere({ industryName, storeId, state, product, filialCode, month });

  type Agg = {
    key: string;
    label: string;
    sublabel?: string | null;
    industryName?: string;
    filialCode?: string;
    filialName?: string;
    storeId?: string | null;
    state?: string | null;
    productCode?: string | null;
    productName?: string | null;
    qtyCurrent: number;
    qtyPrevious: number;
    qtyTrend: number;
    valueCurrent: number;
    valuePrevious: number;
    valueTrend: number;
  };

  const map = new Map<string, Agg>();
  const batchSize = 5000;
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.salesRecord.findMany({
      where,
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        industryName: true,
        filialCode: true,
        filialName: true,
        storeId: true,
        state: true,
        productCode: true,
        productName: true,
        qtyCurrent: true,
        qtyPrevious: true,
        qtyTrend: true,
        valueCurrent: true,
        valuePrevious: true,
        valueTrend: true,
      },
    });
    if (batch.length === 0) break;
    for (const r of batch) {
      let key: string;
      let label: string;
      let sublabel: string | null = null;
      if (groupBy === 'store') {
        key = r.storeId || r.filialCode;
        label = `[${r.filialCode}] ${r.filialName}`;
        sublabel = r.state;
      } else if (groupBy === 'product') {
        key = `${r.industryName}||${r.productCode || r.productName || 'sem-produto'}`;
        label = r.productName || r.productCode || 'Sem produto';
        sublabel = r.industryName;
      } else {
        key = r.industryName || 'Sem indústria';
        label = key;
      }
      const cur = map.get(key) || {
        key,
        label,
        sublabel,
        industryName: r.industryName,
        filialCode: r.filialCode,
        filialName: r.filialName,
        storeId: r.storeId,
        state: r.state,
        productCode: r.productCode,
        productName: r.productName,
        qtyCurrent: 0,
        qtyPrevious: 0,
        qtyTrend: 0,
        valueCurrent: 0,
        valuePrevious: 0,
        valueTrend: 0,
      };
      cur.qtyCurrent += r.qtyCurrent;
      cur.qtyPrevious += r.qtyPrevious;
      cur.qtyTrend += r.qtyTrend || r.qtyCurrent * 2;
      cur.valueCurrent += r.valueCurrent;
      cur.valuePrevious += r.valuePrevious;
      cur.valueTrend += r.valueTrend || r.valueCurrent * 2;
      map.set(key, cur);
    }
    cursor = batch[batch.length - 1].id;
    if (batch.length < batchSize) break;
  }

  const rows = Array.from(map.values())
    .map((v) => ({
      ...v,
      qtyGrowthPct: growthPct(v.qtyCurrent, v.qtyPrevious),
      growthPct: growthPct(v.valueCurrent, v.valuePrevious),
    }))
    .sort((a, b) => b.valueCurrent - a.valueCurrent)
    .slice(0, groupBy === 'product' ? 300 : 200);

  const totals = rows.reduce(
    (acc, r) => {
      acc.qtyCurrent += r.qtyCurrent;
      acc.qtyPrevious += r.qtyPrevious;
      acc.valueCurrent += r.valueCurrent;
      acc.valuePrevious += r.valuePrevious;
      return acc;
    },
    { qtyCurrent: 0, qtyPrevious: 0, valueCurrent: 0, valuePrevious: 0 }
  );

  res.json({
    month: month || null,
    groupBy,
    totals: {
      ...totals,
      qtyGrowthPct: growthPct(totals.qtyCurrent, totals.qtyPrevious),
      growthPct: growthPct(totals.valueCurrent, totals.valuePrevious),
    },
    // Compatível com a UI anterior (byIndustry) quando groupBy=industry
    byIndustry: groupBy === 'industry' ? rows.map((r) => ({
      industryName: r.label,
      qtyCurrent: r.qtyCurrent,
      qtyPrevious: r.qtyPrevious,
      qtyTrend: r.qtyTrend,
      qtyGrowthPct: r.qtyGrowthPct,
      valueCurrent: r.valueCurrent,
      valuePrevious: r.valuePrevious,
      valueTrend: r.valueTrend,
      growthPct: r.growthPct,
    })) : undefined,
    rows,
    filters: {
      months: monthsSorted,
      states: stateRows
        .map((s) => s.state)
        .filter(Boolean)
        .sort() as string[],
      industries: industryRows.map((i) => i.industryName).filter(Boolean),
      stores: storeRows.map((s) => ({
        storeId: s.storeId,
        filialCode: s.filialCode,
        filialName: s.filialName,
        state: s.state,
      })),
    },
  });
}

/** Vendas agregadas de uma loja (PWA promotor). */
export async function getStoreSales(req: AuthRequest, res: Response) {
  const { storeId } = req.params;
  let month = (req.query.month as string | undefined)?.trim();
  const industryName = (req.query.industryName as string | undefined)?.trim();

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, code: true, filialCode: true },
  });
  if (!store) return res.status(404).json({ message: 'Loja não encontrada' });

  const orConditions: any[] = [{ storeId: store.id }];
  const norm = normalizeFilialCode(store.filialCode || store.code || '');
  if (norm) orConditions.push({ filialCode: { in: [norm, norm.padStart(4, '0')] } });

  const baseWhere: any = { OR: orConditions };
  if (industryName) baseWhere.industryName = { equals: industryName, mode: 'insensitive' };

  const monthRows = await prisma.salesRecord.groupBy({
    by: ['month'],
    where: { ...baseWhere, month: { not: null } },
    _sum: { valueCurrent: true },
  });
  const monthsWithValue = monthRows
    .filter((m) => (m._sum.valueCurrent ?? 0) > 0 && m.month)
    .map((m) => m.month as string);
  if (!month) month = latestSalesMonth(monthsWithValue) || undefined;

  const where: any = { ...baseWhere };
  if (month) where.month = { equals: normalizeSalesMonth(month) || month, mode: 'insensitive' };

  const records = await prisma.salesRecord.findMany({
    where,
    orderBy: { valueCurrent: 'desc' },
    take: 2000,
  });

  const byIndustryMap = new Map<
    string,
    { qtyCurrent: number; qtyPrevious: number; qtyTrend: number; valueCurrent: number; valuePrevious: number; valueTrend: number }
  >();
  for (const r of records) {
    const key = r.industryName || 'Sem indústria';
    const cur = byIndustryMap.get(key) || {
      qtyCurrent: 0,
      qtyPrevious: 0,
      qtyTrend: 0,
      valueCurrent: 0,
      valuePrevious: 0,
      valueTrend: 0,
    };
    cur.qtyCurrent += r.qtyCurrent;
    cur.qtyPrevious += r.qtyPrevious;
    cur.qtyTrend += r.qtyTrend || r.qtyCurrent * 2;
    cur.valueCurrent += r.valueCurrent;
    cur.valuePrevious += r.valuePrevious;
    cur.valueTrend += r.valueTrend || r.valueCurrent * 2;
    byIndustryMap.set(key, cur);
  }

  const byIndustry = Array.from(byIndustryMap.entries())
    .map(([name, v]) => ({
      industryName: name,
      ...v,
      qtyGrowthPct: growthPct(v.qtyCurrent, v.qtyPrevious),
      growthPct: growthPct(v.valueCurrent, v.valuePrevious),
    }))
    .sort((a, b) => b.valueCurrent - a.valueCurrent);

  const totals = byIndustry.reduce(
    (acc, r) => {
      acc.qtyCurrent += r.qtyCurrent;
      acc.valueCurrent += r.valueCurrent;
      acc.valuePrevious += r.valuePrevious;
      return acc;
    },
    { qtyCurrent: 0, valueCurrent: 0, valuePrevious: 0 }
  );

  res.json({
    store,
    month: month || null,
    months: monthsWithValue,
    totals: {
      ...totals,
      growthPct: growthPct(totals.valueCurrent, totals.valuePrevious),
    },
    byIndustry,
  });
}

/** Filiais presentes nos relatórios que ainda não estão vinculadas a uma loja. */
export async function getUnmatchedFiliais(_req: AuthRequest, res: Response) {
  const grouped = await prisma.storeStockItem.groupBy({
    by: ['filialCode', 'filialName', 'state'],
    where: { storeId: null, locationType: 'LOJA' },
    _count: { _all: true },
    orderBy: { filialCode: 'asc' },
    take: 1000,
  });
  res.json({
    filiais: grouped
      .map((g) => ({
        filialCode: g.filialCode,
        filialName: g.filialName,
        state: g.state,
        items: g._count._all,
      }))
      .sort((a, b) => b.items - a.items),
  });
}

const linkSchema = z.object({ filialCode: z.string().min(1) });

/** Vincula uma filial a uma loja e re-associa os registros existentes. */
export async function linkFilialToStore(req: AuthRequest, res: Response) {
  const { storeId } = req.params;
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'filialCode é obrigatório' });

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return res.status(404).json({ message: 'Loja não encontrada' });

  const filialCode = normalizeFilialCode(parsed.data.filialCode);

  try {
    await prisma.store.update({ where: { id: storeId }, data: { filialCode } });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'Esta filial já está vinculada a outra loja' });
    }
    throw error;
  }

  const codeVariants = [filialCode, filialCode.padStart(4, '0')];
  const [stock, sales] = await Promise.all([
    prisma.storeStockItem.updateMany({
      where: { filialCode: { in: codeVariants } },
      data: { storeId },
    }),
    prisma.salesRecord.updateMany({
      where: { filialCode: { in: codeVariants } },
      data: { storeId },
    }),
  ]);

  res.json({ message: 'Filial vinculada', updated: { stock: stock.count, sales: sales.count } });
}
