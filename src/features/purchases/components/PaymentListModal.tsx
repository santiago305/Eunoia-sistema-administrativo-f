import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { approvePayment, rejectPayment, removePayment } from "@/shared/services/paymentService";
import { listPayments } from "@/shared/services/purchaseService";
import { Payment } from "@/features/purchases/types/purchase";
import { money } from "@/shared/utils/functionPurchases";
import { PaymentModal } from "./PaymentModal";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { Modal } from "@/shared/components/modales/Modal";
import { usePermissions } from "@/shared/hooks/usePermissions";

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
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canApprovePayment = can("purchases.approve_payment");

  const reloadPayments = useCallback(async (options?: { silent?: boolean }) => {
    if (!poId) return;
    if (!options?.silent) clearFeedback();

    setLoading(true);
    try {
      const data = await listPayments(poId);
      setRows(data ?? []);
    } catch {
      setRows([]);
      if (!options?.silent) {
        showFeedback(errorResponse("No se pudieron cargar los pagos."));
      }
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, poId, showFeedback]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!poId || payments) return;

      setLoading(true);
      clearFeedback();

      try {
        const data = await listPayments(poId);
        if (alive) setRows(data ?? []);
      } catch {
        if (alive) {
          setRows([]);
          showFeedback(errorResponse("No se pudieron cargar los pagos."));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [clearFeedback, poId, payments, open, showFeedback]);

  useEffect(() => {
    if (payments) setRows(payments);
  }, [payments]);

  const visibleRows = useMemo(
    () => (canApprovePayment ? rows : rows.filter((row) => row.status !== "REJECTED")),
    [canApprovePayment, rows],
  );

  const totalPaid = visibleRows.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalToPay = (total ?? 0) - totalPaid;

  const paymentRows = useMemo<PaymentRow[]>(
    () =>
      visibleRows.map((p, index) => ({
        ...p,
        id: p.payDocId ?? `${poId}-${index}`,
      })),
    [visibleRows, poId],
  );

  const handleRemove = useCallback(async (paymentId?: string | null) => {
    if (!paymentId) return;

    clearFeedback();

    try {
      const res = await removePayment(paymentId);

      if (res.type === "success") {
        showFeedback(successResponse("Pago eliminado con exito"));
        await reloadPayments({ silent: true });
        loadPurchases();
      } else {
        showFeedback(errorResponse("Error al eliminar pago"));
      }
    } catch {
      showFeedback(errorResponse("Error al eliminar pago"));
    }
  }, [clearFeedback, loadPurchases, reloadPayments, showFeedback]);

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
        id: "status",
        header: "Estado",
        cell: (row) => {
          const status = row.status ?? "APPROVED";
          if (status === "PENDING_APPROVAL") {
            return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Por confirmar</span>;
          }
          if (status === "REJECTED") {
            return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Rechazado</span>;
          }
          return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Aprobado</span>;
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => (
          <div className="flex justify-end gap-2">
            {canApprovePayment && row.status === "PENDING_APPROVAL" ? (
              <>
                <SystemButton
                  size="sm"
                  onClick={async () => {
                    if (!row.payDocId) return;
                    const res = await approvePayment(row.payDocId);
                    if (res.type === "success") {
                      showFeedback(successResponse(res.message));
                      await reloadPayments({ silent: true });
                      loadPurchases();
                    } else {
                      showFeedback(errorResponse(res.message));
                    }
                  }}
                >
                  Aprobar
                </SystemButton>
                <SystemButton
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (!row.payDocId) return;
                    const res = await rejectPayment(row.payDocId);
                    if (res.type === "success") {
                      showFeedback(successResponse(res.message));
                      await reloadPayments({ silent: true });
                      loadPurchases();
                    } else {
                      showFeedback(errorResponse(res.message));
                    }
                  }}
                >
                  Rechazar
                </SystemButton>
              </>
            ) : null}
            <SystemButton
              variant="danger"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRemove(row.payDocId)}
              title="Eliminar pago"
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [canApprovePayment, handleRemove, loadPurchases, reloadPayments, showFeedback],
  );

  return (
    <Modal open={open} onClose={close} title={title} className={className}>
      <div className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-sm border border-black/10 bg-black/[0.02] px-4 py-3">
            <p className="text-xs text-black/60">Pagos registrados</p>
            <div className="mt-1 text-sm font-semibold text-black tabular-nums">
              {loading ? "Cargando..." : `${visibleRows.length} registros`}
            </div>
          </div>

          <div className="rounded-sm border border-black/10 bg-emerald-50/70 px-4 py-3">
            <p className="text-xs text-black/60">Total pagado</p>
            <div className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums">
              {money(totalPaid, rows[0]?.currency ?? "PEN")}
            </div>
          </div>

          <div className="rounded-sm border border-black/10 bg-rose-50/70 px-4 py-3">
            <p className="text-xs text-black/60">Total pendiente</p>
            <div className="mt-1 text-sm font-semibold text-rose-700 tabular-nums">
              {money(totalToPay, rows[0]?.currency ?? "PEN")}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">

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

