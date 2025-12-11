import { apiClient, apiConfig } from './api';

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

export const industryService = {
  async getPromoterIndustries(promoterId?: string): Promise<IndustryAssignment[]> {
    try {
      // Se não tiver promoterId, usar o endpoint que busca pelo token do usuário logado
      const endpoint = promoterId 
        ? `/industry-assignments/promoter/${promoterId}`
        : '/industry-assignments/promoter/me';
      const response = await apiClient.get(endpoint);
      return response.data.assignments || [];
    } catch (error) {
      console.error('Error fetching promoter industries:', error);
      throw error;
    }
  },

  async associatePhotoToIndustry(data: {
    photoId: string;
    industryId: string;
    visitId: string;
  }): Promise<any> {
    try {
      const response = await apiClient.post('/photo-industries/associate', data);
      return response.data;
    } catch (error) {
      console.error('Error associating photo to industry:', error);
      throw error;
    }
  },
};
