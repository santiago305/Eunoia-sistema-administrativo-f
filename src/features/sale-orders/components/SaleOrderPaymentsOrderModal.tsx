import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { SaleOrder, SaleOrderPayment, SaleOrderPaymentInput } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderPaymentEditor } from "@/features/sale-orders/components/SaleOrderPaymentEditor";
import { useSaleOrderPaymentOptions } from "@/features/sale-orders/components/useSaleOrderPaymentOptions";
import {
  createSaleOrderPayment,
  deleteSaleOrderPayment,
  fetchSaleOrderById,
  listSaleOrderPayments,
} from "@/shared/services/saleOrderService";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";

type Props = {
  open: boolean;
  saleOrderId: string;
  saleOrderLabel?: string;
  onClose: () => void;
  onUpdated?: () => void;
};

const DASH = "\u2014";
const PRIMARY = "hsl(var(--primary))";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatMoney = (value: number) => {
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
  } catch {
    return `S/ ${(Number(value) || 0).toFixed(2)}`;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return DASH;
  return value.length >= 10 ? value.slice(0, 10) : value;
};

export function SaleOrderPaymentsOrderModal({ open, saleOrderId, saleOrderLabel, onClose, onUpdated }: Props) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { methodOptions, bankAccountOptions } = useSaleOrderPaymentOptions();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<SaleOrderPayment[]>([]);
  const [order, setOrder] = useState<SaleOrder | null>(null);

  const [draft, setDraft] = useState<SaleOrderPaymentInput>(() => ({
    method: "",
    amount: 0,
    bankAccountId: "",
    date: toLocalDateKey(new Date()),
    operationNumber: "",
    note: "",
  }));

  useEffect(() => {
    if (!open) return;
    setDraft({
      method: "",
      amount: 0,
      bankAccountId: "",
      date: toLocalDateKey(new Date()),
      operationNumber: "",
      note: "",
    });
  }, [open]);

  const title = useMemo(() => {
    if (!saleOrderLabel?.trim()) return "Pagos";
    return `Pagos (${saleOrderLabel})`;
  }, [saleOrderLabel]);

  const loadAll = useCallback(async () => {
    if (!saleOrderId) return;
    clearFeedback();
    setLoading(true);
    try {
      const [nextPayments, nextOrder] = await Promise.all([
        listSaleOrderPayments(saleOrderId),
        fetchSaleOrderById(saleOrderId),
      ]);
      setPayments(nextPayments ?? []);
      setOrder(nextOrder ?? null);
    } catch (err) {
      showFeedback(errorResponse(parseApiError(err, "No se pudieron cargar los pagos.")));
      setPayments([]);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, saleOrderId, showFeedback]);

  useEffect(() => {
    if (!open) return;
    void loadAll();
  }, [loadAll, open]);

  const total = Number(order?.total ?? 0);
  const totalPaid = Number(order?.totalPaid ?? 0);
  const pending = Number(order?.pendingAmount ?? Math.max(0, total - totalPaid));
  const validateDraft = useCallback(() => {
    const amount = Number(draft.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      showFeedback(errorResponse("Monto inválido."));
      return false;
    }
    const pendingSafe = Math.max(0, Number(pending.toFixed(2)));
    const amountSafe = Number(amount.toFixed(2));
    if (amountSafe > pendingSafe) {
      showFeedback(errorResponse(`El pago no puede exceder el pendiente: ${formatMoney(pendingSafe)}.`));
      return false;
    }
    if (!String(draft.method ?? "").trim()) {
      showFeedback(errorResponse("Método requerido."));
      return false;
    }
    const bankAccountId = String(draft.bankAccountId ?? "").trim();
    if (!bankAccountId || !UUID_REGEX.test(bankAccountId)) {
      showFeedback(errorResponse("Cuenta bancaria inválida."));
      return false;
    }
    const date = String(draft.date ?? "").trim();
    if (date) {
      const parsed = Date.parse(date);

      if (Number.isNaN(parsed)) {
        showFeedback(errorResponse("Fecha de pago inválida."));
        return false;
      }
    }
    return true;
  }, [draft.amount, draft.bankAccountId, draft.date, draft.method, pending, showFeedback]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    if (!validateDraft()) return;

    setCreating(true);
    try {
      await createSaleOrderPayment(saleOrderId, {
        bankAccountId: String(draft.bankAccountId ?? "").trim(),
        method: String(draft.method ?? "").trim(),
        amount: Number(draft.amount ?? 0),
        date: draft.date ? String(draft.date).trim() : undefined,
        operationNumber: draft.operationNumber ? String(draft.operationNumber).trim() : undefined,
        note: draft.note ? String(draft.note).trim() : undefined,
      });

      showFeedback(successResponse("Pago registrado."));
      await loadAll();
      onUpdated?.();
      setDraft({
        method: "",
        amount: 0,
        bankAccountId: draft.bankAccountId,
        date: toLocalDateKey(new Date()),
        operationNumber: "",
        note: "",
      });
    } catch (err) {
      showFeedback(errorResponse(parseApiError(err)));
    } finally {
      setCreating(false);
    }
  }, [creating, draft, loadAll, onUpdated, saleOrderId, showFeedback, validateDraft]);

  const handleDelete = useCallback(
    async (paymentId: string) => {
      if (!paymentId || deletingPaymentId) return;
      setDeletingPaymentId(paymentId);
      try {
        await deleteSaleOrderPayment(saleOrderId, paymentId);
        showFeedback(successResponse("Pago eliminado."));
        await loadAll();
        onUpdated?.();
      } catch (err) {
        showFeedback(errorResponse(parseApiError(err)));
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [deletingPaymentId, loadAll, onUpdated, saleOrderId, showFeedback],
  );

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-4xl" bodyClassName="p-4">
      <div className="space-y-4">
        <div className="rounded-xl border border-black/10 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-semibold text-black/70">Agregar pago</div>
            <SystemButton
              leftIcon={<Plus className="h-4 w-4" />}
              style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
              disabled={creating}
              loading={creating}
              onClick={handleCreate}
            >
              Agregar
            </SystemButton>
          </div>
          <div className="mt-3">
            <SaleOrderPaymentEditor
              payment={draft}
              methodOptions={methodOptions}
              bankAccountOptions={bankAccountOptions}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              showRemove={false}
            />
          </div>
        </div>

        <div className="rounded-xl border border-black/10 overflow-hidden">
          <div className="flex items-center justify-between bg-black/[0.02] px-3 py-2 text-xs font-semibold text-black/70">
            <span>Pagos</span>
            <span className="text-[11px] font-semibold text-black/60">
              Total: {formatMoney(total)} · Pagado: {formatMoney(totalPaid)} · Pendiente: {formatMoney(pending)}
            </span>
          </div>

          <div className="scroll-area scrollbar-panel max-h-[45vh] overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-black/50">Cargando...</div>
            ) : payments.length === 0 ? (
              <div className="p-4 text-sm text-black/50">Sin pagos.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-black/10 text-[11px] text-black/45">
                    <th className="px-3 py-2 text-left font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium">Método</th>
                    <th className="px-3 py-2 text-right font-medium">Monto</th>
                    <th className="px-3 py-2 text-left font-medium">Operación</th>
                    <th className="px-3 py-2 text-left font-medium">Nota</th>
                    <th className="px-3 py-2 text-right font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-black/5 last:border-b-0">
                      <td className="px-3 py-2 tabular-nums">{formatDate(payment.date)}</td>
                      <td className="px-3 py-2">{payment.method ?? DASH}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(payment.amount ?? 0))}</td>
                      <td className="px-3 py-2">{payment.operationNumber ?? DASH}</td>
                      <td className="px-3 py-2">{payment.note ?? DASH}</td>
                      <td className="px-3 py-2 text-right">
                        <SystemButton
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          loading={deletingPaymentId === payment.id}
                          disabled={Boolean(deletingPaymentId)}
                          onClick={() => handleDelete(payment.id)}
                        >
                        </SystemButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
