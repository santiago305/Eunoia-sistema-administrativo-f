// src/types/warehouse.d.ts
import { z } from "zod";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  updateWarehouseActiveSchema,
  listWarehousesQuerySchema,
} from "@/schemas/warehouseSchemas";

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

export type WarehouseLocationsResponse = {
  locations: WarehouseLocation[];
};

export type WarehouseOption = { warehouseId: string; name: string };
