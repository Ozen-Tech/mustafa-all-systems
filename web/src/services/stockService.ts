import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface StockImport {
  id: string;
  fileName: string;
  weekLabel: string | null;
  type: 'STOCK' | 'SALES' | 'BOTH';
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  stockRowCount: number;
  salesRowCount: number;
  industries: string[];
  meta?: { matchedStock?: number; matchedSales?: number } | null;
  errorMessage?: string | null;
  uploadedBy?: { name: string; email: string } | null;
  createdAt: string;
}

export interface StoreStockItem {
  id: string;
  industryName: string;
  supplierName: string | null;
  filialCode: string;
  filialName: string;
  storeId: string | null;
  state: string | null;
  locationType: 'LOJA' | 'CD' | null;
  productCode: string;
  productName: string;
  qty: number;
  valueRs: number | null;
  idade: number | null;
  dde: number | null;
  status: string | null;
  lowTurn: boolean;
}

export interface StockOverview {
  byIndustry: { industryName: string; qty: number; valueRs: number; items: number }[];
  byCd: { cd: string; qty: number; valueRs: number; items: number }[];
  loja: { qty: number; valueRs: number; items: number; rupturas: number; baixoGiro: number };
  lastImport: StockImport | null;
}

export interface StockByStoreRow {
  filialCode: string;
  filialName: string;
  state: string | null;
  qty: number;
  valueRs: number;
  items: number;
}

export interface SalesByIndustry {
  industryName: string;
  qtyCurrent: number;
  qtyPrevious: number;
  valueCurrent: number;
  valuePrevious: number;
  growthPct: number | null;
}

export interface UnmatchedFilial {
  filialCode: string;
  filialName: string;
  state: string | null;
  items: number;
}

export const stockService = {
  async uploadImport(file: File, onProgress?: (pct: number) => void): Promise<StockImport> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post('/stock/imports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return response.data.import;
  },

  async listImports(): Promise<StockImport[]> {
    const response = await apiClient.get('/stock/imports');
    return response.data.imports;
  },

  async getOverview(params: { industryName?: string; state?: string } = {}): Promise<StockOverview> {
    const response = await apiClient.get('/stock/overview', { params });
    return response.data;
  },

  async getByStore(params: { industryName?: string } = {}): Promise<StockByStoreRow[]> {
    const response = await apiClient.get('/stock/by-store', { params });
    return response.data.stores;
  },

  async getSales(params: { industryName?: string; storeId?: string } = {}) {
    const response = await apiClient.get('/stock/sales', { params });
    return response.data as { byIndustry: SalesByIndustry[]; records: any[] };
  },

  async getStoreItems(
    storeId: string,
    params: { industryName?: string; search?: string } = {}
  ): Promise<{
    store: any;
    industries: string[];
    totals: { items: number; rupturas: number; baixoGiro: number };
    items: StoreStockItem[];
  }> {
    const response = await apiClient.get(`/stock/stores/${storeId}/items`, { params });
    return response.data;
  },

  async getUnmatchedFiliais(): Promise<UnmatchedFilial[]> {
    const response = await apiClient.get('/stock/unmatched-filiais');
    return response.data.filiais;
  },

  async linkFilial(storeId: string, filialCode: string) {
    const response = await apiClient.post(`/stock/stores/${storeId}/link-filial`, { filialCode });
    return response.data;
  },
};
