import { apiClient } from './apiClient';

export interface Store {
  id: string;
  name: string;
  address: string;
  state?: string | null;
  code?: string | null;
  latitude: number;
  longitude: number;
}

export interface GetStoresResponse {
  stores: Store[];
  hasRoute?: boolean;
  completedStoreIdsToday?: string[];
}

export interface OnboardingStatus {
  needsGeneralOnboarding: boolean;
  needsIndustries: boolean;
  needsStores: boolean;
  industries: Array<{ id: string; name: string; code: string; isActive?: boolean }>;
  stores: Store[];
  availableStores: Store[];
  promoterState: string | null;
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

  async getOnboarding(): Promise<OnboardingStatus> {
    const response = await apiClient.get<OnboardingStatus>('/promoters/me/onboarding');
    return response.data;
  },

  async setMyRoute(storeIds: string[]): Promise<{ stores: Store[] }> {
    const response = await apiClient.put('/promoters/me/route', { storeIds });
    return response.data;
  },
};
