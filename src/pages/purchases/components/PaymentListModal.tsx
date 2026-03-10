import { Modal } from "@/components/settings/modal";
import { removePayment } from "@/services/paymentService";
import { listPayments } from "@/services/purchaseService";
import { Payment } from "@/pages/purchases/types/purchase";
import { money } from "@/utils/functionPurchases";
import { Plus, Power } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PaymentModal } from "./PaymentModal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";

const PRIMARY = "#21b8a6";

export type PaymentListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  poId: string;
  payments?: Payment[];
  total?:number;
  loadPurchases: ()=> void,
  credit?:boolean
};

export function PaymentListModal({
  title,
  close,
  className,
  poId,
  payments,
  total,
  loadPurchases,
  credit
}: PaymentListModalProps) {
  const [rows, setRows] = useState<Payment[]>(payments ?? []);
  const [loading, setLoading] = useState(false);
  const [modalPayment, setModalPayment] = useState(false);
  const { showFlash, clearFlash } = useFlashMessage();

  const reloadPayments = async (options?: { silent?: boolean }) => {
    if (!poId) return;
    if (!options?.silent) clearFlash();
    setLoading(true);
    try {
      const data = await listPayments(poId);
      setRows(data ?? []);
    } catch {
      setRows([]);
      if (!options?.silent) {
        showFlash(errorResponse("No se pudieron cargar los pagos."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!poId || payments) return;
      setLoading(true);
      clearFlash();
      try {
        const data = await listPayments(poId);
        if (alive) setRows(data ?? []);
      } catch {
        if (alive) {
          setRows([]);
          showFlash(errorResponse("No se pudieron cargar los pagos."));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [poId, payments]);

  useEffect(() => {
    if (payments) setRows(payments);
  }, [payments]);

  const listKey = useMemo(() => `${rows.length}|${poId}`, [rows.length, poId]);
  const totalPaid = rows.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalToPay = (total ?? 0) - totalPaid;

  const handleRemove = async (paymentId?: string | null) => {
    if (!paymentId) return;
    clearFlash();
    try {
      const res = await removePayment(paymentId);
      if (res.type === "success") {
        showFlash(successResponse("Pago eliminado con exito"));
        await reloadPayments({ silent: true });
        if(loadPurchases){
          loadPurchases();
        }
      } else {
        showFlash(errorResponse("Error al eliminar pago"));
      }
    } catch {
      showFlash(errorResponse("Error al eliminar pago"));
    }
  };

  return (
    <Modal onClose={close} title={title} className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-black/60">
            {loading ? "Cargando..." : `${rows.length} pagos`}
          </div>
          {
            !credit && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white"
                style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                onClick={() => {
                  setModalPayment(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Agregar pago
              </button>
            ) 
          }
        </div>

        <div className="rounded-2xl border border-black/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 text-xs text-black/60">
            <span>Listado de pagos</span>
            <span>{loading ? "Cargando..." : `${rows.length} registros`}</span>
          </div>
          <div className="max-h-56 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-2 px-5 text-left">Fecha</th>
                  <th className="py-2 px-5 text-left">Metodo</th>
                  <th className="py-2 px-5 text-left">Moneda</th>
                  <th className="py-2 px-5 text-left">Monto</th>
                  <th className="py-2 px-5 text-left">Operacion</th>
                  <th className="py-2 px-5 text-left">Nota</th>
                  <th className="py-2 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody key={listKey}>
                {rows.map((p) => (
                  <tr key={p.payDocId} className="border-b border-black/5">
                    <td className="py-2 px-5 text-left">{p.date ? new Date(p.date).toLocaleDateString() : "-"}</td>
                    <td className="py-2 px-5 text-left">{p.method}</td>
                    <td className="py-2 px-5 text-left">{p.currency}</td>
                    <td className="py-2 px-5 text-left">{money(p.amount ?? 0, p.currency)}</td>
                    <td className="py-2 px-5 text-left">{p.operationNumber ?? "-"}</td>
                    <td className="py-2 px-5 text-left">{p.note ?? "-"}</td>
                    <td className="py-2 px-5 text-right">
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-red-500 text-lime-50 font-semibold hover:bg-red-400"
                        onClick={() => handleRemove(p.payDocId)}
                        title="Eliminar pago"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && rows.length === 0 && (
              <div className="px-4 py-4 text-sm text-black/60">No hay pagos registrados.</div>
            )}
          </div>
        </div>
      </div>
      {
        modalPayment && (
          <PaymentModal
            title="Formulario de Pago"
            close={() =>{
              setModalPayment(false);
            }}
            className="max-w-[800px]"
            totalPaid={totalPaid}
            totalToPay={totalToPay}
            poId={poId}
            onSaved={() => reloadPayments({ silent: true })}
          />
        )
      }
    </Modal>
  );
}


