/** Campos escalares de Store seguros sem depender de chainId (migration pedidos/metas). */
export const storeSelect = {
  id: true,
  name: true,
  address: true,
  code: true,
  state: true,
  latitude: true,
  longitude: true,
  filialCode: true,
} as const;
