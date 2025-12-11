import PDFDocument from 'pdfkit';
import prisma from '../../prisma/client';
import { generateExecutiveSummary } from '../ai/geminiService';

interface PhotoData {
  id: string;
  url: string;
  createdAt: Date;
  industry?: {
    name: string;
    code: string;
  };
  qualityScore?: number;
  hasRupture?: boolean;
}

interface ReportData {
  promoterId: string;
  promoterName: string;
  startDate: Date;
  endDate: Date;
  photos: PhotoData[];
  industryId?: string;
  industryName?: string;
}

/**
 * Gerar PDF com fotos e análise de qualidade
 */
export async function generatePhotoReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc.fontSize(20).text('Relatório de Fotos', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12);
      doc.text(`Promotor: ${data.promoterName}`);
      doc.text(`Período: ${data.startDate.toLocaleDateString('pt-BR')} a ${data.endDate.toLocaleDateString('pt-BR')}`);
      if (data.industryName) {
        doc.text(`Indústria: ${data.industryName}`);
      }
      doc.moveDown();

      // Resumo
      const totalPhotos = data.photos.length;
      const photosWithRupture = data.photos.filter(p => p.hasRupture).length;
      const avgQuality = data.photos.length > 0
        ? data.photos.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / data.photos.length
        : 0;

      doc.fontSize(14).text('Resumo', { underline: true });
      doc.fontSize(12);
      doc.text(`Total de fotos: ${totalPhotos}`);
      doc.text(`Fotos com rupturas: ${photosWithRupture}`);
      doc.text(`Score médio de qualidade: ${Math.round(avgQuality)}/100`);
      doc.moveDown();

      // Fotos (limitado a 20 por página de performance)
      const photosToShow = data.photos.slice(0, 20);
      
      if (photosToShow.length > 0) {
        doc.fontSize(14).text('Fotos', { underline: true });
        doc.moveDown();

        photosToShow.forEach((photo, index) => {
          if (index > 0 && index % 3 === 0) {
            doc.addPage();
          }

          doc.fontSize(10);
          doc.text(`Foto ${index + 1}`, { continued: false });
          if (photo.industry) {
            doc.text(`Indústria: ${photo.industry.name} (${photo.industry.code})`);
          }
          if (photo.qualityScore !== undefined) {
            doc.text(`Qualidade: ${Math.round(photo.qualityScore)}/100`);
          }
          if (photo.hasRupture) {
            doc.fillColor('red').text('⚠️ Ruptura detectada', { continued: false });
            doc.fillColor('black');
          }
          doc.text(`Data: ${new Date(photo.createdAt).toLocaleDateString('pt-BR')}`);
          doc.moveDown(0.5);
        });

        if (data.photos.length > 20) {
          doc.addPage();
          doc.fontSize(12).text(`... e mais ${data.photos.length - 20} fotos`, { align: 'center' });
        }
      }

      // Resumo executivo (se Gemini estiver disponível)
      // Usar Promise para permitir await dentro do callback
      generateExecutiveSummary({
        photos: totalPhotos,
        industries: data.industryId ? 1 : undefined,
        promoters: 1,
        dateRange: {
          start: data.startDate.toISOString(),
          end: data.endDate.toISOString(),
        },
        qualityScores: {
          average: avgQuality,
          withRuptures: photosWithRupture,
        },
      })
        .then((executiveSummary) => {
          doc.addPage();
          doc.fontSize(14).text('Resumo Executivo', { underline: true });
          doc.moveDown();
          doc.fontSize(11);
          doc.text(executiveSummary, {
            align: 'justify',
            lineGap: 2,
          });
          doc.end();
        })
        .catch((error) => {
          console.error('Error generating executive summary:', error);
          // Continuar sem resumo executivo
          doc.end();
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Salvar PDF e retornar URL
 */
export async function savePDFToStorage(pdfBuffer: Buffer, filename: string): Promise<string> {
  // Por enquanto, retornar uma URL temporária
  // Em produção, fazer upload para Firebase Storage ou S3
  // TODO: Implementar upload para storage
  return `https://storage.example.com/reports/${filename}`;
}

