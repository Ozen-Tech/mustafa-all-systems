import PptxGenJS from 'pptxgenjs';
import prisma from '../prisma/client';
import { PhotoType } from '../types';
import axios from 'axios';
import { storeSelect } from '../utils/storeSelect';

export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  promoterIds?: string[];
  storeIds?: string[];
  format: 'pptx' | 'pdf' | 'excel' | 'html';
}

export async function generatePowerPointReport(options: ExportOptions): Promise<Buffer> {
  const { startDate, endDate, promoterIds, storeIds } = options;

  // Buscar visitas
  const visits = await prisma.visit.findMany({
    where: {
      checkInAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(promoterIds && promoterIds.length > 0
        ? { promoterId: { in: promoterIds } }
        : {}),
      ...(storeIds && storeIds.length > 0
        ? { storeId: { in: storeIds } }
        : {}),
    },
      include: {
        promoter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        store: { select: storeSelect },
        photos: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      checkInAt: 'asc',
    },
  });

  // Criar apresentação
  const pptx = new PptxGenJS();

  // Slide de capa
  const coverSlide = pptx.addSlide();
  coverSlide.addText('Relatório de Visitas', {
    x: 1,
    y: 1,
    w: 8,
    h: 1,
    fontSize: 44,
    bold: true,
    align: 'center',
  });
  coverSlide.addText(
    `Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`,
    {
      x: 1,
      y: 2.5,
      w: 8,
      h: 0.5,
      fontSize: 18,
      align: 'center',
    }
  );
  coverSlide.addText(`Total de Visitas: ${visits.length}`, {
    x: 1,
    y: 3.5,
    w: 8,
    h: 0.5,
    fontSize: 18,
    align: 'center',
  });

  // Agrupar fotos por visita
  const visitsWithPhotos = visits.filter((visit: any) => visit.photos.length > 0);

  // Criar slides com fotos (2x2 grid)
  for (const visit of visitsWithPhotos) {
    const photos = visit.photos;
    const photosPerSlide = 4; // 2x2 grid

    for (let i = 0; i < photos.length; i += photosPerSlide) {
      const slide = pptx.addSlide();
      const batch = photos.slice(i, i + photosPerSlide);

      // Título do slide
      slide.addText(
        `${visit.store.name} - ${visit.promoter.name}`,
        {
          x: 0.5,
          y: 0.2,
          w: 9,
          h: 0.4,
          fontSize: 20,
          bold: true,
        }
      );

      slide.addText(
        `Data: ${new Date(visit.checkInAt).toLocaleDateString('pt-BR')} | Localização: ${visit.checkInLatitude.toFixed(6)}, ${visit.checkInLongitude.toFixed(6)}`,
        {
          x: 0.5,
          y: 0.6,
          w: 9,
          h: 0.3,
          fontSize: 12,
          color: '666666',
        }
      );

      // Grid 2x2 de fotos
      const positions = [
        { x: 0.5, y: 1.2, w: 4.25, h: 2.5 },
        { x: 5.25, y: 1.2, w: 4.25, h: 2.5 },
        { x: 0.5, y: 3.9, w: 4.25, h: 2.5 },
        { x: 5.25, y: 3.9, w: 4.25, h: 2.5 },
      ];

      for (let j = 0; j < batch.length; j++) {
        const photo = batch[j];
        const pos = positions[j];

        try {
          // Baixar imagem do S3
          const imageResponse = await axios.get(photo.url, {
            responseType: 'arraybuffer',
            timeout: 10000,
          });

          const imageBase64 = Buffer.from(imageResponse.data).toString('base64');

          // Adicionar imagem ao slide
          slide.addImage({
            data: `data:image/jpeg;base64,${imageBase64}`,
            x: pos.x,
            y: pos.y,
            w: pos.w,
            h: pos.h,
          });

          // Legenda com metadados
          const photoTypeLabels: Record<PhotoType, string> = {
            FACADE_CHECKIN: 'Fachada - Check-in',
            FACADE_CHECKOUT: 'Fachada - Checkout',
            OTHER: 'Outra',
          };

          slide.addText(
            `${(photoTypeLabels as Record<string, string>)[photo.type] || 'Foto'}\n${photo.latitude ? `${photo.latitude.toFixed(6)}, ${photo.longitude?.toFixed(6)}` : 'Sem GPS'}\n${new Date(photo.createdAt).toLocaleString('pt-BR')}`,
            {
              x: pos.x,
              y: pos.y + pos.h + 0.1,
              w: pos.w,
              h: 0.4,
              fontSize: 10,
              color: '333333',
            }
          );
        } catch (error) {
          console.error(`Erro ao baixar foto ${photo.id}:`, error);
          // Adicionar placeholder se não conseguir baixar
          slide.addText(`Erro ao carregar foto`, {
            x: pos.x,
            y: pos.y,
            w: pos.w,
            h: pos.h,
            fontSize: 12,
            color: '999999',
            align: 'center',
            valign: 'middle',
          });
        }
      }
    }
  }

  // Gerar buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}

export async function generatePDFReport(options: ExportOptions): Promise<Buffer> {
  // TODO: Implementar geração de PDF
  // Por enquanto, retornar buffer vazio
  return Buffer.from('');
}

export async function generateExcelReport(options: ExportOptions): Promise<Buffer> {
  // TODO: Implementar geração de Excel
  // Por enquanto, retornar buffer vazio
  return Buffer.from('');
}

export async function generateHTMLReport(options: ExportOptions): Promise<string> {
  // TODO: Implementar geração de HTML
  // Por enquanto, retornar HTML básico
  return '<html><body>Relatório HTML</body></html>';
}


