import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { successResponse } from "@/shared/common/utils/response";
import { useCompany } from "@/shared/hooks/useCompany";
import { useAuth } from "@/shared/hooks/useAuth";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import { getCompanyPaymentAccountDisplay } from "@/features/payments/paymentAccountView";
import type { CompanyPaymentAccount } from "@/features/payments/types/payment-account.types";
import {
  createBankStatementLine,
  listAvailableBankStatementLines,
  listIncomeReconciliations,
  reconcileIncome,
  unreconcileIncome,
  type BankStatementLine,
  type IncomeReconciliation,
  type IncomeReconciliationStatus,
} from "@/shared/services/incomeService";
import type { Income } from "../types/income.types";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import {
  clearPendingIncomeOperation,
  listPendingIncomeOperations,
  savePendingIncomeOperation,
  type PendingIncomeOperation,
} from "../services/income-operation-recovery";

type Props = {
  open: boolean;
  income: Income | null;
  canReconcile: boolean;
  canUnreconcile: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

const makeIdempotencyKey = createIdempotencyKey;
const currency = (amount: number, code: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
const amount = (value: string | number | undefined) => Number(value ?? 0) || 0;
const today = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const statusText: Record<IncomeReconciliationStatus, string> = {
  UNRECONCILED: "Sin conciliar",
  PARTIALLY_RECONCILED: "Conciliación parcial",
  RECONCILED: "Conciliado",
};

export function IncomeReconciliationModal({ open, income, canReconcile, canUnreconcile, onClose, onSaved }: Props) {
  const { userId } = useAuth();
  const { company } = useCompany();
  const { showFeedback } = useFeedbackToast();
  const [accounts, setAccounts] = useState<CompanyPaymentAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [lines, setLines] = useState<BankStatementLine[]>([]);
  const [allocations, setAllocations] = useState<IncomeReconciliation[]>([]);
  const [reconciledAmount, setReconciledAmount] = useState(0);
  const [status, setStatus] = useState<IncomeReconciliationStatus>("UNRECONCILED");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [operationDate, setOperationDate] = useState(today);
  const [statementAmount, setStatementAmount] = useState("");
  const [lineId, setLineId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [unreconcileDraft, setUnreconcileDraft] = useState<{ id: string; reason: string; confirmed: boolean } | null>(null);
  const [pendingOperations, setPendingOperations] = useState<PendingIncomeOperation[]>([]);
  const requestRef = useRef(0);
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  const eligibleAccounts = useMemo(() => accounts.filter((item) => item.isActive
    && (item.usage === "INFLOW" || item.usage === "BOTH")
    && item.currency === (income?.currency ?? "PEN")
    && item.id === income?.companyPaymentAccountId), [accounts, income?.companyPaymentAccountId, income?.currency]);

  const load = useCallback(async () => {
    if (!income) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const [accountRows, reconciliation] = await Promise.all([
        company?.companyId ? listCompanyPaymentAccountsByCompany(company.companyId) : Promise.resolve([]),
        listIncomeReconciliations(income.incomeId),
      ]);
      if (requestRef.current !== requestId) return;
      const compatible = accountRows.filter((item) => item.isActive
        && (item.usage === "INFLOW" || item.usage === "BOTH")
        && item.currency === (income.currency ?? "PEN")
        && item.id === income.companyPaymentAccountId);
      setAccounts(accountRows);
      const preferredAccount = income.companyPaymentAccountId && compatible.some((item) => item.id === income.companyPaymentAccountId)
        ? income.companyPaymentAccountId
        : compatible[0]?.id ?? "";
      setAccountId((current) => compatible.some((item) => item.id === current) ? current : preferredAccount);
      setAllocations(reconciliation.items);
      setReconciledAmount(reconciliation.reconciledAmount);
      setStatus(reconciliation.status);
    } catch (cause) {
      if (requestRef.current === requestId) setError(parseApiError(cause, "No se pudo cargar la conciliación bancaria."));
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [company?.companyId, income]);

  const loadLines = useCallback(async () => {
    if (!accountId) { setLines([]); setLineId(""); return; }
    try {
      const available = await listAvailableBankStatementLines(accountId);
      setLines(available);
      setLineId((current) => available.some((line) => line.id === current) ? current : available[0]?.id ?? "");
    } catch (cause) {
      setError(parseApiError(cause, "No se pudieron cargar las líneas bancarias disponibles."));
    }
  }, [accountId]);

  useEffect(() => {
    if (!open || !income) return;
    setAllocations([]);
    setLines([]);
    setUnreconcileDraft(null);
    setError("");
    setPendingOperations(userId && income ? listPendingIncomeOperations(userId, income.incomeId) : []);
    void load();
    return () => { requestRef.current += 1; };
  }, [income?.incomeId, load, open, userId]);

  useEffect(() => {
    if (open) void loadLines();
  }, [accountId, loadLines, open]);

  const idempotencyKey = (signature: string) => {
    const key = idempotencyRef.current?.signature === signature ? idempotencyRef.current.key : makeIdempotencyKey();
    idempotencyRef.current = { signature, key };
    return key;
  };

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
    if (operation.kind === "bank-line.create") {
      await createBankStatementLine({
        companyPaymentAccountId: String(payload.companyPaymentAccountId), bankReference: String(payload.bankReference),
        operationDate: String(payload.operationDate), amount: Number(payload.amount), currency: String(payload.currency),
        idempotencyKey: operation.idempotencyKey,
      });
    } else if (operation.kind === "income.reconcile") {
      await reconcileIncome(operation.incomeId, { bankStatementLineId: String(payload.bankStatementLineId), amount: Number(payload.amount), idempotencyKey: operation.idempotencyKey });
    } else if (operation.kind === "income.unreconcile") {
      await unreconcileIncome(operation.incomeId, String(payload.allocationId), String(payload.reason), operation.idempotencyKey);
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
      await load();
      await loadLines();
      await onSaved?.();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo recuperar la operación. Puedes reintentar con la misma clave."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLine = async () => {
    if (!income || !accountId || !bankReference.trim() || !operationDate || submitting || pendingOperations.length > 0) return;
    const value = Math.round((Number(statementAmount) + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0 || bankReference.trim().length > 120) {
      setError("Ingresa una referencia bancaria y un importe positivo válido.");
      return;
    }
    const input = { companyPaymentAccountId: accountId, bankReference: bankReference.trim(), operationDate, amount: value, currency: income.currency ?? "PEN" };
    const key = idempotencyKey(JSON.stringify(input));
    const operation: PendingIncomeOperation = {
      operationId: `bank-line.create:${accountId}:${bankReference.trim()}`, userId: userId ?? "", incomeId: income.incomeId,
      kind: "bank-line.create", idempotencyKey: key, payload: input, createdAt: new Date().toISOString(),
    };
    rememberPending(operation);
    setSubmitting(true);
    setError("");
    try {
      await executeOperation(operation);
      forgetPending(operation);
      idempotencyRef.current = null;
      setBankReference("");
      setStatementAmount("");
      showFeedback(successResponse("Se registró la línea del extracto bancario."));
      await loadLines();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo registrar la línea bancaria. Revisa la referencia y vuelve a intentar."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReconciliation = async () => {
    if (!income || !lineId || submitting || pendingOperations.length > 0) return;
    const line = lines.find((item) => item.id === lineId);
    const value = Math.round((Number(allocationAmount) + Number.EPSILON) * 100) / 100;
    const remainingIncome = Math.max(income.amount - reconciledAmount, 0);
    if (!line || !Number.isFinite(value) || value <= 0 || value > amount(line.available) || value > remainingIncome) {
      setError("El importe debe ser positivo y no superar el saldo conciliable del ingreso ni de la línea bancaria.");
      return;
    }
    const input = { bankStatementLineId: line.id, amount: value };
    const key = idempotencyKey(JSON.stringify({ incomeId: income.incomeId, ...input }));
    const operation: PendingIncomeOperation = {
      operationId: `income.reconcile:${income.incomeId}:${line.id}`, userId: userId ?? "", incomeId: income.incomeId,
      kind: "income.reconcile", idempotencyKey: key, payload: input, createdAt: new Date().toISOString(),
    };
    rememberPending(operation);
    setSubmitting(true);
    setError("");
    try {
      await executeOperation(operation);
      forgetPending(operation);
      idempotencyRef.current = null;
      setAllocationAmount("");
      showFeedback(successResponse("Se concilió el importe con el extracto bancario."));
      await load();
      await loadLines();
      await onSaved?.();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo conciliar el ingreso. Actualiza los saldos y vuelve a intentar."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitUnreconciliation = async () => {
    if (!income || !unreconcileDraft || unreconcileDraft.reason.trim().length < 5 || !unreconcileDraft.confirmed || submitting || pendingOperations.length > 0) return;
    const input = { incomeId: income.incomeId, allocationId: unreconcileDraft.id, reason: unreconcileDraft.reason.trim() };
    const key = idempotencyKey(JSON.stringify(input));
    const operation: PendingIncomeOperation = {
      operationId: `income.unreconcile:${input.incomeId}:${input.allocationId}`, userId: userId ?? "", incomeId: income.incomeId,
      kind: "income.unreconcile", idempotencyKey: key, payload: { allocationId: input.allocationId, reason: input.reason }, createdAt: new Date().toISOString(),
    };
    rememberPending(operation);
    setSubmitting(true);
    setError("");
    try {
      await executeOperation(operation);
      forgetPending(operation);
      idempotencyRef.current = null;
      setUnreconcileDraft(null);
      showFeedback(successResponse("Se retiró la asignación bancaria; el historial se conservó."));
      await load();
      await loadLines();
      await onSaved?.();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo desconciliar la asignación."));
    } finally {
      setSubmitting(false);
    }
  };

  const activeAllocationIds = new Set(allocations.filter((item) => !item.unreconciledAt).map((item) => item.id));
  const code = income?.currency ?? "PEN";
  const lineAccountLabel = eligibleAccounts.find((item) => item.id === accountId);
  const accountLabel = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    return account ? getCompanyPaymentAccountDisplay(account) : "Cuenta receptora";
  };

  return (
    <Modal open={open} onClose={submitting ? () => undefined : onClose} title="Conciliación bancaria"
      description={income ? `${income.saleOrderNumber} · ${income.clientName} · ${currency(income.amount, code)}` : undefined}
      preventClose={submitting} closeOnOverlayClick={!submitting} closeOnEscape={!submitting}
      className="max-h-[90vh] w-[min(760px,calc(100vw-24px))]" bodyClassName="space-y-4 overflow-y-auto">
      {loading ? <div role="status" className="py-8 text-center text-sm text-zinc-700">Cargando conciliación…</div> : <>
        {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 p-3"><p role="alert" className="text-sm text-rose-900">{error}</p><SystemButton type="button" variant="outline" onClick={() => { void load(); void loadLines(); }} disabled={submitting || loading} className="border-rose-700 text-rose-900 hover:bg-rose-50">Reintentar</SystemButton></div>}
        {pendingOperations.length > 0 && <section aria-label="Operaciones por recuperar" className="space-y-3 rounded-lg border border-amber-400 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-950">Hay una operación cuyo resultado no se confirmó. Recuperarla reenvía exactamente la misma solicitud y clave; si ya se guardó, el servidor devuelve el resultado sin duplicar asignaciones.</p>
          {pendingOperations.map((operation) => <div key={operation.operationId} className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-amber-950">{operation.kind === "bank-line.create" ? "Registrar línea bancaria" : operation.kind === "income.reconcile" ? "Conciliar ingreso" : "Desconciliar ingreso"}</span>
            <SystemButton type="button" variant="outline" onClick={() => void recoverOperation(operation)} disabled={submitting} className="border-amber-900 text-amber-950 hover:bg-amber-100">{submitting ? "Recuperando…" : "Recuperar operación pendiente"}</SystemButton>
          </div>)}
        </section>}
        {income && <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-3">
          <div><span className="block text-xs font-medium text-zinc-700">Estado</span><span className="mt-1 block text-sm font-semibold text-zinc-950">{statusText[status]}</span></div>
          <div><span className="block text-xs font-medium text-zinc-700">Ingreso contabilizado</span><span className="mt-1 block text-sm font-semibold tabular-nums text-zinc-950">{currency(income.amount, code)}</span></div>
          <div><span className="block text-xs font-medium text-zinc-700">Importe conciliado</span><span className="mt-1 block text-sm font-semibold tabular-nums text-zinc-950">{currency(reconciledAmount, code)}</span></div>
        </div>}
        {canReconcile && <section className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <div><h3 className="text-sm font-semibold text-zinc-950">Conciliar con una línea bancaria</h3><p className="mt-1 text-sm text-zinc-700">La conciliación no cambia el estado ni el importe contable del ingreso.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatingSelect
              label="Cuenta receptora"
              name="income-reconciliation-account"
              value={accountId}
              options={[{ value: "", label: "Selecciona una cuenta" }, ...eligibleAccounts.map((account) => ({ value: account.id, label: getCompanyPaymentAccountDisplay(account) }))]}
              onChange={(value) => { setAccountId(value); setLineId(""); }}
              disabled={eligibleAccounts.length === 0}
            />
            <div>
              <FloatingSelect
                label="Línea bancaria disponible"
                name="income-reconciliation-line"
                value={lineId}
                options={[{ value: "", label: "Selecciona una línea bancaria" }, ...lines.map((line) => ({ value: line.id, label: `${line.bankReference} · ${line.operationDate} · disponible ${currency(amount(line.available), line.currency)}` }))]}
                onChange={(value) => { setLineId(value); const line = lines.find((item) => item.id === value); setAllocationAmount(line ? Math.min(amount(line.available), Math.max((income?.amount ?? 0) - reconciledAmount, 0)).toFixed(2) : ""); }}
                disabled={lines.length === 0}
              />
              {lineAccountLabel && <span className="mt-1 block text-xs font-normal text-zinc-700">{lineAccountLabel.maskedLabel} · {code}</span>}
            </div>
          </div>
          {eligibleAccounts.length === 0 && <p className="text-sm text-zinc-700">Este ingreso no tiene una cuenta receptora activa compatible asociada. No se pueden registrar ni vincular líneas bancarias hasta corregir la cuenta del ingreso.</p>}
          {lines.length === 0 && <p className="text-sm text-zinc-700">No hay líneas bancarias con saldo disponible para esta cuenta.</p>}
          {lines.length > 0 && <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-40 flex-1 text-sm font-medium text-zinc-900">Importe a conciliar ({code})
              <input type="number" min="0.01" max={Math.min(amount(lines.find((line) => line.id === lineId)?.available), Math.max((income?.amount ?? 0) - reconciledAmount, 0))} step="0.01" value={allocationAmount} onChange={(event) => { setAllocationAmount(event.target.value); idempotencyRef.current = null; }} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
            </label>
            <SystemButton type="button" onClick={() => void submitReconciliation()} loading={submitting} disabled={!lineId || !allocationAmount || pendingOperations.length > 0 || reconciledAmount >= (income?.amount ?? 0)}>Conciliar importe</SystemButton>
          </div>}
          <details className="rounded-lg border border-zinc-200 p-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-zinc-900">Registrar una línea bancaria manualmente</summary>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-900">Referencia bancaria
                <input value={bankReference} maxLength={120} onChange={(event) => setBankReference(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
              </label>
              <FloatingDatePicker
                label="Fecha de operación"
                name="income-reconciliation-operation-date"
                value={parseDateInputValue(operationDate)}
                onChange={(date) => setOperationDate(date ? toLocalDateKey(date) : "")}
              />
              <label className="text-sm font-medium text-zinc-900">Importe de la línea ({code})
                <input type="number" min="0.01" step="0.01" value={statementAmount} onChange={(event) => setStatementAmount(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
              </label>
              <SystemButton type="button" variant="outline" onClick={() => void submitLine()} loading={submitting} disabled={!accountId || !bankReference.trim() || !statementAmount || pendingOperations.length > 0} className="self-end border-sky-800 text-sky-900 hover:bg-sky-50">Registrar línea</SystemButton>
            </div>
          </details>
        </section>}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-950">Historial de asignaciones bancarias</h3>
          {allocations.length === 0 ? <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">Este ingreso todavía no tiene asignaciones bancarias.</p> : allocations.map((allocation) => <div key={allocation.id} className="space-y-2 rounded-xl border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-zinc-950">{allocation.bankReference} · {currency(amount(allocation.amount), allocation.currency)}</p><p className="mt-1 text-sm text-zinc-700">Fecha bancaria: {allocation.operationDate} · Cuenta: {accountLabel(allocation.companyPaymentAccountId)}</p></div>
              {activeAllocationIds.has(allocation.id) ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">Activa</span> : <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">Desconciliada</span>}</div>
            {allocation.unreconciledAt && <p className="text-sm text-zinc-700">Motivo: {allocation.unreconcileReason || "No registrado"}</p>}
            {canUnreconcile && activeAllocationIds.has(allocation.id) && <SystemButton type="button" variant="outline" disabled={pendingOperations.length > 0} onClick={() => { setUnreconcileDraft({ id: allocation.id, reason: "", confirmed: false }); setError(""); }} className="border-rose-400 text-rose-900 hover:bg-rose-50" leftIcon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}>Desconciliar</SystemButton>}
            {unreconcileDraft?.id === allocation.id && <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <label className="block text-sm font-medium text-zinc-900">Motivo de desconciliación
                <textarea value={unreconcileDraft.reason} minLength={5} maxLength={500} rows={2} onChange={(event) => setUnreconcileDraft({ ...unreconcileDraft, reason: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
              </label>
              <label className="flex min-h-11 items-start gap-3 text-sm text-zinc-900"><input type="checkbox" checked={unreconcileDraft.confirmed} onChange={(event) => setUnreconcileDraft({ ...unreconcileDraft, confirmed: event.target.checked })} className="mt-1 h-4 w-4 accent-amber-800" /><span>Confirmo retirar esta asignación. La operación quedará registrada en el historial.</span></label>
              <div className="flex flex-wrap gap-2"><SystemButton type="button" variant="outline" disabled={submitting} onClick={() => setUnreconcileDraft(null)}>Cancelar</SystemButton><SystemButton type="button" variant="danger" loading={submitting} disabled={!unreconcileDraft.confirmed || unreconcileDraft.reason.trim().length < 5} onClick={() => void submitUnreconciliation()}>Confirmar desconciliación</SystemButton></div>
            </div>}
          </div>)}
        </section>
        {!canReconcile && !canUnreconcile && <p className="text-sm text-zinc-700">Tienes permiso de consulta. Para registrar o retirar conciliaciones se requieren permisos adicionales.</p>}
      </>}
    </Modal>
  );
}
