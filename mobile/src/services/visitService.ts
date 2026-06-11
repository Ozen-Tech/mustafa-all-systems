import { apiClient } from './apiClient';

export interface CheckInRequest {
  storeId: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
}

export interface CheckOutRequest {
  visitId: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
}

export type IndustryMissReason =
  | 'STORE_CLOSED'
  | 'NO_STOCK'
  | 'NO_AUTHORIZATION'
  | 'NO_MATERIAL'
  | 'PROMOTER_ERROR'
  | 'OTHER';

export interface UploadPhotosRequest {
  visitId: string;
  photos: Array<{
    url: string;
    type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
    latitude?: number;
    longitude?: number;
    industryId?: string;
  }>;
}

export interface PriceResearchRequest {
  visitId: string;
  storeId: string;
  productName: string;
  price: number;
  competitorPrices: Array<{
    competitorName: string;
    price: number;
  }>;
}

export const visitService = {
  async checkIn(data: CheckInRequest) {
    const response = await apiClient.post('/promoters/checkin', data);
    return response.data;
  },

  async checkOut(data: CheckOutRequest) {
    const response = await apiClient.post('/promoters/checkout', data);
    return response.data;
  },

  async justifyMissingIndustries(visitId: string, items: Array<{ industryId: string; reason: IndustryMissReason; note?: string }>) {
    const response = await apiClient.post(`/promoters/visits/${visitId}/justify-missing-industries`, { items });
    return response.data;
  },

  async uploadPhotos(data: UploadPhotosRequest) {
    const response = await apiClient.post('/promoters/photos', data);
    return response.data;
  },

  async getCurrentVisit() {
    const response = await apiClient.get('/promoters/current-visit');
    return response.data;
  },

  async submitPriceResearch(data: PriceResearchRequest) {
    const response = await apiClient.post('/promoters/price-research', data);
    return response.data;
  },

  async getVisits(page = 1, limit = 50) {
    const response = await apiClient.get(`/promoters/visits?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getDailySummary() {
    const response = await apiClient.get('/promoters/daily-summary');
    return response.data;
  },
};
