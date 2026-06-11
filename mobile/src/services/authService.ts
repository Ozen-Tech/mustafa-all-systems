import { LoginResponse } from '../types';
import apiConfig from '../config/api';
import { apiClient } from './apiClient';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    console.log('🌐 URL da API:', apiConfig.ENDPOINTS.AUTH.LOGIN);
    console.log('📤 Enviando requisição de login...');

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      console.log('✅ Resposta recebida:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro na requisição:', error);
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network request failed')) {
        console.error('❌ Erro de conexão - Verifique se o backend está rodando e a URL está correta');
      }
      throw error;
    }
  },
};
