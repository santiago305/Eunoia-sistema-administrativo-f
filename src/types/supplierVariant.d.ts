import { z } from "zod";
import {
  createSupplierVariantSchema,
  updateSupplierVariantSchema,
  listSupplierVariantsQuerySchema,
} from "@/schemas/supplierVariantSchemas";

export type CreateSupplierVariantDto = z.infer<typeof createSupplierVariantSchema>;
export type UpdateSupplierVariantDto = z.infer<typeof updateSupplierVariantSchema>;
export type ListSupplierVariantsQuery = z.infer<typeof listSupplierVariantsQuerySchema>;

export type SupplierVariant = {
  supplierId: string;
  variantId: string;
  supplierSku?: string | null;
  lastCost?: number | null;
  leadTimeDays?: number | null;
};

export type SupplierVariantListResponse = {
  items: SupplierVariant[];
  total: number;
  page: number;
  limit: number;
};
