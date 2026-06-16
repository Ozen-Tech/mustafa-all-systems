export const NO_PHOTO_INDUSTRY_NOTE = 'Sem foto desta indústria';

export const INDUSTRY_MISS_REASONS = [
  { code: 'NO_STOCK', label: 'Sem estoque / produto' },
  { code: 'NO_MATERIAL', label: 'Sem material no PDV' },
  { code: 'NO_AUTHORIZATION', label: 'Sem autorização' },
  { code: 'STORE_CLOSED', label: 'Loja fechada' },
  { code: 'OTHER', label: 'Sem foto disponível' },
  { code: 'PROMOTER_ERROR', label: 'Outro motivo' },
] as const;

export type IndustryMissReasonCode = (typeof INDUSTRY_MISS_REASONS)[number]['code'];
