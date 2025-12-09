import { jsPDF } from 'jspdf';

interface Photo {
  id?: string;
  url: string;
  type?: string;
  createdAt?: string | Date;
}

interface Visit {
  id: string;
  store: {
    name: string;
    address?: string;
  };
  checkInAt: string | Date;
  checkOutAt?: string | Date;
  photos: Photo[];
  checkInPhotoUrl?: string | null;
  checkOutPhotoUrl?: string | null;
}

interface Promoter {
  id: string;
  name: string;
  email?: string;
}

/**
 * Organiza fotos por tipo na ordem: Check-in, Fotos da Visita, Check-out
 */
function organizePhotos(photos: Photo[], checkInUrl?: string | null, checkOutUrl?: string | null): Photo[] {
  const organized: Photo[] = [];
  const photoMap = new Map<string, Photo>();

  // Adicionar todas as fotos do array
  photos.forEach((photo) => {
    if (photo.url && !photo.url.includes('placeholder.com') && !photo.url.includes('mock-storage.local')) {
      photoMap.set(photo.url, photo);
    }
  });

  // Adicionar check-in primeiro
  const checkInPhoto = Array.from(photoMap.values()).find(
    (p) => p.type === 'FACADE_CHECKIN' || p.url === checkInUrl
  );
  if (checkInPhoto) {
    organized.push({ ...checkInPhoto, type: 'FACADE_CHECKIN' });
  } else if (checkInUrl && !checkInUrl.includes('placeholder.com')) {
    organized.push({ url: checkInUrl, type: 'FACADE_CHECKIN' });
  }

  // Adicionar fotos OTHER (fotos da visita) em ordem cronológica
  const otherPhotos = Array.from(photoMap.values())
    .filter((p) => p.type === 'OTHER' || (!p.type && p.url !== checkInUrl && p.url !== checkOutUrl))
    .sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    });
  organized.push(...otherPhotos);

  // Adicionar check-out por último
  const checkOutPhoto = Array.from(photoMap.values()).find(
    (p) => p.type === 'FACADE_CHECKOUT' || p.url === checkOutUrl
  );
  if (checkOutPhoto) {
    organized.push({ ...checkOutPhoto, type: 'FACADE_CHECKOUT' });
  } else if (checkOutUrl && !checkOutUrl.includes('placeholder.com')) {
    organized.push({ url: checkOutUrl, type: 'FACADE_CHECKOUT' });
  }

  return organized;
}

/**
 * Gera um booking PDF com as fotos do promotor organizadas por visita
 */
export async function generatePhotoBooking(
  promoter: Promoter,
  visits: Visit[],
  dateRange?: { startDate: string; endDate: string }
): Promise<void> {
  // Filtrar visitas por data se fornecido
  let filteredVisits = visits;
  if (dateRange) {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);
    
    filteredVisits = visits.filter((visit) => {
      const visitDate = new Date(visit.checkInAt);
      return visitDate >= start && visitDate <= end;
    });
  }

  // Ordenar visitas por data (crescente - mais antiga primeiro)
  filteredVisits.sort((a, b) => {
    const dateA = new Date(a.checkInAt).getTime();
    const dateB = new Date(b.checkInAt).getTime();
    return dateA - dateB;
  });

  // Agrupar visitas por loja para mostrar evolução
  const visitsByStore = new Map<string, Visit[]>();
  filteredVisits.forEach((visit) => {
    const storeId = visit.store.name;
    if (!visitsByStore.has(storeId)) {
      visitsByStore.set(storeId, []);
    }
    visitsByStore.get(storeId)!.push(visit);
  });

  // Criar PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Função para adicionar nova página se necessário
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Cabeçalho
  pdf.setFontSize(20);
  pdf.setTextColor(124, 58, 237); // Primary color
  pdf.text('Booking de Fotos - Evolução da Loja', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Promotor: ${promoter.name}`, margin, yPosition);
  yPosition += 6;
  if (promoter.email) {
    pdf.text(`Email: ${promoter.email}`, margin, yPosition);
    yPosition += 6;
  }
  if (dateRange) {
    pdf.text(
      `Período: ${new Date(dateRange.startDate).toLocaleDateString('pt-BR')} a ${new Date(dateRange.endDate).toLocaleDateString('pt-BR')}`,
      margin,
      yPosition
    );
    yPosition += 6;
  }
  pdf.text(`Total de Visitas: ${filteredVisits.length}`, margin, yPosition);
  yPosition += 10;

  // Processar cada loja
  for (const [storeName, storeVisits] of Array.from(visitsByStore.entries())) {
    // Título da loja
    checkNewPage(20);
    pdf.setFontSize(16);
    pdf.setTextColor(124, 58, 237);
    pdf.text(`Loja: ${storeName}`, margin, yPosition);
    yPosition += 8;

    if (storeVisits[0].store.address) {
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Endereço: ${storeVisits[0].store.address}`, margin, yPosition);
      yPosition += 6;
    }

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Total de visitas nesta loja: ${storeVisits.length}`, margin, yPosition);
    yPosition += 8;

      // Processar cada visita da loja
      for (let visitIndex = 0; visitIndex < storeVisits.length; visitIndex++) {
        const visit = storeVisits[visitIndex];
        // Filtrar apenas fotos do trabalho (OTHER) - excluir check-in/checkout
        const workPhotos = visit.photos.filter(p => p.type === 'OTHER' || (!p.type && p.url !== visit.checkInPhotoUrl && p.url !== visit.checkOutPhotoUrl));
        
        // Organizar apenas fotos do trabalho em ordem cronológica
        const organizedPhotos = workPhotos.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aDate - bDate;
        });

        if (organizedPhotos.length === 0) continue;

      // Título da visita
      checkNewPage(25);
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `Visita ${visitIndex + 1} - ${new Date(visit.checkInAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        margin,
        yPosition
      );
      yPosition += 6;

      if (visit.checkOutAt) {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const duration = ((new Date(visit.checkOutAt).getTime() - new Date(visit.checkInAt).getTime()) / (1000 * 60 * 60)).toFixed(2);
        pdf.text(`Duração: ${duration}h`, margin, yPosition);
        yPosition += 6;
      }

      // Adicionar fotos
      const photosPerRow = 2;
      const photoWidth = (pageWidth - margin * 2 - 10) / photosPerRow;
      const photoHeight = photoWidth * 0.75; // Aspect ratio 4:3

      for (let i = 0; i < organizedPhotos.length; i++) {
        const photo = organizedPhotos[i];
        const col = i % photosPerRow;
        const row = Math.floor(i / photosPerRow);

        // Verificar se precisa de nova página
        const requiredY = margin + (row + 1) * (photoHeight + 15);
        if (requiredY > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        const x = margin + col * (photoWidth + 10);
        const y = yPosition + row * (photoHeight + 15);

        try {
          // Carregar e adicionar imagem
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              try {
                pdf.addImage(img, 'JPEG', x, y, photoWidth, photoHeight);
                
                // Adicionar label da foto (apenas fotos do trabalho)
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                const label = `Foto ${i + 1}`;
                pdf.text(label, x, y + photoHeight + 4);
                resolve();
              } catch (error) {
                console.error('Erro ao adicionar imagem ao PDF:', error);
                // Adicionar placeholder de erro
                pdf.setFillColor(240, 240, 240);
                pdf.rect(x, y, photoWidth, photoHeight, 'F');
                pdf.setTextColor(150, 150, 150);
                pdf.text('Erro ao carregar', x + 5, y + photoHeight / 2);
                resolve();
              }
            };
            img.onerror = () => {
              // Adicionar placeholder de erro
              pdf.setFillColor(240, 240, 240);
              pdf.rect(x, y, photoWidth, photoHeight, 'F');
              pdf.setTextColor(150, 150, 150);
              pdf.text('Imagem não disponível', x + 5, y + photoHeight / 2);
              resolve();
            };
            img.src = photo.url;
          });
        } catch (error) {
          console.error('Erro ao processar foto:', error);
        }
      }

      // Atualizar posição Y após as fotos
      const totalRows = Math.ceil(organizedPhotos.length / photosPerRow);
      yPosition += totalRows * (photoHeight + 15) + 10;
    }

    // Espaço entre lojas
    yPosition += 10;
  }

  // Salvar PDF
  const fileName = `booking-fotos-${promoter.name.replace(/\s+/g, '-')}-${dateRange ? `${dateRange.startDate}_${dateRange.endDate}` : 'all'}.pdf`;
  pdf.save(fileName);
}

