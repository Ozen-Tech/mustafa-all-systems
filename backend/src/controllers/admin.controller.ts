import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { hashPassword } from '../utils/password';
import { UserRole } from '../types';
import { AuthRequest } from '../middleware/auth';

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
    const supervisorPassword = await hashPassword('senha123');
    const promoterPassword = await hashPassword('senha123');

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
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

/**
 * Listar todos os usuários
 */
export async function listUsers(req: AuthRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users });
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

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ user });
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

    // Preparar dados para atualização
    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    // Atualizar usuário
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
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
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir deletar a si mesmo
    if (existingUser.id === req.userId) {
      return res.status(400).json({ message: 'Não é possível deletar seu próprio usuário' });
    }

    // Deletar usuário
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

