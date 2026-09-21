import type { CurrencyType } from "@/features/purchases/types/purchaseEnums";

export type CompanyPaymentAccountType = "BANK_ACCOUNT" | "CREDIT_CARD" | "CASH" | "DIGITAL_WALLET";
export type CompanyPaymentAccountUsage = "OUTFLOW" | "INFLOW" | "BOTH";

export type CompanyPaymentAccount = {
  id: string;
  companyId: string;
  type: CompanyPaymentAccountType;
  usage?: CompanyPaymentAccountUsage;
  name: string;
  institutionName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountLastFour?: string | null;
  cci?: string | null;
  cciLastFour?: string | null;
  cardLastFour?: string | null;
  walletProvider?: string | null;
  walletName?: string | null;
  walletPhone?: string | null;
  walletPhoneLastFour?: string | null;
  holderName?: string | null;
  currency: CurrencyType;
  isActive: boolean;
  isDefault?: boolean;
  maskedLabel: string;
};

export type CreateCompanyPaymentAccountDto = {
  companyId: string;
  type: CompanyPaymentAccountType;
  usage?: CompanyPaymentAccountUsage;
  name: string;
  institutionName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  cci?: string | null;
  cardLastFour?: string | null;
  walletProvider?: string | null;
  walletName?: string | null;
  walletPhone?: string | null;
  holderName?: string | null;
  currency: CurrencyType;
  isActive?: boolean;
  isDefault?: boolean;
};

export type UpdateCompanyPaymentAccountDto = Partial<Omit<CreateCompanyPaymentAccountDto, "companyId">>;

