import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

const createIndustrySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateIndustrySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Listar todas as indústrias
 */
export async function listIndustries(req: AuthRequest, res: Response) {
  try {
    const { isActive } = req.query;
    
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const industries = await prisma.industry.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true,
            photoIndustries: true,
            industryAssignments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ industries });
  } catch (error) {
    console.error('List industries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Obter detalhes de uma indústria
 */
export async function getIndustry(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const industry = await prisma.industry.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            photoIndustries: true,
            industryAssignments: true,
          },
        },
      },
    });

    if (!industry) {
      return res.status(404).json({ message: 'Indústria não encontrada' });
    }

    res.json({ industry });
  } catch (error) {
    console.error('Get industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Criar nova indústria (ADMIN)
 */
export async function createIndustry(req: AuthRequest, res: Response) {
  try {
    const data = createIndustrySchema.parse(req.body);

    // Verificar se o código já existe
    const existingIndustry = await prisma.industry.findUnique({
      where: { code: data.code },
    });

    if (existingIndustry) {
      return res.status(400).json({ message: 'Código da indústria já está em uso' });
    }

    const industry = await prisma.industry.create({
      data,
    });

    res.status(201).json({ industry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Create industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Atualizar indústria (ADMIN)
 */
export async function updateIndustry(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = updateIndustrySchema.parse(req.body);

    // Verificar se a indústria existe
    const existingIndustry = await prisma.industry.findUnique({
      where: { id },
    });

    if (!existingIndustry) {
      return res.status(404).json({ message: 'Indústria não encontrada' });
    }

    // Se estiver atualizando o código, verificar se não está em uso
    if (data.code && data.code !== existingIndustry.code) {
      const codeInUse = await prisma.industry.findUnique({
        where: { code: data.code },
      });

      if (codeInUse) {
        return res.status(400).json({ message: 'Código já está em uso' });
      }
    }

    const industry = await prisma.industry.update({
      where: { id },
      data,
    });

    res.json({ industry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Update industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Deletar indústria (ADMIN)
 */
export async function deleteIndustry(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const industry = await prisma.industry.findUnique({
      where: { id },
    });

    if (!industry) {
      return res.status(404).json({ message: 'Indústria não encontrada' });
    }

    await prisma.industry.delete({
      where: { id },
    });

    res.json({ message: 'Indústria deletada com sucesso' });
  } catch (error) {
    console.error('Delete industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Estatísticas e KPIs por indústria
 */
export async function getIndustryStats(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { industryId: id };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [photoCount, promoterCount, coverage] = await Promise.all([
      prisma.photoIndustry.count({ where }),
      prisma.industryAssignment.count({
        where: {
          industryId: id,
          isActive: true,
        },
      }),
      prisma.photoIndustry.findMany({
        where,
        select: {
          createdAt: true,
          hasRupture: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const ruptureCount = coverage.filter((p: { hasRupture: boolean }) => p.hasRupture).length;
    const rupturePercentage = photoCount > 0 ? (ruptureCount / photoCount) * 100 : 0;

    res.json({
      industryId: id,
      stats: {
        photoCount,
        promoterCount,
        ruptureCount,
        rupturePercentage: Math.round(rupturePercentage * 100) / 100,
        coverage: coverage.length,
      },
    });
  } catch (error) {
    console.error('Get industry stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Cobertura de fotos por indústria
 */
export async function getIndustryPhotoCoverage(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { industryId: id };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const photos = await prisma.photoIndustry.findMany({
      where,
      include: {
        photo: true,
        promoter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ photos });
  } catch (error) {
    console.error('Get industry photo coverage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

