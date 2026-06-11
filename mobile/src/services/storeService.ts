import { apiClient } from './apiClient';

export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface GetStoresResponse {
  stores: Store[];
  hasRoute?: boolean;
  completedStoreIdsToday?: string[];
}

export const storeService = {
  async getStores(): Promise<GetStoresResponse> {
    const response = await apiClient.get<GetStoresResponse>('/promoters/stores');
    return {
      stores: response.data.stores || [],
      hasRoute: response.data.hasRoute,
      completedStoreIdsToday: response.data.completedStoreIdsToday || [],
    };
  },
};
