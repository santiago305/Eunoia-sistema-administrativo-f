import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, LoaderCircle, Search } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { listIncomeTransferTargets, transferPendingIncome, type IncomeTransferTarget } from "@/shared/services/incomeService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { useAuth } from "@/shared/hooks/useAuth";
import { clearPendingIncomeOperation, savePendingIncomeOperation, type PendingIncomeOperation } from "../services/income-operation-recovery";
import type { Income } from "../types/income.types";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";

type Props = {
  open: boolean;
  income: Income | null;
  onClose: () => void;
  onTransferred: () => void | Promise<void>;
  onTransferUncertain?: (operation: PendingIncomeOperation) => void;
};

const money = (amount: number, currency: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);

export function TransferPendingIncomeModal({ open, income, onClose, onTransferred, onTransferUncertain }: Props) {
  const { showFeedback } = useFeedbackToast();
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<IncomeTransferTarget[]>([]);
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  useEffect(() => {
    if (!open || !income) return;
    setQuery("");
    setTargetId("");
    setReason("");
    setUncertain(false);
  }, [income, open]);

  useEffect(() => {
    if (!open || !income) return;
    let active = true;
    setLoadingTargets(true);
    setLoadError("");
    const timer = window.setTimeout(() => {
      void listIncomeTransferTargets(income.incomeId, query)
        .then((result) => { if (active) { setTargets(result); setTargetId((current) => result.some((item) => item.saleOrderId === current) ? current : ""); } })
        .catch((error) => { if (active) { setTargets([]); setLoadError(parseApiError(error, "No se pudieron cargar pedidos destino.")); } })
        .finally(() => { if (active) setLoadingTargets(false); });
    }, query ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [income, open, query]);

  const selectedTarget = useMemo(() => targets.find((item) => item.saleOrderId === targetId) ?? null, [targetId, targets]);

  const submit = async () => {
    if (!income || !selectedTarget || loadingTargets || reason.trim().length < 5 || saving || uncertain) return;
    setSaving(true);
    if (!userId) {
      showFeedback(errorResponse("No se pudo guardar de forma segura la transferencia. Vuelve a iniciar sesión."));
      return;
    }
    const operation: PendingIncomeOperation = {
      operationId: `income.transfer:${income.incomeId}`,
      userId,
      incomeId: income.incomeId,
      kind: "income.transfer",
      idempotencyKey: createIdempotencyKey(),
      payload: { version: income.version, targetSaleOrderId: selectedTarget.saleOrderId, reason: reason.trim() },
      createdAt: new Date().toISOString(),
    };
    savePendingIncomeOperation(operation);
    try {
      await transferPendingIncome(income, selectedTarget.saleOrderId, reason.trim(), operation.idempotencyKey);
      clearPendingIncomeOperation(operation);
      showFeedback(successResponse(`Pago transferido al pedido ${selectedTarget.saleOrderNumber}.`));
      await onTransferred();
      onClose();
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) clearPendingIncomeOperation(operation);
      else {
        setUncertain(true);
        onTransferUncertain?.(operation);
        onClose();
      }
      showFeedback(errorResponse(parseApiError(error, "No se pudo transferir el ingreso. Actualiza los datos e inténtalo otra vez.")));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir pago por confirmar"
      description={income ? `${income.saleOrderNumber} · ${income.clientName} · ${money(income.amount, income.currency ?? "PEN")}` : undefined}
      className="w-full max-w-2xl"
      preventClose={saving}
      footer={<div className="flex flex-col-reverse justify-end gap-2 sm:flex-row"><SystemButton size="lg" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</SystemButton><SystemButton size="lg" onClick={() => void submit()} loading={saving} disabled={!selectedTarget || loadingTargets || reason.trim().length < 5 || saving || uncertain} leftIcon={<ArrowRightLeft className="h-4 w-4" />}>Transferir pago</SystemButton></div>}
    >
      <div className="space-y-4">
        <p className="text-sm leading-5 text-muted-foreground">El destino se limita a pedidos activos del mismo cliente y moneda con saldo suficiente. Se volverá a validar al transferir.</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <FloatingInput label="Buscar pedido destino" name="income-transfer-search" value={query} onChange={(event) => { setQuery(event.target.value); setTargetId(""); }} className="pl-9" autoComplete="off" />
        </div>
        <section aria-label="Pedidos destino compatibles" aria-busy={loadingTargets} className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-2">
          {loadingTargets ? <div className="flex min-h-20 items-center justify-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Buscando pedidos compatibles…</div> : null}
          {!loadingTargets && loadError ? <div className="p-3 text-sm text-destructive" role="alert">{loadError}</div> : null}
          {!loadingTargets && !loadError && !targets.length ? <div className="p-3 text-sm text-muted-foreground">No hay pedidos activos compatibles con saldo suficiente.</div> : null}
          {!loadingTargets && !loadError ? targets.map((target) => (
            <label key={target.saleOrderId} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${targetId === target.saleOrderId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
              <input type="radio" name="income-transfer-target" value={target.saleOrderId} checked={targetId === target.saleOrderId} onChange={() => setTargetId(target.saleOrderId)} className="h-4 w-4 accent-primary" />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{target.saleOrderNumber}</span><span className="block truncate text-xs text-muted-foreground">{target.clientName}</span></span>
              <span className="shrink-0 text-right text-xs"><span className="block text-muted-foreground">Disponible</span><span className="font-semibold tabular-nums">{money(target.available, target.currency)}</span></span>
            </label>
          )) : null}
        </section>
        <div>
          <label htmlFor="income-transfer-reason" className="mb-1 block text-sm font-medium">Motivo de la transferencia <span className="text-destructive">*</span></label>
          <textarea id="income-transfer-reason" name="income-transfer-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} required aria-describedby="income-transfer-reason-help" className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40" placeholder="Explica por qué el pago se asocia a otro pedido" />
          <p id="income-transfer-reason-help" className="mt-1 text-xs text-muted-foreground">Mínimo 5 caracteres; quedará en la auditoría. {reason.trim().length}/500</p>
        </div>
        {selectedTarget ? <p className="rounded-md bg-muted/50 p-3 text-sm">Se moverá {money(income?.amount ?? 0, selectedTarget.currency)} de <strong>{income?.saleOrderNumber}</strong> a <strong>{selectedTarget.saleOrderNumber}</strong>.</p> : null}
      </div>
    </Modal>
  );
}
