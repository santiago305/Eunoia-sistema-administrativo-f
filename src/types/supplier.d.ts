import { z } from "zod";
import {
  createSupplierSchema,
  updateSupplierSchema,
  updateSupplierActiveSchema,
  listSuppliersQuerySchema,
} from "@/schemas/supplierSchemas";
import { DocumentType } from "./DocumentType";

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;
export type UpdateSupplierActiveDto = z.infer<typeof updateSupplierActiveSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;

export type Supplier = {
  supplierId: string;
  documentType: DocumentType;
  documentNumber: string;
  name?: string | null;
  lastName?: string | null;
  tradeName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  leadTimeDays?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierForm = {
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  lastName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  note: string;
  leadTimeDays: string;
  isActive: boolean;
};

export type SupplierListResponse = {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
};

export type SupplierIdentityLookupResult = {
  documentType: string;
  documentNumber: string;
  data: SupplierDniLookupData | SupplierRucLookupData | null;
};

export type SupplierDniLookupData = {
  name?: string;
  lastName?: string;
};

export type SupplierRucLookupData = {
  tradeName?: string;
  address?: string;
  ubigueo?: string;
};
