import type { CompanyPaymentAccount, CompanyPaymentAccountType } from "./types/payment-account.types";

export const getCompanyPaymentAccountTypeLabel = (type: CompanyPaymentAccountType) => {
  const labels: Record<CompanyPaymentAccountType, string> = {
    BANK_ACCOUNT: "Cuenta bancaria",
    CREDIT_CARD: "Tarjeta de credito",
    CASH: "Caja",
    DIGITAL_WALLET: "Billetera digital",
  };
  return labels[type];
};

export const getCompanyPaymentAccountDisplay = (account?: CompanyPaymentAccount | null) => {
  if (!account) return "-";
  return `${account.maskedLabel || account.name} · ${account.currency}`;
};

