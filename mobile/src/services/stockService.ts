import { apiClient } from './apiClient';

export interface StoreStockItem {
  id: string;
  industryName: string;
  supplierName: string | null;
  filialCode: string;
  filialName: string;
  productCode: string;
  productName: string;
  qty: number;
  valueRs: number | null;
  idade: number | null;
  dde: number | null;
  status: string | null;
  lowTurn: boolean;
}

export interface StoreStockResponse {
  store: { id: string; name: string; code?: string | null; filialCode?: string | null };
  industries: string[];
  totals: { items: number; rupturas: number; baixoGiro: number };
  items: StoreStockItem[];
}

export const stockService = {
  async getStoreItems(
    storeId: string,
    params: { industryName?: string; search?: string } = {}
  ): Promise<StoreStockResponse> {
    const response = await apiClient.get<StoreStockResponse>(`/stock/stores/${storeId}/items`, {
      params,
    });
    return response.data;
  },
};
