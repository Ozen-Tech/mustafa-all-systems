import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';

/**
 * GET /tasks?storeId=&date=
 * Lista tarefas pendentes para uma loja/dia
 */
export async function getTasks(req: AuthRequest, res: Response) {
  try {
    const storeId = req.query.storeId as string;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    if (!storeId) {
      return res.status(400).json({ message: 'storeId é obrigatório' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        storeId,
        date,
      },
      orderBy: [
        { priority: 'desc' },
        { alertType: 'asc' },
        { productName: 'asc' },
      ],
      include: {
        completions: {
          where: { promoterId: req.userId },
          select: { id: true, action: true, createdAt: true }
        }
      }
    });

    const mapped = tasks.map(task => ({
      id: task.id,
      storeId: task.storeId,
      sku: task.sku,
      productName: task.productName,
      industryName: task.industryName,
      industryId: task.industryId,
      alertType: task.alertType.toLowerCase(),
      stockLoja: task.stockLoja,
      stockCD: task.stockCD,
      lastSale: task.lastSale?.toISOString(),
      dde: task.dde,
      priority: task.priority,
      completed: task.completions.length > 0,
      completedAction: task.completions[0]?.action,
    }));

    res.json({ tasks: mapped });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

const completeTaskSchema = z.object({
  visitId: z.string().uuid(),
  taskId: z.string().uuid(),
  storeId: z.string().uuid(),
  sku: z.string(),
  action: z.enum(['NA_GONDOLA', 'RUPTURA', 'DEPOSITO', 'PRECO_OK', 'PRECO_DIVERGENTE', 
                  'na_gondola', 'ruptura', 'deposito', 'preco_ok', 'preco_divergente']),
  priceFound: z.number().optional(),
  ruptureReason: z.enum(['TEM_CD', 'CD_ZERADO', 'SEM_PEDIDO', 'BLOQUEADO',
                         'tem_cd', 'cd_zerado', 'sem_pedido', 'bloqueado']).optional(),
  actionTaken: z.enum(['PEDIDO', 'PONTO_EXTRA', 'CARTAZ', 'TROCA_PRECO',
                       'pedido', 'ponto_extra', 'cartaz', 'troca_preco']).optional(),
  note: z.string().max(500).optional(),
});

/**
 * POST /tasks/complete
 * Registra conclusão de tarefa pelo promotor
 */
export async function completeTask(req: AuthRequest, res: Response) {
  try {
    const data = completeTaskSchema.parse(req.body);
    const promoterId = req.userId!;

    // Verifica se a visita pertence ao promotor
    const visit = await prisma.visit.findFirst({
      where: { id: data.visitId, promoterId },
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visita não encontrada' });
    }

    // Verifica se a tarefa existe
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
    });

    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    // Normaliza valores para uppercase (enum do Prisma)
    const action = data.action.toUpperCase() as 'NA_GONDOLA' | 'RUPTURA' | 'DEPOSITO' | 'PRECO_OK' | 'PRECO_DIVERGENTE';
    const ruptureReason = data.ruptureReason?.toUpperCase() as 'TEM_CD' | 'CD_ZERADO' | 'SEM_PEDIDO' | 'BLOQUEADO' | undefined;
    const actionTaken = data.actionTaken?.toUpperCase() as 'PEDIDO' | 'PONTO_EXTRA' | 'CARTAZ' | 'TROCA_PRECO' | undefined;

    // Upsert completion
    const completion = await prisma.taskCompletion.upsert({
      where: {
        taskId_visitId: { taskId: data.taskId, visitId: data.visitId }
      },
      update: {
        action,
        priceFound: data.priceFound,
        ruptureReason,
        actionTaken,
        note: data.note,
      },
      create: {
        taskId: data.taskId,
        visitId: data.visitId,
        promoterId,
        action,
        priceFound: data.priceFound,
        ruptureReason,
        actionTaken,
        note: data.note,
      },
    });

    // Atualiza status da tarefa
    await prisma.task.update({
      where: { id: data.taskId },
      data: { status: 'COMPLETED' },
    });

    res.json({ success: true, completionId: completion.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * GET /supervisor/sku-matrix
 * Matriz SKU x Loja para o painel do supervisor
 */
export async function getSkuStoreMatrix(req: AuthRequest, res: Response) {
  try {
    const industryId = req.query.industryId as string | undefined;
    const state = req.query.state as string | undefined;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Busca tarefas do dia
    const tasks = await prisma.task.findMany({
      where: {
        date,
        ...(industryId && { industryId }),
        store: state ? { state } : undefined,
      },
      include: {
        store: {
          select: { id: true, name: true, code: true, state: true }
        }
      },
      orderBy: [
        { productName: 'asc' },
        { store: { name: 'asc' } },
      ],
    });

    // Agrupa por SKU
    const skuMap = new Map<string, {
      sku: string;
      productName: string;
      stores: Map<string, {
        storeId: string;
        storeName: string;
        stockLoja: number;
        stockCD: number;
        lastSale?: string;
        status: 'ok' | 'ruptura' | 'sem_registro' | 'cobertura_baixa';
      }>;
    }>();

    const storesSet = new Map<string, { id: string; name: string; code?: string; state?: string }>();

    for (const task of tasks) {
      if (!skuMap.has(task.sku)) {
        skuMap.set(task.sku, {
          sku: task.sku,
          productName: task.productName,
          stores: new Map(),
        });
      }

      const skuData = skuMap.get(task.sku)!;
      
      // Determina status baseado no alertType
      let status: 'ok' | 'ruptura' | 'sem_registro' | 'cobertura_baixa' = 'ok';
      if (task.alertType === 'RUPTURA_COM_CD' || task.alertType === 'CD_ZERADO') {
        status = 'ruptura';
      } else if (task.alertType === 'COBERTURA_BAIXA') {
        status = 'cobertura_baixa';
      } else if (task.stockLoja === 0 && task.stockCD === 0) {
        status = 'sem_registro';
      }

      skuData.stores.set(task.storeId, {
        storeId: task.storeId,
        storeName: task.store.name,
        stockLoja: task.stockLoja,
        stockCD: task.stockCD,
        lastSale: task.lastSale?.toISOString(),
        status,
      });

      storesSet.set(task.store.id, {
        id: task.store.id,
        name: task.store.name,
        code: task.store.code ?? undefined,
        state: task.store.state ?? undefined,
      });
    }

    // Converte para array
    const matrix = Array.from(skuMap.values()).map(sku => ({
      sku: sku.sku,
      productName: sku.productName,
      stores: Array.from(sku.stores.values()),
    }));

    const stores = Array.from(storesSet.values());

    // Totais
    let rupturas = 0;
    let semRegistro = 0;
    for (const sku of skuMap.values()) {
      for (const store of sku.stores.values()) {
        if (store.status === 'ruptura') rupturas++;
        if (store.status === 'sem_registro') semRegistro++;
      }
    }

    res.json({
      matrix,
      stores,
      totals: {
        totalSkus: skuMap.size,
        totalStores: storesSet.size,
        rupturas,
        semRegistro,
      }
    });
  } catch (error) {
    console.error('Get SKU matrix error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
