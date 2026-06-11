import { apiClient } from './apiClient';

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
    const params = industryId ? { industryId } : {};
    const response = await apiClient.get('/information/promoter', { params });
    return response.data.informations || [];
  },

  async askQuestion(question: string, data: any[]): Promise<string> {
    const response = await apiClient.post('/information/ask', {
      question,
      data,
    });
    return response.data.answer;
  },
};
