import { useEffect, useMemo, useState } from "react";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import type { CompanyPaymentAccount } from "../types/payment-account.types";
import { getCompanyPaymentAccountDisplay } from "../paymentAccountView";

type Props = {
  companyId?: string | null;
  value?: string | null;
  onChange: (account: CompanyPaymentAccount | null) => void;
  disabled?: boolean;
};

export function CompanyPaymentAccountSelect({ companyId, value, onChange, disabled }: Props) {
  const [accounts, setAccounts] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setAccounts([]);
      return;
    }

    let alive = true;
    setLoading(true);
    listCompanyPaymentAccountsByCompany(companyId)
      .then((items) => {
        if (alive) setAccounts(items.filter((item) => item.isActive));
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

  const selected = useMemo(
    () => accounts.find((account) => account.id === value) ?? null,
    [accounts, value],
  );

  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-black/70">
      Cuenta/tarjeta de empresa
      <select
        className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm font-normal text-black/80 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:bg-black/5"
        value={selected?.id ?? ""}
        disabled={disabled || loading || !companyId}
        onChange={(event) => {
          const account = accounts.find((item) => item.id === event.target.value) ?? null;
          onChange(account);
        }}
      >
        <option value="">{loading ? "Cargando cuentas..." : "Sin cuenta seleccionada"}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {getCompanyPaymentAccountDisplay(account)}
          </option>
        ))}
      </select>
    </label>
  );
}
