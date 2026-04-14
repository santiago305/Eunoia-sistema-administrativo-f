import { z } from "zod";
import { documentSeriesQuerySchema } from "@/schemas/documentSeriesSchemas";

export type DocumentSeriesQuery = z.infer<typeof documentSeriesQuerySchema>;

export type DocumentSeries = {
  id: string;
  code: string;
  name?: string | null;
  docType?: string;
  warehouseId?: string;
  nextNumber?: number;
  separator?: string;
  padding?: number;
  isActive?: boolean;
  createdAt?: string;
};
