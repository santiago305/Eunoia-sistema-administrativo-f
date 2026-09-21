import { useCallback, useEffect, useMemo, useState } from "react";
import { useCompany } from "@/shared/hooks/useCompany";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse } from "@/shared/common/utils/response";
import { getPaymentMethodsByCompany } from "@/shared/services/paymentMethodService";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import type { PaymentMethodPivot } from "@/features/payment-methods/types/paymentMethod";
import { PaymentTypes } from "@/features/purchases/types/purchaseEnums";
import { getCompanyPaymentAccountDisplay, getCompatibleTreasuryAccountTypes } from "@/features/payments/paymentAccountView";
import type { CompanyPaymentAccount, CompanyPaymentAccountType } from "@/features/payments/types/payment-account.types";

export type SaleOrderPaymentSelectOption = {
  value: string;
  label: string;
  paymentMethodCode?: string;
  accountType?: CompanyPaymentAccountType;
};

type UseSaleOrderPaymentOptionsConfig = {
  enabled?: boolean;
};

const normalizePaymentMethods = (paymentMethods: PaymentMethodPivot[]) => {
  const normalized = (paymentMethods ?? []).map((method) => ({
    ...method,
    name: (method.name ?? "").trim().toUpperCase(),
  }));

  normalized.sort((left, right) => {
    const leftIsCash = left.name === "EFECTIVO";
    const rightIsCash = right.name === "EFECTIVO";
    if (leftIsCash && !rightIsCash) return -1;
    if (!leftIsCash && rightIsCash) return 1;
    return left.name.localeCompare(right.name, "es");
  });

  return normalized;
};

export const buildSaleOrderPaymentMethodOptions = (
  paymentMethods: PaymentMethodPivot[],
): SaleOrderPaymentSelectOption[] => {
  const fromApi = normalizePaymentMethods(paymentMethods).map((method) => ({
    value: method.methodId,
    label: method.name,
    paymentMethodCode: method.code,
  }));

  if (fromApi.length > 0) return fromApi;

  return [
    { value: PaymentTypes.EFECTIVO, label: "EFECTIVO", paymentMethodCode: "CASH" },
    { value: PaymentTypes.TRANSFERENCIA, label: "TRANSFERENCIA", paymentMethodCode: "BANK_TRANSFER" },
    { value: PaymentTypes.TARJETA, label: "TARJETA", paymentMethodCode: "CARD" },
    { value: PaymentTypes.DEPOSITO, label: "DEPOSITO", paymentMethodCode: "BANK_DEPOSIT" },
    { value: PaymentTypes.PLIN, label: "PLIN", paymentMethodCode: "DIGITAL_WALLET" },
    { value: PaymentTypes.YAPE, label: "YAPE", paymentMethodCode: "DIGITAL_WALLET" },
  ];
};

export const buildSaleOrderBankAccountOptions = (
  accounts: CompanyPaymentAccount[],
): SaleOrderPaymentSelectOption[] =>
  (accounts ?? [])
    .filter((account) => account.isActive && (!account.usage || account.usage === "INFLOW" || account.usage === "BOTH"))
    .map((account) => ({
      value: account.id,
      label: getCompanyPaymentAccountDisplay(account),
      accountType: account.type,
    }));

export const filterSaleOrderBankAccountOptions = (
  accounts: SaleOrderPaymentSelectOption[],
  paymentMethodCode?: string | null,
): SaleOrderPaymentSelectOption[] => {
  const compatibleTypes = getCompatibleTreasuryAccountTypes(paymentMethodCode);
  if (compatibleTypes.length === 0) return accounts;
  return accounts.filter(
    (account) => !account.accountType || compatibleTypes.includes(account.accountType),
  );
};

export function useSaleOrderPaymentOptions({
  enabled = true,
}: UseSaleOrderPaymentOptionsConfig = {}) {
  const { company } = useCompany();
  const companyId = company?.companyId ?? "";
  const { showFeedback, clearFeedback } = useFeedbackToast();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPivot[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<SaleOrderPaymentSelectOption[]>([]);

  const loadCompanyMethods = useCallback(
    async (id: string) => {
      clearFeedback();
      try {
        const data = await getPaymentMethodsByCompany(id);
        setPaymentMethods(normalizePaymentMethods(data ?? []));
      } catch {
        showFeedback(errorResponse("No se pudieron cargar los metodos de pago."));
      }
    },
    [clearFeedback, showFeedback],
  );

  const loadCompanyBankAccounts = useCallback(
    async (id: string) => {
      clearFeedback();
      try {
        const accounts = await listCompanyPaymentAccountsByCompany(id);
        setBankAccountOptions(buildSaleOrderBankAccountOptions(accounts ?? []));
      } catch {
        showFeedback(errorResponse("No se pudieron cargar las cuentas de pago."));
        setBankAccountOptions([]);
      }
    },
    [clearFeedback, showFeedback],
  );

  useEffect(() => {
    if (!enabled || !companyId) {
      setPaymentMethods([]);
      setBankAccountOptions([]);
      return;
    }

    void loadCompanyMethods(companyId);
    void loadCompanyBankAccounts(companyId);
  }, [companyId, enabled, loadCompanyBankAccounts, loadCompanyMethods]);

  const methodOptions = useMemo(
    () => buildSaleOrderPaymentMethodOptions(paymentMethods),
    [paymentMethods],
  );

  return { companyId, methodOptions, bankAccountOptions };
}
