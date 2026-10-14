import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  cancelSaleOrder,
  listSaleOrderPayments,
  type SaleOrderCancellationResolution,
} from "@/shared/services/saleOrderService";
import { listIncomeCancellationTargets, type IncomeTransferTarget } from "@/shared/services/incomeService";
import type { SaleOrderPayment } from "@/features/sale-orders/types/saleOrder";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";
import {
  clearPendingSaleOrderCancellation,
  loadPendingSaleOrderCancellation,
  savePendingSaleOrderCancellation,
  type PendingSaleOrderCancellation,
} from "../../services/sale-order-cancellation-recovery";

type Props = {
  open: boolean;
  saleOrderId: string;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

type ResolutionDraft = SaleOrderCancellationResolution;

const activePayment = (payment: SaleOrderPayment) =>
  payment.status === "PENDING_CONFIRMATION" || payment.status === "POSTED";

export function SaleOrderCancellationResolutionModal({
  open,
  saleOrderId,
  onClose,
  onCompleted,
}: Props) {
  const { can } = usePermissions();
  const { userId } = useAuth();
  const [payments, setPayments] = useState<SaleOrderPayment[]>([]);
  const [resolutions, setResolutions] = useState<ResolutionDraft[]>([]);
  const [targetsByIncome, setTargetsByIncome] = useState<Record<string, IncomeTransferTarget[]>>({});
  const [loadingTargets, setLoadingTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [idempotency, setIdempotency] = useState<{ signature: string; key: string } | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<PendingSaleOrderCancellation | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setConfirmed(false);
    const savedOperation = userId ? loadPendingSaleOrderCancellation(userId, saleOrderId) : null;
    setPendingRecovery(savedOperation);
    setIdempotency(savedOperation ? { signature: JSON.stringify({ resolutions: savedOperation.resolutions }), key: savedOperation.idempotencyKey } : null);
    listSaleOrderPayments(saleOrderId)
      .then((rows) => {
        if (requestRef.current !== requestId) return;
        const active = rows.filter(activePayment);
        setPayments(active);
        const initialResolutions = active.map((payment) => ({
          incomeId: payment.id,
          action: payment.status === "PENDING_CONFIRMATION" ? "CANCEL_PENDING" : "KEEP_AS_CREDIT",
          reason: "",
        })) as ResolutionDraft[];
        setResolutions(savedOperation?.resolutions ?? initialResolutions);
      })
      .catch((cause) => {
        if (requestRef.current === requestId) setError(parseApiError(cause, "No se pudieron cargar los ingresos del pedido."));
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => { requestRef.current += 1; };
  }, [open, saleOrderId, userId]);

  const updateResolution = (incomeId: string, patch: Partial<ResolutionDraft>) => {
    if (pendingRecovery) return;
    setError("");
    setResolutions((current) => current.map((item) => item.incomeId === incomeId ? { ...item, ...patch } : item));
    setIdempotency(null);
  };

  const ready = !loading && !submitting && !error && confirmed && resolutions.length === payments.length && resolutions.every((item) =>
    item.reason.trim().length >= 5 &&
    (!["TRANSFER_PENDING", "APPLY_TO_ORDER"].includes(item.action) || Boolean(item.targetSaleOrderId)) &&
    (!["REFUND", "APPLY_TO_ORDER"].includes(item.action) || (
      Number(item.amount) > 0 &&
      Number(item.amount) <= (payments.find((payment) => payment.id === item.incomeId)?.amount ?? 0) &&
      Number(item.amount) <= (targetsByIncome[item.incomeId]?.find((target) => target.saleOrderId === item.targetSaleOrderId)?.available ?? Number.MAX_SAFE_INTEGER)
    )),
  );

  const submit = async (recovery?: PendingSaleOrderCancellation) => {
    if (!recovery && !ready) return;
    if (!recovery && !userId) {
      setError("No se pudo identificar la sesión. Vuelve a iniciar sesión antes de cancelar el pedido.");
      return;
    }
    setSubmitting(true);
    setError("");
    const submittedResolutions = recovery?.resolutions ?? resolutions;
    const signature = JSON.stringify({ resolutions: submittedResolutions });
    const operation: PendingSaleOrderCancellation = recovery ?? {
      userId: userId!,
      saleOrderId,
      idempotencyKey: idempotency?.signature === signature ? idempotency.key : createIdempotencyKey(),
      resolutions: submittedResolutions,
      createdAt: new Date().toISOString(),
    };
    if (!recovery && !savePendingSaleOrderCancellation(operation)) {
      setError("No se pudo guardar la solicitud de forma segura en esta sesión. Habilita el almacenamiento del navegador e inténtalo nuevamente.");
      setSubmitting(false);
      return;
    }
    setPendingRecovery(operation);
    setIdempotency({ signature, key: operation.idempotencyKey });
    try {
      await cancelSaleOrder(saleOrderId, { idempotencyKey: operation.idempotencyKey, resolutions: operation.resolutions });
      await onCompleted();
      clearPendingSaleOrderCancellation(operation);
      setPendingRecovery(null);
      onClose();
    } catch (cause) {
      setError(parseApiError(cause, "No se pudo cancelar el pedido. Revisa los ingresos y vuelve a intentarlo."));
      const status = (cause as { response?: { status?: number; data?: { code?: string } } } | null)?.response?.status;
      const code = (cause as { response?: { data?: { code?: string } } } | null)?.response?.data?.code;
      const outcomeMayBeUnknown = status === undefined || status === 0 || status === 408 || status === 429 || status >= 500 || code === "OPERATION_IN_PROGRESS";
      if (!outcomeMayBeUnknown) {
        clearPendingSaleOrderCancellation(operation);
        setPendingRecovery(null);
        setIdempotency(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const money = (amount: number, currency = "PEN") => new Intl.NumberFormat("es-PE", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);

  const selectResolution = async (payment: SaleOrderPayment, action: ResolutionDraft["action"]) => {
    if (pendingRecovery) return;
    updateResolution(payment.id, {
      action,
      targetSaleOrderId: undefined,
      amount: action === "REFUND" || action === "APPLY_TO_ORDER" ? payment.amount : undefined,
    });
    if (action !== "TRANSFER_PENDING" && action !== "APPLY_TO_ORDER") return;
    setLoadingTargets((current) => [...current, payment.id]);
    try {
      const targets = await listIncomeCancellationTargets(payment.id);
      setTargetsByIncome((current) => ({ ...current, [payment.id]: targets }));
    } catch (cause) {
      setError(parseApiError(cause, "No se pudieron cargar los pedidos destino compatibles."));
    } finally {
      setLoadingTargets((current) => current.filter((id) => id !== payment.id));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resolver pagos del pedido"
      description="Cada decisión y la cancelación del pedido se guardarán en una sola operación."
      preventClose={submitting}
      closeOnOverlayClick={!submitting}
      closeOnEscape={!submitting}
      className="max-h-[90vh] w-[min(760px,calc(100vw-24px))]"
      bodyClassName="space-y-4 overflow-y-auto"
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            Volver
          </button>
          <button type="button" onClick={() => void submit(pendingRecovery ?? undefined)} disabled={submitting || loading || (!pendingRecovery && !ready)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <AlertTriangle aria-hidden="true" className="h-4 w-4" />}
            {submitting ? "Procesando…" : pendingRecovery ? "Reintentar cancelación segura" : "Resolver y cancelar pedido"}
          </button>
        </div>
      )}
    >
      {loading ? (
        <div role="status" className="py-8 text-center text-sm text-zinc-600">Cargando ingresos del pedido…</div>
      ) : (
        <>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {pendingRecovery && (
            <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              Hay una cancelación cuyo resultado no se confirmó en esta sesión. Se conservaron sus decisiones; no las edites. Reintenta para consultar o completar la misma operación sin duplicarla.
            </p>
          )}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Los ingresos contabilizados nunca se eliminan ni vuelven a “por confirmar”. El saldo o reembolso conservará el historial financiero.
          </div>
          {payments.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">No hay ingresos pendientes ni contabilizados. Puedes confirmar la cancelación.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const resolution = resolutions.find((item) => item.incomeId === payment.id);
                if (!resolution) return null;
                const pending = payment.status === "PENDING_CONFIRMATION";
                const canRefund = can("customer_refunds.create");
                return (
                  <section key={payment.id} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Ingreso {pending ? "por confirmar" : "contabilizado"}</h3>
                        <p className="mt-1 text-sm text-zinc-600">{payment.method} · {payment.operationNumber || "Sin número de operación"}</p>
                      </div>
                      <span className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-zinc-900">{money(payment.amount, payment.currency)}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-zinc-800">
                        Resolución
                        <select
                          value={resolution.action}
                          onChange={(event) => void selectResolution(payment, event.target.value as ResolutionDraft["action"])}
                          disabled={Boolean(pendingRecovery)}
                          className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                        >
                          {pending ? (
                            <option value="CANCEL_PENDING">Cancelar ingreso por confirmar</option>
                          ) : (
                            <>
                              <option value="KEEP_AS_CREDIT">Mantener el dinero como saldo a favor</option>
                              {can("customer_credits.apply") && <option value="APPLY_TO_ORDER">Aplicar a otro pedido</option>}
                              {canRefund && <option value="REFUND">Registrar reembolso pendiente</option>}
                            </>
                          )}
                          {pending && can("sale_orders.payments.transfer_pending") && <option value="TRANSFER_PENDING">Transferir ingreso a otro pedido</option>}
                        </select>
                        {resolution.action === "REFUND" && (
                          <span className="mt-1 block text-xs font-normal text-zinc-600">El reembolso queda pendiente; esta acción no registra una salida bancaria.</span>
                        )}
                      </label>
                      {["TRANSFER_PENDING", "APPLY_TO_ORDER"].includes(resolution.action) && (
                        <label className="block text-sm font-medium text-zinc-800">
                          Pedido destino
                          <select value={resolution.targetSaleOrderId ?? ""} onChange={(event) => updateResolution(payment.id, { targetSaleOrderId: event.target.value || undefined })} disabled={Boolean(pendingRecovery) || loadingTargets.includes(payment.id)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
                            <option value="">{loadingTargets.includes(payment.id) ? "Cargando pedidos…" : "Selecciona un pedido"}</option>
                            {(targetsByIncome[payment.id] ?? []).map((target) => <option key={target.saleOrderId} value={target.saleOrderId}>{target.saleOrderNumber} · {target.clientName} · Disponible {money(target.available, target.currency)}</option>)}
                          </select>
                        </label>
                      )}
                      {resolution.action === "APPLY_TO_ORDER" && (
                        <label className="block text-sm font-medium text-zinc-800">
                          Importe a aplicar ({payment.currency ?? "PEN"})
                          <input type="number" min="0.01" max={payment.amount} step="0.01" value={resolution.amount ?? payment.amount} onChange={(event) => updateResolution(payment.id, { amount: Number(event.target.value) })} disabled={Boolean(pendingRecovery)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
                        </label>
                      )}
                      {resolution.action === "REFUND" && (
                        <label className="block text-sm font-medium text-zinc-800">
                          Importe a reembolsar ({payment.currency ?? "PEN"})
                          <input type="number" min="0.01" max={payment.amount} step="0.01" value={resolution.amount ?? payment.amount} onChange={(event) => updateResolution(payment.id, { amount: Number(event.target.value) })} disabled={Boolean(pendingRecovery)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" />
                        </label>
                      )}
                    </div>
                    <label className="block text-sm font-medium text-zinc-800">
                      Motivo <span aria-hidden="true" className="text-rose-700">*</span>
                      <textarea value={resolution.reason} onChange={(event) => updateResolution(payment.id, { reason: event.target.value })} minLength={5} maxLength={500} rows={2} disabled={Boolean(pendingRecovery)} className="mt-1 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700" aria-describedby={`cancel-reason-help-${payment.id}`} />
                      <span id={`cancel-reason-help-${payment.id}`} className="mt-1 block text-xs font-normal text-zinc-600">Entre 5 y 500 caracteres; quedará en la auditoría financiera.</span>
                    </label>
                  </section>
                );
              })}
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 text-sm text-zinc-800">
            <input type="checkbox" checked={confirmed} onChange={(event) => { setError(""); setConfirmed(event.target.checked); }} disabled={Boolean(pendingRecovery)} className="mt-0.5 h-4 w-4 accent-rose-700" />
            <span>Confirmo las resoluciones indicadas y la cancelación definitiva del pedido.</span>
          </label>
        </>
      )}
    </Modal>
  );
}
