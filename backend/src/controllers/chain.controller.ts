import { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { DEFAULT_ORDER_LAYOUT } from '../services/orderParsers/genericOrderParser';

const layoutSchema = z
  .object({
    sheetName: z.string().optional(),
    headerRow: z.number().int().min(0).optional(),
    columns: z.record(z.string()).optional(),
  })
  .optional()
  .nullable();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  orderLayout: layoutSchema,
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  orderLayout: layoutSchema,
});

const linkStoreSchema = z.object({
  storeId: z.string().uuid(),
});

export async function listChains(req: AuthRequest, res: Response) {
  try {
    const onlyActive = req.query.isActive === 'true';
    const chains = await prisma.retailChain.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: { _count: { select: { stores: true, purchaseOrders: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ chains });
  } catch (error) {
    console.error('listChains error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getChain(req: AuthRequest, res: Response) {
  try {
    const chain = await prisma.retailChain.findUnique({
      where: { id: req.params.id },
      include: {
        stores: {
          select: { id: true, name: true, code: true, filialCode: true, state: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { purchaseOrders: true, orderImports: true } },
      },
    });
    if (!chain) return res.status(404).json({ message: 'Rede não encontrada' });
    res.json({ chain });
  } catch (error) {
    console.error('getChain error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function createChain(req: AuthRequest, res: Response) {
  try {
    const data = createSchema.parse(req.body);
    const code = data.code.trim().toUpperCase();
    const existing = await prisma.retailChain.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ message: 'Já existe uma rede com este código' });
    }
    const chain = await prisma.retailChain.create({
      data: {
        name: data.name.trim(),
        code,
        isActive: data.isActive ?? true,
        orderLayout: (data.orderLayout ?? DEFAULT_ORDER_LAYOUT) as Prisma.InputJsonValue,
      },
    });
    res.status(201).json({ chain });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('createChain error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateChain(req: AuthRequest, res: Response) {
  try {
    const data = updateSchema.parse(req.body);
    const chain = await prisma.retailChain.update({
      where: { id: req.params.id },
      data: {
        ...(data.name != null ? { name: data.name.trim() } : {}),
        ...(data.code != null ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.isActive != null ? { isActive: data.isActive } : {}),
        ...(data.orderLayout !== undefined
          ? {
              orderLayout:
                data.orderLayout === null
                  ? Prisma.JsonNull
                  : (data.orderLayout as Prisma.InputJsonValue),
            }
          : {}),
      },
    });
    res.json({ chain });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Rede não encontrada' });
    }
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'Código já em uso' });
    }
    console.error('updateChain error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteChain(req: AuthRequest, res: Response) {
  try {
    await prisma.retailChain.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Rede não encontrada' });
    }
    console.error('deleteChain error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/** Vincula uma loja a uma rede. */
export async function linkStoreToChain(req: AuthRequest, res: Response) {
  try {
    const { storeId } = linkStoreSchema.parse(req.body);
    const chainId = req.params.id;
    const chain = await prisma.retailChain.findUnique({ where: { id: chainId } });
    if (!chain) return res.status(404).json({ message: 'Rede não encontrada' });
    const store = await prisma.store.update({
      where: { id: storeId },
      data: { chainId },
      select: { id: true, name: true, code: true, filialCode: true, chainId: true },
    });
    res.json({ store });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }
    console.error('linkStoreToChain error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/** Remove vínculo loja↔rede. */
export async function unlinkStoreFromChain(req: AuthRequest, res: Response) {
  try {
    const storeId = req.params.storeId;
    const store = await prisma.store.update({
      where: { id: storeId },
      data: { chainId: null },
      select: { id: true, name: true, chainId: true },
    });
    res.json({ store });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }
    console.error('unlinkStoreFromChain error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/** Lojas sem rede vinculada. */
export async function listUnlinkedStores(_req: AuthRequest, res: Response) {
  try {
    const stores = await prisma.store.findMany({
      where: { chainId: null },
      select: { id: true, name: true, code: true, filialCode: true, state: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    res.json({ stores });
  } catch (error) {
    console.error('listUnlinkedStores error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
