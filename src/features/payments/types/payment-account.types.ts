import type { CurrencyType } from "@/features/purchases/types/purchaseEnums";

export type CompanyPaymentAccountType = "BANK_ACCOUNT" | "CREDIT_CARD" | "CASH" | "DIGITAL_WALLET";

export type CompanyPaymentAccount = {
  id: string;
  companyId: string;
  type: CompanyPaymentAccountType;
  name: string;
  bankName?: string | null;
  accountLastFour?: string | null;
  cardLastFour?: string | null;
  walletName?: string | null;
  currency: CurrencyType;
  isActive: boolean;
  maskedLabel: string;
};

export type CreateCompanyPaymentAccountDto = {
  companyId: string;
  type: CompanyPaymentAccountType;
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  cardLastFour?: string | null;
  walletName?: string | null;
  currency: CurrencyType;
  isActive?: boolean;
};

export type UpdateCompanyPaymentAccountDto = Partial<Omit<CreateCompanyPaymentAccountDto, "companyId">>;

