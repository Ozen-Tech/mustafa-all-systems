import { apiClient } from './apiClient';

export type TrailStatus = 'done' | 'skipped' | 'active' | 'pending';
export type StoreDaySkipReason = 'STORE_CLOSED' | 'NO_TIME' | 'REDIRECTED' | 'OTHER';

export interface DayBoardIndicator {
  label: string;
  done: number;
  total: number;
  detail: string;
  complete: boolean;
}

export interface DayBoardTrailItem {
  storeId: string;
  storeName: string;
  address: string;
  order: number;
  status: TrailStatus;
  skipReason: string | null;
}

export interface DayBoardNextAction {
  type: 'continue_visit' | 'go_store' | 'day_closed' | 'no_route' | 'day_absence';
  label: string;
  storeId?: string;
  storeName?: string;
}

export interface DayBoard {
  date: string;
  hasDayAbsence: boolean;
  ring: { resolved: number; total: number; percent: number };
  indicators: {
    stores: DayBoardIndicator;
    industries: DayBoardIndicator;
    onTime: DayBoardIndicator;
    photos?: DayBoardIndicator;
  };
  trail: DayBoardTrailItem[];
  points: number;
  pointsMax: number;
  streakDays: number;
  streakEligible: boolean;
  nextAction: DayBoardNextAction;
  stats: {
    storesDone: number;
    storesSkipped: number;
    storesActive: number;
    storesPending: number;
    photoCount: number;
  };
}

export const SKIP_REASON_LABELS: Record<StoreDaySkipReason, string> = {
  STORE_CLOSED: 'Loja fechada',
  NO_TIME: 'Sem tempo hoje',
  REDIRECTED: 'Redirecionado',
  OTHER: 'Outro',
};

export const dayBoardService = {
  async getDayBoard(): Promise<DayBoard> {
    const response = await apiClient.get<DayBoard>('/promoters/me/day-board');
    return response.data;
  },

  async skipStoreToday(
    storeId: string,
    reason: StoreDaySkipReason,
    note?: string
  ): Promise<void> {
    await apiClient.post(`/promoters/me/stores/${storeId}/skip-today`, {
      reason,
      note,
    });
  },

  async unskipStoreToday(storeId: string): Promise<void> {
    await apiClient.delete(`/promoters/me/stores/${storeId}/skip-today`);
  },
};
