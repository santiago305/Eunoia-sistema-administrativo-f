import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Check, Trash2, X } from "lucide-react";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  approvePayment,
  listPayments,
  rejectPayment,
  removePayment,
  type ListPaymentsResponse,
} from "@/shared/services/paymentService";
import type { Payment } from "@/features/purchases/types/purchase";
import {
  canShowPaymentApprovalActions,
  canShowPaymentDeleteAction,
  getPaymentStatusView,
  type PaymentStatus,
} from "./paymentView";

const DEFAULT_LIMIT = 20;

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function Payments() {
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();
  const canManagePayments = can("payments.manage");
  const canApprovePayment = can("purchases.approve_payment");

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [poIdFilter, setPoIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [pagination, setPagination] = useState<Pick<ListPaymentsResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPayments({
        page: pagination.page,
        limit: pagination.limit,
        poId: poIdFilter.trim() || undefined,
        status: statusFilter || undefined,
      });
      setPayments(Array.isArray(data?.items) ? data.items : []);
      setPagination({
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        limit: data?.limit ?? DEFAULT_LIMIT,
      });
    } catch {
      setPayments([]);
      showFeedback(errorResponse("No se pudo cargar la lista de pagos."));
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, poIdFilter, showFeedback, statusFilter]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleDelete = useCallback(
    async (payDocId?: string) => {
      if (!canManagePayments || !payDocId || deletingId) return;
      setDeletingId(payDocId);
      try {
        await removePayment(payDocId);
        showFeedback(successResponse("Pago eliminado correctamente."));
        await loadPayments();
      } catch {
        showFeedback(errorResponse("No se pudo eliminar el pago."));
      } finally {
        setDeletingId(null);
      }
    },
    [canManagePayments, deletingId, loadPayments, showFeedback],
  );

  const handleApprove = useCallback(
    async (payDocId?: string) => {
      if (!canApprovePayment || !payDocId || reviewingId) return;
      setReviewingId(payDocId);
      try {
        const res = await approvePayment(payDocId);
        if (res.type === "success") {
          showFeedback(successResponse(res.message));
          await loadPayments();
          return;
        }
        showFeedback(errorResponse(res.message));
      } catch {
        showFeedback(errorResponse("No se pudo aprobar el pago."));
      } finally {
        setReviewingId(null);
      }
    },
    [canApprovePayment, loadPayments, reviewingId, showFeedback],
  );

  const handleReject = useCallback(
    async (payDocId?: string) => {
      if (!canApprovePayment || !payDocId || reviewingId) return;
      const reason = window.prompt("Motivo del rechazo")?.trim();
      setReviewingId(payDocId);
      try {
        const res = await rejectPayment(payDocId, reason || undefined);
        if (res.type === "success") {
          showFeedback(successResponse(res.message));
          await loadPayments();
          return;
        }
        showFeedback(errorResponse(res.message));
      } catch {
        showFeedback(errorResponse("No se pudo rechazar el pago."));
      } finally {
        setReviewingId(null);
      }
    },
    [canApprovePayment, loadPayments, reviewingId, showFeedback],
  );

  const columns = useMemo<DataTableColumn<Payment>[]>(
    () => [
      {
        id: "status",
        header: "Estado",
        cell: (row) => {
          const status = getPaymentStatusView(row.status);
          return (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
              {status.label}
            </span>
          );
        },
        hideable: false,
      },
      {
        id: "payDocId",
        header: "ID",
        cell: (row) => <span className="text-xs text-black/70">{row.payDocId ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "poId",
        header: "Orden Compra",
        cell: (row) => <span className="text-xs text-black/70">{row.poId ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "quotaId",
        header: "Cuota",
        cell: (row) => <span className="text-xs text-black/70">{row.quotaId ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "method",
        header: "Metodo",
        cell: (row) => <span className="text-black/80">{row.method}</span>,
      },
      {
        id: "currency",
        header: "Moneda",
        cell: (row) => <span className="text-black/80">{row.currency}</span>,
      },
      {
        id: "amount",
        header: "Monto",
        cell: (row) => <span className="text-black/80">{row.amount ?? "-"}</span>,
      },
      {
        id: "date",
        header: "Fecha",
        cell: (row) => <span className="text-black/70">{formatDate(row.date)}</span>,
      },
      {
        id: "requestedByUserId",
        header: "Solicitante",
        cell: (row) => <span className="text-xs text-black/70">{row.requestedByUserId ?? "-"}</span>,
      },
      {
        id: "approvedByUserId",
        header: "Aprobador",
        cell: (row) => <span className="text-xs text-black/70">{row.approvedByUserId ?? "-"}</span>,
      },
      {
        id: "approvedAt",
        header: "Aprobado",
        cell: (row) => <span className="text-black/70">{formatDate(row.approvedAt)}</span>,
      },
      {
        id: "rejectedAt",
        header: "Rechazado",
        cell: (row) => <span className="text-black/70">{formatDate(row.rejectedAt)}</span>,
      },
      {
        id: "rejectionReason",
        header: "Motivo",
        cell: (row) => <span className="text-black/70">{row.rejectionReason ?? "-"}</span>,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        hideable: false,
        sortable: false,
        cell: (row) => (
          <div className="flex justify-end gap-2">
            {canShowPaymentApprovalActions(row.status, canApprovePayment) ? (
              <>
                <SystemButton
                  size="sm"
                  disabled={!row.payDocId || reviewingId === row.payDocId}
                  onClick={() => void handleApprove(row.payDocId)}
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Aprobar
                </SystemButton>
                <SystemButton
                  size="sm"
                  variant="danger"
                  disabled={!row.payDocId || reviewingId === row.payDocId}
                  onClick={() => void handleReject(row.payDocId)}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Rechazar
                </SystemButton>
              </>
            ) : null}
            {canShowPaymentDeleteAction(canManagePayments) ? (
              <SystemButton
                size="sm"
                variant="ghost"
                disabled={!row.payDocId || deletingId === row.payDocId}
                onClick={() => void handleDelete(row.payDocId)}
                leftIcon={<Trash2 className="h-4 w-4 text-rose-600" />}
              >
                {deletingId === row.payDocId ? "Eliminando..." : "Eliminar"}
              </SystemButton>
            ) : null}
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
      },
    ],
    [canApprovePayment, canManagePayments, deletingId, handleApprove, handleDelete, handleReject, reviewingId],
  );

  return (
    <PageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            value={poIdFilter}
            onChange={(e) => setPoIdFilter(e.target.value)}
            placeholder="Filtrar por poId"
            className="h-9 rounded-lg border border-black/15 bg-white px-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "")}
            className="h-9 rounded-lg border border-black/15 bg-white px-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING_APPROVAL">Pendiente</option>
            <option value="APPROVED">Aprobado</option>
            <option value="REJECTED">Rechazado</option>
          </select>
          <SystemButton size="sm" onClick={() => void loadPayments()}>
            Buscar
          </SystemButton>
        </div>
      </div>

      <DataTable
        tableId="payments-table"
        data={payments}
        columns={columns}
        rowKey="payDocId"
        loading={loading}
        emptyMessage="No hay pagos para los filtros actuales."
        hoverable={false}
        animated={false}
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
        }}
        onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
      />
    </PageShell>
  );
}


