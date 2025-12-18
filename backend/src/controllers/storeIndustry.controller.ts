import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

const addIndustrySchema = z.object({
  industryId: z.string().uuid(),
});

const bulkUpdateSchema = z.object({
  industryIds: z.array(z.string().uuid()),
});

/**
 * Lista indústrias obrigatórias de uma loja
 * GET /stores/:storeId/industries
 */
export async function getStoreIndustries(req: AuthRequest, res: Response) {
  try {
    const { storeId } = req.params;
    const { isActive } = req.query;

    // Verificar se a loja existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    const where: any = { storeId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const storeIndustries = await prisma.storeIndustry.findMany({
      where,
      include: {
        industry: true,
      },
      orderBy: {
        industry: {
          name: 'asc',
        },
      },
    });

    // Retorna apenas as indústrias
    const industries = storeIndustries.map(si => si.industry);

    res.json({
      store: { id: store.id, name: store.name },
      industries,
      storeIndustries, // Inclui dados completos para quem precisar
    });
  } catch (error) {
    console.error('Get store industries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Adiciona uma indústria à loja
 * POST /stores/:storeId/industries
 */
export async function addIndustryToStore(req: AuthRequest, res: Response) {
  try {
    const { storeId } = req.params;
    const data = addIndustrySchema.parse(req.body);

    // Verificar se a loja existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    // Verificar se a indústria existe
    const industry = await prisma.industry.findUnique({
      where: { id: data.industryId },
    });

    if (!industry) {
      return res.status(404).json({ message: 'Indústria não encontrada' });
    }

    // Verificar se já existe a relação
    const existing = await prisma.storeIndustry.findUnique({
      where: {
        storeId_industryId: {
          storeId,
          industryId: data.industryId,
        },
      },
    });

    let storeIndustry;
    if (existing) {
      // Reativar se estava inativa
      storeIndustry = await prisma.storeIndustry.update({
        where: { id: existing.id },
        data: { isActive: true },
        include: { industry: true },
      });
    } else {
      // Criar nova
      storeIndustry = await prisma.storeIndustry.create({
        data: {
          storeId,
          industryId: data.industryId,
        },
        include: { industry: true },
      });
    }

    res.status(201).json({ storeIndustry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Add industry to store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Remove uma indústria da loja
 * DELETE /stores/:storeId/industries/:industryId
 */
export async function removeIndustryFromStore(req: AuthRequest, res: Response) {
  try {
    const { storeId, industryId } = req.params;

    const storeIndustry = await prisma.storeIndustry.findUnique({
      where: {
        storeId_industryId: {
          storeId,
          industryId,
        },
      },
    });

    if (!storeIndustry) {
      return res.status(404).json({ message: 'Relação não encontrada' });
    }

    // Soft delete - apenas desativa
    await prisma.storeIndustry.update({
      where: { id: storeIndustry.id },
      data: { isActive: false },
    });

    res.json({ message: 'Indústria removida da loja com sucesso' });
  } catch (error) {
    console.error('Remove industry from store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Atualiza lista completa de indústrias da loja (bulk)
 * PUT /stores/:storeId/industries
 */
export async function updateStoreIndustries(req: AuthRequest, res: Response) {
  try {
    const { storeId } = req.params;
    const data = bulkUpdateSchema.parse(req.body);

    // Verificar se a loja existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    // Verificar se todas as indústrias existem
    const industries = await prisma.industry.findMany({
      where: { id: { in: data.industryIds } },
    });

    if (industries.length !== data.industryIds.length) {
      return res.status(400).json({ message: 'Uma ou mais indústrias não foram encontradas' });
    }

    // Usar transaction para garantir consistência
    await prisma.$transaction(async (tx) => {
      // Desativar todas as relações existentes
      await tx.storeIndustry.updateMany({
        where: { storeId },
        data: { isActive: false },
      });

      // Criar ou reativar as novas relações
      for (const industryId of data.industryIds) {
        await tx.storeIndustry.upsert({
          where: {
            storeId_industryId: {
              storeId,
              industryId,
            },
          },
          create: {
            storeId,
            industryId,
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });
      }
    });

    // Buscar resultado atualizado
    const storeIndustries = await prisma.storeIndustry.findMany({
      where: { storeId, isActive: true },
      include: { industry: true },
      orderBy: { industry: { name: 'asc' } },
    });

    res.json({
      message: 'Indústrias da loja atualizadas com sucesso',
      store: { id: store.id, name: store.name },
      industries: storeIndustries.map(si => si.industry),
      storeIndustries,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Update store industries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Lista todas as lojas com suas indústrias configuradas
 * GET /store-industries
 */
export async function getAllStoreIndustries(req: AuthRequest, res: Response) {
  try {
    const stores = await prisma.store.findMany({
      include: {
        storeIndustries: {
          where: { isActive: true },
          include: { industry: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = stores.map(store => ({
      store: { id: store.id, name: store.name, address: store.address },
      industries: store.storeIndustries.map(si => si.industry),
      totalIndustries: store.storeIndustries.length,
    }));

    res.json({ stores: result });
  } catch (error) {
    console.error('Get all store industries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


