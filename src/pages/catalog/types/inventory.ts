export type StockItemType = "PRODUCT" | "VARIANT" | (string & {});

export type InventoryWarehouseSnapshot = {
  warehouseId: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export type InventoryProductSnapshot = {
  id: string;
  baseUnitId: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  minStock?: number | null;
  attributes?: Record<string, string | number | boolean | null>;
  isActive: boolean;
  type: string;
  createdAt?: string;
  updatedAt?: string | null;
  customSku?: string | null;
};

export type InventoryVariantSnapshot = {
  id: string;
  productId?: string | null;
  name?: string | null;
  sku?: string | null;
  unidad?: string | null;
  barcode?: string | null;
  attributes?: Record<string, string | number | boolean | null>;
  price?: number | null;
  cost?: number | null;
  minStock?: number | null;
  baseUnitId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  customSku?: string | null;
};

export type ProductVariantWithProductInfo = {
  variant: InventoryVariantSnapshot | null;
  productName: string;
  productDescription: string | null;
  baseUnitId?: string;
  unitCode?: string;
  unitName?: string;
};

export type InventoryStockItemSnapshot = {
  id: string;
  type: StockItemType;
  productId?: string | null;
  variantId?: string | null;
  product?: InventoryProductSnapshot | null;
  variant?: ProductVariantWithProductInfo | InventoryVariantSnapshot | null;
};

export type InventorySnapshotOutput = {
  warehouseId: string;
  warehouse?: InventoryWarehouseSnapshot | null;
  stockItemId: string;
  stockItem?: InventoryStockItemSnapshot | null;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
};

export type ListInventoryQuery = {
  page?: number;
  limit?: number;
  warehouseId?: string;
  skuId?: string;
  warehouseIdsIn?: string[];
  warehouseIdsNotIn?: string[];
  skuIdsIn?: string[];
  skuIdsNotIn?: string[];
  itemId?: string;
  stockItemId?: string;
  locationId?: string;
  search?: string;
  q?: string;
  type?: string;
  productType?: string;
};

export type InventoryRow = {
  id: string;
  stockItemId: string;
  sku: string;
  name: string;
  warehouse: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  available: number;
  min: number;
  minStock?: number;
  ideal: number;
  daysRemaining: number | null;
  dailyConsumption: number;
  productType: string | "unknown";
};


export type AvailabilityQuery = {
  warehouseId?: string;
  itemId?: string;
  stockItemId?: string;
  locationId?: string;
};

export type GetStockQuery = {
  warehouseId: string;
  itemId?: string;
  stockItemId?: string;
  locationId?: string;
};

export type InventoryListResponse = {
  items: InventorySnapshotOutput[];
  total: number;
  page: number;
  limit: number;
};

export type AvailabilityResponse = InventorySnapshotOutput[];

export type GetStockResponse = InventorySnapshotOutput | null;

export type SalesTotalsQuery = {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  from?: string;
  to?: string;
  month?: string;
};

export type SalesDailyTotal = {
  day?: string | null;
  date?: string | null;
  salida: number;
};

export type DemandSummaryQuery = {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  from?: string;
  to?: string;
  windowDays?: number;
  horizonDays?: number;
};

export type SalesWeekdayTotal = {
  weekday: number;
  salida: number;
};

export type SalesMonthlyTotal = {
  month: string;
  salida: number;
};

export type MonthlyProjectionMonth = {
  month: string;
  salida: number;
};

export type MonthlyProjectionOutput = {
  months: MonthlyProjectionMonth[];
  xo: MonthlyProjectionMonth | null;
  xu: MonthlyProjectionMonth | null;
  salesActual: MonthlyProjectionMonth | null;
  growthRate: number;
  projectedNextMonth: number;
  monthsCount: number;
};

export type DemandSummaryOutput = {
  avgDaily: number;
  projection: number;
  coverageDays: number | null;
  totalOut: number;
  daysCount: number;
};
