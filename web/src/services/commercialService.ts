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

export interface RetailChain {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  orderLayout?: Record<string, unknown> | null;
  _count?: { stores: number; purchaseOrders: number };
  stores?: Array<{
    id: string;
    name: string;
    code?: string | null;
    filialCode?: string | null;
    state?: string | null;
  }>;
}

export interface PurchaseOrder {
  id: string;
  chainId: string;
  industryId?: string | null;
  industryName: string;
  storeId?: string | null;
  filialCode: string;
  filialName: string;
  orderNumber?: string | null;
  orderDate: string;
  deliveryDate?: string | null;
  state?: string | null;
  totalQty: number;
  totalValue: number;
  chain?: { id: string; name: string; code: string };
  industry?: { id: string; name: string; code: string } | null;
  store?: { id: string; name: string; code?: string | null } | null;
  _count?: { items: number };
  items?: Array<{
    id: string;
    productCode: string;
    productName: string;
    qty: number;
    unitValue?: number | null;
    totalValue: number;
  }>;
}

export interface OrderImport {
  id: string;
  fileName: string;
  chainId: string;
  periodLabel?: string | null;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  rowCount: number;
  orderCount: number;
  meta?: {
    unmatchedFiliais?: string[];
    createdOrders?: number;
    updatedOrders?: number;
    parseErrors?: string[];
  } | null;
  errorMessage?: string | null;
  chain?: { id: string; name: string; code: string };
  uploadedBy?: { name: string; email: string } | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  period: string;
  metric: 'ORDER_VALUE' | 'ORDER_QTY';
  industryId?: string | null;
  chainId?: string | null;
  storeId?: string | null;
  targetValue: number;
  note?: string | null;
  industry?: { id: string; name: string; code: string } | null;
  chain?: { id: string; name: string; code: string } | null;
  store?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string };
}

export interface GoalProgressRow {
  goal: Goal;
  realized: number;
  pct: number;
  paceExpected?: number;
  projection?: number;
  onTrack?: boolean;
  days?: { elapsed: number; total: number; remaining: number };
}

export interface FeedEntry {
  id: string;
  type: 'IMPORT' | 'GOAL' | 'PENDING' | 'NOTE';
  title: string;
  body?: string | null;
  status: 'OPEN' | 'DONE';
  dueDate?: string | null;
  createdAt: string;
  author?: { id: string; name: string; role?: string };
  assignee?: { id: string; name: string } | null;
  industry?: { id: string; name: string } | null;
  chain?: { id: string; name: string } | null;
  store?: { id: string; name: string } | null;
}

export const chainService = {
  async list(isActive?: boolean): Promise<RetailChain[]> {
    const { data } = await apiClient.get('/chains', {
      params: isActive ? { isActive: 'true' } : undefined,
    });
    return data.chains || [];
  },
  async get(id: string) {
    const { data } = await apiClient.get(`/chains/${id}`);
    return data.chain as RetailChain;
  },
  async create(payload: {
    name: string;
    code: string;
    isActive?: boolean;
    orderLayout?: Record<string, unknown>;
  }) {
    const { data } = await apiClient.post('/chains', payload);
    return data.chain as RetailChain;
  },
  async update(
    id: string,
    payload: Partial<{ name: string; code: string; isActive: boolean; orderLayout: Record<string, unknown> }>
  ) {
    const { data } = await apiClient.put(`/chains/${id}`, payload);
    return data.chain as RetailChain;
  },
  async remove(id: string) {
    await apiClient.delete(`/chains/${id}`);
  },
  async linkStore(chainId: string, storeId: string) {
    const { data } = await apiClient.post(`/chains/${chainId}/link-store`, { storeId });
    return data.store;
  },
  async unlinkStore(storeId: string) {
    const { data } = await apiClient.delete(`/chains/stores/${storeId}/link`);
    return data.store;
  },
  async unlinkedStores() {
    const { data } = await apiClient.get('/chains/unlinked-stores');
    return (data.stores || []) as Array<{
      id: string;
      name: string;
      code?: string | null;
      filialCode?: string | null;
      state?: string | null;
    }>;
  },
};

export const orderService = {
  async list(params?: Record<string, string | number | undefined>) {
    const { data } = await apiClient.get('/orders', { params });
    return (data.orders || []) as PurchaseOrder[];
  },
  async get(id: string) {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data.order as PurchaseOrder;
  },
  async summary(params?: Record<string, string | undefined>) {
    const { data } = await apiClient.get('/orders/summary', { params });
    return data as {
      month: string | null;
      groupBy: string;
      rows: Array<{
        key: string;
        label: string;
        orderCount: number;
        totalQty: number;
        totalValue: number;
      }>;
      totals: { orderCount: number; totalQty: number; totalValue: number };
    };
  },
  async listImports() {
    const { data } = await apiClient.get('/orders/imports');
    return (data.imports || []) as OrderImport[];
  },
  async upload(file: File, chainId: string, periodLabel?: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('chainId', chainId);
    if (periodLabel) form.append('periodLabel', periodLabel);
    const { data } = await apiClient.post('/orders/imports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.import as OrderImport;
  },
  async unmatchedFiliais(chainId?: string) {
    const { data } = await apiClient.get('/orders/unmatched-filiais', {
      params: chainId ? { chainId } : undefined,
    });
    return (data.filiais || []) as Array<{
      filialCode: string;
      filialName: string;
      chainId: string;
      state?: string | null;
      orderCount: number;
    }>;
  },
};

export const goalService = {
  async list(params?: { period?: string; industryId?: string; chainId?: string }) {
    const { data } = await apiClient.get('/goals', { params });
    return (data.goals || []) as Goal[];
  },
  async progress(period?: string) {
    const { data } = await apiClient.get('/goals/progress', {
      params: period ? { period } : undefined,
    });
    return data as {
      period: string;
      days: { elapsed: number; total: number; remaining: number };
      rows: GoalProgressRow[];
    };
  },
  async upsert(payload: {
    period: string;
    metric: 'ORDER_VALUE' | 'ORDER_QTY';
    industryId?: string | null;
    chainId?: string | null;
    storeId?: string | null;
    targetValue: number;
    note?: string | null;
  }) {
    const { data } = await apiClient.post('/goals', payload);
    return data.goal as Goal;
  },
  async remove(id: string) {
    await apiClient.delete(`/goals/${id}`);
  },
};

export const feedService = {
  async list(params?: { status?: string; type?: string; limit?: number }) {
    const { data } = await apiClient.get('/feed', { params });
    return (data.entries || []) as FeedEntry[];
  },
  async create(payload: {
    type?: FeedEntry['type'];
    title: string;
    body?: string | null;
    industryId?: string | null;
    chainId?: string | null;
    storeId?: string | null;
    assigneeId?: string | null;
  }) {
    const { data } = await apiClient.post('/feed', payload);
    return data.entry as FeedEntry;
  },
  async patch(id: string, payload: Partial<{ status: 'OPEN' | 'DONE'; title: string; body: string | null }>) {
    const { data } = await apiClient.patch(`/feed/${id}`, payload);
    return data.entry as FeedEntry;
  },
  async dashboard(period?: string) {
    const { data } = await apiClient.get('/feed/dashboard', {
      params: period ? { period } : undefined,
    });
    return data as {
      period: string;
      totals: { orderCount: number; totalValue: number; totalQty: number };
      byIndustry: Array<{ label: string; orderCount: number; totalValue: number; totalQty: number }>;
      byChain: Array<{
        chainId: string;
        label: string;
        orderCount: number;
        totalValue: number;
        totalQty: number;
      }>;
      goalProgress: Array<{ goal: Goal; realized: number; pct: number }>;
      openPendings: FeedEntry[];
      recentImports: OrderImport[];
      recentFeed: FeedEntry[];
    };
  },
};

export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
