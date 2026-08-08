export type InventoryAlertSetting = {
  id: string | null;
  stockItemId: string;
  warehouseId: string | null;
  minStockAlertQty: number | null;
  alertThresholdDays: number;
  alertEnabled: boolean;
  isDefault: boolean;
  productType?: "PRODUCT" | "MATERIAL" | "SUPPLY";
  historyDays: number;
  coverageDays: number;
  evaluation?: InventoryAlertEvaluation;
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryAlertLevel = "NORMAL" | "PREVENTIVE" | "WARNING" | "URGENT" | "CRITICAL";

export type InventoryAlertEvaluation = {
  history: Array<{ day: string; consumption: number }>;
  totalConsumption: number;
  averageDailyConsumption: number;
  availableStock: number;
  requiredStock: number;
  coverageDays: number | null;
  shortage: number;
  level: InventoryAlertLevel;
};

export type ListInventoryAlertSettingsQuery = {
  stockItemId?: string;
  warehouseId?: string | null;
};

export type UpdateInventoryAlertSettingPayload = {
  warehouseId?: string | null;
  minStockAlertQty?: number | null;
  alertThresholdDays?: number;
  alertEnabled?: boolean;
  historyDays?: number;
  coverageDays?: number;
};
