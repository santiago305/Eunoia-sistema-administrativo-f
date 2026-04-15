import { z } from "zod";
import {
  createCompanyMethodSchema,
  createPaymentMethodSchema,
  createSupplierMethodSchema,
  listPaymentMethodsQuerySchema,
  setPaymentMethodActiveSchema,
  updatePaymentMethodSchema,
} from "@/schemas/paymentMethodSchemas";

export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>;
export type SetPaymentMethodActiveDto = z.infer<typeof setPaymentMethodActiveSchema>;
export type CreateCompanyMethodDto = z.infer<typeof createCompanyMethodSchema>;
export type CreateSupplierMethodDto = z.infer<typeof createSupplierMethodSchema>;
export type ListPaymentMethodsQuery = z.infer<typeof listPaymentMethodsQuerySchema>;

export type PaymentMethod = {
  methodId: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentMethodPivot = {
  methodId: string;
  name: string;
  number?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierMethodRelation = {
  supplierMethodId: string;
  supplierId: string;
  methodId: string;
  methodName: string;
  number?: string | null;
  isActive: boolean;
};

export type PaymentMethodListResponse = {
  items: PaymentMethod[];
  total: number;
  page: number;
  limit: number;
};

export type PaymentMethodGetByIdResponse = {
  type: string;
  message: string;
  data?: PaymentMethod;
};


export type CompanyMethod = {
  companyId: string;
  methodId: string;
  number: string;
};

export type SupplierMethod = {
  supplierMethodId: string;
  supplierId: string;
  methodId: string;
  methodName?: string;
  number?: string | null;
  isActive?: boolean;
};
