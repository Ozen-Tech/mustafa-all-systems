import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

const associatePhotoSchema = z.object({
  photoId: z.string().uuid(),
  industryId: z.string().uuid(),
  visitId: z.string().uuid(),
});

/**
 * Associar foto a indústria (mobile)
 */
export async function associatePhotoToIndustry(req: AuthRequest, res: Response) {
  try {
    const data = associatePhotoSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verificar se a foto existe
    const photo = await prisma.photo.findUnique({
      where: { id: data.photoId },
      include: {
        visit: true,
      },
    });

    if (!photo) {
      return res.status(404).json({ message: 'Foto não encontrada' });
    }

    // Verificar se a visita pertence ao promotor
    if (photo.visit.promoterId !== promoterId) {
      return res.status(403).json({ message: 'Você não tem permissão para associar esta foto' });
    }

    // Verificar se a indústria existe
    const industry = await prisma.industry.findUnique({
      where: { id: data.industryId },
    });

    if (!industry) {
      return res.status(404).json({ message: 'Indústria não encontrada' });
    }

    // Verificar se o promotor está atribuído a esta indústria
    const assignment = await prisma.industryAssignment.findFirst({
      where: {
        promoterId,
        industryId: data.industryId,
        isActive: true,
        OR: [
          { storeId: photo.visit.storeId },
          { storeId: null },
        ],
      },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Você não está atribuído a esta indústria' });
    }

    // Verificar se já existe associação
    const existing = await prisma.photoIndustry.findUnique({
      where: {
        photoId_industryId: {
          photoId: data.photoId,
          industryId: data.industryId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Foto já está associada a esta indústria' });
    }

    // Criar associação
    const photoIndustry = await prisma.photoIndustry.create({
      data: {
        photoId: data.photoId,
        industryId: data.industryId,
        promoterId,
        storeId: photo.visit.storeId,
        visitId: data.visitId,
      },
      include: {
        photo: true,
        industry: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ photoIndustry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Associate photo to industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Fotos por indústria
 */
export async function getPhotosByIndustry(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;
    const { promoterId, storeId, startDate, endDate } = req.query;

    const where: any = { industryId };
    
    if (promoterId) {
      where.promoterId = promoterId as string;
    }
    
    if (storeId) {
      where.storeId = storeId as string;
    }
    
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
        industry: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ photos });
  } catch (error) {
    console.error('Get photos by industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Cobertura de todas as indústrias
 */
export async function getIndustryCoverage(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const industries = await prisma.industry.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            photoIndustries: where,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const coverage = industries.map((industry: any) => ({
      id: industry.id,
      name: industry.name,
      code: industry.code,
      photoCount: industry._count.photoIndustries,
      hasCoverage: industry._count.photoIndustries > 0,
    }));

    res.json({ coverage });
  } catch (error) {
    console.error('Get industry coverage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Indústrias sem fotos
 */
export async function getMissingCoverage(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const industries = await prisma.industry.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            photoIndustries: where,
          },
        },
      },
    });

    const missing = industries
      .filter((industry: any) => industry._count.photoIndustries === 0)
      .map((industry: any) => ({
        id: industry.id,
        name: industry.name,
        code: industry.code,
        description: industry.description,
      }));

    res.json({ missingIndustries: missing });
  } catch (error) {
    console.error('Get missing coverage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

