import { useEffect, useMemo, useState } from "react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import type { CompanyPaymentAccount } from "../types/payment-account.types";
import { getCompanyPaymentAccountDisplay } from "../paymentAccountView";

type Props = {
  companyId?: string | null;
  value?: string | null;
  onChange: (account: CompanyPaymentAccount | null) => void;
  disabled?: boolean;
  label?: string;
  name?: string;
  className?: string;
};

export function CompanyPaymentAccountSelect({
  companyId,
  value,
  onChange,
  disabled,
  label = "Cuenta/tarjeta de empresa",
  name = "company-payment-account",
  className,
}: Props) {
  const [accounts, setAccounts] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalValue, setInternalValue] = useState("");

  useEffect(() => {
    if (!companyId) {
      setAccounts([]);
      setInternalValue("");
      return;
    }

    let alive = true;
    setLoading(true);
    listCompanyPaymentAccountsByCompany(companyId)
      .then((items) => {
        if (!alive) return;
        setAccounts(items.filter((item) => item.isActive));
      })
      .catch(() => {
        if (alive) setAccounts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [companyId]);

  const effectiveValue = value || internalValue;

  const selected = useMemo(
    () => accounts.find((account) => account.id === effectiveValue) ?? null,
    [accounts, effectiveValue],
  );

  useEffect(() => {
    if (loading || selected || effectiveValue || accounts.length === 0) return;
    const defaultAccount = accounts.find((account) => account.isDefault) ?? accounts[0] ?? null;
    setInternalValue(defaultAccount?.id ?? "");
    onChange(defaultAccount);
  }, [accounts, effectiveValue, loading, onChange, selected]);

  const options = useMemo(
    () => accounts.map((account) => ({
      value: account.id,
      label: getCompanyPaymentAccountDisplay(account),
    })),
    [accounts],
  );

  return (
    <FloatingSelect
      label={label}
      name={name}
      value={selected?.id ?? internalValue}
      onChange={(nextValue) => {
        setInternalValue(nextValue);
        const account = accounts.find((item) => item.id === nextValue) ?? null;
        onChange(account);
      }}
      options={options}
      placeholder={loading ? "Cargando cuentas..." : "Sin cuenta seleccionada"}
      disabled={disabled || loading || !companyId}
      searchable={false}
      className={className}
    />
  );
}
