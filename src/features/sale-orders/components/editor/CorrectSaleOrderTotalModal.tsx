import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calculator } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import type { CorrectSaleOrderTotalPreview } from "@/shared/services/saleOrderService";
import type { SaleOrder } from "../../types/saleOrder";

type Props = {
  open: boolean;
  order: SaleOrder;
  loading: boolean;
  onClose: () => void;
  onConfirm: (total: number, previewToken: string) => void | Promise<void>;
  onPreview: (total: number) => Promise<CorrectSaleOrderTotalPreview>;
};

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
  onPreview,
}: Props) {
  const [value, setValue] = useState(String(order.total || ""));
  const [showValidation, setShowValidation] = useState(false);
  const [preview, setPreview] = useState<CorrectSaleOrderTotalPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [confirmExcess, setConfirmExcess] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(order.total > 0 ? String(order.total) : "");
      setShowValidation(false);
      setPreview(null);
      setPreviewError(false);
      setConfirmExcess(false);
    }
  }, [open, order.total]);

  const parsedTotal = parseCorrectedTotal(value);
  const currency = preview?.currency ?? order.currency ?? "PEN";
  const money = useMemo(() => new Intl.NumberFormat("es-PE", { style: "currency", currency }), [currency]);
  const pendingAmount = useMemo(
    () => preview?.pendingAmount ?? (parsedTotal.total !== null
      ? Math.max(parsedTotal.total - Number(order.totalPaid || 0), 0)
      : 0),
    [order.totalPaid, parsedTotal.total, preview?.pendingAmount],
  );
  const mayInvalidatePaymentState = pendingAmount > 0;

  useEffect(() => {
    if (!open || parsedTotal.total === null) {
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError(false);
      return;
    }

    let cancelled = false;
    setPreview(null);
    setPreviewError(false);
    setPreviewLoading(true);
    const timeout = window.setTimeout(() => {
      void onPreview(parsedTotal.total!).then((result) => {
        if (!cancelled) setPreview(result);
      }).catch(() => {
        if (!cancelled) setPreviewError(true);
      }).finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, onPreview, parsedTotal.total]);

  const confirm = () => {
    if (parsedTotal.total === null) {
      setShowValidation(true);
      return;
    }
    if (previewLoading || previewError || !preview || (preview.customerCreditCreated > 0 && !confirmExcess)) return;
    void onConfirm(parsedTotal.total, preview.previewToken);
  };
  const confirmDisabled = loading || parsedTotal.total !== null && (
    previewLoading || previewError || !preview || (preview.customerCreditCreated > 0 && !confirmExcess)
  );

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
            disabled={confirmDisabled}
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
            setConfirmExcess(false);
            if (showValidation) setShowValidation(false);
          }}
        />

        {parsedTotal.total !== null && previewLoading ? <p role="status" className="text-sm text-muted-foreground">Calculando el impacto de los ingresos contabilizados…</p> : null}
        {parsedTotal.total !== null && previewError ? <p role="alert" className="text-sm text-rose-700">No se pudo previsualizar el impacto financiero. Cambia el importe y vuelve a intentarlo antes de confirmar.</p> : null}
        {parsedTotal.total !== null && preview ? (
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Importe aplicado al pedido</span><strong className="tabular-nums">{money.format(preview.appliedAmount)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Saldo pendiente resultante</span><strong className="tabular-nums">{money.format(preview.pendingAmount)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Excedente que quedará como saldo a favor</span><strong className="tabular-nums">{money.format(preview.customerCreditCreated)}</strong></div>
              {preview.releasedByIncome.length ? <p className="text-xs text-muted-foreground">El excedente se liberará de {preview.releasedByIncome.length} ingreso(s) contabilizado(s).</p> : null}
              {preview.customerCreditCreated > 0 ? <label className="flex cursor-pointer items-start gap-2 border-t border-border pt-2 text-sm"><input type="checkbox" checked={confirmExcess} onChange={(event) => setConfirmExcess(event.target.checked)} /><span>Confirmo que el excedente se registrará como saldo a favor del cliente.</span></label> : null}
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
