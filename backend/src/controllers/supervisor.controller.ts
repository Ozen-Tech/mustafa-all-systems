import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { UserRole } from '../types';

/** Campos de loja usados nas telas de promotor — evita SELECT de chainId se a migration ainda não rodou. */
const storeSelect = {
  id: true,
  name: true,
  address: true,
  code: true,
  state: true,
  latitude: true,
  longitude: true,
  filialCode: true,
} as const;

/**
 * Obtém escopo do supervisor: quais promotores/estados ele pode ver.
 * Admin vê todos; supervisor vê apenas promotores vinculados.
 */
async function supervisorScope(supervisorId: string): Promise<{
  promoterIds?: string[];
  states?: string[];
}> {
  const supervisor = await prisma.user.findUnique({
    where: { id: supervisorId },
    select: { role: true },
  });

  if (supervisor?.role === UserRole.ADMIN) {
    return {};
  }

  const promoterIds: string[] = [];
  const states = new Set<string>();

  const linkedPromoters = await prisma.user.findMany({
    where: {
      role: UserRole.PROMOTER,
      OR: [
        { promoterSupervisors: { some: { supervisorId } } },
        { routeAssignments: { some: { supervisorId, isActive: true } } },
      ],
    },
    select: { id: true, state: true },
  });

  linkedPromoters.forEach(p => {
    promoterIds.push(p.id);
    if (p.state) states.add(p.state);
  });

  const regions = await prisma.supervisorRegion.findMany({
    where: { supervisorId },
    select: { state: true },
  });
  regions.forEach(r => states.add(r.state));

  return {
    promoterIds: promoterIds.length > 0 ? promoterIds : undefined,
    states: states.size > 0 ? Array.from(states) : undefined,
  };
}

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const totalPromoters = await prisma.user.count({
      where: { role: UserRole.PROMOTER },
    });

    const visitsToday = await prisma.visit.count({
      where: {
        checkInAt: {
          gte: today,
        },
      },
    });

    const visitsThisWeek = await prisma.visit.count({
      where: {
        checkInAt: {
          gte: startOfWeek,
        },
      },
    });

    const visitsThisMonth = await prisma.visit.count({
      where: {
        checkInAt: {
          gte: startOfMonth,
        },
      },
    });

    const activePromotersToday = await prisma.visit.groupBy({
      by: ['promoterId'],
      where: {
        checkInAt: {
          gte: today,
        },
      },
    });

    const visitsByPromoter = await prisma.visit.groupBy({
      by: ['promoterId'],
      where: {
        checkInAt: {
          gte: startOfWeek,
        },
      },
      _count: {
        id: true,
      },
    });

    const visitsWithHours = await prisma.visit.findMany({
      where: {
        checkInAt: {
          gte: today,
        },
        checkOutAt: {
          not: null,
        },
      },
      select: {
        checkInAt: true,
        checkOutAt: true,
      },
    });

    const totalHoursToday = visitsWithHours.reduce((total: number, visit: any) => {
      if (visit.checkOutAt) {
        const hours = (visit.checkOutAt.getTime() - visit.checkInAt.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    res.json({
      stats: {
        totalPromoters,
        visitsToday,
        visitsThisWeek,
        visitsThisMonth,
        activePromotersToday: activePromotersToday.length,
        totalHoursToday: totalHoursToday.toFixed(2),
      },
      visitsByPromoter: visitsByPromoter.map((v: any) => ({
        promoterId: v.promoterId,
        visitCount: v._count.id,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPromoterPerformance(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    if (startDate) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 30);
    }
    
    const end = endDate ? new Date(endDate as string) : new Date();
    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    const promoter = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!promoter || promoter.id !== id) {
      return res.status(404).json({ message: 'Promotor não encontrado' });
    }

    const visits = await prisma.visit.findMany({
      where: {
        promoterId: id,
        checkInAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        store: { select: storeSelect },
        photos: true,
      },
      orderBy: {
        checkInAt: 'desc',
      },
    });

    const totalVisits = visits.length;
    const completedVisits = visits.filter((v: any) => v.checkOutAt !== null).length;
    const totalHours = visits
      .filter((v: any) => v.checkOutAt !== null)
      .reduce((total: number, visit: any) => {
        if (visit.checkOutAt) {
          const hours = (visit.checkOutAt.getTime() - visit.checkInAt.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }
        return total;
      }, 0);

    const totalPhotos = visits.reduce((total: number, visit: any) => total + visit.photos.length, 0);

    const visitsByDay = await prisma.visit.groupBy({
      by: ['checkInAt'],
      where: {
        promoterId: id,
        checkInAt: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    res.json({
      promoter,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      stats: {
        totalVisits,
        completedVisits,
        totalHours: totalHours.toFixed(2),
        totalPhotos,
        averageHoursPerVisit: completedVisits > 0 ? (totalHours / completedVisits).toFixed(2) : '0',
      },
      visits: visits.map((visit: any) => ({
        id: visit.id,
        store: visit.store,
        checkInAt: visit.checkInAt,
        checkOutAt: visit.checkOutAt,
        hoursWorked: visit.checkOutAt
          ? ((visit.checkOutAt.getTime() - visit.checkInAt.getTime()) / (1000 * 60 * 60)).toFixed(2)
          : null,
        photoCount: visit.photos.length,
        checkInPhotoUrl: visit.checkInPhotoUrl,
        checkOutPhotoUrl: visit.checkOutPhotoUrl,
      })),
      visitsByDay: visitsByDay.map((v: any) => ({
        date: v.checkInAt.toISOString().split('T')[0],
        count: v._count.id,
      })),
    });
  } catch (error) {
    console.error('Promoter performance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function dayRangeBRT(dateISO: string): { start: Date; endExclusive: Date } {
  const start = new Date(`${dateISO}T00:00:00-03:00`);
  const endExclusive = new Date(`${dateISO}T00:00:00-03:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
}

function toISODateBRT(d: Date): string {
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

export async function getPromoterVisits(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', date, summary } = req.query;
    const wantSummary = summary === '1' || summary === 'true';
    const dateISO = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

    const promoter = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        state: true,
        role: true,
        createdAt: true,
      },
    });

    if (!promoter) {
      return res.status(404).json({ message: 'Promotor não encontrado' });
    }

    if (wantSummary) {
      const visits = await prisma.visit.findMany({
        where: { promoterId: id },
        select: {
          id: true,
          checkInAt: true,
          checkOutAt: true,
          checkInPhotoUrl: true,
          store: { select: { id: true, name: true, state: true } },
          _count: { select: { photos: true } },
        },
        orderBy: { checkInAt: 'desc' },
        take: 1000,
      });

      type DayAgg = {
        date: string;
        visitCount: number;
        photoCount: number;
        storeNames: string[];
        states: Set<string>;
        storeIds: Set<string>;
        doneIds: Set<string>;
        openIds: Set<string>;
      };
      const byDay = new Map<string, DayAgg>();

      for (const v of visits) {
        const d = toISODateBRT(v.checkInAt);
        let agg = byDay.get(d);
        if (!agg) {
          agg = {
            date: d,
            visitCount: 0,
            photoCount: 0,
            storeNames: [],
            states: new Set(),
            storeIds: new Set(),
            doneIds: new Set(),
            openIds: new Set(),
          };
          byDay.set(d, agg);
        }
        agg.visitCount += 1;
        agg.photoCount += v._count.photos;
        if (v.store?.state) agg.states.add(v.store.state);
        if (v.store?.id) {
          if (!agg.storeIds.has(v.store.id)) {
            agg.storeIds.add(v.store.id);
            agg.storeNames.push(v.store.name);
          }
          if (v.checkOutAt) {
            agg.doneIds.add(v.store.id);
            agg.openIds.delete(v.store.id);
          } else if (!agg.doneIds.has(v.store.id)) {
            agg.openIds.add(v.store.id);
          }
        }
      }

      const days = Array.from(byDay.values())
        .map((a) => ({
          date: a.date,
          visitCount: a.visitCount,
          storesCount: a.storeIds.size,
          storesDone: a.doneIds.size,
          storesOpen: a.openIds.size,
          photoCount: a.photoCount,
          storeNames: a.storeNames.slice(0, 6),
          states: Array.from(a.states),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const latestAvatar =
        visits.find((v) => v.checkInPhotoUrl && !v.checkInPhotoUrl.includes('placeholder'))?.checkInPhotoUrl ??
        null;

      return res.json({
        promoter: { ...promoter, avatarUrl: latestAvatar },
        days,
      });
    }

    if (dateISO) {
      const { start, endExclusive } = dayRangeBRT(dateISO);
      const visits = await prisma.visit.findMany({
        where: {
          promoterId: id,
          checkInAt: { gte: start, lt: endExclusive },
        },
        include: {
          store: { select: storeSelect },
          photos: {
            orderBy: { createdAt: 'asc' },
            include: {
              photoIndustries: {
                take: 1,
                include: { industry: { select: { name: true, abbreviation: true } } },
              },
            },
          },
        },
        orderBy: { checkInAt: 'asc' },
      });

      return res.json({
        promoter,
        date: dateISO,
        visits: visits.map((visit: any) => ({
          id: visit.id,
          store: visit.store,
          promoterName: promoter.name,
          checkInAt: visit.checkInAt,
          checkOutAt: visit.checkOutAt,
          checkInLatitude: visit.checkInLatitude,
          checkInLongitude: visit.checkInLongitude,
          checkOutLatitude: visit.checkOutLatitude,
          checkOutLongitude: visit.checkOutLongitude,
          checkInPhotoUrl: visit.checkInPhotoUrl,
          checkOutPhotoUrl: visit.checkOutPhotoUrl,
          hoursWorked: visit.checkOutAt
            ? ((visit.checkOutAt.getTime() - visit.checkInAt.getTime()) / (1000 * 60 * 60)).toFixed(2)
            : null,
          photos: visit.photos.map((p: any) => {
            const industry = p.photoIndustries?.[0]?.industry;
            return {
              id: p.id,
              url: p.url,
              type: p.type,
              latitude: p.latitude,
              longitude: p.longitude,
              createdAt: p.createdAt,
              industryName: industry?.name ?? null,
              industryAbbreviation: industry?.abbreviation ?? null,
            };
          }),
          photoCount: visit.photos.length,
        })),
      });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where: { promoterId: id },
        include: {
          promoter: { select: { name: true } },
          store: { select: storeSelect },
          photos: {
            orderBy: { createdAt: 'asc' },
            include: {
              photoIndustries: {
                take: 1,
                include: { industry: { select: { name: true, abbreviation: true } } },
              },
            },
          },
        },
        orderBy: { checkInAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.visit.count({ where: { promoterId: id } }),
    ]);

    res.json({
      promoter,
      visits: visits.map((visit: any) => ({
        id: visit.id,
        store: visit.store,
        promoterName: visit.promoter?.name ?? promoter.name,
        checkInAt: visit.checkInAt,
        checkOutAt: visit.checkOutAt,
        checkInLatitude: visit.checkInLatitude,
        checkInLongitude: visit.checkInLongitude,
        checkOutLatitude: visit.checkOutLatitude,
        checkOutLongitude: visit.checkOutLongitude,
        checkInPhotoUrl: visit.checkInPhotoUrl,
        checkOutPhotoUrl: visit.checkOutPhotoUrl,
        hoursWorked: visit.checkOutAt
          ? ((visit.checkOutAt.getTime() - visit.checkInAt.getTime()) / (1000 * 60 * 60)).toFixed(2)
          : null,
        photos: visit.photos.map((p: any) => {
          const industry = p.photoIndustries?.[0]?.industry;
          return {
            id: p.id,
            url: p.url,
            type: p.type,
            latitude: p.latitude,
            longitude: p.longitude,
            createdAt: p.createdAt,
            industryName: industry?.name ?? null,
            industryAbbreviation: industry?.abbreviation ?? null,
          };
        }),
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
    console.error('Get promoter visits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPromoterRoute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const promoter = await prisma.user.findUnique({
      where: { id },
    });

    if (!promoter) {
      return res.status(404).json({ message: 'Promotor não encontrado' });
    }

    const visits = await prisma.visit.findMany({
      where: {
        promoterId: id,
        checkInAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        store: { select: storeSelect },
        locations: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
      orderBy: {
        checkInAt: 'asc',
      },
    });

    const route = visits.map((visit: any) => ({
      id: visit.id,
      store: visit.store,
      checkInAt: visit.checkInAt,
      checkOutAt: visit.checkOutAt,
      checkInLocation: {
        latitude: visit.checkInLatitude,
        longitude: visit.checkInLongitude,
      },
      checkOutLocation: visit.checkOutAt
        ? {
            latitude: visit.checkOutLatitude!,
            longitude: visit.checkOutLongitude!,
          }
        : null,
      locations: visit.locations.map((loc: any) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: loc.timestamp,
      })),
    }));

    res.json({
      date: targetDate.toISOString().split('T')[0],
      promoter: {
        id: promoter.id,
        name: promoter.name,
      },
      route,
      totalVisits: visits.length,
    });
  } catch (error) {
    console.error('Get promoter route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMissingPhotos(req: AuthRequest, res: Response) {
  try {
    const { promoterId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    if (startDate) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 30);
    }
    
    const end = endDate ? new Date(endDate as string) : new Date();
    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    const visits = await prisma.visit.findMany({
      where: {
        ...(promoterId ? { promoterId: promoterId as string } : {}),
        checkInAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        store: { select: storeSelect },
        photos: true,
        promoter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const visitsWithMissingPhotos = visits.filter((visit: any) => {
      const photoCount = visit.photos.length;
      return photoCount <= 2;
    });

    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      missingPhotos: visitsWithMissingPhotos.map((visit: any) => ({
        visitId: visit.id,
        promoter: visit.promoter,
        store: visit.store,
        checkInAt: visit.checkInAt,
        checkOutAt: visit.checkOutAt,
        photoCount: visit.photos.length,
        expectedPhotos: 3,
      })),
      total: visitsWithMissingPhotos.length,
    });
  } catch (error) {
    console.error('Get missing photos error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const setPhotoQuotaSchema = z.object({
  expectedPhotos: z.number().int().positive(),
});

export async function setPhotoQuota(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { expectedPhotos } = setPhotoQuotaSchema.parse(req.body);

    const promoter = await prisma.user.findUnique({
      where: { id },
    });

    if (!promoter) {
      return res.status(404).json({ message: 'Promotor não encontrado' });
    }

    const quota = await prisma.photoQuota.upsert({
      where: { promoterId: id },
      update: {
        expectedPhotos,
      },
      create: {
        promoterId: id,
        expectedPhotos,
      },
    });

    res.json({
      quota,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Set photo quota error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const exportReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  promoterIds: z.array(z.string().uuid()).optional(),
  storeIds: z.array(z.string().uuid()).optional(),
  format: z.enum(['pptx', 'pdf', 'excel', 'html']),
});

export async function exportReport(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate, promoterIds, storeIds, format } = exportReportSchema.parse(
      req.body
    );
    const userId = req.userId!;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const exportJob = await prisma.exportJob.create({
      data: {
        userId,
        status: 'processing',
        progress: 0,
        format,
        filters: {
          startDate,
          endDate,
          promoterIds: promoterIds || [],
          storeIds: storeIds || [],
        },
      },
    });

    setImmediate(async () => {
      try {
        const {
          generatePowerPointReport,
          generatePDFReport,
          generateExcelReport,
          generateHTMLReport,
        } = await import('../services/export.service');

        let buffer: Buffer | string;
        let contentType: string;
        let filename: string;

        switch (format) {
          case 'pptx':
            buffer = await generatePowerPointReport({
              startDate: start,
              endDate: end,
              promoterIds,
              storeIds,
              format,
            });
            contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            filename = `relatorio-${startDate}-${endDate}.pptx`;
            break;
          case 'pdf':
            buffer = await generatePDFReport({
              startDate: start,
              endDate: end,
              promoterIds,
              storeIds,
              format,
            });
            contentType = 'application/pdf';
            filename = `relatorio-${startDate}-${endDate}.pdf`;
            break;
          case 'excel':
            buffer = await generateExcelReport({
              startDate: start,
              endDate: end,
              promoterIds,
              storeIds,
              format,
            });
            contentType =
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            filename = `relatorio-${startDate}-${endDate}.xlsx`;
            break;
          case 'html':
            buffer = await generateHTMLReport({
              startDate: start,
              endDate: end,
              promoterIds,
              storeIds,
              format,
            });
            contentType = 'text/html';
            filename = `relatorio-${startDate}-${endDate}.html`;
            break;
          default:
            throw new Error('Formato não suportado');
        }

        const downloadUrl = `/api/supervisors/export/download/${exportJob.id}`;

        await prisma.exportJob.update({
          where: { id: exportJob.id },
          data: {
            status: 'completed',
            progress: 100,
            downloadUrl,
          },
        });
      } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        await prisma.exportJob.update({
          where: { id: exportJob.id },
          data: {
            status: 'failed',
          },
        });
      }
    });

    res.json({
      jobId: exportJob.id,
      status: exportJob.status,
      message: 'Relatório sendo gerado. Use o jobId para verificar o status.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPendingIndustries(req: AuthRequest, res: Response) {
  try {
    const { view = 'store', date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (view === 'store') {
      const stores = await prisma.store.findMany({
        select: {
          ...storeSelect,
          storeIndustries: {
            where: { isActive: true },
            include: { industry: true },
          },
          visits: {
            where: {
              checkInAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            include: {
              photoIndustries: true,
              promoter: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      const pendingByStore = stores
        .filter(s => s.storeIndustries.length > 0)
        .map(store => {
          const allPhotoIndustries = store.visits.flatMap(v => v.photoIndustries);
          const coveredIds = new Set(allPhotoIndustries.map(pi => pi.industryId));
          
          const pendingIndustries = store.storeIndustries
            .filter(si => !coveredIds.has(si.industryId))
            .map(si => si.industry);

          const coveredIndustries = store.storeIndustries
            .filter(si => coveredIds.has(si.industryId))
            .map(si => si.industry);

          const lastVisit = store.visits.length > 0
            ? store.visits.sort((a, b) => 
                new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime()
              )[0]
            : null;

          return {
            store: { id: store.id, name: store.name, address: store.address },
            totalRequired: store.storeIndustries.length,
            totalCovered: coveredIndustries.length,
            pendingIndustries,
            coveredIndustries,
            lastVisit: lastVisit ? {
              id: lastVisit.id,
              checkInAt: lastVisit.checkInAt,
              promoter: lastVisit.promoter,
            } : null,
            visitsCount: store.visits.length,
          };
        })
        .filter(s => s.pendingIndustries.length > 0)
        .sort((a, b) => b.pendingIndustries.length - a.pendingIndustries.length);

      const totalStoresWithRequirements = stores.filter(s => s.storeIndustries.length > 0).length;
      const totalStoresWithPending = pendingByStore.length;
      const totalStoresComplete = totalStoresWithRequirements - totalStoresWithPending;

      res.json({
        view: 'store',
        date: targetDate.toISOString().split('T')[0],
        stats: {
          totalStoresWithRequirements,
          totalStoresWithPending,
          totalStoresComplete,
          complianceRate: totalStoresWithRequirements > 0
            ? Math.round((totalStoresComplete / totalStoresWithRequirements) * 100)
            : 100,
        },
        pending: pendingByStore,
      });

    } else {
      const visits = await prisma.visit.findMany({
        where: {
          checkInAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          promoter: { select: { id: true, name: true, email: true } },
          store: {
            select: {
              ...storeSelect,
              storeIndustries: {
                where: { isActive: true },
                include: { industry: true },
              },
            },
          },
          photoIndustries: true,
        },
      });

      const pendingByPromoter = visits
        .filter(v => v.store.storeIndustries.length > 0)
        .map(visit => {
          const coveredIds = new Set(visit.photoIndustries.map(pi => pi.industryId));
          
          const pendingIndustries = visit.store.storeIndustries
            .filter(si => !coveredIds.has(si.industryId))
            .map(si => ({
              ...si.industry,
              storeName: visit.store.name,
            }));

          const coveredIndustries = visit.store.storeIndustries
            .filter(si => coveredIds.has(si.industryId))
            .map(si => si.industry);

          return {
            promoter: visit.promoter,
            store: { id: visit.store.id, name: visit.store.name },
            visitId: visit.id,
            visitDate: visit.checkInAt,
            checkOutAt: visit.checkOutAt,
            totalRequired: visit.store.storeIndustries.length,
            totalCovered: coveredIndustries.length,
            pendingIndustries,
            coveredIndustries,
            percentComplete: visit.store.storeIndustries.length > 0
              ? Math.round((coveredIndustries.length / visit.store.storeIndustries.length) * 100)
              : 100,
          };
        })
        .filter(v => v.pendingIndustries.length > 0)
        .sort((a, b) => b.pendingIndustries.length - a.pendingIndustries.length);

      const visitsWithRequirements = visits.filter(v => v.store.storeIndustries.length > 0);
      const visitsComplete = visitsWithRequirements.filter(v => {
        const coveredIds = new Set(v.photoIndustries.map(pi => pi.industryId));
        return v.store.storeIndustries.every(si => coveredIds.has(si.industryId));
      });

      res.json({
        view: 'promoter',
        date: targetDate.toISOString().split('T')[0],
        stats: {
          totalVisitsWithRequirements: visitsWithRequirements.length,
          totalVisitsWithPending: pendingByPromoter.length,
          totalVisitsComplete: visitsComplete.length,
          complianceRate: visitsWithRequirements.length > 0
            ? Math.round((visitsComplete.length / visitsWithRequirements.length) * 100)
            : 100,
        },
        pending: pendingByPromoter,
      });
    }
  } catch (error) {
    console.error('Get pending industries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMyStates(req: AuthRequest, res: Response) {
  try {
    const isAdmin = req.userRole === UserRole.ADMIN;
    const supervisorId = req.userId!;

    if (isAdmin) {
      const promoters = await prisma.user.findMany({
        where: { role: UserRole.PROMOTER, state: { not: null } },
        select: { state: true },
        distinct: ['state'],
        orderBy: { state: 'asc' },
      });
      return res.json({ states: promoters.map((p) => p.state!).filter(Boolean) });
    }

    const stateSet = new Set<string>();

    const promoters = await prisma.user.findMany({
      where: {
        role: UserRole.PROMOTER,
        promoterSupervisors: { some: { supervisorId } },
        state: { not: null },
      },
      select: { state: true },
      distinct: ['state'],
    });
    promoters.forEach(p => { if (p.state) stateSet.add(p.state); });

    const routeStores = await prisma.routeAssignment.findMany({
      where: { supervisorId, isActive: true },
      select: { store: { select: { state: true } } },
    });
    routeStores.forEach(ra => { if (ra.store.state) stateSet.add(ra.store.state); });

    if (stateSet.size === 0) {
      const regions = await prisma.supervisorRegion.findMany({
        where: { supervisorId },
        select: { state: true },
        orderBy: { state: 'asc' },
      });
      return res.json({ states: regions.map(r => r.state) });
    }

    res.json({ states: Array.from(stateSet).sort() });
  } catch (error) {
    console.error('Get my states error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPendingOverview(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const { state } = req.query;

    const whereClause: any = {
      role: UserRole.PROMOTER,
      OR: [
        { promoterSupervisors: { some: { supervisorId } } },
        { routeAssignments: { some: { supervisorId, isActive: true } } },
      ],
    };

    if (state) {
      whereClause.state = String(state).toUpperCase();
    }

    const promoters = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        state: true,
        routeAssignments: {
          where: { isActive: true },
          select: {
            supervisorId: true,
            store: {
              select: {
                id: true,
                name: true,
                state: true,
                storeIndustries: {
                  where: { isActive: true },
                  select: {
                    industry: {
                      select: { id: true, name: true, code: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Promise.all(
      promoters.map(async (promoter) => {
        const relevantAssignments = promoter.routeAssignments.filter(
          ra => ra.supervisorId === supervisorId || ra.supervisorId === null
        );

        const storeIds = relevantAssignments.map(ra => ra.store.id);

        const [assignments, latestVisits] = await Promise.all([
          prisma.industryAssignment.findMany({
            where: {
              promoterId: promoter.id,
              isActive: true,
              storeId: { in: storeIds },
            },
            include: { industry: true },
          }),
          prisma.visit.findMany({
            where: {
              promoterId: promoter.id,
              storeId: { in: storeIds },
            },
            orderBy: [{ storeId: 'asc' }, { checkInAt: 'desc' }],
            distinct: ['storeId'],
            select: {
              storeId: true,
              checkInAt: true,
              checkOutAt: true,
              photos: {
                where: { type: 'OTHER' },
                select: { selectedIndustryId: true },
              },
            },
          }),
        ]);

        const assignmentsByStore = new Map<string, typeof assignments>();
        assignments.forEach((assignment) => {
          const storeAssignments = assignmentsByStore.get(assignment.storeId || '') || [];
          storeAssignments.push(assignment);
          assignmentsByStore.set(assignment.storeId || '', storeAssignments);
        });

        const latestVisitByStore = new Map(latestVisits.map(v => [v.storeId, v]));

        const stores = relevantAssignments.map((ra) => {
          const store = ra.store;
          const promoterStoreAssignments = assignmentsByStore.get(store.id) || [];
          const requiredIndustries =
            promoterStoreAssignments.length > 0
              ? promoterStoreAssignments.map(a => a.industry)
              : store.storeIndustries.map(si => si.industry);

          if (requiredIndustries.length === 0) {
            return {
              id: store.id,
              name: store.name,
              industries: [],
              totalRequired: 0,
              totalCovered: 0,
            };
          }

          const latestVisit = latestVisitByStore.get(store.id);
          const coveredIndustryIds = new Set(
            (latestVisit?.photos || [])
              .map(p => p.selectedIndustryId)
              .filter(Boolean)
          );

          const industries = requiredIndustries.map(ind => ({
            id: ind.id,
            name: ind.name,
            code: ind.code,
            hasCoverage: coveredIndustryIds.has(ind.id),
            photoCount: (latestVisit?.photos || []).filter(
              p => p.selectedIndustryId === ind.id
            ).length,
          }));

          return {
            id: store.id,
            name: store.name,
            lastVisitAt: latestVisit?.checkInAt || null,
            lastVisitCompleted: !!latestVisit?.checkOutAt,
            industries,
            totalRequired: requiredIndustries.length,
            totalCovered: industries.filter(i => i.hasCoverage).length,
          };
        });

        const totalRequired = stores.reduce((sum, s) => sum + s.totalRequired, 0);
        const totalCovered = stores.reduce((sum, s) => sum + s.totalCovered, 0);
        const isPending = totalRequired > 0 && totalCovered < totalRequired;

        return {
          id: promoter.id,
          name: promoter.name,
          email: promoter.email,
          state: promoter.state,
          stores,
          totalRequired,
          totalCovered,
          isPending,
        };
      })
    );

    result.sort((a, b) => {
      if (a.isPending && !b.isPending) return -1;
      if (!a.isPending && b.isPending) return 1;
      return a.name.localeCompare(b.name);
    });

    const summary = {
      total: result.length,
      pending: result.filter(p => p.isPending).length,
      complete: result.filter(p => !p.isPending).length,
    };

    res.json({ state: state || null, promoters: result, summary });
  } catch (error) {
    console.error('Get pending overview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPromoterMissHistory(req: AuthRequest, res: Response) {
  try {
    const { id: promoterId } = req.params;
    const days = Math.min(Math.max(parseInt((req.query.days as string) || '30', 10) || 30, 1), 180);

    const requesterId = req.userId!;
    const requesterRole = req.userRole;

    if (requesterRole !== UserRole.ADMIN) {
      const allowed = await prisma.user.count({
        where: {
          id: promoterId,
          role: UserRole.PROMOTER,
          OR: [
            { promoterSupervisors: { some: { supervisorId: requesterId } } },
            { routeAssignments: { some: { supervisorId: requesterId, isActive: true } } },
          ],
        },
      });
      if (!allowed) return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const misses = await prisma.industryMiss.findMany({
      where: { promoterId, createdAt: { gte: start } },
      include: {
        store: { select: { id: true, name: true, state: true } },
        industry: { select: { id: true, name: true, abbreviation: true, code: true } },
        visit: { select: { id: true, checkInAt: true, checkOutAt: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const byDay = new Map<string, number>();
    for (const m of misses) {
      const day = m.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }

    res.json({
      promoterId,
      days,
      start: start.toISOString().slice(0, 10),
      total: misses.length,
      byDay: Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count })),
      misses: misses.map((m) => ({
        id: m.id,
        createdAt: m.createdAt,
        reason: m.reason,
        note: m.note,
        store: m.store,
        industry: m.industry,
        visit: m.visit,
      })),
    });
  } catch (error) {
    console.error('Get promoter miss history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getScopedPromoters(req: AuthRequest, res: Response) {
  try {
    const isAdmin = req.userRole === UserRole.ADMIN;
    const supervisorId = req.userId!;

    const where: any = { role: UserRole.PROMOTER };
    if (!isAdmin) {
      where.OR = [
        { promoterSupervisors: { some: { supervisorId } } },
        { routeAssignments: { some: { supervisorId, isActive: true } } },
      ];
    }

    const promoters = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        state: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ promoters });
  } catch (error) {
    console.error('Get scoped promoters error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ============================================================
// V2: Novas funções do painel supervisor
// ============================================================

/**
 * GET /supervisor/day-status
 * Status do dia por promotor
 */
export async function getDayStatus(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const scope = await supervisorScope(supervisorId);

    const promoters = await prisma.user.findMany({
      where: {
        role: 'PROMOTER',
        ...(scope.promoterIds?.length ? { id: { in: scope.promoterIds } } : {}),
        ...(scope.states?.length ? { state: { in: scope.states } } : {}),
      },
      select: {
        id: true,
        name: true,
        state: true,
      },
    });

    const routes = await prisma.routeAssignment.findMany({
      where: {
        promoterId: { in: promoters.map(p => p.id) },
        isActive: true,
      },
      select: {
        promoterId: true,
        storeId: true,
      },
    });

    const storesByPromoter = new Map<string, Set<string>>();
    for (const route of routes) {
      if (!storesByPromoter.has(route.promoterId)) {
        storesByPromoter.set(route.promoterId, new Set());
      }
      storesByPromoter.get(route.promoterId)!.add(route.storeId);
    }

    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const visits = await prisma.visit.findMany({
      where: {
        promoterId: { in: promoters.map(p => p.id) },
        checkInAt: { gte: dayStart, lt: dayEnd },
      },
      select: {
        promoterId: true,
        storeId: true,
        checkInAt: true,
        checkOutAt: true,
      },
    });

    const visitsByPromoter = new Map<string, typeof visits>();
    for (const visit of visits) {
      if (!visitsByPromoter.has(visit.promoterId)) {
        visitsByPromoter.set(visit.promoterId, []);
      }
      visitsByPromoter.get(visit.promoterId)!.push(visit);
    }

    const result = promoters.map(promoter => {
      const stores = storesByPromoter.get(promoter.id) || new Set();
      const promoterVisits = visitsByPromoter.get(promoter.id) || [];
      const visitedStores = new Set(promoterVisits.map(v => v.storeId));
      const lastCheckIn = promoterVisits
        .filter(v => v.checkInAt)
        .sort((a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime())[0];

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (promoterVisits.length > 0) {
        const hasActiveVisit = promoterVisits.some(v => !v.checkOutAt);
        if (visitedStores.size >= stores.size && !hasActiveVisit) {
          status = 'completed';
        } else {
          status = 'in_progress';
        }
      }

      return {
        id: promoter.id,
        name: promoter.name,
        state: promoter.state,
        storesTotal: stores.size,
        storesVisited: visitedStores.size,
        lastCheckIn: lastCheckIn?.checkInAt.toISOString(),
        status,
      };
    });

    const statusOrder = { not_started: 0, in_progress: 1, completed: 2 };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    res.json({ promoters: result });
  } catch (error) {
    console.error('Get day status error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * GET /supervisor/check-in-reviews
 * Lista check-ins pendentes de revisão (sem GPS)
 */
export async function getCheckInReviews(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const scope = await supervisorScope(supervisorId);

    const reviews = await prisma.checkInReview.findMany({
      where: {
        reviewedAt: null,
        gpsStatus: { not: 'OK' },
        visit: {
          promoter: {
            ...(scope.promoterIds?.length ? { id: { in: scope.promoterIds } } : {}),
            ...(scope.states?.length ? { state: { in: scope.states } } : {}),
          },
        },
      },
      include: {
        visit: {
          include: {
            promoter: { select: { id: true, name: true } },
            store: { select: { id: true, name: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      reviews: reviews.map(r => ({
        id: r.id,
        visitId: r.visitId,
        gpsStatus: r.gpsStatus,
        promoter: r.visit.promoter,
        store: r.visit.store,
        checkInAt: r.visit.checkInAt,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get check-in reviews error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

const reviewCheckInSchema = z.object({
  reviewId: z.string().uuid(),
  approved: z.boolean(),
  note: z.string().max(500).optional(),
});

/**
 * POST /supervisor/review-check-in
 * Aprova ou rejeita check-in sem GPS
 */
export async function reviewCheckIn(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const data = reviewCheckInSchema.parse(req.body);

    const review = await prisma.checkInReview.update({
      where: { id: data.reviewId },
      data: {
        approved: data.approved,
        note: data.note,
        reviewedAt: new Date(),
        reviewedBy: supervisorId,
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Review check-in error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

const reassignStoreSchema = z.object({
  storeId: z.string().uuid(),
  fromPromoterId: z.string().uuid(),
  toPromoterId: z.string().uuid(),
});

/**
 * POST /supervisor/reassign-store
 * Troca promotor de uma loja
 */
export async function reassignStore(req: AuthRequest, res: Response) {
  try {
    const data = reassignStoreSchema.parse(req.body);

    await prisma.routeAssignment.deleteMany({
      where: {
        storeId: data.storeId,
        promoterId: data.fromPromoterId,
      },
    });

    await prisma.routeAssignment.create({
      data: {
        storeId: data.storeId,
        promoterId: data.toPromoterId,
        isActive: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Reassign store error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * GET /supervisor/stores-without-promoter
 * Lista lojas sem promotor atribuído
 */
export async function getStoresWithoutPromoter(req: AuthRequest, res: Response) {
  try {
    const supervisorId = req.userId!;
    const scope = await supervisorScope(supervisorId);

    const stores = await prisma.store.findMany({
      where: {
        ...(scope.states?.length ? { state: { in: scope.states } } : {}),
        routeAssignments: { none: { isActive: true } },
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        state: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ stores });
  } catch (error) {
    console.error('Get stores without promoter error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
