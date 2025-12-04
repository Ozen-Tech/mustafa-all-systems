import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { PhotoType } from '../types';

const checkInSchema = z.object({
  storeId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  photoUrl: z.string().url(),
});

export async function checkIn(req: AuthRequest, res: Response) {
  try {
    const { storeId, latitude, longitude, photoUrl } = checkInSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verificar se o promotor já tem uma visita em aberto
    const activeVisit = await prisma.visit.findFirst({
      where: {
        promoterId,
        checkOutAt: null,
      },
    });

    if (activeVisit) {
      return res.status(400).json({
        message: 'Você já tem uma visita em andamento. Faça checkout primeiro.',
        visitId: activeVisit.id,
      });
    }

    // Verificar se a loja existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    // Criar visita
    const visit = await prisma.visit.create({
      data: {
        promoterId,
        storeId,
        checkInAt: new Date(),
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInPhotoUrl: photoUrl,
      },
      include: {
        store: true,
      },
    });

    // Criar registro da foto
    await prisma.photo.create({
      data: {
        visitId: visit.id,
        url: photoUrl,
        type: PhotoType.FACADE_CHECKIN,
        latitude,
        longitude,
      },
    });

    res.json({
      visit: {
        id: visit.id,
        store: visit.store,
        checkInAt: visit.checkInAt,
        checkInLatitude: visit.checkInLatitude,
        checkInLongitude: visit.checkInLongitude,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const checkOutSchema = z.object({
  visitId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  photoUrl: z.string().url(),
});

export async function checkOut(req: AuthRequest, res: Response) {
  try {
    const { visitId, latitude, longitude, photoUrl } = checkOutSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verificar se a visita existe e pertence ao promotor
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        promoterId,
      },
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visita não encontrada' });
    }

    if (visit.checkOutAt) {
      return res.status(400).json({ message: 'Visita já foi finalizada' });
    }

    // Atualizar visita com checkout
    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        checkOutAt: new Date(),
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        checkOutPhotoUrl: photoUrl,
      },
      include: {
        store: true,
      },
    });

    // Criar registro da foto de checkout
    await prisma.photo.create({
      data: {
        visitId: visit.id,
        url: photoUrl,
        type: PhotoType.FACADE_CHECKOUT,
        latitude,
        longitude,
      },
    });

    // Calcular horas trabalhadas
    const hoursWorked = updatedVisit.checkOutAt 
      ? (updatedVisit.checkOutAt.getTime() - updatedVisit.checkInAt.getTime()) / (1000 * 60 * 60)
      : 0;

    res.json({
      visit: {
        id: updatedVisit.id,
        store: updatedVisit.store,
        checkInAt: updatedVisit.checkInAt,
        checkOutAt: updatedVisit.checkOutAt,
        hoursWorked: hoursWorked.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const uploadPhotosSchema = z.object({
  visitId: z.string().uuid(),
  photos: z.array(
    z.object({
      url: z.string().url(),
      type: z.nativeEnum(PhotoType),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
  ),
});

export async function uploadPhotos(req: AuthRequest, res: Response) {
  try {
    const { visitId, photos } = uploadPhotosSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verificar se a visita existe e pertence ao promotor
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        promoterId,
      },
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visita não encontrada' });
    }

    // Processar cada foto: atualizar se existir (mesmo tipo), criar se não existir
    const createdPhotos = await Promise.all(
      photos.map(async (photo) => {
        // Verificar se já existe uma foto do mesmo tipo para esta visita
        const existingPhoto = await prisma.photo.findFirst({
          where: {
            visitId,
            type: photo.type,
          },
        });

        if (existingPhoto) {
          // Atualizar foto existente (especialmente para substituir URLs placeholder)
          const updated = await prisma.photo.update({
            where: { id: existingPhoto.id },
            data: {
              url: photo.url,
              latitude: photo.latitude || existingPhoto.latitude,
              longitude: photo.longitude || existingPhoto.longitude,
            },
          });
          console.log(`✅ Foto ${photo.type} atualizada: ${existingPhoto.url} -> ${photo.url}`);
          return updated;
        } else {
          // Criar nova foto
          const created = await prisma.photo.create({
            data: {
              visitId,
              url: photo.url,
              type: photo.type,
              latitude: photo.latitude || null,
              longitude: photo.longitude || null,
            },
          });
          console.log(`✅ Nova foto ${photo.type} criada: ${photo.url}`);
          return created;
        }
      })
    );

    // Atualizar também checkInPhotoUrl e checkOutPhotoUrl na tabela Visit se necessário
    const checkInPhoto = photos.find(p => p.type === PhotoType.FACADE_CHECKIN);
    const checkOutPhoto = photos.find(p => p.type === PhotoType.FACADE_CHECKOUT);
    
    if (checkInPhoto && !checkInPhoto.url.includes('placeholder.com')) {
      await prisma.visit.update({
        where: { id: visitId },
        data: { checkInPhotoUrl: checkInPhoto.url },
      });
      console.log(`✅ checkInPhotoUrl atualizado na visita: ${checkInPhoto.url}`);
    }
    
    if (checkOutPhoto && !checkOutPhoto.url.includes('placeholder.com')) {
      await prisma.visit.update({
        where: { id: visitId },
        data: { checkOutPhotoUrl: checkOutPhoto.url },
      });
      console.log(`✅ checkOutPhotoUrl atualizado na visita: ${checkOutPhoto.url}`);
    }

    res.json({
      photos: createdPhotos,
      count: createdPhotos.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Upload photos error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const priceResearchSchema = z.object({
  visitId: z.string().uuid(),
  storeId: z.string().uuid(),
  productName: z.string().min(1),
  price: z.number().positive(),
  competitorPrices: z.array(
    z.object({
      competitorName: z.string().min(1),
      price: z.number().positive(),
    })
  ),
});

export async function submitPriceResearch(req: AuthRequest, res: Response) {
  try {
    const { visitId, storeId, productName, price, competitorPrices } = priceResearchSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verificar se a visita existe e pertence ao promotor
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        promoterId,
      },
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visita não encontrada' });
    }

    // Criar pesquisa de preço
    const priceResearch = await prisma.priceResearch.create({
      data: {
        visitId,
        storeId,
        productName,
        price,
        competitorPrices: competitorPrices as any,
      },
    });

    res.json({
      priceResearch,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Price research error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getStores(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;

    // Buscar lojas atribuídas ao promotor (rota configurada)
    const routeAssignments = await prisma.routeAssignment.findMany({
      where: {
        promoterId,
        isActive: true,
      },
      include: {
        store: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Se o promotor tem rota configurada, retornar apenas essas lojas
    if (routeAssignments.length > 0) {
      return res.json({
        stores: routeAssignments.map((a: { store: any }) => a.store),
        hasRoute: true,
      });
    }

    // Caso contrário, retornar todas as lojas (compatibilidade com versão antiga)
    const stores = await prisma.store.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ stores, hasRoute: false });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getCurrentVisit(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;

    // Buscar visita em aberto
    const visit = await prisma.visit.findFirst({
      where: {
        promoterId,
        checkOutAt: null,
      },
      include: {
        store: true,
        photos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        checkInAt: 'desc',
      },
    });

    if (!visit) {
      return res.json({ visit: null });
    }

    res.json({
      visit: {
        id: visit.id,
        store: visit.store,
        checkInAt: visit.checkInAt,
        checkInLatitude: visit.checkInLatitude,
        checkInLongitude: visit.checkInLongitude,
        photos: visit.photos,
      },
    });
  } catch (error) {
    console.error('Get current visit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getVisits(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Buscar visitas do promotor
    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where: { promoterId },
        include: {
          store: true,
          photos: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          checkInAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.visit.count({
        where: { promoterId },
      }),
    ]);

    res.json({
      visits: visits.map((visit: any) => ({
        id: visit.id,
        store: visit.store,
        checkInAt: visit.checkInAt,
        checkOutAt: visit.checkOutAt,
        hoursWorked: visit.checkOutAt
          ? ((visit.checkOutAt.getTime() - visit.checkInAt.getTime()) / (1000 * 60 * 60)).toFixed(2)
          : null,
        photoCount: visit.photos.length,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

