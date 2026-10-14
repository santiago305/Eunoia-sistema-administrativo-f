import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { errorResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { prevalidateIncomeBatch, prevalidateIncomePost, type IncomePostValidation } from "@/shared/services/incomeService";
import type { Income } from "../types/income.types";

type Props = {
  open: boolean;
  payments: Income[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (validation: IncomePostValidation, confirmExcess: boolean) => void | Promise<void>;
};

const money = (amount: number, currency: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);

export function IncomePostConfirmationModal({ open, payments, loading = false, onClose, onConfirm }: Props) {
  const [validation, setValidation] = useState<IncomePostValidation | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmExcess, setConfirmExcess] = useState(false);
  const { showFeedback } = useFeedbackToast();
  const paymentKey = payments.map(({ incomeId, version }) => `${incomeId}:${version}`).sort().join("|");

  useEffect(() => {
    if (!open || !payments.length) { setValidation(null); return; }
    let active = true;
    setChecking(true);
    setConfirmExcess(false);
    const validationRequest = payments.length === 1
      ? prevalidateIncomePost(payments[0])
      : prevalidateIncomeBatch(payments.map(({ incomeId, version }) => ({ id: incomeId, version })));
    void validationRequest
      .then((result) => { if (active) setValidation(result); })
      .catch(() => { if (active) { setValidation(null); showFeedback(errorResponse("No se pudo validar el lote. Actualiza los ingresos e inténtalo de nuevo.")); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [open, paymentKey, showFeedback]);

  const excessWarning = validation?.warnings.some((item) => item.code === "OVERPAYMENT_CONFIRMATION_REQUIRED") ?? false;
  const canConfirm = Boolean(validation?.canPost || (validation && excessWarning && validation.errors.length === 0 && confirmExcess));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={payments.length > 1 ? "Contabilizar ingresos" : "Contabilizar ingreso"}
      description="La prevalidación aplica al lote completo y solo admite una fecha de pago por operación."
      className="w-full max-w-xl"
      preventClose={loading}
      footer={<div className="flex justify-end gap-2"><SystemButton variant="ghost" onClick={onClose} disabled={loading}>Cancelar</SystemButton><SystemButton leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => validation && void onConfirm(validation, confirmExcess)} disabled={!canConfirm || checking || loading} loading={loading || checking}>Contabilizar</SystemButton></div>}
    >
      {checking ? <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Validando estados, permisos, cuentas, montos y fecha...</p> : null}
      {validation ? <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Fecha de pago</dt><dd className="font-semibold">{validation.paymentDate ?? "Varias fechas"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Ingresos</dt><dd className="font-semibold">{validation.count}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Con evidencia</dt><dd className="font-semibold">{validation.withEvidence}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Sin evidencia</dt><dd className="font-semibold">{validation.withoutEvidence}</dd></div>
          {Object.entries(validation.totalsByCurrency).map(([currency, amount]) => <div key={currency}><dt className="text-xs text-muted-foreground">Total {currency}</dt><dd className="font-semibold tabular-nums">{money(amount, currency)}</dd></div>)}
        </dl>
        {validation.errors.map((item, index) => <div key={`${item.incomeId}-${index}`} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><strong>No se puede contabilizar:</strong> {item.message}</div>)}
        {validation.warnings.map((item, index) => <div key={`${item.incomeId}-${index}`} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{item.message}</span></div></div>)}
        {excessWarning && !validation.errors.length ? <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={confirmExcess} onChange={(event) => setConfirmExcess(event.target.checked)} /><span>Confirmo que el excedente se registrará como saldo a favor del cliente.</span></label> : null}
        {!validation.errors.length && !excessWarning && !validation.canPost ? <p className="text-sm text-red-700">No hay ingresos contabilizables en esta selección.</p> : null}
      </div> : null}
    </Modal>
  );
}
