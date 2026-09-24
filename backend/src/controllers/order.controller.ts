import { Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { normalizeFilialCode } from '../services/pivotCacheParser';
import {
  OrderLayout,
  orderSourceHash,
  parseOrdersWorkbook,
  ParsedOrderLine,
} from '../services/orderParsers/genericOrderParser';

const uploadDir = path.join(os.tmpdir(), 'order-imports');
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {
  // ignore
}

export const orderUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`),
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
});

async function buildFilialToStoreMap(chainId?: string): Promise<Map<string, string>> {
  const stores = await prisma.store.findMany({
    where: chainId ? { OR: [{ chainId }, { chainId: null }] } : undefined,
    select: { id: true, code: true, filialCode: true, chainId: true },
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

async function buildIndustryNameMap(): Promise<Map<string, string>> {
  const industries = await prisma.industry.findMany({
    select: { id: true, name: true, code: true, abbreviation: true },
  });
  const map = new Map<string, string>();
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  for (const ind of industries) {
    map.set(norm(ind.name), ind.id);
    if (ind.code) map.set(norm(ind.code), ind.id);
    if (ind.abbreviation) map.set(norm(ind.abbreviation), ind.id);
  }
  return map;
}

function groupLines(lines: ParsedOrderLine[], chainId: string) {
  type Acc = {
    hash: string;
    orderNumber: string | null;
    orderDate: Date;
    deliveryDate: Date | null;
    filialCode: string;
    filialName: string;
    industryName: string;
    state: string | null;
    items: ParsedOrderLine[];
  };
  const groups = new Map<string, Acc>();
  for (const line of lines) {
    const hash = orderSourceHash({
      chainId,
      orderNumber: line.orderNumber,
      orderDate: line.orderDate,
      filialCode: line.filialCode,
      industryName: line.industryName,
    });
    let g = groups.get(hash);
    if (!g) {
      g = {
        hash,
        orderNumber: line.orderNumber,
        orderDate: line.orderDate,
        deliveryDate: line.deliveryDate,
        filialCode: line.filialCode,
        filialName: line.filialName,
        industryName: line.industryName,
        state: line.state,
        items: [],
      };
      groups.set(hash, g);
    }
    g.items.push(line);
    if (!g.deliveryDate && line.deliveryDate) g.deliveryDate = line.deliveryDate;
  }
  return groups;
}

async function processOrderImport(
  importId: string,
  chainId: string,
  filePath: string,
  layout: OrderLayout | null
): Promise<void> {
  const { lines, errors, sheetName } = parseOrdersWorkbook(filePath, layout);
  if (!lines.length) {
    await prisma.orderImport.update({
      where: { id: importId },
      data: {
        status: 'FAILED',
        errorMessage: (errors.join('; ') || 'Nenhuma linha válida').slice(0, 480),
        meta: { sheetName, parseErrors: errors.slice(0, 50) },
      },
    });
    return;
  }

  const [filialMap, industryMap] = await Promise.all([
    buildFilialToStoreMap(chainId),
    buildIndustryNameMap(),
  ]);
  const normInd = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const groups = groupLines(lines, chainId);
  let createdOrders = 0;
  let updatedOrders = 0;
  let matchedStores = 0;
  const unmatchedFiliais = new Set<string>();

  for (const g of groups.values()) {
    const storeId = filialMap.get(normalizeFilialCode(g.filialCode)) ?? null;
    if (storeId) matchedStores += 1;
    else unmatchedFiliais.add(`${g.filialCode}|${g.filialName}`);

    const industryId = industryMap.get(normInd(g.industryName)) ?? null;
    const totalQty = g.items.reduce((s, i) => s + (i.qty || 0), 0);
    const totalValue = g.items.reduce((s, i) => s + (i.totalValue || 0), 0);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { sourceHash: g.hash },
      select: { id: true },
    });

    if (existing) {
      await prisma.purchaseOrderItem.deleteMany({ where: { orderId: existing.id } });
      await prisma.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          importId,
          storeId,
          industryId,
          industryName: g.industryName,
          filialCode: g.filialCode,
          filialName: g.filialName,
          orderNumber: g.orderNumber,
          orderDate: g.orderDate,
          deliveryDate: g.deliveryDate,
          state: g.state,
          totalQty,
          totalValue,
        },
      });
      await prisma.purchaseOrderItem.createMany({
        data: g.items.map((i) => ({
          orderId: existing.id,
          productCode: i.productCode,
          productName: i.productName,
          qty: i.qty,
          unitValue: i.unitValue,
          totalValue: i.totalValue,
        })),
      });
      updatedOrders += 1;
    } else {
      await prisma.purchaseOrder.create({
        data: {
          importId,
          chainId,
          storeId,
          industryId,
          industryName: g.industryName,
          filialCode: g.filialCode,
          filialName: g.filialName,
          orderNumber: g.orderNumber,
          orderDate: g.orderDate,
          deliveryDate: g.deliveryDate,
          state: g.state,
          totalQty,
          totalValue,
          sourceHash: g.hash,
          items: {
            create: g.items.map((i) => ({
              productCode: i.productCode,
              productName: i.productName,
              qty: i.qty,
              unitValue: i.unitValue,
              totalValue: i.totalValue,
            })),
          },
        },
      });
      createdOrders += 1;
    }
  }

  await prisma.orderImport.update({
    where: { id: importId },
    data: {
      status: 'DONE',
      rowCount: lines.length,
      orderCount: createdOrders + updatedOrders,
      meta: {
        sheetName,
        createdOrders,
        updatedOrders,
        matchedStores,
        unmatchedFiliais: Array.from(unmatchedFiliais).slice(0, 100),
        parseErrors: errors.slice(0, 30),
      },
    },
  });
}

export async function createOrderImport(req: AuthRequest, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    const chainId = String(req.body.chainId || '').trim();
    if (!chainId) {
      fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: 'chainId é obrigatório' });
    }
    const chain = await prisma.retailChain.findUnique({ where: { id: chainId } });
    if (!chain) {
      fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Rede não encontrada' });
    }

    const periodLabel = (req.body.periodLabel as string | undefined)?.trim() || null;
    const created = await prisma.orderImport.create({
      data: {
        fileName: req.file.originalname || 'pedidos.xlsx',
        chainId,
        periodLabel,
        status: 'PROCESSING',
        uploadedById: req.userId ?? null,
      },
    });

    try {
      const layout = (chain.orderLayout as unknown as OrderLayout | null) || null;
      await processOrderImport(created.id, chainId, req.file.path, layout);

      if (req.userId) {
        await prisma.feedEntry.create({
          data: {
            type: 'IMPORT',
            title: `Importação de pedidos — ${chain.name}`,
            body: `Arquivo ${created.fileName}${periodLabel ? ` (${periodLabel})` : ''}`,
            chainId,
            authorId: req.userId,
            status: 'DONE',
            resolvedAt: new Date(),
          },
        });
      }

      const fresh = await prisma.orderImport.findUnique({
        where: { id: created.id },
        include: { chain: { select: { id: true, name: true, code: true } } },
      });
      return res.status(201).json({ import: fresh });
    } catch (error: any) {
      console.error('processOrderImport error:', error);
      await prisma.orderImport
        .update({
          where: { id: created.id },
          data: {
            status: 'FAILED',
            errorMessage: error?.message?.slice(0, 480) || 'Erro ao processar',
          },
        })
        .catch(() => {});
      return res.status(500).json({ message: 'Erro ao processar arquivo', importId: created.id });
    } finally {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  } catch (error) {
    console.error('createOrderImport error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listOrderImports(_req: AuthRequest, res: Response) {
  try {
    const imports = await prisma.orderImport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        chain: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { name: true, email: true } },
      },
    });
    res.json({ imports });
  } catch (error) {
    console.error('listOrderImports error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getOrderImport(req: AuthRequest, res: Response) {
  try {
    const item = await prisma.orderImport.findUnique({
      where: { id: req.params.id },
      include: {
        chain: { select: { id: true, name: true, code: true } },
        uploadedBy: { select: { name: true, email: true } },
      },
    });
    if (!item) return res.status(404).json({ message: 'Importação não encontrada' });
    res.json({ import: item });
  } catch (error) {
    console.error('getOrderImport error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function buildOrderWhere(query: {
  chainId?: string;
  industryId?: string;
  storeId?: string;
  state?: string;
  month?: string;
  search?: string;
}): Prisma.PurchaseOrderWhereInput {
  const where: Prisma.PurchaseOrderWhereInput = {};
  if (query.chainId) where.chainId = query.chainId;
  if (query.industryId) where.industryId = query.industryId;
  if (query.storeId) where.storeId = query.storeId;
  if (query.state) where.state = query.state.toUpperCase();
  if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    const [y, m] = query.month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    where.orderDate = { gte: start, lt: end };
  }
  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: 'insensitive' } },
      { industryName: { contains: query.search, mode: 'insensitive' } },
      { filialName: { contains: query.search, mode: 'insensitive' } },
      { filialCode: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function listOrders(req: AuthRequest, res: Response) {
  try {
    const chainId = (req.query.chainId as string | undefined)?.trim();
    const industryId = (req.query.industryId as string | undefined)?.trim();
    const storeId = (req.query.storeId as string | undefined)?.trim();
    const state = (req.query.state as string | undefined)?.trim();
    const month = (req.query.month as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const where = buildOrderWhere({ chainId, industryId, storeId, state, month, search });
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        chain: { select: { id: true, name: true, code: true } },
        industry: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
        _count: { select: { items: true } },
      },
      orderBy: { orderDate: 'desc' },
      take: limit,
    });
    res.json({ orders });
  } catch (error) {
    console.error('listOrders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getOrder(req: AuthRequest, res: Response) {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        chain: { select: { id: true, name: true, code: true } },
        industry: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true, address: true } },
        items: { orderBy: { productName: 'asc' } },
      },
    });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    res.json({ order });
  } catch (error) {
    console.error('getOrder error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getOrdersSummary(req: AuthRequest, res: Response) {
  try {
    const month = (req.query.month as string | undefined)?.trim();
    const chainId = (req.query.chainId as string | undefined)?.trim();
    const industryId = (req.query.industryId as string | undefined)?.trim();
    const groupBy = ((req.query.groupBy as string) || 'industry') as
      | 'industry'
      | 'chain'
      | 'store';

    const where = buildOrderWhere({ chainId, industryId, month });
    const orders = await prisma.purchaseOrder.findMany({
      where,
      select: {
        chainId: true,
        industryId: true,
        industryName: true,
        storeId: true,
        filialCode: true,
        filialName: true,
        totalQty: true,
        totalValue: true,
        chain: { select: { name: true, code: true } },
        store: { select: { name: true } },
      },
    });

    type Row = {
      key: string;
      label: string;
      chainId?: string | null;
      industryId?: string | null;
      storeId?: string | null;
      orderCount: number;
      totalQty: number;
      totalValue: number;
    };
    const map = new Map<string, Row>();

    for (const o of orders) {
      let key: string;
      let label: string;
      if (groupBy === 'chain') {
        key = o.chainId;
        label = o.chain?.name || o.chainId;
      } else if (groupBy === 'store') {
        key = o.storeId || o.filialCode;
        label = o.store?.name || `[${o.filialCode}] ${o.filialName}`;
      } else {
        key = o.industryId || o.industryName;
        label = o.industryName;
      }
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          label,
          chainId: o.chainId,
          industryId: o.industryId,
          storeId: o.storeId,
          orderCount: 0,
          totalQty: 0,
          totalValue: 0,
        };
        map.set(key, row);
      }
      row.orderCount += 1;
      row.totalQty += o.totalQty || 0;
      row.totalValue += o.totalValue || 0;
    }

    const rows = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
    const totals = rows.reduce(
      (acc, r) => {
        acc.orderCount += r.orderCount;
        acc.totalQty += r.totalQty;
        acc.totalValue += r.totalValue;
        return acc;
      },
      { orderCount: 0, totalQty: 0, totalValue: 0 }
    );

    res.json({ month: month || null, groupBy, rows, totals });
  } catch (error) {
    console.error('getOrdersSummary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/** Filiais presentes em pedidos sem loja vinculada. */
export async function getUnmatchedOrderFiliais(req: AuthRequest, res: Response) {
  try {
    const chainId = (req.query.chainId as string | undefined)?.trim();
    const groups = await prisma.purchaseOrder.groupBy({
      by: ['filialCode', 'filialName', 'chainId', 'state'],
      where: {
        storeId: null,
        ...(chainId ? { chainId } : {}),
      },
      _count: { _all: true },
      orderBy: { filialCode: 'asc' },
    });
    res.json({
      filiais: groups.map((g) => ({
        filialCode: g.filialCode,
        filialName: g.filialName,
        chainId: g.chainId,
        state: g.state,
        orderCount: g._count._all,
      })),
    });
  } catch (error) {
    console.error('getUnmatchedOrderFiliais error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
