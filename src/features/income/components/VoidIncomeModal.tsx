import { useEffect, useRef, useState } from "react";
import { Ban } from "lucide-react";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import type { Income } from "../types/income.types";

type Props = {
  open: boolean;
  income: Income | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value || 0);

const QUICK_REASONS = [
  "Pago duplicado",
  "Monto incorrecto",
  "Pedido incorrecto",
  "Operación inexistente",
];

export function VoidIncomeModal({ open, income, loading = false, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open, income?.incomeId]);

  const confirm = () => {
    const normalized = reason.trim();
    if (normalized.length < 5) {
      setError("Ingresa un motivo de al menos 5 caracteres.");
      reasonRef.current?.focus();
      return;
    }
    if (normalized.length > 500) {
      setError("El motivo no puede superar los 500 caracteres.");
      reasonRef.current?.focus();
      return;
    }
    onConfirm(normalized);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Anular ingreso"
      description="La operación no puede deshacerse y el saldo del pedido será recalculado."
      className="w-full max-w-lg"
      preventClose={loading}
      initialFocusRef={reasonRef}
      footer={(
        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <SystemButton variant="ghost" onClick={onClose} disabled={loading}>Cancelar</SystemButton>
          <SystemButton variant="danger" leftIcon={<Ban className="h-4 w-4" />} onClick={confirm} loading={loading}>
            Anular ingreso
          </SystemButton>
        </div>
      )}
    >
      {income ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Pedido</dt><dd className="font-semibold">{income.saleOrderNumber}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Cliente</dt><dd className="truncate font-medium" title={income.clientName}>{income.clientName}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Monto</dt><dd className="font-semibold tabular-nums">{money(income.amount)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Método</dt><dd className="font-medium">{income.method || "Sin método"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Operación</dt><dd className="font-medium">{income.operationNumber || "Sin número"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Cuenta</dt><dd className="truncate font-medium" title={income.companyPaymentAccountLabel ?? "Sin cuenta"}>{income.companyPaymentAccountLabel ?? "Sin cuenta"}</dd></div>
          </dl>
          <FloatingTextarea
            ref={reasonRef}
            label="Motivo de anulación"
            name="income-void-reason"
            value={reason}
            error={error}
            rows={4}
            maxLength={500}
            onChange={(event) => { setReason(event.target.value); if (error) setError(""); }}
          />
          <div className="flex flex-wrap gap-2" aria-label="Motivos frecuentes">
            {QUICK_REASONS.map((quickReason) => (
              <button
                key={quickReason}
                type="button"
                className="min-h-11 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => {
                  setReason(quickReason);
                  setError("");
                  reasonRef.current?.focus();
                }}
              >
                {quickReason}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">La evidencia y los datos originales se conservarán para auditoría.</p>
        </div>
      ) : null}
    </Modal>
  );
}
