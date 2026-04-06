import { useEffect, useMemo, useState } from "react";
import { Plus, Power, ReceiptText } from "lucide-react";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { removePayment } from "@/services/paymentService";
import { listPayments } from "@/services/purchaseService";
import { Payment } from "@/pages/purchases/types/purchase";
import { money } from "@/utils/functionPurchases";
import { PaymentModal } from "./PaymentModal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { Modal } from "@/components/modales/Modal";

const PRIMARY = "hsl(var(--primary))";

export type PaymentListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  poId: string;
  payments?: Payment[];
  total?: number;
  loadPurchases: () => void;
  credit?: boolean;
  open: boolean;
};

type PaymentRow = Payment & {
  id: string;
};

export function PaymentListModal({
  title,
  close,
  className,
  poId,
  payments,
  total,
  loadPurchases,
  credit,
  open
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

  const totalPaid = rows.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalToPay = (total ?? 0) - totalPaid;

  const paymentRows = useMemo<PaymentRow[]>(
    () =>
      rows.map((p, index) => ({
        ...p,
        id: p.payDocId ?? `${poId}-${index}`,
      })),
    [rows, poId],
  );

  const handleRemove = async (paymentId?: string | null) => {
    if (!paymentId) return;

    clearFlash();

    try {
      const res = await removePayment(paymentId);

      if (res.type === "success") {
        showFlash(successResponse("Pago eliminado con exito"));
        await reloadPayments({ silent: true });
        loadPurchases();
      } else {
        showFlash(errorResponse("Error al eliminar pago"));
      }
    } catch {
      showFlash(errorResponse("Error al eliminar pago"));
    }
  };

  const columns = useMemo<DataTableColumn<PaymentRow>[]>(
    () => [
      {
        id: "date",
        header: "Fecha",
        cell: (row) => (
          <span>{row.date ? new Date(row.date).toLocaleDateString() : "-"}</span>
        ),
        hideable: false,
      },
      {
        id: "method",
        header: "Metodo",
        accessorKey: "method",
        hideable: false,
      },
      {
        id: "currency",
        header: "Moneda",
        accessorKey: "currency",
      },
      {
        id: "amount",
        header: "Monto",
        cell: (row) => <span>{money(row.amount ?? 0, row.currency)}</span>,
        hideable: false,
      },
      {
        id: "operationNumber",
        header: "Operacion",
        cell: (row) => <span>{row.operationNumber ?? "-"}</span>,
      },
      {
        id: "note",
        header: "Nota",
        cell: (row) => <span>{row.note ?? "-"}</span>,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="danger"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRemove(row.payDocId)}
              title="Eliminar pago"
            >
              <Power className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [rows],
  );

  return (
    <Modal open={open} onClose={close} title={title} className={className}>
      <div className="space-y-4">
        <div className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeaderForm icon={ReceiptText} title="Listado de pagos" />

            {!credit && (
              <SystemButton
                leftIcon={<Plus className="h-4 w-4" />}
                style={{
                  backgroundColor: PRIMARY,
                  borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                }}
                onClick={() => setModalPayment(true)}
              >
                Agregar pago
              </SystemButton>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3">
              <p className="text-xs text-black/60">Pagos registrados</p>
              <div className="mt-1 text-sm font-semibold text-black tabular-nums">
                {loading ? "Cargando..." : `${rows.length} registros`}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-emerald-50/70 px-4 py-3">
              <p className="text-xs text-black/60">Total pagado</p>
              <div className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums">
                {money(totalPaid, rows[0]?.currency ?? "PEN")}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-rose-50/70 px-4 py-3">
              <p className="text-xs text-black/60">Total pendiente</p>
              <div className="mt-1 text-sm font-semibold text-rose-700 tabular-nums">
                {money(totalToPay, rows[0]?.currency ?? "PEN")}
              </div>
            </div>
          </div>

          <DataTable
            tableId={`purchase-payments-table-${poId}`}
            data={paymentRows}
            columns={columns}
            rowKey="id"
            loading={loading}
            emptyMessage="No hay pagos registrados."
            hoverable={false}
            animated={false}
          />
        </div>
      </div>
      <PaymentModal
        title="Formulario de Pago"
        close={() => {
          setModalPayment(false);
        }}
        open={modalPayment}
        className="max-w-[800px]"
        totalPaid={totalPaid}
        totalToPay={totalToPay}
        poId={poId}
        onSaved={() => reloadPayments({ silent: true })}
        loadPurchases={loadPurchases}
      />
    </Modal>
  );
}