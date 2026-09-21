import { z } from "zod";
import {
  createCompanyMethodSchema,
  createPaymentMethodSchema,
  listPaymentMethodsQuerySchema,
  setPaymentMethodActiveSchema,
  updatePaymentMethodSchema,
} from "@/shared/schemas/paymentMethodSchemas";
import type { PaymentMethodCode } from "../paymentMethodCatalog";

export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>;
export type SetPaymentMethodActiveDto = z.infer<typeof setPaymentMethodActiveSchema>;
export type CreateCompanyMethodDto = z.infer<typeof createCompanyMethodSchema>;
export type ListPaymentMethodsQuery = z.infer<typeof listPaymentMethodsQuerySchema>;

export type PaymentMethod = {
  methodId: string;
  name: string;
  code?: PaymentMethodCode | string;
  category?: string;
  requiresSourceAccount?: boolean;
  requiresDestination?: boolean;
  requiresOperationReference?: boolean;
  isSystem?: boolean;
  isActive: boolean;
  requiresVoucher?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentMethodPivot = {
  companyMethodId: string;
  methodId: string;
  name: string;
  code?: PaymentMethodCode | string;
  category?: string;
  requiresSourceAccount?: boolean;
  requiresDestination?: boolean;
  requiresOperationReference?: boolean;
  isActive: boolean;
  isDefault?: boolean;
  requiresVoucher?: boolean;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  requiresVoucher?: boolean;
};

