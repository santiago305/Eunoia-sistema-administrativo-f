import type { CompanyPaymentAccountType } from "./types/payment-account.types";

export const PAYMENT_ACCOUNT_COMPATIBILITY: Record<string, CompanyPaymentAccountType[]> = {
  CASH: ["CASH"],
  BANK_TRANSFER: ["BANK_ACCOUNT"],
  BANK_DEPOSIT: ["BANK_ACCOUNT", "CASH"],
  CARD: ["CREDIT_CARD"],
  DIGITAL_WALLET: ["DIGITAL_WALLET"],
  CHECK: ["BANK_ACCOUNT"],
};

export const getCompatibleTreasuryAccountTypes = (paymentMethodCode?: string | null) =>
  PAYMENT_ACCOUNT_COMPATIBILITY[(paymentMethodCode ?? "").toUpperCase()] ?? [];
