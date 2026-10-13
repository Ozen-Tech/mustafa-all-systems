import { jsPDF } from 'jspdf';
import {
  MISS_REASON_LABELS,
  type IndustryPhotoReport,
  type IndustryPhotoReportPhoto,
} from '../services/supervisorService';

const PRIMARY: [number, number, number] = [124, 58, 237];
const MAX_IMAGE_PX = 1000;
const LOAD_CONCURRENCY = 6;

type LoadedImage = { dataUrl: string; width: number; height: number } | null;

function brDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function brDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Carrega a foto e reduz para no máximo MAX_IMAGE_PX, para o PDF não ficar gigante. */
function loadImage(url: string): Promise<LoadedImage> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_IMAGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.72), width: w, height: h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadAll(
  photos: IndustryPhotoReportPhoto[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, LoadedImage>> {
  const result = new Map<string, LoadedImage>();
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < photos.length) {
      const photo = photos[next++];
      result.set(photo.id, await loadImage(photo.url));
      done++;
      onProgress?.(done, photos.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(LOAD_CONCURRENCY, photos.length) }, worker));
  return result;
}

export async function generateIndustryPhotoPdf(
  report: IndustryPhotoReport,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const allPhotos = report.stores.flatMap((s) => s.photos);
  const images = await loadAll(allPhotos, onProgress);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin - 6) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const { industry, summary } = report;
  const period = `${brDate(report.startDate)} a ${brDate(report.endDate)}`;

  // Capa / resumo
  pdf.setFillColor(...PRIMARY);
  pdf.rect(0, 0, pageW, 38, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text('Relatório de Fotos por Indústria', margin, 16);
  pdf.setFontSize(13);
  pdf.text(`${industry.name}${industry.code ? ` (${industry.code})` : ''}`, margin, 25, {
    maxWidth: contentW,
  });
  pdf.setFontSize(10);
  pdf.text(`Período: ${period}${report.state ? `  ·  UF: ${report.state}` : ''}`, margin, 32);
  y = 48;

  const cards: Array<[string, string]> = [
    ['Fotos', String(summary.photos)],
    ['Lojas com foto', String(summary.stores)],
    ['Visitas', String(summary.visits)],
    ['Promotores', String(summary.promoters)],
    [
      'Cobertura',
      summary.expectedStores
        ? `${Math.round((summary.coveredExpectedStores / summary.expectedStores) * 100)}%`
        : '—',
    ],
    ['Lojas sem foto', String(summary.storesWithoutPhotos)],
    ['Rupturas', String(summary.ruptures)],
    ['Qualidade média', summary.averageQuality != null ? `${summary.averageQuality}` : '—'],
  ];
  const cardW = (contentW - 9) / 4;
  cards.forEach(([label, value], i) => {
    const cx = margin + (i % 4) * (cardW + 3);
    const cy = y + Math.floor(i / 4) * 24;
    pdf.setFillColor(245, 243, 255);
    pdf.roundedRect(cx, cy, cardW, 20, 2, 2, 'F');
    pdf.setTextColor(...PRIMARY);
    pdf.setFontSize(16);
    pdf.text(value, cx + 4, cy + 10);
    pdf.setTextColor(90, 90, 90);
    pdf.setFontSize(8);
    pdf.text(label, cx + 4, cy + 16);
  });
  y += 52;

  if (summary.expectedStores) {
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(9);
    pdf.text(
      `${summary.coveredExpectedStores} de ${summary.expectedStores} lojas atendidas da indústria tiveram foto no período.`,
      margin,
      y
    );
    y += 6;
  }
  if (report.truncated) {
    pdf.setTextColor(180, 80, 0);
    pdf.setFontSize(9);
    pdf.text(
      `Atenção: o período tem ${summary.photos} fotos; o PDF mostra as primeiras ${allPhotos.length}. Reduza o período para ver todas.`,
      margin,
      y,
      { maxWidth: contentW }
    );
    y += 8;
  }

  // Índice de lojas
  y += 2;
  pdf.setTextColor(...PRIMARY);
  pdf.setFontSize(12);
  pdf.text('Lojas no relatório', margin, y);
  y += 6;
  pdf.setFontSize(9);
  for (const s of report.stores) {
    ensure(5);
    pdf.setTextColor(40, 40, 40);
    pdf.text(`${s.store.name}${s.store.state ? ` - ${s.store.state}` : ''}`, margin, y, {
      maxWidth: contentW - 40,
    });
    pdf.setTextColor(110, 110, 110);
    pdf.text(`${s.photoCount} foto(s) · ${s.visitCount} visita(s)`, pageW - margin, y, {
      align: 'right',
    });
    y += 5;
  }

  // Fotos por loja
  const cols = 2;
  const gap = 6;
  const cellW = (contentW - gap) / cols;
  const imgH = cellW * 0.75;
  const captionH = 10;
  const rowH = imgH + captionH + 4;

  for (const s of report.stores) {
    pdf.addPage();
    y = margin;

    pdf.setFillColor(...PRIMARY);
    pdf.rect(margin, y, contentW, 16, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.text(`${s.store.name}${s.store.state ? ` - ${s.store.state}` : ''}`, margin + 3, y + 6.5, {
      maxWidth: contentW - 6,
    });
    pdf.setFontSize(8);
    pdf.text(
      `${s.photoCount} foto(s) · ${s.visitCount} visita(s) · Promotor(es): ${s.promoters.join(', ')}`,
      margin + 3,
      y + 12.5,
      { maxWidth: contentW - 6 }
    );
    y += 19;
    if (s.store.address) {
      pdf.setTextColor(110, 110, 110);
      pdf.setFontSize(8);
      pdf.text(s.store.address, margin, y, { maxWidth: contentW });
      y += 5;
    }

    for (let i = 0; i < s.photos.length; i += cols) {
      ensure(rowH);
      const rowPhotos = s.photos.slice(i, i + cols);
      rowPhotos.forEach((photo, c) => {
        const x = margin + c * (cellW + gap);
        const loaded = images.get(photo.id);
        pdf.setFillColor(242, 242, 242);
        pdf.rect(x, y, cellW, imgH, 'F');
        if (loaded) {
          const ratio = Math.min(cellW / loaded.width, imgH / loaded.height);
          const w = loaded.width * ratio;
          const h = loaded.height * ratio;
          pdf.addImage(loaded.dataUrl, 'JPEG', x + (cellW - w) / 2, y + (imgH - h) / 2, w, h);
        } else {
          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(9);
          pdf.text('Imagem não disponível', x + cellW / 2, y + imgH / 2, { align: 'center' });
        }
        if (photo.hasRupture) {
          pdf.setFillColor(220, 38, 38);
          pdf.roundedRect(x + 2, y + 2, 18, 5, 1, 1, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(7);
          pdf.text('RUPTURA', x + 11, y + 5.5, { align: 'center' });
        }
        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(8);
        pdf.text(brDateTime(photo.takenAt), x, y + imgH + 4);
        pdf.setTextColor(110, 110, 110);
        pdf.text(
          `${photo.promoterName}${photo.qualityScore != null ? ` · Qualidade ${Math.round(photo.qualityScore)}` : ''}`,
          x,
          y + imgH + 8,
          { maxWidth: cellW }
        );
      });
      y += rowH;
    }
  }

  // Lojas sem foto
  if (report.storesWithoutPhotos.length > 0) {
    pdf.addPage();
    y = margin;
    pdf.setTextColor(...PRIMARY);
    pdf.setFontSize(14);
    pdf.text('Lojas atendidas sem foto no período', margin, y + 4);
    y += 12;
    for (const item of report.storesWithoutPhotos) {
      const reasons = item.misses.map(
        (m) =>
          `${brDate(m.date)} · ${MISS_REASON_LABELS[m.reason] ?? m.reason}${m.note ? ` (${m.note})` : ''} · ${m.promoterName}`
      );
      ensure(8 + Math.max(1, reasons.length) * 4.5);
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(10);
      pdf.text(`${item.store.name}${item.store.state ? ` - ${item.store.state}` : ''}`, margin, y);
      y += 5;
      pdf.setFontSize(8);
      if (reasons.length === 0) {
        pdf.setTextColor(180, 80, 0);
        pdf.text('Sem foto e sem justificativa', margin + 3, y);
        y += 4.5;
      } else {
        pdf.setTextColor(110, 110, 110);
        for (const r of reasons) {
          pdf.text(`Justificativa: ${r}`, margin + 3, y, { maxWidth: contentW - 3 });
          y += 4.5;
        }
      }
      y += 3;
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`${industry.name} · ${period}`, margin, pageH - 6);
    pdf.text(`Página ${p} de ${pages}`, pageW - margin, pageH - 6, { align: 'right' });
  }

  pdf.save(`fotos-${slug(industry.abbreviation || industry.name)}-${report.startDate}_${report.endDate}.pdf`);
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Planilha (CSV com ; e BOM, abre direto no Excel) com uma linha por foto. */
export function downloadIndustryPhotoCsv(report: IndustryPhotoReport): void {
  const header = [
    'Indústria',
    'Loja',
    'Código loja',
    'UF',
    'Endereço',
    'Status',
    'Data da visita',
    'Data/hora da foto',
    'Promotor',
    'Ruptura',
    'Qualidade',
    'Justificativa',
    'Link da foto',
  ];
  const lines: string[][] = [];
  for (const s of report.stores) {
    for (const p of s.photos) {
      lines.push([
        report.industry.name,
        s.store.name,
        s.store.code ?? '',
        s.store.state ?? '',
        s.store.address,
        'Com foto',
        brDate(p.visitDate),
        brDateTime(p.takenAt),
        p.promoterName,
        p.hasRupture ? 'Sim' : 'Não',
        p.qualityScore != null ? String(Math.round(p.qualityScore)) : '',
        '',
        p.url,
      ]);
    }
  }
  for (const item of report.storesWithoutPhotos) {
    const base = [
      report.industry.name,
      item.store.name,
      item.store.code ?? '',
      item.store.state ?? '',
      item.store.address,
      'Sem foto',
    ];
    if (item.misses.length === 0) {
      lines.push([...base, '', '', '', '', '', 'Sem justificativa', '']);
    } else {
      for (const m of item.misses) {
        lines.push([
          ...base,
          brDate(m.date),
          '',
          m.promoterName,
          '',
          '',
          `${MISS_REASON_LABELS[m.reason] ?? m.reason}${m.note ? ` - ${m.note}` : ''}`,
          '',
        ]);
      }
    }
  }

  const csv = '\uFEFF' + [header, ...lines].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fotos-${slug(report.industry.abbreviation || report.industry.name)}-${report.startDate}_${report.endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
