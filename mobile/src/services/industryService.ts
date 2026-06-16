import { apiClient } from './apiClient';

export interface Industry {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface IndustryAssignment {
  id: string;
  industry: Industry;
  store?: {
    id: string;
    name: string;
  };
}

export interface CoverageItem {
  industry: Industry;
  covered: boolean;
  hasPhoto?: boolean;
  justified?: boolean;
  missReason?: string | null;
  missNote?: string | null;
  photoCount: number;
}

export interface CoverageResponse {
  visitId: string;
  storeId: string;
  storeName: string;
  coverage: CoverageItem[];
  pending: CoverageItem[];
  covered: CoverageItem[];
  isComplete: boolean;
  totalRequired: number;
  totalCovered: number;
  percentComplete: number;
}

export const industryService = {
  async getPromoterIndustries(promoterId?: string): Promise<IndustryAssignment[]> {
    const endpoint = promoterId
      ? `/industry-assignments/promoter/${promoterId}`
      : '/industry-assignments/promoter/me';
    const response = await apiClient.get(endpoint);
    return response.data.assignments || [];
  },

  async getStoreIndustries(storeId: string): Promise<Industry[]> {
    try {
      const response = await apiClient.get(`/store-industries/${storeId}?isActive=true`);
      return response.data.industries || [];
    } catch (error) {
      console.error('Error fetching store industries:', error);
      return [];
    }
  },

  async getVisitIndustries(visitId: string): Promise<{
    visitId: string;
    storeId: string;
    needsOnboarding: boolean;
    needsSupervisorAssignment?: boolean;
    industries: Industry[];
  }> {
    const response = await apiClient.get(`/promoters/visits/${visitId}/industries`);
    return response.data;
  },

  async setMyStoreIndustries(storeId: string, industryIds: string[]): Promise<{ industries: Industry[] }> {
    const response = await apiClient.post(`/industry-assignments/me/store/${storeId}`, {
      industryIds,
    });
    return response.data;
  },

  async getVisitCoverage(visitId: string): Promise<CoverageResponse> {
    const response = await apiClient.get(`/promoters/visits/${visitId}/coverage`);
    return response.data;
  },

  async associatePhotoToIndustry(data: {
    photoId: string;
    industryId: string;
    visitId: string;
  }): Promise<any> {
    const response = await apiClient.post('/photo-industries/associate', data);
    return response.data;
  },
};
