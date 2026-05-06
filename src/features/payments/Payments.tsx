import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { Headed } from "@/shared/components/components/Headed";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Trash2 } from "lucide-react";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { listPayments, removePayment, type ListPaymentsResponse } from "@/shared/services/paymentService";
import type { Payment } from "@/features/purchases/types/purchase";

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
  const { showFlash } = useFlashMessage();
  const canManagePayments = can("payments.manage");

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [poIdFilter, setPoIdFilter] = useState("");
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
      });
      setPayments(Array.isArray(data?.items) ? data.items : []);
      setPagination({
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        limit: data?.limit ?? DEFAULT_LIMIT,
      });
    } catch {
      setPayments([]);
      showFlash(errorResponse("No se pudo cargar la lista de pagos."));
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, poIdFilter, showFlash]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleDelete = useCallback(
    async (payDocId?: string) => {
      if (!canManagePayments || !payDocId || deletingId) return;
      setDeletingId(payDocId);
      try {
        await removePayment(payDocId);
        showFlash(successResponse("Pago eliminado correctamente."));
        await loadPayments();
      } catch {
        showFlash(errorResponse("No se pudo eliminar el pago."));
      } finally {
        setDeletingId(null);
      }
    },
    [canManagePayments, deletingId, loadPayments, showFlash],
  );

  const columns = useMemo<DataTableColumn<Payment>[]>(
    () => [
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
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        hideable: false,
        sortable: false,
        cell: (row) => (
          <div className="flex justify-end">
            {canManagePayments ? (
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
    [canManagePayments, deletingId, handleDelete],
  );

  return (
    <PageShell>
      <PageTitle title="Pagos" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Headed title="Pagos registrados" size="lg" />
        <div className="flex items-center gap-2">
          <input
            value={poIdFilter}
            onChange={(e) => setPoIdFilter(e.target.value)}
            placeholder="Filtrar por poId"
            className="h-9 rounded-lg border border-black/15 bg-white px-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
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

