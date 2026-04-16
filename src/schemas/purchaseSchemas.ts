import { z } from "zod";
import {
  CurrencyTypes,
  PaymentFormTypes,
  PurchaseOrderStatuses,
  VoucherDocTypes,
  PaymentTypes,
  AfectType,
} from "@/pages/purchases/types/purchaseEnums";

const uuidSchema = z.string().uuid();

const currencyEnum = z.enum(Object.values(CurrencyTypes) as [string, ...string[]]);
const paymentFormEnum = z.enum(Object.values(PaymentFormTypes) as [string, ...string[]]);
const purchaseStatusEnum = z.enum(Object.values(PurchaseOrderStatuses) as [string, ...string[]]);
const voucherDocEnum = z.enum(Object.values(VoucherDocTypes) as [string, ...string[]]);
const paymentTypeEnum = z.enum(Object.values(PaymentTypes) as [string, ...string[]]);
const afectTypeEnum = z.enum(Object.values(AfectType) as [string, ...string[]]);

export const addPurchaseOrderItemSchema = z.object({
  skuId: uuidSchema,
  afectType: afectTypeEnum,
  quantity: z.number().int().min(1),
  porcentageIgv: z.number().min(0),
  baseWithoutIgv: z.number().min(0),
  amountIgv: z.number().min(0),
  unitValue:z.number().min(0),
  unitPrice: z.number().min(0),
  purchaseValue: z.number().min(0)
});

export const createCreditQuotaSchema = z.object({
  number: z.number().int().min(1),
  expirationDate: z.string().min(1),
  paymentDate: z.string().min(1).optional(),
  totalToPay: z.number().min(0.01),
  totalPaid: z.number().min(0).optional(),
  poId: uuidSchema.optional(),
});

export const createPaymentSchema = z.object({
  method: paymentTypeEnum,
  date: z.string().min(1),
  operationNumber: z.string().min(1).optional(),
  currency: currencyEnum,
  amount: z.number().min(0.01),
  note: z.string().optional(),
  quotaId: uuidSchema.optional(),
  poId: uuidSchema.optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: uuidSchema,
  warehouseId: uuidSchema,
  documentType: voucherDocEnum,
  serie: z.string().min(1),
  correlative: z.number().int(),
  currency: currencyEnum,
  paymentForm: paymentFormEnum,
  creditDays: z.number().int().min(0).optional(),
  numQuotas: z.number().int().min(0).optional(),
  totalTaxed: z.number().min(0),
  totalExempted: z.number().min(0),
  totalIgv: z.number().min(0),
  purchaseValue: z.number().min(0),
  total: z.number().min(0),
  note: z.string().optional(),
  status: purchaseStatusEnum,
  expectedAt: z.string().min(1).optional(),
  dateIssue: z.string().min(1).optional(),
  dateExpiration: z.string().min(1).optional(),
  items: z.array(addPurchaseOrderItemSchema),
  payments: z.array(createPaymentSchema),
  quotas: z.array(createCreditQuotaSchema),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

export const setPurchaseOrderActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listPurchaseOrdersQuerySchema = z.object({
  status: purchaseStatusEnum.optional(),
  supplierId: uuidSchema.optional(),
  warehouseId: uuidSchema.optional(),
  documentType: voucherDocEnum.optional(),
  number: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});


