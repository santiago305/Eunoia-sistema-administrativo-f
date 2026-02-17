import { z } from "zod";
import {
  createLocationSchema,
  updateLocationSchema,
  updateLocationActiveSchema,
  listLocationsQuerySchema,
} from "@/schemas/locationSchemas";

export type CreateLocationDto = z.infer<typeof createLocationSchema>;
export type UpdateLocationDto = z.infer<typeof updateLocationSchema>;
export type UpdateLocationActiveDto = z.infer<typeof updateLocationActiveSchema>;
export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>;

export type Location = {
  locationId: string;     // en backend es "id", pero tu API ya puede mapearlo. Si no, ver nota abajo.
  warehouseId: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LocationsListResponse = {
  items: Location[];
  total: number;
  page: number;
  limit: number;
};

export type LocationForm = {
    warehouseId: string;
    code: string;
    description: string;
    isActive: boolean;
};