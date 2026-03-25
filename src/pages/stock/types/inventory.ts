export type GetStockQuery = {
  warehouseId: string;
  itemId: string;
  locationId?: string;
};

export type GetStockResponse = Record<string, unknown>;
