import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import type { SaleOrder } from "../../types/saleOrder";

type Props = {
  open: boolean;
  order: SaleOrder;
  loading: boolean;
  onClose: () => void;
  onConfirm: (total: number) => void | Promise<void>;
};

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

function parseCorrectedTotal(rawValue: string): {
  total: number | null;
  error: string | null;
} {
  const compactValue = rawValue
    .trim()
    .replace(/\s+/g, "")
    .replace(/^s\/?/i, "");
  if (!compactValue) {
    return { total: null, error: "Ingresa el total correcto del pedido." };
  }

  const normalizedValue =
    compactValue.includes(",") && compactValue.includes(".")
      ? compactValue.replace(/,/g, "")
      : compactValue.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    return {
      total: null,
      error: "Ingresa un importe válido con máximo 2 decimales.",
    };
  }

  const total = Number(normalizedValue);
  if (!Number.isFinite(total) || total <= 0) {
    return { total: null, error: "El total debe ser mayor a 0." };
  }
  if (total > 9999999999.99) {
    return { total: null, error: "El total ingresado es demasiado alto." };
  }
  return { total, error: null };
}

export function CorrectSaleOrderTotalModal({
  open,
  order,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(String(order.total || ""));
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(order.total > 0 ? String(order.total) : "");
      setShowValidation(false);
    }
  }, [open, order.total]);

  const parsedTotal = parseCorrectedTotal(value);
  const pendingAmount = useMemo(
    () =>
      parsedTotal.total !== null
        ? Math.max(parsedTotal.total - Number(order.totalPaid || 0), 0)
        : 0,
    [order.totalPaid, parsedTotal.total],
  );
  const mayInvalidatePaymentState = pendingAmount > 0;
  const confirm = () => {
    if (parsedTotal.total === null) {
      setShowValidation(true);
      return;
    }
    void onConfirm(parsedTotal.total);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={loading}
      title="Corregir total del pedido"
      description="El sistema analizará los pagos, el estado actual y el inventario antes de aplicar el nuevo total."
      className="w-full max-w-lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </SystemButton>
          <SystemButton
            leftIcon={<Calculator className="h-4 w-4" />}
            loading={loading}
            disabled={loading}
            onClick={confirm}
          >
            Analizar y corregir
          </SystemButton>
        </div>
      }
    >
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Total actual</p>
            <p className="font-semibold tabular-nums">
              {money.format(Number(order.total || 0))}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Pagado</p>
            <p className="font-semibold tabular-nums">
              {money.format(Number(order.totalPaid || 0))}
            </p>
          </div>
        </div>

        <FloatingInput
          label="Total correcto"
          name="correct-sale-order-total"
          type="text"
          inputMode="decimal"
          value={value}
          error={showValidation ? (parsedTotal.error ?? undefined) : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            if (showValidation) setShowValidation(false);
          }}
        />

        {parsedTotal.total !== null ? (
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Saldo resultante</span>
              <strong className="tabular-nums">{money.format(pendingAmount)}</strong>
            </div>
          </div>
        ) : null}

        {mayInvalidatePaymentState ? (
          <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Como queda saldo pendiente, se revisará si el pedido atravesó una
              condición de pago total. Si corresponde, volverá automáticamente
              al estado anterior válido y el stock consumido será restaurado y
              reservado.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
