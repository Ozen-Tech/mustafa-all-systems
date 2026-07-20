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
  qtyCurrent: number;
  qtyPrevious: number;
  valueCurrent: number;
  valuePrevious: number;
  productCount: number;
}

/**
 * Processa o arquivo: faz parse do cache da pivot, casa filiais com lojas e
 * substitui (por indústria) os dados de estoque e vendas.
 */
export async function processImport(importId: string, filePath: string): Promise<void> {
  // Estoque: dedup por (industria, filial, produto, tipo) mantendo o último.
  const stockMap = new Map<string, StockRow>();
  // Vendas: agrega por (industria, filial).
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
        if (!r.industryName) continue;
        const key = `${r.industryName}||${r.filialCode}`;
        let agg = salesMap.get(key);
        if (!agg) {
          agg = {
            industryName: r.industryName,
            filialCode: r.filialCode,
            filialName: r.filialName,
            state: r.state,
            bandeira: r.bandeira,
            qtyCurrent: 0,
            qtyPrevious: 0,
            valueCurrent: 0,
            valuePrevious: 0,
            productCount: 0,
          };
          salesMap.set(key, agg);
        }
        agg.qtyCurrent += r.qtyCurrent ?? 0;
        agg.qtyPrevious += r.qtyPrevious ?? 0;
        agg.valueCurrent += r.valueCurrent ?? 0;
        agg.valuePrevious += r.valuePrevious ?? 0;
        agg.productCount += 1;
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
    qtyCurrent: a.qtyCurrent,
    qtyPrevious: a.qtyPrevious,
    valueCurrent: a.valueCurrent,
    valuePrevious: a.valuePrevious,
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

export async function getSales(req: AuthRequest, res: Response) {
  const industryName = (req.query.industryName as string | undefined)?.trim();
  const storeId = (req.query.storeId as string | undefined)?.trim();
  const where: any = {};
  if (industryName) where.industryName = { equals: industryName, mode: 'insensitive' };
  if (storeId) where.storeId = storeId;

  const records = await prisma.salesRecord.findMany({
    where,
    orderBy: { valueCurrent: 'desc' },
    take: 1000,
  });

  const byIndustry = await prisma.salesRecord.groupBy({
    by: ['industryName'],
    where,
    _sum: { qtyCurrent: true, qtyPrevious: true, valueCurrent: true, valuePrevious: true },
  });

  res.json({
    byIndustry: byIndustry
      .map((r) => {
        const qtyCur = r._sum.qtyCurrent ?? 0;
        const qtyPrev = r._sum.qtyPrevious ?? 0;
        const cur = r._sum.valueCurrent ?? 0;
        const prev = r._sum.valuePrevious ?? 0;
        return {
          industryName: r.industryName,
          qtyCurrent: qtyCur,
          qtyPrevious: qtyPrev,
          // Projeção estilo planilha Mateus (TEND QTD ≈ 2x parcial do mês)
          qtyTrend: qtyCur * 2,
          qtyGrowthPct: qtyPrev > 0 ? ((qtyCur - qtyPrev) / qtyPrev) * 100 : null,
          valueCurrent: cur,
          valuePrevious: prev,
          valueTrend: cur * 2,
          growthPct: prev > 0 ? ((cur - prev) / prev) * 100 : null,
        };
      })
      .sort((a, b) => b.valueCurrent - a.valueCurrent),
    records,
  });
}

/** Vendas agregadas de uma loja (PWA promotor). */
export async function getStoreSales(req: AuthRequest, res: Response) {
  const { storeId } = req.params;
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, code: true, filialCode: true },
  });
  if (!store) return res.status(404).json({ message: 'Loja não encontrada' });

  const orConditions: any[] = [{ storeId: store.id }];
  const norm = normalizeFilialCode(store.filialCode || store.code || '');
  if (norm) orConditions.push({ filialCode: { in: [norm, norm.padStart(4, '0')] } });

  const records = await prisma.salesRecord.findMany({
    where: { OR: orConditions },
    orderBy: { valueCurrent: 'desc' },
    take: 500,
  });

  const byIndustryMap = new Map<
    string,
    { qtyCurrent: number; qtyPrevious: number; valueCurrent: number; valuePrevious: number }
  >();
  for (const r of records) {
    const key = r.industryName || 'Sem indústria';
    const cur = byIndustryMap.get(key) || {
      qtyCurrent: 0,
      qtyPrevious: 0,
      valueCurrent: 0,
      valuePrevious: 0,
    };
    cur.qtyCurrent += r.qtyCurrent;
    cur.qtyPrevious += r.qtyPrevious;
    cur.valueCurrent += r.valueCurrent;
    cur.valuePrevious += r.valuePrevious;
    byIndustryMap.set(key, cur);
  }

  const byIndustry = Array.from(byIndustryMap.entries())
    .map(([industryName, v]) => ({
      industryName,
      ...v,
      qtyTrend: v.qtyCurrent * 2,
      qtyGrowthPct: v.qtyPrevious > 0 ? ((v.qtyCurrent - v.qtyPrevious) / v.qtyPrevious) * 100 : null,
      growthPct: v.valuePrevious > 0 ? ((v.valueCurrent - v.valuePrevious) / v.valuePrevious) * 100 : null,
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
    totals: {
      ...totals,
      growthPct:
        totals.valuePrevious > 0
          ? ((totals.valueCurrent - totals.valuePrevious) / totals.valuePrevious) * 100
          : null,
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
