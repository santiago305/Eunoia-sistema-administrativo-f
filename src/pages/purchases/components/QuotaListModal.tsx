import { Modal } from "@/components/settings/modal";
import { listQuotas } from "@/services/purchaseService";
import type { CreditQuota } from "@/pages/purchases/types/purchase";
import type { CurrencyType } from "@/pages/purchases/types/purchaseEnums";
import { CurrencyTypes } from "@/pages/purchases/types/purchaseEnums";
import { money } from "@/utils/functionPurchases";
import { Banknote, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PaymentModal } from "./PaymentModal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";

const PRIMARY = "#21b8a6";

export type QuotaListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  poId: string;
  quotas?: CreditQuota[];
  currency?: CurrencyType;
  loadPurchases: () => void;
};

type SelectedTotals = {
  totalPaid: number;
  totalToPay: number;
};

export function QuotaListModal({
  title,
  close,
  className,
  poId,
  quotas,
  currency = CurrencyTypes.PEN,
  loadPurchases,
}: QuotaListModalProps) {
  const [rows, setRows] = useState<CreditQuota[]>(quotas ?? []);
  const [loading, setLoading] = useState(false);
  const [modalPayment, setModalPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qtaId, setQtaId] = useState("");
  const [selectedTotals, setSelectedTotals] = useState<SelectedTotals>({
    totalPaid: 0,
    totalToPay: 0,
  });
  const { showFlash, clearFlash } = useFlashMessage();

  const loadQuotas = async () => {
      if (!poId || quotas) return;
      setLoading(true);
      clearFlash();
      setError(null);
      try {
          const data = await listQuotas(poId);
          setRows(data ?? []);
      } catch {
          setRows([]);
          showFlash(errorResponse("No se pudieron cargar las cuotas."));
      } finally {
          setLoading(false);
      }
  };
  useEffect(() => {
    void loadQuotas();
  }, [poId, quotas, clearFlash, showFlash]);

  useEffect(() => {
    if (quotas) setRows(quotas);
  }, [quotas]);

  const listKey = useMemo(() => `${rows.length}|${poId}`, [rows.length, poId]);

  const openPaymentModal = (quota: CreditQuota) => {
    const paid = quota.totalPaid ?? 0;
    const pending = (quota.totalToPay ?? 0) - paid;
    setSelectedTotals({
      totalPaid: paid,
      totalToPay: pending,
    });
    setModalPayment(true);
  };

  return (
    <Modal onClose={close} title={title} className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-black/60">
            {loading ? "Cargando..." : `${rows.length} cuotas`}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 text-xs text-black/60">
            <span>Listado de cuotas</span>
            <span>{loading ? "Cargando..." : `${rows.length} registros`}</span>
          </div>
          <div className="max-h-200 overflow-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-2 px-5 text-left w-5">Cuota</th>
                  <th className="py-2 px-5 text-left w-15">Vence</th>
                  <th className="py-2 px-5 text-left w-15">Pago</th>
                  <th className="py-2 px-5 text-left w-20">Total</th>
                  <th className="py-2 px-5 text-left w-20">Pagado</th>
                  <th className="py-2 px-5 text-left w-20">Pendiente</th>
                  <th className="py-2 px-5 text-right w-25">Acciones</th>
                </tr>
              </thead>
              <tbody key={listKey}>
                {rows.map((q) => {
                  const paid = q.totalPaid ?? 0;
                  const pending = (q.totalToPay ?? 0) - paid;
                  const isFullyPaid = pending <= 0;
                  return (
                    <tr key={q.quotaId ?? `${q.number}-${q.expirationDate}`} className="border-b border-black/5">
                      <td className="py-2 px-5 text-left">{q.number}</td>
                      <td className="py-2 px-5 text-left">
                        {q.expirationDate ? new Date(q.expirationDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-2 px-5 text-left">
                        {q.paymentDate ? new Date(q.paymentDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-2 px-5 text-left">{money(q.totalToPay ?? 0, currency)}</td>
                      <td className="py-2 px-5 text-left">{money(paid, currency)}</td>
                      <td className="py-2 px-5 text-left">{money(pending, currency)}</td>
                      <td className="py-2 px-5 text-left">
                        {
                          !isFullyPaid && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs text-white"
                              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                              onClick={() => {
                                openPaymentModal(q);
                                setQtaId(q.quotaId ?? "");
                              }}
                              title="Agregar pago"
                            >
                              Agregar <Banknote className="h-6 w-6" />
                            </button>
                          )
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && rows.length === 0 && (
              <div className="px-4 py-4 text-sm text-black/60">No hay cuotas registradas.</div>
            )}
            {error && <div className="px-4 py-4 text-sm text-rose-600">{error}</div>}
          </div>
        </div>
      </div>
      {modalPayment && (
        <PaymentModal
          title="Formulario de Pago"
          close={() => {
            setModalPayment(false);
          }}
          className="max-w-[800px]"
          totalPaid={selectedTotals.totalPaid}
          totalToPay={selectedTotals.totalToPay}
          poId={poId}
          quotaId={qtaId}
          loadQuotas={loadQuotas}
          loadPurchases={loadPurchases}
        />
      )}
    </Modal>
  );
}


