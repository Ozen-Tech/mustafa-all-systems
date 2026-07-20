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

export type InformationType = 'estoque' | 'produto' | 'geral';

export interface InformationItem {
  id: string;
  title: string;
  content: string;
  type: InformationType;
  isActive: boolean;
  geminiSummary: string | null;
  industryId: string | null;
  storeId: string | null;
  promoterId: string | null;
  createdAt: string;
  industry?: { id: string; name: string; code: string } | null;
  store?: { id: string; name: string } | null;
  promoter?: { id: string; name: string; email: string } | null;
}

export const informationService = {
  async list(params: { type?: string; isActive?: boolean } = {}): Promise<InformationItem[]> {
    const response = await apiClient.get('/information', {
      params: {
        ...params,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
      },
    });
    return response.data.informations;
  },

  async create(data: {
    title: string;
    content?: string;
    type: InformationType;
    industryId?: string;
    storeId?: string;
    promoterId?: string;
  }) {
    const response = await apiClient.post('/information', data);
    return response.data.information as InformationItem;
  },

  async setActive(id: string, isActive: boolean) {
    const response = await apiClient.patch(`/information/${id}/active`, { isActive });
    return response.data.information as InformationItem;
  },

  async publishStockSummary() {
    const response = await apiClient.post('/information/publish-stock-summary');
    return response.data.information as InformationItem;
  },
};
