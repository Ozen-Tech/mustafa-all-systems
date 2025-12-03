// Configuração da API
// URL padrão para produção: https://promo-gestao-backend.onrender.com/api
// Em desenvolvimento local, use .env com EXPO_PUBLIC_API_URL

// Prioridade: 1. process.env (desenvolvimento), 2. URL de produção (padrão)
const API_URL = 
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) 
    ? process.env.EXPO_PUBLIC_API_URL 
    : 'https://promo-gestao-backend.onrender.com/api'; // URL de produção como padrão

// Log da URL configurada (apenas em desenvolvimento)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('🔧 Configuração da API:');
  console.log('   EXPO_PUBLIC_API_URL:', process.env?.EXPO_PUBLIC_API_URL || 'NÃO DEFINIDO - usando produção');
  console.log('   API_URL final:', API_URL);
}

export default {
  BASE_URL: API_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: `${API_URL}/auth/login`,
      REFRESH: `${API_URL}/auth/refresh`,
    },
    PROMOTER: {
      STORES: `${API_URL}/promoters/stores`,
      CHECKIN: `${API_URL}/promoters/checkin`,
      CHECKOUT: `${API_URL}/promoters/checkout`,
      PHOTOS: `${API_URL}/promoters/photos`,
      PRICE_RESEARCH: `${API_URL}/promoters/price-research`,
      CURRENT_VISIT: `${API_URL}/promoters/current-visit`,
    },
    UPLOAD: {
      PHOTO: `${API_URL}/upload/photo`,
    },
  },
};
