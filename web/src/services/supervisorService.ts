import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado - limpar e redirecionar para login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const supervisorService = {
  async getDashboard() {
    const response = await apiClient.get('/supervisors/dashboard');
    return response.data;
  },

  async getOpsTeamToday(params?: { state?: string; date?: string }) {
    const qs = new URLSearchParams();
    if (params?.state) qs.set('state', params.state);
    if (params?.date) qs.set('date', params.date);
    const query = qs.toString();
    const response = await apiClient.get(`/supervisors/ops/team-today${query ? `?${query}` : ''}`);
    return response.data;
  },

  async getOpsTradeMetrics(params?: { state?: string; date?: string }) {
    const qs = new URLSearchParams();
    if (params?.state) qs.set('state', params.state);
    if (params?.date) qs.set('date', params.date);
    const query = qs.toString();
    const response = await apiClient.get(`/supervisors/ops/trade-metrics${query ? `?${query}` : ''}`);
    return response.data;
  },

  async getOpsPromoterDayDetail(promoterId: string, params?: { date?: string }) {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    const query = qs.toString();
    const response = await apiClient.get(
      `/supervisors/ops/promoters/${promoterId}/day${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  async getPromoters() {
    const response = await apiClient.get('/supervisors/promoters');
    return response.data;
  },

  async getPromoterPerformance(promoterId: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await apiClient.get(
      `/supervisors/promoters/${promoterId}/performance?${params.toString()}`
    );
    return response.data;
  },

  async getPromoterVisits(promoterId: string, page = 1, limit = 20) {
    const response = await apiClient.get(
      `/supervisors/promoters/${promoterId}/visits?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /** Resumo leve: dias com lojas/fotos (sem carregar imagens). */
  async getPromoterVisitDays(promoterId: string) {
    const response = await apiClient.get(`/supervisors/promoters/${promoterId}/visits?summary=1`);
    const data = response.data;
    // Compat: backend antigo ignora summary e devolve { visits }
    if (data?.days) {
      return data as {
        promoter: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          state: string | null;
          avatarUrl?: string | null;
        };
        days: Array<{
          date: string;
          visitCount: number;
          storesCount: number;
          storesDone: number;
          storesOpen: number;
          photoCount: number;
          storeNames: string[];
          states?: string[];
        }>;
      };
    }

    const visits: any[] = data?.visits || [];
    const byDay = new Map<
      string,
      {
        date: string;
        visitCount: number;
        storesCount: number;
        storesDone: number;
        storesOpen: number;
        photoCount: number;
        storeNames: string[];
        states: string[];
        storeIds: Set<string>;
      }
    >();
    for (const v of visits) {
      const d = new Date(v.checkInAt);
      const date = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      let agg = byDay.get(date);
      if (!agg) {
        agg = {
          date,
          visitCount: 0,
          storesCount: 0,
          storesDone: 0,
          storesOpen: 0,
          photoCount: 0,
          storeNames: [],
          states: [],
          storeIds: new Set(),
        };
        byDay.set(date, agg);
      }
      agg.visitCount += 1;
      agg.photoCount += v.photoCount || v.photos?.length || 0;
      if (v.store?.id && !agg.storeIds.has(v.store.id)) {
        agg.storeIds.add(v.store.id);
        agg.storeNames.push(v.store.name);
        if (v.store.state) agg.states.push(v.store.state);
      }
      if (v.checkOutAt) agg.storesDone += 1;
      else agg.storesOpen += 1;
    }
    const days = Array.from(byDay.values())
      .map(({ storeIds, ...rest }) => ({
        ...rest,
        storesCount: storeIds.size,
        storesDone: rest.storesDone,
        storesOpen: rest.storesOpen,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const first = visits[0];
    return {
      promoter: data?.promoter || {
        id: promoterId,
        name: first?.promoterName || 'Promotor',
        email: '',
        phone: null,
        state: first?.store?.state || null,
        avatarUrl: first?.checkInPhotoUrl || null,
      },
      days,
    };
  },

  /** Visitas + fotos de um dia (carrega só ao abrir a barra). */
  async getPromoterVisitsByDate(promoterId: string, date: string) {
    const response = await apiClient.get(
      `/supervisors/promoters/${promoterId}/visits?date=${encodeURIComponent(date)}&limit=100`
    );
    const data = response.data;
    // Backend novo já devolve só o dia
    if (data?.date === date) {
      return data as { promoter: any; date: string; visits: any[] };
    }
    // Backend antigo: filtra no cliente
    const visits = (data.visits || []).filter((v: any) => {
      const d = new Date(v.checkInAt).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      return d === date;
    });
    return { promoter: data.promoter, date, visits };
  },

  async getPromoterRoute(promoterId: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    const response = await apiClient.get(`/supervisors/promoters/${promoterId}/route${params}`);
    return response.data;
  },

  async getMissingPhotos(promoterId?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (promoterId) params.append('promoterId', promoterId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await apiClient.get(`/supervisors/missing-photos?${params.toString()}`);
    return response.data;
  },

  async setPhotoQuota(promoterId: string, expectedPhotos: number) {
    const response = await apiClient.put(`/supervisors/promoters/${promoterId}/photo-quota`, {
      expectedPhotos,
    });
    return response.data;
  },

  async exportReport(data: {
    startDate: string;
    endDate: string;
    promoterIds?: string[];
    storeIds?: string[];
    format: 'pptx' | 'pdf' | 'excel' | 'html';
  }) {
    const response = await apiClient.post('/supervisors/export/report', data);
    return response.data;
  },

  async getExportStatus(jobId: string) {
    const response = await apiClient.get(`/supervisors/export/status/${jobId}`);
    return response.data;
  },

  async downloadExport(jobId: string) {
    const response = await apiClient.get(`/supervisors/export/download/${jobId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Rotas de configuração de rotas
  async setPromoterRoute(promoterId: string, storeIds: string[], orders?: number[], supervisorId?: string | null) {
    const response = await apiClient.post(`/supervisors/promoters/${promoterId}/route-assignment`, {
      storeIds,
      orders,
      supervisorId: supervisorId || null,
    });
    return response.data;
  },

  async addStoresToRoute(promoterId: string, storeIds: string[], supervisorId?: string | null) {
    const response = await apiClient.post(`/supervisors/promoters/${promoterId}/route-assignment/add`, {
      storeIds,
      supervisorId: supervisorId || null,
    });
    return response.data;
  },

  async removeStoreFromRoute(promoterId: string, storeId: string) {
    const response = await apiClient.delete(`/supervisors/promoters/${promoterId}/route-assignment/${storeId}`);
    return response.data;
  },

  async updateRouteAssignmentSupervisor(promoterId: string, storeId: string, supervisorId: string | null) {
    const response = await apiClient.patch(
      `/supervisors/promoters/${promoterId}/route-assignment/${storeId}/supervisor`,
      { supervisorId },
    );
    return response.data;
  },

  async getSupervisorsList(): Promise<{ supervisors: { id: string; name: string; email: string; state: string | null }[] }> {
    const response = await apiClient.get('/supervisors/supervisors-list');
    return response.data;
  },

  async getPromoterRouteAssignment(promoterId: string) {
    const response = await apiClient.get(`/supervisors/promoters/${promoterId}/route-assignment`);
    return response.data;
  },

  async getAllRoutes() {
    const response = await apiClient.get('/supervisors/routes');
    return response.data;
  },

  async getAvailableStores() {
    const response = await apiClient.get('/supervisors/stores/available');
    return response.data;
  },

  // Rotas de gerenciamento de lojas
  async getAllStores() {
    const response = await apiClient.get('/supervisors/stores');
    return response.data;
  },

  async getStore(storeId: string) {
    const response = await apiClient.get(`/supervisors/stores/${storeId}`);
    return response.data;
  },

  async createStore(data: {
    name: string;
    code?: string;
    address: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    industryIds?: string[];
  }) {
    const response = await apiClient.post('/supervisors/stores', data);
    return response.data;
  },

  async bulkCreateStores(stores: {
    name: string;
    code?: string;
    address: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    industryIds?: string[];
  }[]) {
    const response = await apiClient.post('/supervisors/stores/bulk', { stores });
    return response.data;
  },

  async updateStore(storeId: string, data: {
    name?: string;
    code?: string | null;
    address?: string;
    state?: string | null;
    latitude?: number;
    longitude?: number;
  }) {
    const response = await apiClient.put(`/supervisors/stores/${storeId}`, data);
    return response.data;
  },

  async deleteStore(storeId: string) {
    const response = await apiClient.delete(`/supervisors/stores/${storeId}`);
    return response.data;
  },

  // Rotas de indústrias por loja
  async getStoreIndustries(storeId: string) {
    const response = await apiClient.get(`/store-industries/${storeId}?isActive=true`);
    return response.data;
  },

  async getPromoterIndustryAssignments(
    promoterId: string
  ): Promise<{ id: string; industry: { id: string; name: string; code: string }; storeId: string | null }[]> {
    const response = await apiClient.get(`/industry-assignments/promoter/${promoterId}`);
    return response.data.assignments || [];
  },

  async setPromoterStoreIndustries(
    promoterId: string,
    storeId: string,
    industryIds: string[]
  ): Promise<{ industries: { id: string; name: string; code: string }[] }> {
    const response = await apiClient.put(`/industry-assignments/promoter/${promoterId}/store/${storeId}`, {
      industryIds,
    });
    return response.data;
  },

  async updateStoreIndustries(storeId: string, industryIds: string[]) {
    const response = await apiClient.put(`/store-industries/${storeId}`, {
      industryIds,
    });
    return response.data;
  },

  async getAllStoreIndustries() {
    const response = await apiClient.get('/store-industries');
    return response.data;
  },

  // Rotas de pendências de indústrias
  async getPendingIndustries(view: 'store' | 'promoter' = 'store', date?: string) {
    const params = new URLSearchParams();
    params.append('view', view);
    if (date) params.append('date', date);
    const response = await apiClient.get(`/supervisors/pending-industries?${params.toString()}`);
    return response.data;
  },

  async getMyStates(): Promise<{ states: string[] }> {
    const response = await apiClient.get('/supervisors/my-states');
    return response.data;
  },

  async getPendingOverview(state?: string) {
    const params = state ? `?state=${state}` : '';
    const response = await apiClient.get(`/supervisors/pending-overview${params}`);
    return response.data;
  },
};

