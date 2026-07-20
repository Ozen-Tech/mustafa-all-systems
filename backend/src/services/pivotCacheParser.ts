import StreamZip from 'node-stream-zip';
import { SaxesParser } from 'saxes';
import { Readable } from 'stream';

/**
 * Parser dos relatórios do Mateus (.xlsx com tabela dinâmica).
 *
 * Os arquivos guardam o detalhe completo no cache da pivot:
 *  - xl/pivotCache/pivotCacheDefinitionN.xml  -> nomes dos campos + sharedItems
 *  - xl/pivotCache/pivotCacheRecordsN.xml      -> ~1M registros (a maioria é padding)
 *
 * Em cada <r> os filhos seguem a ordem dos "database fields" (databaseField != 0).
 *  <x v="i"/> referencia sharedItems[campo][i]; <n>/<s> valor inline; <m/> vazio.
 *
 * Só interessam as linhas com valor numérico (estoque/venda). O restante é
 * preenchimento até o limite de linhas do Excel e deve ser descartado.
 */

export type CacheType = 'STOCK' | 'SALES' | 'UNKNOWN';

export interface StockRow {
  filialRaw: string;
  filialCode: string;
  filialName: string;
  state: string | null;
  supplier: string | null;
  productRaw: string;
  productCode: string;
  productName: string;
  qty: number;
  valueRs: number | null;
  idade: number | null;
  dde: number | null;
  status: string | null;
  locationType: 'LOJA' | 'CD' | null;
  lowTurn: boolean;
  sale: number | null;
  industryName: string | null;
}

export interface SalesRow {
  filialRaw: string;
  filialCode: string;
  filialName: string;
  state: string | null;
  bandeira: string | null;
  supplier: string | null;
  productRaw: string;
  productCode: string;
  productName: string;
  category: string | null;
  month: string | null;
  qtyCurrent: number | null;
  qtyPrevious: number | null;
  qtyTrend: number | null;
  valueCurrent: number | null;
  valuePrevious: number | null;
  valueTrend: number | null;
  industryName: string | null;
}

/** Ordem civil dos meses (planilha Mateus). */
export const SALES_MONTH_ORDER = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const;

export function normalizeSalesMonth(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.toString().trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const map: Record<string, string> = {
    JANEIRO: 'JANEIRO',
    FEVEREIRO: 'FEVEREIRO',
    MARCO: 'MARÇO',
    ABRIL: 'ABRIL',
    MAIO: 'MAIO',
    JUNHO: 'JUNHO',
    JULHO: 'JULHO',
    AGOSTO: 'AGOSTO',
    SETEMBRO: 'SETEMBRO',
    OUTUBRO: 'OUTUBRO',
    NOVEMBRO: 'NOVEMBRO',
    DEZEMBRO: 'DEZEMBRO',
  };
  return map[m] ?? raw.toString().trim().toUpperCase();
}

export function latestSalesMonth(months: string[]): string | null {
  const present = new Set(months.map((m) => normalizeSalesMonth(m) || m));
  for (let i = SALES_MONTH_ORDER.length - 1; i >= 0; i--) {
    const name = SALES_MONTH_ORDER[i];
    if (present.has(name)) return name;
  }
  return months[0] ?? null;
}

export interface ParseResult {
  stockRows: number;
  salesRows: number;
  industries: string[];
}

export interface ParseOptions {
  onStockBatch?: (rows: StockRow[]) => Promise<void>;
  onSalesBatch?: (rows: SalesRow[]) => Promise<void>;
  onProgress?: (info: { type: CacheType; processed: number }) => void;
  batchSize?: number;
}

interface CacheField {
  name: string;
  databaseField: boolean;
  shared: string[];
}

interface CacheDefinition {
  defEntry: string;
  recordsEntry: string;
  type: CacheType;
  fields: CacheField[];
  dbFields: CacheField[];
}

/** "0001 - MATEUS SUPERMERCADO" -> { code: "0001", name: "MATEUS SUPERMERCADO" } */
export function parseLabeledCode(raw: string | null | undefined): { code: string; name: string } {
  const value = (raw ?? '').toString().trim();
  if (!value) return { code: '', name: '' };
  const idx = value.indexOf(' - ');
  if (idx === -1) return { code: value, name: value };
  return { code: value.slice(0, idx).trim(), name: value.slice(idx + 3).trim() };
}

/** Normaliza código de filial p/ casamento (remove zeros à esquerda). */
export function normalizeFilialCode(code: string | null | undefined): string {
  const v = (code ?? '').toString().trim().replace(/^0+/, '');
  return v;
}

function classifyFields(fieldNames: string[]): CacheType {
  const upper = fieldNames.map((n) => n.toUpperCase());
  const hasStock = upper.some((n) => n.startsWith('QTD. ESTOQUE') || n === 'DDE');
  const hasSales = upper.some((n) => /^VENDA R\$/.test(n) || /^QTD \d{4}/.test(n));
  if (hasStock && !hasSales) return 'STOCK';
  if (hasSales) return 'SALES';
  return 'UNKNOWN';
}

async function readEntryText(zip: StreamZip.StreamZipAsync, entry: string): Promise<string> {
  const buf = await zip.entryData(entry);
  return buf.toString('utf-8');
}

/** Faz parse de uma definition (sharedItems por campo) usando streaming. */
async function parseDefinition(
  zip: StreamZip.StreamZipAsync,
  defEntry: string
): Promise<{ fields: CacheField[] }> {
  const xml = await readEntryText(zip, defEntry);
  const parser = new SaxesParser();
  const fields: CacheField[] = [];
  let current: CacheField | null = null;
  let insideShared = false;

  parser.on('opentag', (tag) => {
    const name = tag.name;
    if (name === 'cacheField') {
      const fieldName = (tag.attributes['name'] as string) ?? '';
      const dbAttr = tag.attributes['databaseField'] as string | undefined;
      current = {
        name: fieldName,
        databaseField: dbAttr !== '0',
        shared: [],
      };
      fields.push(current);
    } else if (name === 'sharedItems') {
      insideShared = true;
    } else if (insideShared && current) {
      // itens compartilhados: <s v=".."/> <n v=".."/> <m/> <d v=".."/> <b v=".."/> <e v=".."/>
      if (name === 's' || name === 'n' || name === 'd') {
        current.shared.push((tag.attributes['v'] as string) ?? '');
      } else if (name === 'b') {
        current.shared.push(((tag.attributes['v'] as string) === '1' ? 'TRUE' : 'FALSE'));
      } else if (name === 'm' || name === 'e') {
        current.shared.push('');
      }
    }
  });

  parser.on('closetag', (tag) => {
    if (tag.name === 'sharedItems') insideShared = false;
    else if (tag.name === 'cacheField') current = null;
  });

  parser.write(xml).close();
  return { fields };
}

function recordsEntryFor(defEntry: string): string {
  return defEntry.replace('pivotCacheDefinition', 'pivotCacheRecords');
}

function toNumber(v: string | null): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Faz streaming dos records resolvendo cada <r> para um array de valores. */
async function streamRecords(
  zip: StreamZip.StreamZipAsync,
  def: CacheDefinition,
  onRow: (getValue: (fieldName: string) => string | null, hasNumeric: boolean) => Promise<void> | void
): Promise<void> {
  const dbFields = def.dbFields;
  const indexByName = new Map<string, number>();
  dbFields.forEach((f, i) => indexByName.set(f.name, i));

  const stream = (await zip.stream(def.recordsEntry)) as unknown as Readable;
  const parser = new SaxesParser();

  let values: (string | null)[] = [];
  let fieldIdx = 0;
  let hasNumeric = false;
  let pending: Promise<void> | void = undefined;

  const queue: Array<() => Promise<void> | void> = [];

  parser.on('opentag', (tag) => {
    const name = tag.name;
    if (name === 'r') {
      values = new Array(dbFields.length).fill(null);
      fieldIdx = 0;
      hasNumeric = false;
      return;
    }
    if (fieldIdx >= dbFields.length) return;
    const v = tag.attributes ? (tag.attributes['v'] as string | undefined) : undefined;
    switch (name) {
      case 'x': {
        const shared = dbFields[fieldIdx].shared;
        const i = v !== undefined ? Number(v) : 0;
        values[fieldIdx] = shared[i] ?? null;
        fieldIdx++;
        break;
      }
      case 'n':
        values[fieldIdx] = v ?? null;
        hasNumeric = true;
        fieldIdx++;
        break;
      case 's':
        values[fieldIdx] = v ?? '';
        fieldIdx++;
        break;
      case 'd':
        values[fieldIdx] = v ?? null;
        fieldIdx++;
        break;
      case 'b':
        values[fieldIdx] = v === '1' ? 'TRUE' : 'FALSE';
        fieldIdx++;
        break;
      case 'm':
      case 'e':
        values[fieldIdx] = null;
        fieldIdx++;
        break;
      default:
        break;
    }
  });

  parser.on('closetag', (tag) => {
    if (tag.name !== 'r') return;
    const snapshot = values;
    const numeric = hasNumeric;
    const getValue = (fieldName: string): string | null => {
      const idx = indexByName.get(fieldName);
      if (idx === undefined) return null;
      return snapshot[idx];
    };
    queue.push(() => onRow(getValue, numeric));
  });

  return new Promise<void>((resolve, reject) => {
    parser.on('error', reject);

    const drainQueue = async () => {
      while (queue.length > 0) {
        const fn = queue.shift()!;
        await fn();
      }
    };

    stream.on('data', (chunk: Buffer) => {
      try {
        parser.write(chunk.toString('utf-8'));
      } catch (err) {
        stream.destroy();
        reject(err);
        return;
      }
      if (queue.length > 2000) {
        stream.pause();
        drainQueue()
          .then(() => stream.resume())
          .catch(reject);
      }
    });

    stream.on('end', () => {
      try {
        parser.close();
      } catch (err) {
        reject(err);
        return;
      }
      drainQueue().then(resolve).catch(reject);
    });

    stream.on('error', reject);
  });
}

function buildStockRow(get: (n: string) => string | null): StockRow {
  const filialRaw = get('Filial') ?? '';
  const filial = parseLabeledCode(filialRaw);
  const productRaw = get('Produto') ?? '';
  const product = parseLabeledCode(productRaw);
  const tip = (get('TIP') ?? '').toUpperCase();
  const baixo = (get('BAIXO') ?? '').toUpperCase();
  return {
    filialRaw,
    filialCode: filial.code,
    filialName: filial.name,
    state: get('ETS'),
    supplier: get('Fornecedor'),
    productRaw,
    productCode: product.code,
    productName: product.name,
    qty: toNumber(get('Qtd. estoque')) ?? 0,
    valueRs: toNumber(get('VALO')),
    idade: toNumber(get('IDAD')),
    dde: toNumber(get('DDE')),
    status: get('STAT'),
    locationType: tip === 'CD' ? 'CD' : tip === 'LOJA' ? 'LOJA' : null,
    lowTurn: baixo.includes('BAIXO'),
    sale: toNumber(get('VEND')),
    industryName: get('IND'),
  };
}

function pickSalesField(fieldNames: string[], prefix: RegExp): { current?: string; previous?: string } {
  const matches = fieldNames
    .filter((n) => prefix.test(n.toUpperCase()))
    .map((n) => ({ name: n, year: Number((n.match(/(\d{4})/) || [])[1] || 0) }))
    .sort((a, b) => b.year - a.year);
  return { current: matches[0]?.name, previous: matches[1]?.name };
}

export async function parseMateusWorkbook(
  filePath: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const batchSize = options.batchSize ?? 1000;
  const zip = new StreamZip.async({ file: filePath });
  const industries = new Set<string>();
  let stockRows = 0;
  let salesRows = 0;

  try {
    const entries = await zip.entries();
    const defEntries = Object.keys(entries)
      .filter((n) => /pivotCache\/pivotCacheDefinition\d+\.xml$/.test(n))
      .sort();

    const definitions: CacheDefinition[] = [];
    for (const defEntry of defEntries) {
      const { fields } = await parseDefinition(zip, defEntry);
      const type = classifyFields(fields.map((f) => f.name));
      definitions.push({
        defEntry,
        recordsEntry: recordsEntryFor(defEntry),
        type,
        fields,
        dbFields: fields.filter((f) => f.databaseField),
      });
    }

    const stockDef = definitions.find((d) => d.type === 'STOCK');
    const salesDef = definitions.find((d) => d.type === 'SALES');

    if (stockDef && options.onStockBatch) {
      let batch: StockRow[] = [];
      let processed = 0;
      await streamRecords(zip, stockDef, async (get, hasNumeric) => {
        if (!hasNumeric) return; // descarta padding
        const row = buildStockRow(get);
        if (!row.filialCode || !row.productCode) return;
        if (row.industryName) industries.add(row.industryName);
        batch.push(row);
        if (batch.length >= batchSize) {
          await options.onStockBatch!(batch);
          processed += batch.length;
          stockRows += batch.length;
          options.onProgress?.({ type: 'STOCK', processed });
          batch = [];
        }
      });
      if (batch.length > 0) {
        await options.onStockBatch!(batch);
        stockRows += batch.length;
      }
    }

    if (salesDef && options.onSalesBatch) {
      const fieldNames = salesDef.dbFields.map((f) => f.name);
      const qty = pickSalesField(fieldNames, /^QTD \d{4}/);
      const value = pickSalesField(fieldNames, /^VENDA R\$/);
      const filialFieldName =
        fieldNames.find((n) => /^FILIAL 1$/i.test(n)) ||
        fieldNames.find((n) => /^FILIAL/i.test(n)) ||
        'FILIAL 1';
      const productFieldName = fieldNames.find((n) => /^PRODUTO$/i.test(n)) || 'PRODUTO';

      let batch: SalesRow[] = [];
      let processed = 0;
      await streamRecords(zip, salesDef, async (get, hasNumeric) => {
        if (!hasNumeric) return;
        const filialRaw = get(filialFieldName) ?? '';
        const filial = parseLabeledCode(filialRaw);
        const productRaw = get(productFieldName) ?? '';
        const product = parseLabeledCode(productRaw);
        if (!filial.code || !product.code) return;
        const ind = get('IND');
        if (ind) industries.add(ind);
        const qtyCur = qty.current ? toNumber(get(qty.current)) : null;
        const valCur = value.current ? toNumber(get(value.current)) : null;
        const tendQtyField =
          fieldNames.find((n) => /^TEND\s*QTD/i.test(n)) ||
          fieldNames.find((n) => /^TEND$/i.test(n));
        const tendValField = fieldNames.find((n) => /^TEND[EÊ]NCIA$/i.test(n));
        const qtyTrendRaw = tendQtyField ? toNumber(get(tendQtyField)) : null;
        const valueTrendRaw = tendValField ? toNumber(get(tendValField)) : null;
        const row: SalesRow = {
          filialRaw,
          filialCode: filial.code,
          filialName: filial.name,
          state: get('ESTADO FILI') ?? get('ESTADO'),
          bandeira: get('BANDEIRA'),
          supplier: get('FORNECEDOR'),
          productRaw,
          productCode: product.code,
          productName: product.name,
          category: get('CATEGORIA'),
          month: normalizeSalesMonth(get('MES')),
          qtyCurrent: qtyCur,
          qtyPrevious: qty.previous ? toNumber(get(qty.previous)) : null,
          qtyTrend: qtyTrendRaw ?? (qtyCur != null ? qtyCur * 2 : null),
          valueCurrent: valCur,
          valuePrevious: value.previous ? toNumber(get(value.previous)) : null,
          valueTrend: valueTrendRaw ?? (valCur != null ? valCur * 2 : null),
          industryName: ind,
        };
        batch.push(row);
        if (batch.length >= batchSize) {
          await options.onSalesBatch!(batch);
          processed += batch.length;
          salesRows += batch.length;
          options.onProgress?.({ type: 'SALES', processed });
          batch = [];
        }
      });
      if (batch.length > 0) {
        await options.onSalesBatch!(batch);
        salesRows += batch.length;
      }
    }

    return { stockRows, salesRows, industries: Array.from(industries) };
  } finally {
    await zip.close();
  }
}
