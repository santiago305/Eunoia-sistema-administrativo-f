import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountType,
  CompanyPaymentAccountUsage,
} from "./types/payment-account.types";

export const getCompanyPaymentAccountTypeLabel = (type: CompanyPaymentAccountType) => {
  const labels: Record<CompanyPaymentAccountType, string> = {
    BANK_ACCOUNT: "Cuenta bancaria",
    CREDIT_CARD: "Tarjeta de credito",
    CASH: "Caja",
    DIGITAL_WALLET: "Billetera digital",
  };
  return labels[type];
};

export const getCompanyPaymentAccountUsageLabel = (usage?: CompanyPaymentAccountUsage) => ({
  OUTFLOW: "Salidas",
  INFLOW: "Ingresos",
  BOTH: "Ingresos y salidas",
} as const)[usage ?? "BOTH"];

export const getCompanyPaymentAccountDisplay = (account?: CompanyPaymentAccount | null) => {
  if (!account) return "-";
  return `${account.maskedLabel || account.name} · ${account.currency}`;
};

export const getCompatibleTreasuryAccountTypes = (paymentMethodCode?: string | null): CompanyPaymentAccountType[] => ({
  CASH: ["CASH"],
  BANK_TRANSFER: ["BANK_ACCOUNT"],
  BANK_DEPOSIT: ["BANK_ACCOUNT", "CASH"],
  CARD: ["CREDIT_CARD"],
  DIGITAL_WALLET: ["DIGITAL_WALLET"],
  CHECK: ["BANK_ACCOUNT"],
} as Record<string, CompanyPaymentAccountType[]>)[(paymentMethodCode ?? "").toUpperCase()] ?? [];

export const isTreasuryAccountOperational = (
  account: CompanyPaymentAccount,
  filters: {
    usage?: CompanyPaymentAccountUsage;
    currency?: CompanyPaymentAccount["currency"] | null;
    paymentMethodCode?: string | null;
    allowedTypes?: CompanyPaymentAccountType[];
  },
) => {
  if (!account.isActive) return false;
  if (filters.currency && account.currency !== filters.currency) return false;
  if (filters.usage && account.usage && account.usage !== "BOTH" && account.usage !== filters.usage) return false;
  const types = filters.allowedTypes?.length
    ? filters.allowedTypes
    : getCompatibleTreasuryAccountTypes(filters.paymentMethodCode);
  return types.length === 0 || types.includes(account.type);
};

