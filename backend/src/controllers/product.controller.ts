import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';

const createProductSchema = z.object({
  name: z.string().min(1),
  industryId: z.string().uuid(),
  code: z.string().min(1),
  description: z.string().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
});

/**
 * Listar produtos (filtro por indústria)
 */
export async function listProducts(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.query;

    const where: any = {};
    if (industryId) {
      where.industryId = industryId as string;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ products });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Criar produto (ADMIN)
 */
export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const data = createProductSchema.parse(req.body);

    // Verificar se a indústria existe
    const industry = await prisma.industry.findUnique({
      where: { id: data.industryId },
    });

    if (!industry) {
      return res.status(404).json({ message: 'Indústria não encontrada' });
    }

    // Verificar se o código já existe para esta indústria
    const existingProduct = await prisma.product.findUnique({
      where: {
        industryId_code: {
          industryId: data.industryId,
          code: data.code,
        },
      },
    });

    if (existingProduct) {
      return res.status(400).json({ message: 'Código do produto já está em uso nesta indústria' });
    }

    const product = await prisma.product.create({
      data,
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Atualizar produto (ADMIN)
 */
export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Se estiver atualizando o código, verificar se não está em uso
    if (data.code && data.code !== existingProduct.code) {
      const codeInUse = await prisma.product.findUnique({
        where: {
          industryId_code: {
            industryId: existingProduct.industryId,
            code: data.code,
          },
        },
      });

      if (codeInUse) {
        return res.status(400).json({ message: 'Código já está em uso nesta indústria' });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Deletar produto (ADMIN)
 */
export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

