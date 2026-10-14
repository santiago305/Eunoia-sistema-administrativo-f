import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { successResponse } from "@/shared/common/utils/response";
import { useCompany } from "@/shared/hooks/useCompany";
import { useAuth } from "@/shared/hooks/useAuth";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import { getCompanyPaymentAccountDisplay } from "@/features/payments/paymentAccountView";
import type { CompanyPaymentAccount } from "@/features/payments/types/payment-account.types";
import {
  cancelIncomeRefund,
  createIncomeRefund,
  listIncomeRefunds,
  postIncomeRefund,
  reverseIncomeRefund,
  type IncomeRefund,
} from "@/shared/services/incomeService";
import type { Income } from "../types/income.types";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";
import {
  clearPendingIncomeOperation,
  listPendingIncomeOperations,
  savePendingIncomeOperation,
  type PendingIncomeOperation,
} from "../services/income-operation-recovery";

type Action = "post" | "cancel" | "reverse";
type ActionDraft = { refundId: string; action: Action; accountId: string; operationNumber: string; reason: string; confirmed: boolean };
type Props = {
  open: boolean;
  income: Income | null;
  canPost: boolean;
  canCreate: boolean;
  canCancel: boolean;
  canReverse: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const statusLabel: Record<IncomeRefund["status"], string> = {
  PENDING: "Pendiente",
  POSTED: "Devuelto",
  CANCELLED: "Cancelado",
  REVERSED: "Revertido",
};

export function IncomeRefundsModal({ open, income, canPost, canCreate, canCancel, canReverse, onClose, onSaved }: Props) {
  const { userId } = useAuth();
  const { company } = useCompany();
  const { showFeedback } = useFeedbackToast();
  const [refunds, setRefunds] = useState<IncomeRefund[]>([]);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [accounts, setAccounts] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<ActionDraft | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newReason, setNewReason] = useState("");
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingIncomeOperation[]>([]);
  const requestRef = useRef(0);
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  const load = useCallback(async () => {
    if (!income) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const [refundResponse, accountRows] = await Promise.all([
        listIncomeRefunds(income.incomeId),
        company?.companyId ? listCompanyPaymentAccountsByCompany(company.companyId) : Promise.resolve([]),
      ]);
      if (requestRef.current !== requestId) return;
      setRefunds(refundResponse.items);
      setAvailableCredit(Math.max(refundResponse.availableCredit, 0));
      setAccounts(accountRows.filter((account) => account.isActive && (account.usage === "OUTFLOW" || account.usage === "BOTH") && account.currency === (income.currency ?? "PEN")));
    } catch (cause) {
      if (requestRef.current === requestId) setError(parseApiError(cause, "No se pudieron cargar los reembolsos y las cuentas de salida."));
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [company?.companyId, income]);

  useEffect(() => {
    if (!open || !income) return;
    setDraft(null);
    setCreateOpen(false);
    setPendingOperations(userId && income ? listPendingIncomeOperations(userId, income.incomeId) : []);
    void load();
    return () => { requestRef.current += 1; };
  }, [income?.incomeId, load, open, userId]);

  const rememberPending = (operation: PendingIncomeOperation) => {
    if (!userId) return;
    savePendingIncomeOperation(operation);
    setPendingOperations(listPendingIncomeOperations(userId, operation.incomeId));
  };

  const forgetPending = (operation: PendingIncomeOperation) => {
    clearPendingIncomeOperation(operation);
    setPendingOperations((current) => current.filter((item) => item.operationId !== operation.operationId));
  };

  const executeOperation = async (operation: PendingIncomeOperation) => {
    const payload = operation.payload;
    if (operation.kind === "refund.create") {
      await createIncomeRefund(operation.incomeId, { amount: Number(payload.amount), reason: String(payload.reason), idempotencyKey: operation.idempotencyKey });
      return;
    }
    const refundId = String(payload.refundId);
    if (operation.kind === "refund.post") {
      await postIncomeRefund(refundId, { companyPaymentAccountId: String(payload.companyPaymentAccountId), operationNumber: String(payload.operationNumber), idempotencyKey: operation.idempotencyKey });
    } else if (operation.kind === "refund.cancel") {
      await cancelIncomeRefund(refundId, String(payload.reason), operation.idempotencyKey);
    } else if (operation.kind === "refund.reverse") {
      await reverseIncomeRefund(refundId, String(payload.reason), operation.idempotencyKey);
    }
  };

  const recoverOperation = async (operation: PendingIncomeOperation) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await executeOperation(operation);
      forgetPending(operation);
      idempotencyRef.current = null;
      showFeedback(successResponse("Se recuperó el resultado de la operación idempotente."));
      setDraft(null);
      setCreateOpen(false);
      await load();
      await onSaved();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo recuperar la operación. Puedes reintentar con la misma clave."));
    } finally {
      setSubmitting(false);
    }
  };

  const startAction = (refund: IncomeRefund, action: Action) => {
    setError("");
    idempotencyRef.current = null;
    setDraft({ refundId: refund.id, action, accountId: refund.companyPaymentAccountId ?? "", operationNumber: refund.operationNumber ?? "", reason: "", confirmed: false });
  };

  const updateDraft = (patch: Partial<ActionDraft>) => {
    setDraft((current) => current ? { ...current, ...patch } : current);
    idempotencyRef.current = null;
  };

  const submit = async () => {
    if (!draft || submitting || pendingOperations.length > 0 || !draft.confirmed) return;
    const reason = draft.reason.trim();
    if (draft.action === "post" && (!draft.accountId || !draft.operationNumber.trim())) {
      setError("Selecciona una cuenta de salida e ingresa el número de operación del reembolso.");
      return;
    }
    if (draft.action !== "post" && (reason.length < 5 || reason.length > 500)) {
      setError("El motivo debe tener entre 5 y 500 caracteres.");
      return;
    }
    const payload = draft.action === "post"
      ? { refundId: draft.refundId, accountId: draft.accountId, operationNumber: draft.operationNumber.trim() }
      : { refundId: draft.refundId, reason };
    const storedPayload: PendingIncomeOperation["payload"] = draft.action === "post"
      ? { refundId: draft.refundId, companyPaymentAccountId: draft.accountId, operationNumber: draft.operationNumber.trim() }
      : { refundId: draft.refundId, reason };
    const signature = JSON.stringify({ action: draft.action, ...payload });
    const key = idempotencyRef.current?.signature === signature ? idempotencyRef.current.key : createIdempotencyKey();
    idempotencyRef.current = { signature, key };
    const operation: PendingIncomeOperation = {
      operationId: `refund.${draft.action}:${draft.refundId}`, userId: userId ?? "", incomeId: income?.incomeId ?? "",
      kind: `refund.${draft.action}`, idempotencyKey: key, payload: storedPayload, createdAt: new Date().toISOString(),
    };
    rememberPending(operation);
    setSubmitting(true);
    setError("");
    try {
      await executeOperation(operation);
      const message = draft.action === "post" ? "Reembolso confirmado y registrado en la cuenta de salida." : draft.action === "cancel" ? "Se liberó la reserva del reembolso." : "Reembolso revertido con un movimiento compensatorio.";
      showFeedback(successResponse(message));
      forgetPending(operation);
      setDraft(null);
      idempotencyRef.current = null;
      await load();
      await onSaved();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo completar la operación del reembolso. Actualiza e inténtalo nuevamente."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCreate = async () => {
    if (!income || submitting || pendingOperations.length > 0 || !createConfirmed) return;
    const amount = Math.round((Number(newAmount) + Number.EPSILON) * 100) / 100;
    const reason = newReason.trim();
    if (!Number.isFinite(amount) || amount <= 0 || amount > availableCredit) {
      setError(`Ingresa un importe positivo que no supere el saldo a favor disponible de ${money(availableCredit, income.currency ?? "PEN")}.`);
      return;
    }
    if (reason.length < 5 || reason.length > 500) {
      setError("El motivo debe tener entre 5 y 500 caracteres.");
      return;
    }
    const signature = JSON.stringify({ incomeId: income.incomeId, amount, reason });
    const key = idempotencyRef.current?.signature === signature ? idempotencyRef.current.key : createIdempotencyKey();
    idempotencyRef.current = { signature, key };
    const operation: PendingIncomeOperation = {
      operationId: `refund.create:${income.incomeId}`, userId: userId ?? "", incomeId: income.incomeId,
      kind: "refund.create", idempotencyKey: key, payload: { amount, reason }, createdAt: new Date().toISOString(),
    };
    rememberPending(operation);
    setSubmitting(true);
    setError("");
    try {
      await executeOperation(operation);
      showFeedback(successResponse("Se registró el reembolso pendiente y se reservó el saldo a favor."));
      setCreateOpen(false);
      setNewAmount("");
      setNewReason("");
      setCreateConfirmed(false);
      forgetPending(operation);
      idempotencyRef.current = null;
      await load();
      await onSaved();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo registrar el reembolso pendiente."));
    } finally {
      setSubmitting(false);
    }
  };

  const money = (amount: number, currency: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  const selectedRefund = refunds.find((refund) => refund.id === draft?.refundId);
  const actionTitle = draft?.action === "post" ? "Confirmar devolución real" : draft?.action === "cancel" ? "Cancelar reembolso pendiente" : "Revertir devolución contabilizada";

  return (
    <Modal open={open} onClose={submitting ? () => undefined : onClose} title="Reembolsos del ingreso"
      description={income ? `${income.saleOrderNumber} · ${income.clientName} · ${money(income.amount, income.currency ?? "PEN")}` : undefined}
      preventClose={submitting} closeOnOverlayClick={!submitting} closeOnEscape={!submitting}
      className="max-h-[90vh] w-[min(720px,calc(100vw-24px))]" bodyClassName="space-y-4 overflow-y-auto">
      {loading ? <div role="status" className="py-8 text-center text-sm text-zinc-700">Cargando reembolsos…</div> : error && !refunds.length ? (
        <div className="space-y-3"><p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</p><button type="button" onClick={() => void load()} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">Reintentar</button></div>
      ) : <>
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">Un reembolso pendiente solo reserva el saldo. Al confirmarlo se registra una salida real; revertirlo crea movimientos compensatorios y no borra el historial.</p>
        {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        {pendingOperations.length > 0 && <section aria-label="Operaciones por recuperar" className="space-y-3 rounded-lg border border-amber-400 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-950">Hay una operación cuyo resultado no se confirmó. Recuperarla reenvía exactamente la misma solicitud y clave; si ya se guardó, el servidor devuelve el resultado sin duplicar movimientos.</p>
          {pendingOperations.map((operation) => <div key={operation.operationId} className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-amber-950">{operation.kind === "refund.create" ? "Crear reembolso" : operation.kind === "refund.post" ? "Confirmar reembolso" : operation.kind === "refund.cancel" ? "Cancelar reembolso" : "Revertir reembolso"}</span>
            <button type="button" onClick={() => void recoverOperation(operation)} disabled={submitting} className="min-h-11 rounded-lg border border-amber-900 bg-white px-4 text-sm font-semibold text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:opacity-50">{submitting ? "Recuperando…" : "Recuperar operación pendiente"}</button>
          </div>)}
        </section>}
        {canCreate && <section className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-zinc-950">Registrar reembolso pendiente</h3><p className="mt-1 text-sm text-zinc-700">Saldo a favor disponible: <span className="font-semibold tabular-nums">{money(availableCredit, income?.currency ?? "PEN")}</span></p></div>
            <button type="button" disabled={availableCredit <= 0 || loading || pendingOperations.length > 0} onClick={() => { setCreateOpen((value) => !value); setDraft(null); setError(""); }} className="min-h-11 rounded-lg border border-sky-700 px-4 text-sm font-semibold text-sky-900 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50">{createOpen ? "Cerrar formulario" : "Nuevo reembolso"}</button>
          </div>
          {availableCredit <= 0 && <p className="text-sm text-zinc-600">No hay saldo libre para devolver. Si el importe sigue aplicado a un pedido, resuelve primero esa aplicación.</p>}
          {createOpen && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-zinc-900">Importe a reservar ({income?.currency ?? "PEN"})
              <input type="number" min="0.01" max={availableCredit} step="0.01" value={newAmount} onChange={(event) => { setNewAmount(event.target.value); setCreateConfirmed(false); idempotencyRef.current = null; }} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
            </label>
            <label className="text-sm font-medium text-zinc-900">Motivo
              <textarea value={newReason} minLength={5} maxLength={500} rows={2} onChange={(event) => { setNewReason(event.target.value); setCreateConfirmed(false); idempotencyRef.current = null; }} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-zinc-900 sm:col-span-2"><input type="checkbox" checked={createConfirmed} onChange={(event) => setCreateConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-sky-800" /><span>Confirmo que esta operación solo reserva el saldo; todavía no representa dinero devuelto.</span></label>
            <button type="button" onClick={() => void submitCreate()} disabled={!createConfirmed || submitting || !newAmount || !newReason.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-800 px-4 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">{submitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}{submitting ? "Registrando…" : "Crear reembolso pendiente"}</button>
          </div>}
        </section>}
        {refunds.length === 0 ? <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">Este ingreso no tiene reembolsos registrados.</p> : <div className="space-y-3">
          {refunds.map((refund) => <section key={refund.id} className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-zinc-950">{money(refund.amount, refund.currency)}</h3><p className="mt-1 text-sm text-zinc-700">{statusLabel[refund.status]} · {refund.reason}</p></div>
              <span className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900">{refund.operationNumber || "Sin operación bancaria"}</span>
            </div>
            {refund.status === "PENDING" && <div className="flex flex-wrap gap-2">
              {canPost && <button type="button" disabled={pendingOperations.length > 0} onClick={() => startAction(refund, "post")} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-50"><CheckCircle2 aria-hidden="true" className="mr-2 inline h-4 w-4" />Confirmar devolución</button>}
              {canCancel && <button type="button" disabled={pendingOperations.length > 0} onClick={() => startAction(refund, "cancel")} className="min-h-11 rounded-lg border border-rose-400 px-4 text-sm font-semibold text-rose-900 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-50"><Ban aria-hidden="true" className="mr-2 inline h-4 w-4" />Cancelar reserva</button>}
            </div>}
            {refund.status === "POSTED" && canReverse && <button type="button" disabled={pendingOperations.length > 0} onClick={() => startAction(refund, "reverse")} className="min-h-11 rounded-lg border border-rose-400 px-4 text-sm font-semibold text-rose-900 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-50"><RotateCcw aria-hidden="true" className="mr-2 inline h-4 w-4" />Revertir reembolso</button>}
          </section>)}
        </div>}
        {draft && selectedRefund && <section aria-label={actionTitle} className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-950">{actionTitle} · {money(selectedRefund.amount, selectedRefund.currency)}</h3>
          {draft.action === "post" ? <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-zinc-900">Cuenta de salida
              <select value={draft.accountId} onChange={(event) => updateDraft({ accountId: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
                <option value="">Selecciona una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{getCompanyPaymentAccountDisplay(account)}</option>)}
              </select>
              {accounts.length === 0 && <span className="mt-1 block text-xs font-normal text-rose-800">No hay cuentas de salida activas en {selectedRefund.currency}.</span>}
            </label>
            <label className="text-sm font-medium text-zinc-900">Número de operación
              <input value={draft.operationNumber} maxLength={100} onChange={(event) => updateDraft({ operationNumber: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
            </label>
          </div> : <label className="block text-sm font-medium text-zinc-900">Motivo <span className="text-rose-800">*</span>
            <textarea value={draft.reason} minLength={5} maxLength={500} rows={3} onChange={(event) => updateDraft({ reason: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" aria-describedby="refund-action-reason-help" />
            <span id="refund-action-reason-help" className="mt-1 block text-xs font-normal text-zinc-700">Entre 5 y 500 caracteres; se conservará en la auditoría.</span>
          </label>}
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-zinc-900"><input type="checkbox" checked={draft.confirmed} onChange={(event) => updateDraft({ confirmed: event.target.checked })} className="mt-1 h-4 w-4 accent-amber-800" /><span>Confirmo que revisé esta operación financiera.</span></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setDraft(null); setError(""); }} disabled={submitting} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">Cancelar acción</button>
            <button type="button" onClick={() => void submit()} disabled={!draft.confirmed || submitting || (draft.action === "post" && (accounts.length === 0 || !draft.accountId || !draft.operationNumber.trim()))} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-900 px-4 text-sm font-semibold text-white hover:bg-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:cursor-not-allowed disabled:opacity-50">{submitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}{submitting ? "Procesando…" : "Confirmar operación"}</button>
          </div>
        </section>}
      </>}
    </Modal>
  );
}
