import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Coins, RefreshCw } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useAuth } from "@/shared/hooks/useAuth";
import { applyCustomerCredit, getCustomerCreditBalances, type CustomerCreditBalance } from "@/shared/services/incomeService";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";

type Props = {
  clientId: string;
  saleOrderId: string;
  currency: string;
  remainingAmount: number;
  hasUnsavedChanges: boolean;
  onApplied?: () => void | Promise<void>;
};

const makeIdempotencyKey = createIdempotencyKey;

type CreditApplyRecovery = { clientId: string; saleOrderId: string; amount: number; reason: string; idempotencyKey: string };
const creditApplyStorageKey = (userId: string, saleOrderId: string) => `eunoia:customer-credit-apply:${userId}:${saleOrderId}`;
const readCreditApplyRecovery = (userId: string | null | undefined, clientId: string, saleOrderId: string): CreditApplyRecovery | null => {
  if (!userId || !saleOrderId || typeof sessionStorage === "undefined") return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(creditApplyStorageKey(userId, saleOrderId)) ?? "null") as CreditApplyRecovery | null;
    return value && value.clientId === clientId && value.saleOrderId === saleOrderId
      && Number.isFinite(value.amount) && value.amount > 0 && value.reason.length >= 5 && value.idempotencyKey
      ? value : null;
  } catch { return null; }
};

export function CustomerCreditApplyPanel({ clientId, saleOrderId, currency, remainingAmount, hasUnsavedChanges, onApplied }: Props) {
  const { can } = usePermissions();
  const { userId } = useAuth();
  const canView = can("customer_credits.view");
  const canApply = can("customer_credits.apply");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [balances, setBalances] = useState<CustomerCreditBalance[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<CreditApplyRecovery | null>(() => readCreditApplyRecovery(userId, clientId, saleOrderId));
  const [recovering, setRecovering] = useState(false);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const currencyBalance = useMemo(() => balances.find((item) => item.currency === currency)?.available ?? 0, [balances, currency]);
  const amountNumber = Number(amount);
  const maxApply = Math.min(currencyBalance, Math.max(remainingAmount, 0));
  const formatted = useMemo(() => new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }), [currency]);

  useEffect(() => {
    setRecovery(readCreditApplyRecovery(userId, clientId, saleOrderId));
  }, [clientId, saleOrderId, userId]);

  const saveRecovery = useCallback((request: CreditApplyRecovery) => {
    try { if (userId) sessionStorage.setItem(creditApplyStorageKey(userId, saleOrderId), JSON.stringify(request)); } catch { /* Recovery still remains available in component state. */ }
    setRecovery(request);
  }, [saleOrderId, userId]);

  const clearRecovery = useCallback(() => {
    try { if (userId) sessionStorage.removeItem(creditApplyStorageKey(userId, saleOrderId)); } catch { /* The server result is already confirmed. */ }
    setRecovery(null);
  }, [saleOrderId, userId]);

  const refreshBalances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getCustomerCreditBalances(clientId);
      setBalances(next);
      const available = next.find((item) => item.currency === currency)?.available ?? 0;
      const suggested = Math.min(available, Math.max(remainingAmount, 0));
      setAmount(suggested > 0 ? suggested.toFixed(2) : "");
    } catch (requestError) {
      setError(parseApiError(requestError, "No se pudo consultar el saldo a favor. Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  }, [clientId, currency, remainingAmount]);

  useEffect(() => {
    if (open && canView) void refreshBalances();
  }, [open, canView, refreshBalances]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!canView || !canApply) {
      setError("Necesitas los permisos de consulta y aplicación de saldos a favor.");
      return;
    }
    if (hasUnsavedChanges) {
      setError("Guarda o descarta los cambios del pedido antes de aplicar el saldo.");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0 || amountNumber > maxApply) {
      setError(`Ingresa un monto mayor a cero y no superior a ${formatted.format(maxApply)}.`);
      return;
    }
    if (reason.trim().length < 5) {
      setError("Escribe un motivo de al menos 5 caracteres.");
      return;
    }
    if (!confirmed) {
      setError("Confirma que deseas aplicar este crédito al pedido.");
      return;
    }
    if (!userId) {
      setError("No se pudo guardar de forma segura la aplicación. Vuelve a iniciar sesión.");
      return;
    }

    const normalizedAmount = Math.round((amountNumber + Number.EPSILON) * 100) / 100;
    const normalizedReason = reason.trim();
    const fingerprint = `${clientId}|${saleOrderId}|${normalizedAmount.toFixed(2)}|${normalizedReason}`;
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { fingerprint, key: makeIdempotencyKey() };
    }
    const request: CreditApplyRecovery = {
      clientId, saleOrderId, amount: normalizedAmount, reason: normalizedReason,
      idempotencyKey: idempotencyRef.current.key,
    };
    saveRecovery(request);
    setSubmitting(true);
    try {
      await applyCustomerCredit(request);
      clearRecovery();
      idempotencyRef.current = null;
      setConfirmed(false);
      setReason("");
      setSuccess(`Se aplicaron ${formatted.format(normalizedAmount)} al pedido. El ingreso bancario original no se modificó.`);
      await refreshBalances();
      try {
        await onApplied?.();
      } catch {
        setError("El crédito sí se aplicó, pero no se pudo actualizar la vista del pedido. Cierra y vuelve a abrir el pedido para refrescar sus totales.");
      }
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })?.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) clearRecovery();
      setError(parseApiError(requestError, "No se pudo aplicar el saldo. Puedes reintentar sin duplicar la operación."));
    } finally {
      setSubmitting(false);
    }
  };

  const recoverApplication = async () => {
    if (!recovery || recovering || submitting) return;
    setRecovering(true);
    setError(null);
    try {
      await applyCustomerCredit(recovery);
      clearRecovery();
      setSuccess(`Se confirmó la aplicación de ${formatted.format(recovery.amount)} al pedido. El ingreso bancario original no se modificó.`);
      await refreshBalances();
      try { await onApplied?.(); }
      catch { setError("El saldo se aplicó, pero no se pudo actualizar la vista. Cierra y vuelve a abrir el pedido para refrescar sus totales."); }
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })?.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) clearRecovery();
      setError(parseApiError(requestError, "No se pudo confirmar la aplicación. Se conserva la misma solicitud para reintentar."));
    } finally { setRecovering(false); }
  };

  if (!canView || !canApply || !clientId || !saleOrderId) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/70 p-3">
      {recovery ? (
        <section className="space-y-2" role="status" aria-label="Aplicación de saldo pendiente">
          <h3 className="text-sm font-semibold">Aplicación de saldo por confirmar</h3>
          <p className="text-sm text-amber-900">La respuesta de una aplicación al pedido se perdió. Repite exactamente el mismo importe y motivo para confirmar su resultado sin duplicarla.</p>
          {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}
          <SystemButton type="button" size="md" className="h-11 min-h-11" loading={recovering || submitting} disabled={recovering || submitting || hasUnsavedChanges} onClick={() => void recoverApplication()}>
            {submitting || recovering ? "Consultando aplicación…" : "Recuperar aplicación del saldo"}
          </SystemButton>
        </section>
      ) : !open ? (
        <SystemButton type="button" variant="outline" size="md" className="h-11 min-h-11" leftIcon={<Coins className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Consultar y aplicar saldo a favor
        </SystemButton>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Saldo a favor del cliente</h3>
              <p className="text-xs leading-5 text-muted-foreground">Se aplica al pedido sin crear otro ingreso bancario. Moneda del pedido: {currency}.</p>
            </div>
              <SystemButton type="button" variant="ghost" size="sm" className="h-11 min-h-11" onClick={() => { setOpen(false); setError(null); setSuccess(null); }}>Cerrar</SystemButton>
          </div>

          {loading ? <p role="status" className="text-sm text-muted-foreground">Consultando saldo…</p> : (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Disponible en {currency}: </span>
              <strong className="tabular-nums">{formatted.format(currencyBalance)}</strong>
              {currencyBalance === 0 ? <span className="ml-2 text-muted-foreground">No hay saldo disponible en la moneda del pedido.</span> : null}
            </div>
          )}

          {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">{error}</p> : null}
          {success ? <p role="status" className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</p> : null}
          {hasUnsavedChanges ? <p className="text-sm text-amber-800">Guarda o descarta los cambios del pedido antes de aplicar créditos.</p> : null}

          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <div className="space-y-1">
              <label htmlFor={`credit-amount-${saleOrderId}`} className="text-sm font-medium">Monto a aplicar ({currency})</label>
              <input
                id={`credit-amount-${saleOrderId}`}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="number" inputMode="decimal" min="0.01" max={maxApply.toFixed(2)} step="0.01"
                value={amount} onChange={(event) => { setAmount(event.target.value); setConfirmed(false); setSuccess(null); }}
                disabled={loading || submitting || currencyBalance <= 0 || maxApply <= 0 || hasUnsavedChanges}
                aria-describedby={`credit-limit-${saleOrderId}`}
              />
              <p id={`credit-limit-${saleOrderId}`} className="text-xs text-muted-foreground">Máximo aplicable: {formatted.format(maxApply)} (menor entre crédito disponible y saldo pendiente).</p>
            </div>
            <div className="space-y-1">
              <label htmlFor={`credit-reason-${saleOrderId}`} className="text-sm font-medium">Motivo</label>
              <textarea
                id={`credit-reason-${saleOrderId}`}
                className="min-h-11 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={reason} onChange={(event) => { setReason(event.target.value); setConfirmed(false); setSuccess(null); }}
                minLength={5} maxLength={500} required disabled={submitting || hasUnsavedChanges}
                placeholder="Indica por qué se aplica el saldo"
              />
            </div>
            <label className="flex min-h-11 items-start gap-2 text-sm leading-5 sm:col-span-2">
              <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={submitting || loading || hasUnsavedChanges || maxApply <= 0} />
              Confirmo aplicar {formatted.format(Number.isFinite(amountNumber) ? amountNumber : 0)} al saldo pendiente de este pedido.
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <SystemButton type="submit" size="md" className="h-11 min-h-11" loading={submitting} disabled={loading || submitting || !confirmed || hasUnsavedChanges || maxApply <= 0} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                Aplicar crédito
              </SystemButton>
              <SystemButton type="button" size="md" variant="outline" className="h-11 min-h-11" disabled={loading || submitting} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void refreshBalances()}>
                Actualizar saldo
              </SystemButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
