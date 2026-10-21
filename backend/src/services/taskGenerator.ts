/**
 * Motor de Geração de Tarefas
 * 
 * Gera tarefas diárias por SKU/loja a partir dos dados importados do Mateus.
 * Regras conforme especificação:
 * - Ruptura com CD: estoque_loja <= 0 com venda recente e estoque_cd > 0
 * - CD zerado: estoque_cd = 0
 * - Parado 30d: estoque > 0 sem venda nos últimos 30 dias
 * - Negativo: estoque < 0
 * - Excesso DDE > 90: dias de estoque > 90
 * - Cobertura baixa DDE < 15: dias de estoque < 15
 */

import prisma from '../prisma/client';
import { TaskAlertType } from '@prisma/client';

interface TaskCandidate {
  storeId: string;
  industryId: string | null;
  industryName: string;
  sku: string;
  productName: string;
  alertType: TaskAlertType;
  stockLoja: number;
  stockCD: number;
  lastSale: Date | null;
  dde: number | null;
  priority: number;
}

export async function generateDailyTasks(date?: string): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  console.log(`[TaskGenerator] Gerando tarefas para ${targetDate}`);

  try {
    // Busca última importação de estoque
    const lastImport = await prisma.stockImport.findFirst({
      where: { status: 'DONE', type: { in: ['STOCK', 'BOTH'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastImport) {
      console.log('[TaskGenerator] Nenhuma importação de estoque encontrada');
      return { created: 0, skipped: 0, errors: ['Nenhuma importação de estoque encontrada'] };
    }

    // Busca dados de estoque por loja (não CD)
    const stockItems = await prisma.storeStockItem.findMany({
      where: {
        importId: lastImport.id,
        locationType: 'LOJA',
        storeId: { not: null },
      },
      select: {
        storeId: true,
        industryName: true,
        productCode: true,
        productName: true,
        qty: true,
        dde: true,
        lowTurn: true,
      },
    });

    // Busca dados de estoque por CD para cruzar
    const cdStock = await prisma.storeStockItem.findMany({
      where: {
        importId: lastImport.id,
        locationType: 'CD',
      },
      select: {
        productCode: true,
        qty: true,
        filialCode: true,
      },
    });

    // Indexa estoque do CD por produto
    const cdStockByProduct = new Map<string, number>();
    for (const item of cdStock) {
      const current = cdStockByProduct.get(item.productCode) || 0;
      cdStockByProduct.set(item.productCode, current + item.qty);
    }

    // Busca vendas recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = await prisma.salesRecord.findMany({
      where: {
        importId: lastImport.id,
        storeId: { not: null },
        qtyCurrent: { gt: 0 },
      },
      select: {
        storeId: true,
        productCode: true,
        qtyCurrent: true,
      },
    });

    // Indexa vendas por loja+produto
    const salesByStoreProduct = new Map<string, number>();
    for (const sale of recentSales) {
      if (!sale.storeId || !sale.productCode) continue;
      const key = `${sale.storeId}:${sale.productCode}`;
      salesByStoreProduct.set(key, (salesByStoreProduct.get(key) || 0) + sale.qtyCurrent);
    }

    // Busca mapeamento indústria por nome
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const industryByName = new Map(industries.map(i => [i.name.toLowerCase(), i.id]));

    // Gera candidatos a tarefas
    const candidates: TaskCandidate[] = [];

    for (const item of stockItems) {
      if (!item.storeId) continue;

      const stockLoja = item.qty;
      const stockCD = cdStockByProduct.get(item.productCode) || 0;
      const salesKey = `${item.storeId}:${item.productCode}`;
      const recentSaleQty = salesByStoreProduct.get(salesKey) || 0;
      const industryId = industryByName.get(item.industryName.toLowerCase()) || null;

      let alertType: TaskAlertType | null = null;
      let priority = 0;

      // Aplica regras de alerta
      if (stockLoja < 0) {
        // Negativo
        alertType = 'NEGATIVO';
        priority = 60;
      } else if (stockLoja <= 0 && recentSaleQty > 0 && stockCD > 0) {
        // Ruptura com CD (mais urgente)
        alertType = 'RUPTURA_COM_CD';
        priority = 100;
      } else if (stockLoja <= 0 && stockCD <= 0) {
        // CD zerado
        alertType = 'CD_ZERADO';
        priority = 80;
      } else if (stockLoja > 0 && recentSaleQty === 0 && item.lowTurn) {
        // Parado 30 dias
        alertType = 'PARADO_30D';
        priority = 40;
      } else if (item.dde && item.dde > 90) {
        // Excesso DDE > 90
        alertType = 'EXCESSO_DDE90';
        priority = 30;
      } else if (item.dde && item.dde < 15 && stockLoja > 0) {
        // Cobertura baixa DDE < 15
        alertType = 'COBERTURA_BAIXA';
        priority = 50;
      }

      if (alertType) {
        candidates.push({
          storeId: item.storeId,
          industryId,
          industryName: item.industryName,
          sku: item.productCode,
          productName: item.productName,
          alertType,
          stockLoja,
          stockCD,
          lastSale: recentSaleQty > 0 ? new Date() : null,
          dde: item.dde,
          priority,
        });
      }
    }

    console.log(`[TaskGenerator] ${candidates.length} candidatos a tarefas identificados`);

    // Insere tarefas em lote (upsert para evitar duplicatas)
    for (const candidate of candidates) {
      try {
        await prisma.task.upsert({
          where: {
            date_storeId_sku: {
              date: targetDate,
              storeId: candidate.storeId,
              sku: candidate.sku,
            },
          },
          update: {
            alertType: candidate.alertType,
            stockLoja: candidate.stockLoja,
            stockCD: candidate.stockCD,
            lastSale: candidate.lastSale,
            dde: candidate.dde,
            priority: candidate.priority,
            status: 'PENDING',
          },
          create: {
            date: targetDate,
            storeId: candidate.storeId,
            industryId: candidate.industryId,
            industryName: candidate.industryName,
            sku: candidate.sku,
            productName: candidate.productName,
            alertType: candidate.alertType,
            stockLoja: candidate.stockLoja,
            stockCD: candidate.stockCD,
            lastSale: candidate.lastSale,
            dde: candidate.dde,
            priority: candidate.priority,
          },
        });
        created++;
      } catch (err) {
        skipped++;
        if (errors.length < 10) {
          errors.push(`SKU ${candidate.sku} loja ${candidate.storeId}: ${err}`);
        }
      }
    }

    console.log(`[TaskGenerator] Concluído: ${created} criadas, ${skipped} ignoradas`);

    return { created, skipped, errors };
  } catch (error) {
    console.error('[TaskGenerator] Erro geral:', error);
    return { created, skipped, errors: [String(error)] };
  }
}

/**
 * Endpoint para disparar geração manual (admin)
 */
export async function triggerTaskGeneration(date?: string) {
  return generateDailyTasks(date);
}
