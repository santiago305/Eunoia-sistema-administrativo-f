import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { listPurchaseHistory, getPurchaseTimeline } from "@/shared/services/purchaseService";
import type { PurchaseOrder } from "@/features/purchases/types/purchase";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse } from "@/shared/common/utils/response";
import { Modal } from "@/shared/components/modales/Modal";
import { DataTablePagination } from "@/shared/components/table/DataTablePagination";
import { listUsers, type UserApiListItem } from "@/shared/services/userService";
import { PurchaseTimeline, type PurchaseTimelineEvent } from "@/features/purchases/components/timeline/PurchaseTimeline";
import {
  PurchaseTimelineFilters,
  type PurchaseTimelineFilterState,
} from "@/features/purchases/components/timeline/PurchaseTimelineFilters";

type HistoryPurchase = PurchaseOrder & {
  history?: {
    eventsCount: number;
    lastEventAt: string | null;
  };
};

export default function PurchaseHistory() {
  const { showFeedback } = useFeedbackToast();
  const [items, setItems] = useState<HistoryPurchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<HistoryPurchase | null>(null);
  const [timeline, setTimeline] = useState<PurchaseTimelineEvent[]>([]);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineLimit] = useState(10);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [users, setUsers] = useState<UserApiListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [filters, setFilters] = useState<PurchaseTimelineFilterState>({
    eventType: "",
    performedByUserId: "",
    from: "",
    to: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPurchaseHistory({
        page,
        limit,
        eventType: filters.eventType || undefined,
        eventFrom: filters.from || undefined,
        eventTo: filters.to || undefined,
        performedByUserId: filters.performedByUserId || undefined,
      });
      setItems((res.items ?? []) as HistoryPurchase[]);
      setTotal(res.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
      showFeedback(errorResponse("No se pudo cargar el historial de compras."));
    } finally {
      setLoading(false);
    }
  }, [filters.eventType, filters.from, filters.performedByUserId, filters.to, limit, page, showFeedback]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await listUsers({ status: "active", page: 1, q: "" });
        if (!cancelled) setUsers(response.items ?? []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo<DataTableColumn<HistoryPurchase>[]>(() => [
    {
      id: "numero",
      header: "Compra",
      cell: (row) => <span>{[row.serie, row.correlative].filter(Boolean).join("-") || row.poId}</span>,
    },
    {
      id: "proveedor",
      header: "Proveedor",
      cell: (row) => <span>{row.supplierName ?? "-"}</span>,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <span>{row.status}</span>,
    },
    {
      id: "eventos",
      header: "Eventos",
      cell: (row) => <span>{row.history?.eventsCount ?? 0}</span>,
    },
    {
      id: "ultimo",
      header: "Último evento",
      cell: (row) => <span>{row.history?.lastEventAt ? new Date(row.history.lastEventAt).toLocaleString() : "-"}</span>,
    },
  ], []);

  const openTimeline = useCallback(async (row: HistoryPurchase, nextPage = 1) => {
    setSelected(row);
    setTimelineLoading(true);
    try {
      const res = await getPurchaseTimeline(row.poId ?? "", {
        eventType: filters.eventType || undefined,
        performedByUserId: filters.performedByUserId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page: nextPage,
        limit: timelineLimit,
      });
      setTimeline((res.events ?? []) as PurchaseTimelineEvent[]);
      setTimelineTotal(res.total ?? 0);
      setTimelinePage(res.page ?? nextPage);
    } catch {
      setTimeline([]);
      setTimelineTotal(0);
      showFeedback(errorResponse("No se pudo cargar la línea de tiempo de la compra."));
    } finally {
      setTimelineLoading(false);
    }
  }, [filters.eventType, filters.from, filters.performedByUserId, filters.to, showFeedback, timelineLimit]);

  const applyFilters = useCallback(() => {
    setPage(1);
    setTimelinePage(1);
    void load();
    if (selected) void openTimeline(selected, 1);
  }, [load, openTimeline, selected]);

  const resetFilters = useCallback(() => {
    setFilters({ eventType: "", performedByUserId: "", from: "", to: "" });
    setPage(1);
    setTimelinePage(1);
  }, []);

  return (
    <PageShell className="bg-white">
      <PurchaseTimelineFilters
        value={filters}
        users={users}
        loadingUsers={usersLoading}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
      />
      <DataTable
        tableId="purchase-history"
        data={items}
        columns={columns}
        rowKey="poId"
        loading={loading}
        emptyMessage="No hay compras en historial."
        pagination={{ page, limit, total }}
        onPageChange={setPage}
        onRowClick={(row) => {
          void openTimeline(row, 1);
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-zinc-900 px-3 py-1 text-xs text-white"
          onClick={() => {
            void load();
          }}
        >
          Actualizar historial
        </button>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setTimeline([]);
          setTimelineTotal(0);
          setTimelinePage(1);
        }}
        title="Línea de tiempo de compra"
        className="w-[900px]"
      >
        <div className="space-y-3">
          <PurchaseTimelineFilters
            value={filters}
            users={users}
            loadingUsers={usersLoading}
            onChange={setFilters}
            onApply={() => selected && void openTimeline(selected, 1)}
            onReset={resetFilters}
          />
          <PurchaseTimeline events={timeline} loading={timelineLoading} />
          {timelineTotal > timelineLimit ? (
            <DataTablePagination
              page={timelinePage}
              limit={timelineLimit}
              total={timelineTotal}
              onPageChange={(nextPage) => {
                if (selected) void openTimeline(selected, nextPage);
              }}
            />
          ) : null}
        </div>
      </Modal>
    </PageShell>
  );
}

