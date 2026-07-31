import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { hashPassword } from '../utils/password';
import { UserRole } from '../types';
import { AuthRequest } from '../middleware/auth';
import { ensureIndustryOwnerAssignmentTable } from '../utils/industryOwnerScope';

const optionalUuid = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.string().uuid().optional()
);

const optionalNullableUuid = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().uuid().optional().nullable()
);

/**
 * Endpoint temporário para executar seed do banco de dados
 * ⚠️ REMOVER EM PRODUÇÃO ou proteger com autenticação forte
 */
export async function seedDatabase(req: Request, res: Response) {
  try {
    // ⚠️ SEGURANÇA: Em produção, adicione uma verificação de secret
    const secret = req.headers['x-seed-secret'] || req.body.secret;
    const expectedSecret = process.env.SEED_SECRET || 'temporary-seed-secret-change-me';
    
    if (secret !== expectedSecret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('🌱 Starting database seed...');

    // Create test users
    const adminPassword = await hashPassword('admin123');
    const supervisorPassword = await hashPassword('senha123');
    const promoterPassword = await hashPassword('senha123');

    // Create admin
    const admin = await prisma.user.upsert({
      where: { email: 'admin@promo.com' },
      update: {
        password: adminPassword,
        role: UserRole.ADMIN,
      },
      create: {
        email: 'admin@promo.com',
        name: 'Administrador',
        password: adminPassword,
        role: UserRole.ADMIN,
      },
    });

    console.log('✅ Admin created:', admin.email);

    // Create supervisor
    const supervisor = await prisma.user.upsert({
      where: { email: 'supervisor@teste.com' },
      update: {},
      create: {
        email: 'supervisor@teste.com',
        name: 'Supervisor Teste',
        password: supervisorPassword,
        role: UserRole.SUPERVISOR,
      },
    });

    console.log('✅ Supervisor created:', supervisor.email);

    // Create promoters
    const promoters = await Promise.all([
      prisma.user.upsert({
        where: { email: 'promotor1@teste.com' },
        update: {},
        create: {
          email: 'promotor1@teste.com',
          name: 'Promotor 1',
          password: promoterPassword,
          role: UserRole.PROMOTER,
        },
      }),
      prisma.user.upsert({
        where: { email: 'promotor2@teste.com' },
        update: {},
        create: {
          email: 'promotor2@teste.com',
          name: 'Promotor 2',
          password: promoterPassword,
          role: UserRole.PROMOTER,
        },
      }),
    ]);

    console.log('✅ Promoters created:', promoters.map(p => p.email));

    // Create test stores
    let store1 = await prisma.store.findFirst({
      where: { name: 'Loja ABC' },
    });

    if (!store1) {
      store1 = await prisma.store.create({
        data: {
          name: 'Loja ABC',
          address: 'Rua Teste, 123 - São Paulo, SP',
          latitude: -23.5505,
          longitude: -46.6333,
        },
      });
    }

    let store2 = await prisma.store.findFirst({
      where: { name: 'Loja XYZ' },
    });

    if (!store2) {
      store2 = await prisma.store.create({
        data: {
          name: 'Loja XYZ',
          address: 'Av. Exemplo, 456 - São Paulo, SP',
          latitude: -23.5632,
          longitude: -46.6541,
        },
      });
    }

    console.log('✅ Stores created');

    // Create photo quotas
    await Promise.all(
      promoters.map(promoter =>
        prisma.photoQuota.upsert({
          where: { promoterId: promoter.id },
          update: {},
          create: {
            promoterId: promoter.id,
            expectedPhotos: 10,
          },
        })
      )
    );

    console.log('✅ Photo quotas created');

    res.json({
      success: true,
      message: 'Database seeded successfully',
      users: {
        admin: admin.email,
        supervisor: supervisor.email,
        promoters: promoters.map(p => p.email),
      },
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding database',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Schemas de validação
const createUserSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  state: z.string().length(2).optional(),
  industryId: optionalUuid,
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
  phone: z.string().optional(),
  state: z.string().length(2).optional().nullable(),
  industryId: optionalNullableUuid,
});

/**
 * Listar todos os usuários
 */
export async function listUsers(req: AuthRequest, res: Response) {
  try {
    await ensureIndustryOwnerAssignmentTable().catch((e) =>
      console.warn('listUsers: ensure IndustryOwnerAssignment failed:', e)
    );

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const assignmentByUserId = new Map<
      string,
      {
        industryId: string;
        industry: { id: string; name: string; code: string; abbreviation: string | null };
      }
    >();

    try {
      const assignments = await prisma.industryOwnerAssignment.findMany({
        select: {
          userId: true,
          industryId: true,
          industry: {
            select: { id: true, name: true, code: true, abbreviation: true },
          },
        },
      });
      for (const a of assignments) {
        assignmentByUserId.set(a.userId, {
          industryId: a.industryId,
          industry: a.industry,
        });
      }
    } catch (assignmentError) {
      console.warn('listUsers: IndustryOwnerAssignment unavailable:', assignmentError);
    }

    res.json({
      users: users.map((u) => {
        const assignment = assignmentByUserId.get(u.id);
        return {
          ...u,
          industryId: assignment?.industryId ?? null,
          industry: assignment?.industry ?? null,
        };
      }),
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Criar novo usuário
 */
export async function createUser(req: AuthRequest, res: Response) {
  try {
    const data = createUserSchema.parse(req.body);

    if (data.role === UserRole.INDUSTRY_OWNER) {
      await ensureIndustryOwnerAssignmentTable();
      if (!data.industryId) {
        return res.status(400).json({ message: 'Dono de indústria exige industryId' });
      }
    }

    if (data.industryId) {
      const industry = await prisma.industry.findUnique({
        where: { id: data.industryId },
        select: { id: true },
      });
      if (!industry) {
        return res.status(400).json({ message: 'Indústria não encontrada' });
      }
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        phone: data.phone || null,
        state: data.state?.toUpperCase() || null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let industryId: string | null = null;
    let industry: { id: string; name: string; code: string; abbreviation: string | null } | null =
      null;

    if (data.role === UserRole.INDUSTRY_OWNER && data.industryId) {
      try {
        const assignment = await prisma.industryOwnerAssignment.create({
          data: { userId: user.id, industryId: data.industryId },
          select: {
            industryId: true,
            industry: {
              select: { id: true, name: true, code: true, abbreviation: true },
            },
          },
        });
        industryId = assignment.industryId;
        industry = assignment.industry;
      } catch (assignmentError) {
        console.error('Create IndustryOwnerAssignment error:', assignmentError);
        // Rollback user to avoid orphan INDUSTRY_OWNER without industry
        await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
        return res.status(500).json({
          message:
            'Falha ao vincular indústria. Verifique se a migration IndustryOwnerAssignment foi aplicada no banco.',
        });
      }
    }

    res.status(201).json({
      user: {
        ...user,
        industryId,
        industry,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Atualizar usuário
 */
export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Se estiver atualizando o email, verificar se não está em uso
    if (data.email && data.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailInUse) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.state !== undefined) updateData.state = data.state?.toUpperCase() || null;
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    const nextRole = data.role ?? existingUser.role;

    if (nextRole === UserRole.INDUSTRY_OWNER || data.industryId !== undefined) {
      await ensureIndustryOwnerAssignmentTable().catch((e) =>
        console.warn('updateUser: ensure IndustryOwnerAssignment failed:', e)
      );
    }

    if (nextRole === UserRole.INDUSTRY_OWNER) {
      let existingIndustryId: string | null = null;
      try {
        existingIndustryId =
          (
            await prisma.industryOwnerAssignment.findUnique({
              where: { userId: id },
              select: { industryId: true },
            })
          )?.industryId ?? null;
      } catch {
        existingIndustryId = null;
      }

      const industryId =
        data.industryId !== undefined ? data.industryId : existingIndustryId;
      if (!industryId) {
        return res.status(400).json({ message: 'Dono de indústria exige industryId' });
      }
      if (data.industryId) {
        const industry = await prisma.industry.findUnique({
          where: { id: data.industryId },
          select: { id: true },
        });
        if (!industry) {
          return res.status(400).json({ message: 'Indústria não encontrada' });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let industryId: string | null = null;
    let industry: {
      id: string;
      name: string;
      code: string;
      abbreviation: string | null;
    } | null = null;

    try {
      if (nextRole === UserRole.INDUSTRY_OWNER && data.industryId) {
        const assignment = await prisma.industryOwnerAssignment.upsert({
          where: { userId: id },
          create: { userId: id, industryId: data.industryId },
          update: { industryId: data.industryId },
          select: {
            industryId: true,
            industry: {
              select: { id: true, name: true, code: true, abbreviation: true },
            },
          },
        });
        industryId = assignment.industryId;
        industry = assignment.industry;
      } else if (data.role && data.role !== UserRole.INDUSTRY_OWNER) {
        await prisma.industryOwnerAssignment.deleteMany({ where: { userId: id } });
      } else if (nextRole === UserRole.INDUSTRY_OWNER && data.industryId === null) {
        await prisma.industryOwnerAssignment.deleteMany({ where: { userId: id } });
      } else {
        const assignment = await prisma.industryOwnerAssignment.findUnique({
          where: { userId: id },
          select: {
            industryId: true,
            industry: {
              select: { id: true, name: true, code: true, abbreviation: true },
            },
          },
        });
        industryId = assignment?.industryId ?? null;
        industry = assignment?.industry ?? null;
      }
    } catch (assignmentError) {
      console.warn('updateUser: IndustryOwnerAssignment op failed:', assignmentError);
    }

    res.json({
      user: {
        ...user,
        industryId,
        industry,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Deletar usuário
 */
export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir deletar a si mesmo
    if (existingUser.id === req.userId) {
      return res.status(400).json({ message: 'Não é possível deletar seu próprio usuário' });
    }

    // Limpa dependências que ainda não têm ON DELETE CASCADE no banco
    // (ex.: Visit.promoterId era Restrict e derrubava o delete com 500).
    await prisma.$transaction(async (tx) => {
      await tx.routeAssignment.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      });

      // Visitas do promotor (fotos/misses/etc. cascateiam a partir da Visit)
      await tx.visit.deleteMany({ where: { promoterId: id } });

      await tx.user.delete({ where: { id } });
    });

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    // Prisma FK / constraint
    if (error?.code === 'P2003' || error?.code === 'P2014') {
      return res.status(409).json({
        message:
          'Não foi possível deletar: ainda há dados vinculados a este usuário. Tente novamente ou contate o suporte.',
      });
    }
    res.status(500).json({
      message: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined,
    });
  }
}

/**
 * Obter detalhes de um usuário
 */
export async function getUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        state: true,
        createdAt: true,
        updatedAt: true,
        supervisorRegions: {
          select: { state: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    let industryId: string | null = null;
    let industry: {
      id: string;
      name: string;
      code: string;
      abbreviation: string | null;
    } | null = null;

    try {
      await ensureIndustryOwnerAssignmentTable().catch(() => undefined);
      const assignment = await prisma.industryOwnerAssignment.findUnique({
        where: { userId: id },
        select: {
          industryId: true,
          industry: {
            select: { id: true, name: true, code: true, abbreviation: true },
          },
        },
      });
      industryId = assignment?.industryId ?? null;
      industry = assignment?.industry ?? null;
    } catch {
      // ignore
    }

    res.json({ user: { ...user, industryId, industry } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Atribuir estados a um supervisor
 */
export async function setSupervisorRegions(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { states } = z.object({ states: z.array(z.string().length(2)) }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== UserRole.SUPERVISOR) {
      return res.status(400).json({ message: 'Usuário não é um supervisor' });
    }

    await prisma.$transaction([
      prisma.supervisorRegion.deleteMany({ where: { supervisorId: id } }),
      ...states.map(state =>
        prisma.supervisorRegion.create({
          data: { supervisorId: id, state: state.toUpperCase() },
        })
      ),
    ]);

    const regions = await prisma.supervisorRegion.findMany({
      where: { supervisorId: id },
      select: { state: true },
    });

    res.json({ states: regions.map(r => r.state) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Set supervisor regions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Listar estados de um supervisor
 */
export async function getSupervisorRegions(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const regions = await prisma.supervisorRegion.findMany({
      where: { supervisorId: id },
      select: { state: true },
    });

    res.json({ states: regions.map(r => r.state) });
  } catch (error) {
    console.error('Get supervisor regions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Atribuir supervisores a um promotor
 */
export async function setPromoterSupervisors(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { supervisorIds } = z.object({
      supervisorIds: z.array(z.string().uuid()),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== UserRole.PROMOTER) {
      return res.status(400).json({ message: 'Usuário não é um promotor' });
    }

    if (supervisorIds.length > 0) {
      const supervisors = await prisma.user.findMany({
        where: { id: { in: supervisorIds }, role: UserRole.SUPERVISOR },
      });
      if (supervisors.length !== supervisorIds.length) {
        return res.status(400).json({ message: 'Um ou mais supervisores inválidos' });
      }
    }

    await prisma.$transaction([
      prisma.promoterSupervisor.deleteMany({ where: { promoterId: id } }),
      ...supervisorIds.map(supervisorId =>
        prisma.promoterSupervisor.create({
          data: { promoterId: id, supervisorId },
        })
      ),
    ]);

    const result = await prisma.promoterSupervisor.findMany({
      where: { promoterId: id },
      include: { supervisor: { select: { id: true, name: true, email: true } } },
    });

    res.json({ supervisors: result.map(r => r.supervisor) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Set promoter supervisors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Listar supervisores de um promotor
 */
export async function getPromoterSupervisors(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await prisma.promoterSupervisor.findMany({
      where: { promoterId: id },
      include: { supervisor: { select: { id: true, name: true, email: true } } },
    });

    res.json({ supervisors: result.map(r => r.supervisor) });
  } catch (error) {
    console.error('Get promoter supervisors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Permite ao promotor iniciar nova visita na mesma loja no mesmo dia (uma vez por concessão).
 * POST /admin/promoters/:id/stores/:storeId/redo-grant
 */
export async function createPromoterStoreRedoGrant(req: AuthRequest, res: Response) {
  try {
    const { id: promoterId, storeId } = req.params;

    if (!z.string().uuid().safeParse(promoterId).success || !z.string().uuid().safeParse(storeId).success) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    const promoter = await prisma.user.findUnique({ where: { id: promoterId } });
    if (!promoter || promoter.role !== UserRole.PROMOTER) {
      return res.status(404).json({ message: 'Promotor não encontrado' });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    const grant = await prisma.promoterStoreRedoGrant.create({
      data: {
        promoterId,
        storeId,
        grantedById: req.userId!,
      },
    });

    res.status(201).json({
      message:
        'Concessão criada. O promotor poderá fazer check-in novamente nesta loja hoje (a concessão é usada no próximo check-in após já ter finalizado uma visita no dia).',
      grant: { id: grant.id, promoterId, storeId, createdAt: grant.createdAt },
    });
  } catch (error) {
    console.error('Create redo grant error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Visão geral do ADMIN (somente hoje), preparada para múltiplos estados.
 * GET /admin/promoters/today-overview?state=SP
 */
export async function getAdminTodayPromoterOverview(req: AuthRequest, res: Response) {
  try {
    const { state } = req.query as { state?: string };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const promoters = await prisma.user.findMany({
      where: {
        role: UserRole.PROMOTER,
        ...(state ? { state } : {}),
      },
      select: { id: true, name: true, email: true, state: true },
      orderBy: { name: 'asc' },
    });

    const promoterIds = promoters.map((p) => p.id);

    const visitsToday = await prisma.visit.findMany({
      where: {
        promoterId: { in: promoterIds },
        checkInAt: { gte: todayStart, lt: todayEnd },
      },
      select: { id: true, promoterId: true, checkInAt: true, checkOutAt: true, storeId: true },
      orderBy: { checkInAt: 'asc' },
    });

    const openVisitByPromoter = new Map<string, { id: string; checkInAt: Date; storeId: string }>();
    const lastActivityByPromoter = new Map<string, Date>();
    const visitsCountByPromoter = new Map<string, number>();
    for (const v of visitsToday) {
      visitsCountByPromoter.set(v.promoterId, (visitsCountByPromoter.get(v.promoterId) || 0) + 1);
      const last = v.checkOutAt ?? v.checkInAt;
      const prev = lastActivityByPromoter.get(v.promoterId);
      if (!prev || last.getTime() > prev.getTime()) lastActivityByPromoter.set(v.promoterId, last);
      if (!v.checkOutAt) {
        openVisitByPromoter.set(v.promoterId, { id: v.id, checkInAt: v.checkInAt, storeId: v.storeId });
      }
    }

    const storeIdsToday = Array.from(new Set(visitsToday.map((v) => v.storeId)));
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIdsToday } },
      select: { id: true, name: true },
    });
    const storeNameById = new Map(stores.map((s) => [s.id, s.name] as const));

    // “Falta sem justificativa”: visitas de hoje com checkout completo, mas ainda com indústrias pendentes sem IndustryMiss.
    // (Com o novo bloqueio de checkout, isso tende a ficar 0, mas fica aqui para consistência e auditoria.)
    const completedVisitIds = visitsToday.filter((v) => v.checkOutAt != null).map((v) => v.id);
    const industryMissByVisit = await prisma.industryMiss.findMany({
      where: { visitId: { in: completedVisitIds } },
      select: { visitId: true, industryId: true },
    });
    const missSetByVisit = new Map<string, Set<string>>();
    for (const m of industryMissByVisit) {
      if (!missSetByVisit.has(m.visitId)) missSetByVisit.set(m.visitId, new Set());
      missSetByVisit.get(m.visitId)!.add(m.industryId);
    }

    const storeIndustriesByStore = await prisma.storeIndustry.findMany({
      where: { storeId: { in: visitsToday.map((v) => v.storeId) }, isActive: true },
      select: { storeId: true, industryId: true },
    });
    const reqByStore = new Map<string, string[]>();
    for (const si of storeIndustriesByStore) {
      reqByStore.set(si.storeId, [...(reqByStore.get(si.storeId) || []), si.industryId]);
    }

    const coveredByVisit = await prisma.photoIndustry.findMany({
      where: { visitId: { in: completedVisitIds } },
      select: { visitId: true, industryId: true },
    });
    const coveredSetByVisit = new Map<string, Set<string>>();
    for (const c of coveredByVisit) {
      if (!coveredSetByVisit.has(c.visitId)) coveredSetByVisit.set(c.visitId, new Set());
      coveredSetByVisit.get(c.visitId)!.add(c.industryId);
    }

    const unjustifiedByPromoter = new Map<string, number>();
    for (const v of visitsToday) {
      if (!v.checkOutAt) continue;
      const required = reqByStore.get(v.storeId) || [];
      if (required.length === 0) continue;
      const covered = coveredSetByVisit.get(v.id) || new Set<string>();
      const misses = missSetByVisit.get(v.id) || new Set<string>();
      const pending = required.filter((industryId) => !covered.has(industryId));
      const pendingWithoutJustification = pending.filter((industryId) => !misses.has(industryId));
      if (pendingWithoutJustification.length > 0) {
        unjustifiedByPromoter.set(
          v.promoterId,
          (unjustifiedByPromoter.get(v.promoterId) || 0) + pendingWithoutJustification.length
        );
      }
    }

    // Agregar por estado
    const byState = new Map<string, any>();
    for (const p of promoters) {
      const uf = p.state || '—';
      if (!byState.has(uf)) {
        byState.set(uf, {
          state: uf,
          promotersTotal: 0,
          openVisits: 0,
          noVisitToday: 0,
          unjustifiedMisses: 0,
        });
      }
      const row = byState.get(uf);
      row.promotersTotal += 1;

      const visitsCount = visitsCountByPromoter.get(p.id) || 0;
      const hasOpen = openVisitByPromoter.has(p.id);
      if (hasOpen) row.openVisits += 1;
      if (visitsCount === 0) row.noVisitToday += 1;
      row.unjustifiedMisses += unjustifiedByPromoter.get(p.id) || 0;
    }

    res.json({
      date: todayStart.toISOString().slice(0, 10),
      states: Array.from(byState.values()).sort((a, b) => a.state.localeCompare(b.state)),
      promoters: promoters.map((p) => {
        const visitsCount = visitsCountByPromoter.get(p.id) || 0;
        const openVisit = openVisitByPromoter.get(p.id) || null;
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          state: p.state,
          visitsToday: visitsCount,
          hasOpenVisit: openVisitByPromoter.has(p.id),
          noVisitToday: visitsCount === 0,
          unjustifiedMissesToday: unjustifiedByPromoter.get(p.id) || 0,
          lastActivityAt: lastActivityByPromoter.get(p.id)?.toISOString() ?? null,
          openVisit: openVisit
            ? {
                ...openVisit,
                checkInAt: openVisit.checkInAt.toISOString(),
                storeName: storeNameById.get(openVisit.storeId) || null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('Get admin today overview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Fechar (forçar checkout) uma visita em aberto.
 * POST /admin/visits/:visitId/force-checkout
 *
 * Usado para casos em que o promotor esqueceu de fazer checkout no app.
 */
export async function forceCheckoutVisit(req: AuthRequest, res: Response) {
  try {
    const { visitId } = req.params as { visitId: string };
    if (!z.string().uuid().safeParse(visitId).success) {
      return res.status(400).json({ message: 'visitId inválido' });
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        promoterId: true,
        storeId: true,
        checkInAt: true,
        checkOutAt: true,
      },
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visita não encontrada' });
    }

    if (visit.checkOutAt) {
      return res.status(400).json({ message: 'Visita já está fechada' });
    }

    const now = new Date();
    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: {
        checkOutAt: now,
      },
      select: {
        id: true,
        promoterId: true,
        storeId: true,
        checkInAt: true,
        checkOutAt: true,
      },
    });

    console.log('[ADMIN] Force checkout visit', {
      adminUserId: req.userId,
      visitId,
      promoterId: visit.promoterId,
      storeId: visit.storeId,
      checkInAt: visit.checkInAt.toISOString(),
      forcedCheckOutAt: now.toISOString(),
    });

    return res.json({
      message: 'Visita fechada com sucesso',
      visit: {
        ...updated,
        checkInAt: updated.checkInAt.toISOString(),
        checkOutAt: updated.checkOutAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Force checkout visit error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Listar visitas em aberto (qualquer dia).
 * GET /admin/visits/open?state=SP
 */
export async function listOpenVisits(req: AuthRequest, res: Response) {
  try {
    const { state } = req.query as { state?: string };

    const visits = await prisma.visit.findMany({
      where: {
        checkOutAt: null,
        ...(state ? { promoter: { state } } : {}),
      },
      select: {
        id: true,
        checkInAt: true,
        promoter: { select: { id: true, name: true, email: true, state: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { checkInAt: 'asc' },
      take: 500,
    });

    res.json({
      visits: visits.map((v) => ({
        id: v.id,
        checkInAt: v.checkInAt.toISOString(),
        promoter: v.promoter,
        store: v.store,
      })),
    });
  } catch (error) {
    console.error('List open visits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
