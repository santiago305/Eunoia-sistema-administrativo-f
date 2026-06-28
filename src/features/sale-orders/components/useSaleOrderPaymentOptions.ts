import { useCallback, useEffect, useMemo, useState } from "react";
import { useCompany } from "@/shared/hooks/useCompany";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse } from "@/shared/common/utils/response";
import { getPaymentMethodsByCompany } from "@/shared/services/paymentMethodService";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import type { PaymentMethodPivot } from "@/features/payment-methods/types/paymentMethod";
import { PaymentTypes } from "@/features/purchases/types/purchaseEnums";
import { getCompanyPaymentAccountDisplay } from "@/features/payments/paymentAccountView";

export function useSaleOrderPaymentOptions() {
  const { company } = useCompany();
  const companyId = company?.companyId ?? "";
  const { showFeedback, clearFeedback } = useFeedbackToast();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPivot[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<Array<{ value: string; label: string }>>([]);

  const loadCompanyMethods = useCallback(
    async (id: string) => {
      clearFeedback();
      try {
        const data = await getPaymentMethodsByCompany(id);
        const normalized = (data ?? []).map((m) => ({
          ...m,
          name: (m.name ?? "").trim().toUpperCase(),
        }));

        normalized.sort((a, b) => {
          const aIsCash = a.name === "EFECTIVO";
          const bIsCash = b.name === "EFECTIVO";
          if (aIsCash && !bIsCash) return -1;
          if (!aIsCash && bIsCash) return 1;
          return a.name.localeCompare(b.name, "es");
        });

        setPaymentMethods(normalized ?? []);
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
        setBankAccountOptions(
          (accounts ?? [])
            .filter((account) => account.isActive)
            .map((account) => ({
              value: account.id,
              label: getCompanyPaymentAccountDisplay(account),
            })),
        );
      } catch {
        showFeedback(errorResponse("No se pudieron cargar las cuentas de pago."));
        setBankAccountOptions([]);
      }
    },
    [clearFeedback, showFeedback],
  );

  useEffect(() => {
    if (!companyId) {
      setPaymentMethods([]);
      setBankAccountOptions([]);
      return;
    }

    void loadCompanyMethods(companyId);
    void loadCompanyBankAccounts(companyId);
  }, [companyId, loadCompanyBankAccounts, loadCompanyMethods]);

  const methodOptions = useMemo(() => {
    const fromApi = (paymentMethods ?? []).map((m) => {
      const label = `${m.name} ${m.number ? `- ${m.number}` : ""}`.trim();
      return { value: label, label };
    });

    if (fromApi.length > 0) return fromApi;

    return [
      { value: PaymentTypes.EFECTIVO, label: "EFECTIVO" },
      { value: PaymentTypes.TRANSFERENCIA, label: "TRANSFERENCIA" },
      { value: PaymentTypes.TARJETA, label: "TARJETA" },
      { value: PaymentTypes.DEPOSITO, label: "DEPÓSITO" },
      { value: PaymentTypes.PLIN, label: "PLIN" },
      { value: PaymentTypes.YAPE, label: "YAPE" },
    ];
  }, [paymentMethods]);

  return { companyId, methodOptions, bankAccountOptions };
}

