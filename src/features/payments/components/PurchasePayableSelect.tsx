import { useEffect, useMemo, useState } from "react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { listAccountPayables } from "@/shared/services/accountsPayableService";
import type { AccountPayable } from "../types/payable.types";

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (payable: AccountPayable | null) => void;
};

const money = (amount: number, currency: string) =>
  `${currency} ${Number(amount ?? 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const labelFor = (payable: AccountPayable) => {
  const description = payable.description?.trim() || payable.purchaseId;
  const due = payable.dueDate ? ` | vence ${payable.dueDate.slice(0, 10)}` : "";
  return `${description} | ${money(payable.amountPending, payable.currency)} pendiente${due}`;
};

export function PurchasePayableSelect({ value, disabled = false, onChange }: Props) {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    listAccountPayables({
      statuses: ["PENDING", "PARTIAL", "OVERDUE"],
      page: 1,
      limit: 50,
    })
      .then((response) => {
        if (!alive) return;
        setPayables(Array.isArray(response.items) ? response.items : []);
      })
      .catch(() => {
        if (!alive) return;
        setPayables([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo(
    () =>
      payables.map((payable) => ({
        value: payable.accountPayableId,
        label: labelFor(payable),
      })),
    [payables],
  );

  return (
    <FloatingSelect
      label="Seleccionar cuenta por pagar"
      name="payment-payable-selector"
      value={value}
      options={options}
      onChange={(nextValue) => {
        onChange(payables.find((payable) => payable.accountPayableId === nextValue) ?? null);
      }}
      placeholder={loading ? "Cargando cuentas..." : "Seleccionar cuenta por pagar"}
      disabled={disabled || loading}
      searchable
      searchPlaceholder="Buscar cuenta por pagar"
      emptyMessage="No hay cuentas pendientes"
      panelWidthMode="min-trigger"
    />
  );
}
