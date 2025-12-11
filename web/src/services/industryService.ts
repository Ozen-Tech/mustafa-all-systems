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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Industry {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    photoIndustries: number;
    industryAssignments: number;
  };
}

export interface CreateIndustryRequest {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateIndustryRequest {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface ListIndustriesResponse {
  industries: Industry[];
}

export interface GetIndustryResponse {
  industry: Industry;
}

export const industryService = {
  async listIndustries(isActive?: boolean): Promise<Industry[]> {
    const params = isActive !== undefined ? { isActive: isActive.toString() } : {};
    const response = await apiClient.get<ListIndustriesResponse>('/industries', { params });
    return response.data.industries;
  },

  async getIndustry(id: string): Promise<Industry> {
    const response = await apiClient.get<GetIndustryResponse>(`/industries/${id}`);
    return response.data.industry;
  },

  async createIndustry(data: CreateIndustryRequest): Promise<Industry> {
    const response = await apiClient.post<GetIndustryResponse>('/industries', data);
    return response.data.industry;
  },

  async updateIndustry(id: string, data: UpdateIndustryRequest): Promise<Industry> {
    const response = await apiClient.put<GetIndustryResponse>(`/industries/${id}`, data);
    return response.data.industry;
  },

  async deleteIndustry(id: string): Promise<void> {
    await apiClient.delete(`/industries/${id}`);
  },

  async getIndustryStats(id: string, startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get(`/industries/${id}/stats`, { params });
    return response.data;
  },

  async getIndustryPhotoCoverage(id: string, startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get(`/industries/${id}/coverage`, { params });
    return response.data;
  },

  async getIndustryCoverage(startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/photo-industries/coverage', { params });
    return response.data;
  },
};

