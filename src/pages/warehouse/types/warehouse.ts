import { createWarehouseSchema, updateWarehouseSchema, updateWarehouseActiveSchema, listWarehousesQuerySchema } from "@/schemas/warehouseSchema";
import { z } from "zod";


export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>;
export type UpdateWarehouseActiveDto = z.infer<typeof updateWarehouseActiveSchema>;
export type ListWarehousesQuery = z.infer<typeof listWarehousesQuerySchema>;

export type Warehouse = {
  warehouseId: string; 
  name: string;
  department: string;
  province: string;
  district: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseSelectOption = { value: string; label: string };

export type WarehouseListResponse = {
  items: Warehouse[];
  total: number;
  page: number;
  limit: number;
};

export type WarehouseLocation = {
  locationId: string;
  code: string;
  description?: string;
};

export enum DocType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  PRODUCTION = 'PRODUCTION'
}
export enum DocStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export type WarehouseLocationsResponse = {
  locations: WarehouseLocation[];
};

export type WarehouseOption = { warehouseId: string; name: string };


