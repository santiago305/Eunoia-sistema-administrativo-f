import { z } from "zod";
import {
  CurrencyTypes,
  PaymentFormTypes,
  PurchaseOrderStatuses,
  VoucherDocTypes,
  PaymentTypes,
  AfectType,
} from "@/features/purchases/types/purchaseEnums";
import {
  PurchaseItemTypes,
  PurchasePaymentStatuses,
  PurchaseTypes,
  ReceptionStatuses,
} from "@/features/purchases/types/purchase-classification.types";

const uuidSchema = z.string().uuid();

const currencyEnum = z.enum(Object.values(CurrencyTypes) as [string, ...string[]]);
const paymentFormEnum = z.enum(Object.values(PaymentFormTypes) as [string, ...string[]]);
const purchaseStatusEnum = z.enum(Object.values(PurchaseOrderStatuses) as [string, ...string[]]);
const voucherDocEnum = z.enum(Object.values(VoucherDocTypes) as [string, ...string[]]);
const paymentTypeEnum = z.enum(Object.values(PaymentTypes) as [string, ...string[]]);
const afectTypeEnum = z.enum(Object.values(AfectType) as [string, ...string[]]);
const purchaseTypeEnum = z.enum(Object.values(PurchaseTypes) as [string, ...string[]]);
const purchaseItemTypeEnum = z.enum(Object.values(PurchaseItemTypes) as [string, ...string[]]);
const receptionStatusEnum = z.enum(Object.values(ReceptionStatuses) as [string, ...string[]]);
const purchasePaymentStatusEnum = z.enum(Object.values(PurchasePaymentStatuses) as [string, ...string[]]);
const purchaseSearchFieldEnum = z.enum([
  "supplierId",
  "warehouseId",
  "status",
  "documentType",
  "paymentForm",
  "number",
  "total",
  "totalPaid",
  "totalToPay",
  "waitTime",
  "dateIssue",
  "expectedAt",
]);
const purchaseSearchOperatorEnum = z.enum([
  "in",
  "contains",
  "eq",
  "gt",
  "gte",
  "lt",
  "lte",
  "on",
  "before",
  "after",
  "between",
  "onOrBefore",
  "onOrAfter",
]);
const purchaseSearchRuleSchema = z.object({
  field: purchaseSearchFieldEnum,
  operator: purchaseSearchOperatorEnum,
  mode: z.enum(["include", "exclude"]).optional(),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
  range: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
});

export const addPurchaseOrderItemSchema = z.object({
  skuId: uuidSchema.optional(),
  stockItemId: uuidSchema.optional(),
  itemType: purchaseItemTypeEnum.optional(),
  internalMaterialId: uuidSchema.optional(),
  assetCategoryId: uuidSchema.optional(),
  serviceName: z.string().min(1).optional(),
  description: z.string().optional(),
  warehouseId: uuidSchema.optional(),
  affectsStock: z.boolean().optional(),
  generatesAsset: z.boolean().optional(),
  isService: z.boolean().optional(),
  isSubscription: z.boolean().optional(),
  unitBase: z.string().min(1).optional(),
  equivalence: z.string().min(1).optional(),
  factor: z.number().min(0).optional(),
  afectType: afectTypeEnum,
  quantity: z.number().min(0.001),
  porcentageIgv: z.number().min(0),
  baseWithoutIgv: z.number().min(0),
  amountIgv: z.number().min(0),
  unitValue:z.number().min(0),
  unitPrice: z.number().min(0),
  purchaseValue: z.number().min(0)
}).superRefine((item, ctx) => {
  const itemType = item.itemType ?? PurchaseItemTypes.PRODUCT;
  const noStockItemTypes: string[] = [PurchaseItemTypes.SERVICE, PurchaseItemTypes.SUBSCRIPTION];
  const affectsStock = item.affectsStock ?? !noStockItemTypes.includes(itemType);
  if (affectsStock && !item.skuId && !item.stockItemId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["skuId"],
      message: "Debe seleccionar SKU o stockItem en items que afectan stock",
    });
  }
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
  warehouseId: uuidSchema.optional(),
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
  purchaseType: purchaseTypeEnum.optional(),
  receptionStatus: receptionStatusEnum.optional(),
  paymentStatus: purchasePaymentStatusEnum.optional(),
  isRecurringSource: z.boolean().optional(),
  recurringTemplateId: uuidSchema.optional(),
  requiresReceipt: z.boolean().optional(),
  requiresStockEntry: z.boolean().optional(),
  requiresAssetCreation: z.boolean().optional(),
  expectedAt: z.string().min(1).optional(),
  dateIssue: z.string().min(1).optional(),
  dateExpiration: z.string().min(1).optional(),
  items: z.array(addPurchaseOrderItemSchema),
  payments: z.array(createPaymentSchema),
  quotas: z.array(createCreditQuotaSchema),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

export const listPurchaseOrdersQuerySchema = z.object({
  status: purchaseStatusEnum.optional(),
  statuses: z.array(purchaseStatusEnum).optional(),
  supplierId: uuidSchema.optional(),
  supplierIds: z.array(uuidSchema).optional(),
  warehouseId: uuidSchema.optional(),
  warehouseIds: z.array(uuidSchema).optional(),
  documentType: voucherDocEnum.optional(),
  documentTypes: z.array(voucherDocEnum).optional(),
  paymentForms: z.array(paymentFormEnum).optional(),
  number: z.string().optional(),
  q: z.string().optional(),
  filters: z.array(purchaseSearchRuleSchema).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});


