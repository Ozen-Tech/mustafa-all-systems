import { apiClient } from './api';

export interface Industry {
  id: string;
  name: string;
  code: string;
  abbreviation?: string | null;
  isActive?: boolean;
}

export interface FilterOptions {
  states: string[];
  stores: Array<{ id: string; name: string; state: string | null }>;
  promoters: Array<{ id: string; name: string; state: string | null }>;
}

export interface ListFilters {
  storeId?: string;
  promoterId?: string;
  state?: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.append(k, String(v));
  });
  return sp.toString();
}

export const industryOwnerService = {
  async getMe(): Promise<{ industryId: string; industry: Industry }> {
    const { data } = await apiClient.get('/industry-owner/me');
    return data;
  },

  async getFilters(industryId: string, state?: string): Promise<FilterOptions> {
    const { data } = await apiClient.get(
      `/industry-owner/${industryId}/filters?${qs({ state })}`
    );
    return data;
  },

  async getPhotos(industryId: string, filters: ListFilters = {}) {
    const { data } = await apiClient.get(
      `/industry-owner/${industryId}/photos?${qs(filters as any)}`
    );
    return data as { photos: any[]; total: number; page: number; limit: number };
  },

  async getAudit(
    industryId: string,
    opts: { date?: string; state?: string; includeJustified?: boolean } = {}
  ) {
    const { data } = await apiClient.get(
      `/industry-owner/${industryId}/audit?${qs({
        date: opts.date,
        state: opts.state,
        includeJustified: opts.includeJustified === false ? '0' : '1',
      })}`
    );
    return data;
  },

  async getCoverage(
    industryId: string,
    opts: { state?: string; startDate?: string; endDate?: string } = {}
  ) {
    const { data } = await apiClient.get(
      `/industry-owner/${industryId}/coverage?${qs(opts as any)}`
    );
    return data;
  },

  async getMetrics(
    industryId: string,
    opts: { state?: string; startDate?: string; endDate?: string } = {}
  ) {
    const { data } = await apiClient.get(
      `/industry-owner/${industryId}/metrics?${qs(opts as any)}`
    );
    return data;
  },

  exportUrl(
    industryId: string,
    opts: {
      format: 'csv' | 'xlsx' | 'pdf';
      type?: 'audit' | 'coverage';
      date?: string;
      state?: string;
    }
  ) {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const query = qs({
      format: opts.format,
      type: opts.type || 'audit',
      date: opts.date,
      state: opts.state,
    });
    return `${base}/industry-owner/${industryId}/export?${query}`;
  },

  async downloadExport(
    industryId: string,
    opts: {
      format: 'csv' | 'xlsx' | 'pdf';
      type?: 'audit' | 'coverage';
      date?: string;
      state?: string;
    }
  ) {
    const url = `/industry-owner/${industryId}/export?${qs({
      format: opts.format,
      type: opts.type || 'audit',
      date: opts.date,
      state: opts.state,
    })}`;
    const res = await apiClient.get(url, { responseType: 'blob' });
    const ext = opts.format;
    const blob = new Blob([res.data]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${opts.type || 'audit'}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
