import { apiClient } from './apiClient';

export interface PromoterGoalRow {
  goal: {
    id: string;
    period: string;
    metric: 'ORDER_VALUE' | 'ORDER_QTY';
    targetValue: number;
    industry?: { id: string; name: string; code: string } | null;
    chain?: { id: string; name: string; code: string } | null;
    store?: { id: string; name: string } | null;
  };
  realized: number;
  pct: number;
  days?: { elapsed: number; total: number; remaining: number };
}

export const goalService = {
  async getMyGoals(period?: string): Promise<{ period: string; rows: PromoterGoalRow[] }> {
    const { data } = await apiClient.get('/promoters/goals', {
      params: period ? { period } : undefined,
    });
    return {
      period: data.period,
      rows: data.rows || [],
    };
  },
};

export function formatGoalValue(metric: 'ORDER_VALUE' | 'ORDER_QTY', value: number): string {
  if (metric === 'ORDER_VALUE') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return value.toLocaleString('pt-BR');
}
