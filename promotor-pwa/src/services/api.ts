/**
 * API Client
 * Comunicação com o backend Express existente
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = new Error(errorData.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = errorData.code;
    throw error;
  }

  return response.json();
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    state?: string;
  };
}

export interface Store {
  id: string;
  name: string;
  code?: string;
  filialCode?: string;
  address: string;
  state?: string;
  latitude: number;
  longitude: number;
}

export interface Visit {
  id: string;
  store: Store;
  checkInAt: string;
  checkOutAt?: string;
  checkInLatitude: number;
  checkInLongitude: number;
}

export interface Task {
  id: string;
  storeId: string;
  sku: string;
  productName: string;
  industryName: string;
  industryId?: string;
  alertType: 'ruptura_com_cd' | 'cd_zerado' | 'parado_30d' | 'negativo' | 'excesso_dde90' | 'cobertura_baixa';
  stockLoja: number;
  stockCD: number;
  lastSale?: string;
  dde?: number;
  priority: number;
}

export interface Mission {
  id: string;
  title: string;
  description?: string;
  industryId?: string;
  industryName?: string;
  storeId?: string;
  weekStart: string;
  weekEnd: string;
  requiresPhoto: boolean;
  completed: boolean;
}

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getProfile(): Promise<LoginResponse['user']> {
    return request('/auth/me');
  },

  async getStores(): Promise<{ stores: Store[]; hasRoute: boolean; completedStoreIdsToday: string[] }> {
    return request('/promoters/stores');
  },

  async checkIn(data: {
    storeId: string;
    latitude: number | null;
    longitude: number | null;
    gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable';
    photoUrl: string;
    clientId?: string;
  }): Promise<{ visit: Visit }> {
    return request('/promoters/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async checkout(data: {
    visitId: string;
    latitude: number | null;
    longitude: number | null;
    photoUrl: string;
  }): Promise<{ visit: Visit }> {
    return request('/promoters/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCurrentVisit(): Promise<{ visit: Visit | null }> {
    return request('/promoters/current-visit');
  },

  async uploadPhoto(blob: Blob, type: string): Promise<{ url: string }> {
    const { uploadUrl, publicUrl } = await request<{ uploadUrl: string; publicUrl: string }>(
      '/upload/photo',
      {
        method: 'POST',
        body: JSON.stringify({
          contentType: 'image/jpeg',
          extension: 'jpg',
          type,
        }),
      }
    );

    await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    return { url: publicUrl };
  },

  async registerPhoto(data: {
    visitId: string;
    url: string;
    type: string;
    latitude?: number;
    longitude?: number;
    industryId?: string;
  }): Promise<{ photo: { id: string } }> {
    return request('/promoters/photos', {
      method: 'POST',
      body: JSON.stringify({
        visitId: data.visitId,
        photos: [{
          url: data.url,
          type: data.type,
          latitude: data.latitude,
          longitude: data.longitude,
          industryId: data.industryId,
        }],
      }),
    });
  },

  async getTasks(storeId: string, date?: string): Promise<{ tasks: Task[] }> {
    const params = new URLSearchParams({ storeId });
    if (date) params.set('date', date);
    return request(`/tasks?${params}`);
  },

  async completeTask(data: {
    visitId: string;
    taskId: string;
    storeId: string;
    sku: string;
    action: string;
    priceFound?: number;
    ruptureReason?: string;
    actionTaken?: string;
    note?: string;
  }): Promise<{ success: boolean }> {
    return request('/tasks/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMissions(weekStart?: string): Promise<{ missions: Mission[] }> {
    const params = weekStart ? `?weekStart=${weekStart}` : '';
    return request(`/missions${params}`);
  },

  async completeMission(data: {
    missionId: string;
    storeId?: string;
    done: boolean;
    photoUrl?: string;
    note?: string;
  }): Promise<{ success: boolean }> {
    return request('/missions/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Supervisor endpoints
  async getSupervisorDayStatus(date?: string): Promise<{
    promoters: Array<{
      id: string;
      name: string;
      state?: string;
      storesTotal: number;
      storesVisited: number;
      lastCheckIn?: string;
      status: 'not_started' | 'in_progress' | 'completed';
    }>;
  }> {
    const params = date ? `?date=${date}` : '';
    return request(`/supervisors/day-status${params}`);
  },

  async getSkuStoreMatrix(params: {
    industryId?: string;
    state?: string;
    date?: string;
  }): Promise<{
    matrix: Array<{
      sku: string;
      productName: string;
      stores: Array<{
        storeId: string;
        storeName: string;
        stockLoja: number;
        stockCD: number;
        lastSale?: string;
        status: 'ok' | 'ruptura' | 'sem_registro' | 'cobertura_baixa';
      }>;
    }>;
    stores: Store[];
    totals: {
      totalSkus: number;
      totalStores: number;
      rupturas: number;
      semRegistro: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params.industryId) searchParams.set('industryId', params.industryId);
    if (params.state) searchParams.set('state', params.state);
    if (params.date) searchParams.set('date', params.date);
    return request(`/tasks/sku-matrix?${searchParams}`);
  },

  async reassignPromoterStore(data: {
    storeId: string;
    fromPromoterId: string;
    toPromoterId: string;
  }): Promise<{ success: boolean }> {
    return request('/supervisors/reassign-store', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
