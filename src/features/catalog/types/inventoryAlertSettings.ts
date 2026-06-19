export type InventoryAlertSetting = {
  id: string | null;
  stockItemId: string;
  warehouseId: string | null;
  minStockAlertQty: number | null;
  alertThresholdDays: number;
  alertEnabled: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
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
};
