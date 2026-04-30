import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import type { CreditQuota, Payment } from "@/features/purchases/types/purchase";
import type { AfectTypeType, CurrencyType, PaymentFormType, PurchaseOrderStatus, VoucherDocType } from "@/features/purchases/types/purchaseEnums";

export type PurchaseOrderItemEditOutput = {
  poItemId?: string;
  poId?: string;

  // Backend shape: item.sku.sku + item.sku.attributes (+ optional unit)
  sku?: ProductSkuWithAttributes | null;

  unitBase: string;
  equivalence: string;
  factor: number;
  afectType: AfectTypeType;
  quantity: number;
  porcentageIgv: number;
  baseWithoutIgv: number;
  amountIgv: number;
  unitValue: number;
  unitPrice: number;
  purchaseValue: number;

  // Some backends also include a flat skuId/name; treat as optional.
  skuId?: string;
  name?: string;

  // Allow extra fields without breaking the consumer.
  [key: string]: unknown;
};

export type PurchaseOrderDetailOutput = {
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
  totalPaid?: number;
  totalToPay?: number;
  note?: string | null;
  status: PurchaseOrderStatus;
  expectedAt?: string | null;
  dateIssue?: string | null;
  dateExpiration?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  imageProdution?: string[];

  items?: PurchaseOrderItemEditOutput[];
  payments?: Payment[];
  quotas?: CreditQuota[];
};
