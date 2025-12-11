import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { generatePhotoReportPDF, savePDFToStorage } from '../services/pdf/reportGenerator';

const generateReportSchema = z.object({
  promoterId: z.string().uuid().optional(),
  industryId: z.string().uuid().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  recipientPhone: z.string().min(1),
  recipientName: z.string().min(1),
});

/**
 * Gerar relatório (PDF + análise)
 */
export async function generateReport(req: AuthRequest, res: Response) {
  try {
    const data = generateReportSchema.parse(req.body);

    // Buscar fotos
    const where: any = {
      createdAt: {
        gte: data.startDate,
        lte: data.endDate,
      },
    };

    if (data.promoterId) {
      where.promoterId = data.promoterId;
    }

    if (data.industryId) {
      where.industryId = data.industryId;
    }

    const photoIndustries = await prisma.photoIndustry.findMany({
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

    if (photoIndustries.length === 0) {
      return res.status(404).json({ message: 'Nenhuma foto encontrada no período' });
    }

    // Preparar dados para PDF
    const promoter = photoIndustries[0].promoter;
    const reportData = {
      promoterId: promoter.id,
      promoterName: promoter.name,
      startDate: data.startDate,
      endDate: data.endDate,
      photos: photoIndustries.map((pi: any) => ({
        id: pi.photo.id,
        url: pi.photo.url,
        createdAt: pi.createdAt,
        industry: pi.industry
          ? {
              name: pi.industry.name,
              code: pi.industry.code,
            }
          : undefined,
        qualityScore: pi.qualityScore || undefined,
        hasRupture: pi.hasRupture,
      })),
      industryId: data.industryId,
      industryName: photoIndustries[0].industry?.name,
    };

    // Gerar PDF
    const pdfBuffer = await generatePhotoReportPDF(reportData);
    const filename = `report-${promoter.id}-${Date.now()}.pdf`;
    const pdfUrl = await savePDFToStorage(pdfBuffer, filename);

    // Criar registro de relatório
    const report = await prisma.whatsAppReport.create({
      data: {
        recipientPhone: data.recipientPhone,
        recipientName: data.recipientName,
        reportType: data.promoterId ? 'promoter' : data.industryId ? 'industry' : 'general',
        promoterId: data.promoterId || null,
        industryId: data.industryId || null,
        dateRange: {
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
        },
        pdfUrl,
        status: 'pending',
      },
    });

    res.status(201).json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Enviar relatório via WhatsApp
 */
export async function sendReportViaWhatsApp(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const report = await prisma.whatsAppReport.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    if (!report.pdfUrl) {
      return res.status(400).json({ message: 'PDF não foi gerado ainda' });
    }

    // TODO: Implementar integração com WhatsApp
    // Por enquanto, apenas marcar como enviado
    const updated = await prisma.whatsAppReport.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    res.json({
      message: 'Relatório enviado com sucesso (simulado)',
      report: updated,
    });
  } catch (error) {
    console.error('Send report via WhatsApp error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Agendar relatório recorrente
 */
export async function scheduleReport(req: AuthRequest, res: Response) {
  try {
    const { schedule, reportConfig } = req.body;

    // TODO: Implementar agendamento com node-cron
    // Por enquanto, retornar sucesso
    res.json({
      message: 'Agendamento criado (não implementado ainda)',
      schedule,
    });
  } catch (error) {
    console.error('Schedule report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Listar relatórios
 */
export async function listReports(req: AuthRequest, res: Response) {
  try {
    const reports = await prisma.whatsAppReport.findMany({
      include: {
        promoter: {
          select: {
            id: true,
            name: true,
            email: true,
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

    res.json({ reports });
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

