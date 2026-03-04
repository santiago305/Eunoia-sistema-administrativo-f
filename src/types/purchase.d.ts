import { z } from "zod";
import {
  addPurchaseOrderItemSchema,
  createCreditQuotaSchema,
  createPaymentSchema,
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  setPurchaseOrderActiveSchema,
  updatePurchaseOrderSchema,
} from "@/schemas/purchaseSchemas";
import type {
  AfectTypeType,
  CurrencyType,
  PaymentFormType,
  PaymentType,
  PurchaseOrderStatus,
  VoucherDocType,
} from "@/types/purchaseEnums";

export type AddPurchaseOrderItemDto = z.infer<typeof addPurchaseOrderItemSchema>;
export type CreateCreditQuotaDto = z.infer<typeof createCreditQuotaSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderDto = z.infer<typeof updatePurchaseOrderSchema>;
export type UpdatePurchaseOrderActiveDto = z.infer<typeof setPurchaseOrderActiveSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;

export type PurchaseOrderItem = {
  stockItemId: string,
  unitBase:string,
  equivalence:string,
  factor:number,
  afectType: AfectTypeType,
  quantity: number,
  porcentageIgv: number,
  baseWithoutIgv: number,
  amountIgv: number,
  unitValue:number,
  unitPrice: number,
  purchaseValue: number
};

export type PurchaseOrder = {
  poId?: string;
  supplierId: string;
  warehouseId: string;
  documentType: VoucherDocType;
  serie: string;
  correlative?: number;
  currency: CurrencyType;
  paymentForm: PaymentFormType;
  creditDays?: number | null;
  numQuotas?: number | null;
  totalTaxed: number;
  totalExempted: number;
  totalIgv: number;
  purchaseValue: number;
  total: number;
  note?: string | null;
  status: PurchaseOrderStatus;
  expectedAt?: string | null;
  dateIssue?: string | null;
  dateExpiration?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  items?: PurchaseOrderItem[];
  payments?: Payment[];
  quotas?: CreditQuota[];
};

export type Payment = {
  paymentId?: string;
  method: PaymentType;
  date: string;
  operationNumber?: string | null;
  currency: CurrencyType;
  amount: number;
  note?: string | null;
  quotaId?: string | null;
  poId?: string | null;
};

export type CreditQuota = {
  quotaId?: string;
  number: number;
  expirationDate: string;
  paymentDate?: string | null;
  totalToPay: number;
  totalPaid?: number | null;
  poId?: string | null;
};

export type PurchaseOrderListResponse = {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseOrderItemsResponse = PurchaseOrderItem[];
