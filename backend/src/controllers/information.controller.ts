import { Request, Response } from 'express';
import { z } from 'zod';
import { latestSalesMonth } from '../services/pivotCacheParser';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { processDataWithGemini } from '../services/ai/geminiService';
import * as XLSX from 'xlsx';

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const createInformationSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  industryId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  promoterId: z.string().uuid().optional(),
  type: z.enum(['estoque', 'produto', 'geral']),
});

/**
 * Upload de arquivo Excel/CSV e processamento
 */
export const uploadInformationFile = [
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }

      const { type, industryId, storeId, promoterId, title } = req.body;

      // Processar arquivo Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Processar com Gemini para gerar resumo
      let geminiSummary: string | null = null;
      try {
        geminiSummary = await processDataWithGemini(data, `Tipo: ${type}`);
      } catch (error) {
        console.error('Error processing with Gemini:', error);
        // Continuar mesmo se Gemini falhar
      }

      // Criar registro de distribuição
      const information = await prisma.informationDistribution.create({
        data: {
          title: title || `Informação ${type} - ${new Date().toLocaleDateString('pt-BR')}`,
          content: JSON.stringify(data),
          type,
          industryId: industryId || null,
          storeId: storeId || null,
          promoterId: promoterId || null,
          sourceData: data as any,
          geminiSummary,
        },
      });

      res.status(201).json({ information });
    } catch (error) {
      console.error('Upload information file error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
];

/**
 * Processar dados existentes com Gemini
 */
export async function processInformationWithGemini(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const information = await prisma.informationDistribution.findUnique({
      where: { id },
    });

    if (!information) {
      return res.status(404).json({ message: 'Informação não encontrada' });
    }

    if (!information.sourceData) {
      return res.status(400).json({ message: 'Não há dados para processar' });
    }

    const summary = await processDataWithGemini(
      information.sourceData as any[],
      `Tipo: ${information.type}`
    );

    const updated = await prisma.informationDistribution.update({
      where: { id },
      data: {
        geminiSummary: summary,
      },
    });

    res.json({ information: updated });
  } catch (error) {
    console.error('Process information with Gemini error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Obter informações para promotor (mobile)
 */
export async function getInformationForPromoter(req: AuthRequest, res: Response) {
  try {
    const promoterId = req.userId!;
    const { industryId } = req.query;

    const where: any = {
      OR: [
        { promoterId },
        { promoterId: null }, // Informações gerais
      ],
      isActive: true,
    };

    if (industryId) {
      where.OR.push({ industryId: industryId as string });
    }

    const informations = await prisma.informationDistribution.findMany({
      where,
      include: {
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limitar a 50 mais recentes
    });

    res.json({ informations });
  } catch (error) {
    console.error('Get information for promoter error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Obter informações de uma indústria
 */
export async function getInformationForIndustry(req: AuthRequest, res: Response) {
  try {
    const { industryId } = req.params;

    const informations = await prisma.informationDistribution.findMany({
      where: {
        industryId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ informations });
  } catch (error) {
    console.error('Get information for industry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Criar informação manualmente
 */
export async function createInformation(req: AuthRequest, res: Response) {
  try {
    const data = createInformationSchema.parse(req.body);

    const information = await prisma.informationDistribution.create({
      data: {
        ...data,
        industryId: data.industryId || null,
        storeId: data.storeId || null,
        promoterId: data.promoterId || null,
        content: data.content || '',
      },
    });

    res.status(201).json({ information });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Create information error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Listar todas as informações (ADMIN)
 */
export async function listInformations(req: AuthRequest, res: Response) {
  try {
    const { type, industryId, isActive } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (industryId) where.industryId = industryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const informations = await prisma.informationDistribution.findMany({
      where,
      include: {
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
        promoter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ informations });
  } catch (error) {
    console.error('List informations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Ativar / desativar informação
 */
export async function setInformationActive(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

    const information = await prisma.informationDistribution.update({
      where: { id },
      data: { isActive },
    });

    res.json({ information });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Set information active error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Publica resumo da última importação de estoque/vendas para promotores
 */
export async function publishStockSummary(req: AuthRequest, res: Response) {
  try {
    const lastImport = await prisma.stockImport.findFirst({
      where: { status: 'DONE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastImport) {
      return res.status(404).json({ message: 'Nenhuma importação concluída encontrada' });
    }

    const monthRows = await prisma.salesRecord.groupBy({
      by: ['month'],
      where: { month: { not: null } },
      _sum: { valueCurrent: true },
    });
    const monthsWithValue = monthRows
      .filter((m) => (m._sum.valueCurrent ?? 0) > 0 && m.month)
      .map((m) => m.month as string);
    const month = latestSalesMonth(monthsWithValue);

    const byIndustry = await prisma.salesRecord.groupBy({
      by: ['industryName'],
      where: month ? { month } : {},
      _sum: { qtyCurrent: true, qtyPrevious: true, valueCurrent: true, valuePrevious: true },
    });

    const ranked = byIndustry
      .map((r) => {
        const cur = r._sum.valueCurrent ?? 0;
        const prev = r._sum.valuePrevious ?? 0;
        const growth = prev > 0 ? ((cur - prev) / prev) * 100 : null;
        return {
          industryName: r.industryName,
          qtyCurrent: r._sum.qtyCurrent ?? 0,
          valueCurrent: cur,
          growthPct: growth,
        };
      })
      .sort((a, b) => b.valueCurrent - a.valueCurrent)
      .slice(0, 15);

    const week = lastImport.weekLabel || new Date(lastImport.createdAt).toLocaleDateString('pt-BR');
    const periodLabel = month ? `${month}` : week;
    const lines = ranked.map((r, i) => {
      const g =
        r.growthPct === null
          ? 's/ base'
          : `${r.growthPct >= 0 ? '+' : ''}${r.growthPct.toFixed(1)}%`;
      return `${i + 1}. ${r.industryName} — R$ ${Math.round(r.valueCurrent).toLocaleString('pt-BR')} (${g})`;
    });

    const title = `Relatório de Vendas Mateus — ${periodLabel}`;
    const content = [
      `Resumo automático da importação "${lastImport.fileName}".`,
      `Estoque: ${lastImport.stockRowCount.toLocaleString('pt-BR')} linhas · Vendas: ${lastImport.salesRowCount.toLocaleString('pt-BR')} linhas.`,
      '',
      'Top indústrias por faturamento (período atual):',
      ...lines,
    ].join('\n');

    const geminiSummary = [
      `Semana ${week}: ranking de vendas Mateus.`,
      ranked.slice(0, 5).map((r) => `${r.industryName}`).join(', ') || 'Sem dados de venda',
    ].join(' ');

    const information = await prisma.informationDistribution.create({
      data: {
        title,
        content,
        type: 'estoque',
        sourceData: { importId: lastImport.id, weekLabel: lastImport.weekLabel, ranked } as any,
        geminiSummary,
        isActive: true,
      },
    });

    res.status(201).json({ information });
  } catch (error) {
    console.error('Publish stock summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

