import type { CurrencyType } from "@/features/purchases/types/purchaseEnums";
import type { CompanyPaymentAccountType } from "./payment-account.types";

export type PaymentFlowSource = "PAYMENTS" | "PAYABLE" | "PURCHASE" | "QUOTA" | "RECURRING";
export type PaymentFlowMode = "IMMEDIATE" | "SCHEDULED";

export type PaymentFlowContext = {
  mode: PaymentFlowMode;
  purchaseId?: string;
  accountPayableId?: string;
  quotaId?: string;
  supplierId?: string;
  recurringTemplateId?: string;
  currency?: CurrencyType;
  suggestedAmount?: number;
  lockObligation?: boolean;
  source: PaymentFlowSource;
};

export type PaymentMethodPolicy = {
  id?: string;
  code: string;
  isActive: boolean;
  requiresSourceAccount: boolean;
  requiresDestination: boolean;
  requiresOperationReference: boolean;
  requiresVoucher: boolean;
  compatibleAccountTypes?: CompanyPaymentAccountType[];
};

export type PaymentContract = {
  source: PaymentFlowSource;
  mode: PaymentFlowMode;
  currency: CurrencyType;
  amount: number;
  paymentMethodId: string;
  companyPaymentAccountId?: string | null;
  supplierPaymentDestinationId?: string | null;
  operationNumber?: string | null;
  paymentEvidenceFileId?: string | null;
};
