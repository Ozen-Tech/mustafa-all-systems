import { apiClient, apiConfig } from './api';

export interface Information {
  id: string;
  title: string;
  content: string;
  type: 'estoque' | 'produto' | 'geral';
  geminiSummary?: string;
  sourceData?: any;
  industry?: {
    id: string;
    name: string;
    code: string;
  };
  store?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export const informationService = {
  async getInformationForPromoter(industryId?: string): Promise<Information[]> {
    try {
      const params = industryId ? { industryId } : {};
      const response = await apiClient.get('/information/promoter', { params });
      return response.data.informations || [];
    } catch (error) {
      console.error('Error fetching information:', error);
      throw error;
    }
  },

  async askQuestion(question: string, data: any[]): Promise<string> {
    try {
      // Esta função será implementada no backend
      const response = await apiClient.post('/information/ask', {
        question,
        data,
      });
      return response.data.answer;
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  },
};

