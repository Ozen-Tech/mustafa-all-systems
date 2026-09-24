import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { normalizeFilialCode } from '../pivotCacheParser';

export type OrderLayoutField =
  | 'orderNumber'
  | 'orderDate'
  | 'filialCode'
  | 'filialName'
  | 'industryName'
  | 'productCode'
  | 'productName'
  | 'qty'
  | 'unitValue'
  | 'totalValue'
  | 'state'
  | 'deliveryDate';

export type OrderLayout = {
  /** Nome da aba (opcional; usa a primeira se omitido) */
  sheetName?: string;
  /** Linha do cabeçalho (0-based). Default 0. */
  headerRow?: number;
  /** Mapa campo interno → nome da coluna na planilha */
  columns: Partial<Record<OrderLayoutField, string>>;
};

export type ParsedOrderLine = {
  orderNumber: string | null;
  orderDate: Date;
  deliveryDate: Date | null;
  filialCode: string;
  filialName: string;
  industryName: string;
  productCode: string;
  productName: string;
  qty: number;
  unitValue: number | null;
  totalValue: number;
  state: string | null;
};

/** Layout padrão genérico (colunas em português comuns). */
export const DEFAULT_ORDER_LAYOUT: OrderLayout = {
  headerRow: 0,
  columns: {
    orderNumber: 'Pedido',
    orderDate: 'Data',
    filialCode: 'Filial',
    filialName: 'Nome Filial',
    industryName: 'Indústria',
    productCode: 'Código',
    productName: 'Produto',
    qty: 'Quantidade',
    unitValue: 'Valor Unitário',
    totalValue: 'Valor Total',
    state: 'UF',
    deliveryDate: 'Entrega',
  },
};

function cellStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function cellNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  if (typeof v === 'string') {
    const s = v.trim();
    // dd/mm/yyyy
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (br) {
      const dd = Number(br[1]);
      const mm = Number(br[2]);
      let yyyy = Number(br[3]);
      if (yyyy < 100) yyyy += 2000;
      return new Date(Date.UTC(yyyy, mm - 1, dd));
    }
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  return null;
}

function findColumnIndex(headers: string[], wanted: string | undefined): number {
  if (!wanted) return -1;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const target = norm(wanted);
  return headers.findIndex((h) => norm(h) === target || norm(h).includes(target));
}

/**
 * Lê uma planilha de pedidos usando o layout configurado da rede.
 * Aceita orderLayout parcial; campos faltantes usam o DEFAULT.
 */
export function parseOrdersWorkbook(
  filePath: string,
  layoutInput?: OrderLayout | null
): { lines: ParsedOrderLine[]; errors: string[]; sheetName: string } {
  const layout: OrderLayout = {
    ...DEFAULT_ORDER_LAYOUT,
    ...(layoutInput || {}),
    columns: {
      ...DEFAULT_ORDER_LAYOUT.columns,
      ...(layoutInput?.columns || {}),
    },
  };

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName =
    (layout.sheetName && wb.SheetNames.includes(layout.sheetName)
      ? layout.sheetName
      : wb.SheetNames[0]) || '';
  if (!sheetName) {
    return { lines: [], errors: ['Planilha sem abas'], sheetName: '' };
  }

  const sheet = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const headerRowIdx = layout.headerRow ?? 0;
  const headerRow = (rows[headerRowIdx] || []).map((c) => cellStr(c));
  const cols = layout.columns;

  const idx = {
    orderNumber: findColumnIndex(headerRow, cols.orderNumber),
    orderDate: findColumnIndex(headerRow, cols.orderDate),
    filialCode: findColumnIndex(headerRow, cols.filialCode),
    filialName: findColumnIndex(headerRow, cols.filialName),
    industryName: findColumnIndex(headerRow, cols.industryName),
    productCode: findColumnIndex(headerRow, cols.productCode),
    productName: findColumnIndex(headerRow, cols.productName),
    qty: findColumnIndex(headerRow, cols.qty),
    unitValue: findColumnIndex(headerRow, cols.unitValue),
    totalValue: findColumnIndex(headerRow, cols.totalValue),
    state: findColumnIndex(headerRow, cols.state),
    deliveryDate: findColumnIndex(headerRow, cols.deliveryDate),
  };

  const errors: string[] = [];
  if (idx.filialCode < 0) errors.push(`Coluna de filial não encontrada (esperava "${cols.filialCode}")`);
  if (idx.industryName < 0) errors.push(`Coluna de indústria não encontrada (esperava "${cols.industryName}")`);
  if (idx.productCode < 0 && idx.productName < 0) {
    errors.push('Coluna de produto (código ou nome) não encontrada');
  }
  if (idx.orderDate < 0) errors.push(`Coluna de data não encontrada (esperava "${cols.orderDate}")`);

  if (errors.length) {
    return { lines: [], errors, sheetName };
  }

  const lines: ParsedOrderLine[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const get = (i: number) => (i >= 0 ? row[i] : null);

    const filialCode = normalizeFilialCode(cellStr(get(idx.filialCode)));
    const industryName = cellStr(get(idx.industryName));
    if (!filialCode && !industryName) continue;

    const orderDate = parseDate(get(idx.orderDate)) || new Date();
    const deliveryDate = idx.deliveryDate >= 0 ? parseDate(get(idx.deliveryDate)) : null;
    const qty = cellNum(get(idx.qty));
    let unitValue = idx.unitValue >= 0 ? cellNum(get(idx.unitValue)) : null;
    let totalValue = idx.totalValue >= 0 ? cellNum(get(idx.totalValue)) : 0;
    if (!totalValue && unitValue != null && qty) totalValue = unitValue * qty;
    if ((!unitValue || unitValue === 0) && totalValue && qty) unitValue = totalValue / qty;

    const productCode = cellStr(get(idx.productCode)) || cellStr(get(idx.productName)) || `ROW-${r}`;
    const productName = cellStr(get(idx.productName)) || productCode;

    if (!filialCode) {
      errors.push(`Linha ${r + 1}: filial vazia`);
      continue;
    }
    if (!industryName) {
      errors.push(`Linha ${r + 1}: indústria vazia`);
      continue;
    }

    lines.push({
      orderNumber: idx.orderNumber >= 0 ? cellStr(get(idx.orderNumber)) || null : null,
      orderDate,
      deliveryDate,
      filialCode,
      filialName: cellStr(get(idx.filialName)) || filialCode,
      industryName,
      productCode,
      productName,
      qty,
      unitValue,
      totalValue,
      state: idx.state >= 0 ? cellStr(get(idx.state)).toUpperCase() || null : null,
    });
  }

  return { lines, errors, sheetName };
}

/** Hash estável para evitar duplicar o mesmo pedido em reimportações. */
export function orderSourceHash(input: {
  chainId: string;
  orderNumber: string | null;
  orderDate: Date;
  filialCode: string;
  industryName: string;
}): string {
  const day = input.orderDate.toISOString().slice(0, 10);
  const raw = [
    input.chainId,
    input.orderNumber || '',
    day,
    input.filialCode,
    input.industryName.toLowerCase(),
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}
