import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  getPurchaseHistorySearchState,
  getPurchaseTimeline,
  listPurchaseHistory,
} from "@/shared/services/purchaseService";
import type {
  PurchaseOrder,
  PurchaseSearchRule,
  PurchaseSearchSnapshot,
  PurchaseSearchStateResponse,
} from "@/features/purchases/types/purchase";
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
import { PageTitle } from "@/shared/components/components/PageTitle";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import {
  buildPurchaseHistorySearchChips,
  buildPurchaseHistorySmartSearchColumns,
  createEmptyPurchaseHistorySearchFilters,
  hasPurchaseHistorySearchCriteria,
  removePurchaseHistorySearchKey,
  sanitizePurchaseHistorySearchSnapshot,
  upsertPurchaseHistorySearchRule,
  type PurchaseHistorySearchFilterKey,
} from "@/features/purchases/utils/purchaseHistorySmartSearch";
import { PurchaseHistorySmartSearchPanel } from "@/features/purchases/components/PurchaseHistorySmartSearchPanel";
import { PurchaseStatusBadge } from "@/features/purchases/components/shared/PurchaseStatusBadge";
import { NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";

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
  const [searchText, setSearchText] = useState("");
  const searchTextRef = useRef("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyPurchaseHistorySearchFilters());
  const [searchState, setSearchState] = useState<PurchaseSearchStateResponse | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filters, setFilters] = useState<PurchaseTimelineFilterState>({
    eventType: "",
    performedByUserId: "",
    from: "",
    to: "",
  });

  const draftSnapshot = useMemo(
    () => sanitizePurchaseHistorySearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () => sanitizePurchaseHistorySearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getPurchaseHistorySearchState();
      setSearchState(response);
    } catch {
      setSearchState(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPurchaseHistory({
        page,
        limit,
        eventType: filters.eventType || undefined,
        eventFrom: fromDate || filters.from || undefined,
        eventTo: toDate || filters.to || undefined,
        performedByUserId: filters.performedByUserId || undefined,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });
      setItems((res.items ?? []) as HistoryPurchase[]);
      setTotal(res.total ?? 0);
      if (hasPurchaseHistorySearchCriteria(executedSnapshot)) void loadSearchState();
    } catch {
      setItems([]);
      setTotal(0);
      showFeedback(errorResponse("No se pudo cargar el historial de compras."));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, filters.eventType, filters.from, filters.performedByUserId, filters.to, fromDate, limit, loadSearchState, page, showFeedback, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

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

  const selectedRef = useRef<HistoryPurchase | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const columns = useMemo<DataTableColumn<HistoryPurchase>[]>(() => [
    {
      id: "numero",
      header: "Compra",
      cell: (row) => <span>{[row.serie, row.correlative].filter(Boolean).join("-") || row.poId}</span>,
      sortable: true,
      sortAccessor: (row) => [row.serie, row.correlative].filter(Boolean).join("-") || row.poId || "",
    },
    {
      id: "proveedor",
      header: "Proveedor",
      cell: (row) => <span>{row.supplierName ?? "-"}</span>,
      sortable: true,
      sortAccessor: (row) => row.supplierName ?? "",
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <PurchaseStatusBadge status={row.status} />,
      sortable: true,
      sortAccessor: (row) => row.status,
    },
    {
      id: "eventos",
      header: "Eventos",
      cell: (row) => <span className="tabular-nums">{row.history?.eventsCount ?? 0}</span>,
      sortable: true,
      sortAccessor: (row) => row.history?.eventsCount ?? 0,
    },
    {
      id: "ultimo",
      header: "Ultimo evento",
      cell: (row) => <span>{row.history?.lastEventAt ? new Date(row.history.lastEventAt).toLocaleString() : "-"}</span>,
      sortable: true,
      sortAccessor: (row) => row.history?.lastEventAt ? new Date(row.history.lastEventAt) : null,
    },
  ], []);

  const openTimeline = useCallback(async (row: HistoryPurchase, nextPage = 1) => {
    setSelected(row);
    setTimelineLoading(true);
    try {
      const res = await getPurchaseTimeline(row.poId ?? "", {
        eventType: filters.eventType || undefined,
        performedByUserId: filters.performedByUserId || undefined,
        from: filters.from || fromDate || undefined,
        to: filters.to || toDate || undefined,
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
  }, [filters.eventType, filters.from, filters.performedByUserId, filters.to, fromDate, showFeedback, timelineLimit, toDate]);

  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent).detail as { notification?: { metadata?: Record<string, unknown>; sourceEntityType?: string; sourceEntityId?: string } } | undefined;
      const notification = detail?.notification;
      const metadata = notification?.metadata ?? {};
      const isPurchaseEvent =
        metadata.sourceEntityType === "purchase_order" ||
        notification?.sourceEntityType === "purchase_order" ||
        Boolean(metadata.poId) ||
        Boolean(notification?.sourceEntityId);
      if (!isPurchaseEvent) return;
      void load();
      const currentSelected = selectedRef.current;
      if (currentSelected) void openTimeline(currentSelected, timelinePage);
    };

    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, onRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, onRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, onRefresh);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, onRefresh);
    };
  }, [load, openTimeline, timelinePage]);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchTextRef.current.trim());
      setPage(1);
    });
  }, []);

  const handleSearchTextChange = useCallback((value: string) => {
    searchTextRef.current = value;
    startTransition(() => setSearchText(value));
  }, []);

  const applySmartSnapshot = useCallback((snapshot: PurchaseSearchSnapshot) => {
    const normalized = sanitizePurchaseHistorySearchSnapshot(snapshot);
    searchTextRef.current = normalized.q ?? "";
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPage(1);
    });
  }, []);

  const handleApplySearchRule = useCallback((rule: PurchaseSearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => upsertPurchaseHistorySearchRule(
        sanitizePurchaseHistorySearchSnapshot({ q: searchTextRef.current, filters: current }),
        rule,
      ).filters);
      setPage(1);
    });
  }, []);

  const handleRemoveSearchRule = useCallback((fieldId: PurchaseHistorySearchFilterKey) => {
    startTransition(() => {
      setSearchFilters((current) => removePurchaseHistorySearchKey(
        sanitizePurchaseHistorySearchSnapshot({ q: searchTextRef.current, filters: current }),
        fieldId,
      ).filters);
      setPage(1);
    });
  }, []);

  const handleRemoveChip = useCallback((key: "q" | PurchaseHistorySearchFilterKey) => {
    const nextSnapshot = removePurchaseHistorySearchKey(
      sanitizePurchaseHistorySearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    searchTextRef.current = nextSnapshot.q ?? "";
    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
      setPage(1);
    });
  }, [appliedSearchText, searchFilters]);

  const handleDateRangeChange = useCallback(({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
    startTransition(() => {
      setFromDate(startDate ? toLocalDateKey(startDate) : "");
      setToDate(endDate ? toLocalDateKey(endDate) : "");
      setPage(1);
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ eventType: "", performedByUserId: "", from: "", to: "" });
    setPage(1);
    setTimelinePage(1);
  }, []);

  const smartSearchColumns = useMemo(() => buildPurchaseHistorySmartSearchColumns(searchState), [searchState]);

  const recentSearches = useMemo<DataTableRecentSearchItem<PurchaseSearchSnapshot>[]>(
    () => (searchState?.recent ?? []).map((item) => ({ id: item.recentId, label: item.label, snapshot: item.snapshot })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<PurchaseSearchSnapshot>[]>(
    () => (searchState?.saved ?? []).map((metric) => ({ id: metric.metricId, name: metric.name, label: metric.label, snapshot: metric.snapshot })),
    [searchState],
  );

  const searchChips = useMemo(
    () => buildPurchaseHistorySearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  return (
    <PageShell className="bg-white">
      <PageTitle title="Historial de compras" />
      <div className="space-y-4">
        <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />
        <DataTable
          tableId="purchase-history"
          data={items}
          columns={columns}
          rowKey="poId"
          loading={loading}
          emptyMessage="No hay compras en historial."
          selectableColumns
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={handleSearchTextChange}
              onSubmitSearch={submitSearch}
              searchLabel="Busca tu compra"
              searchName="purchase-history-smart-search"
            >
              <PurchaseHistorySmartSearchPanel
                recent={recentSearches}
                saved={savedMetrics}
                columns={smartSearchColumns}
                snapshot={draftSnapshot}
                searchState={searchState}
                filterQuery={searchText}
                onApplySnapshot={applySmartSnapshot}
                onApplyRule={handleApplySearchRule}
                onRemoveRule={handleRemoveSearchRule}
              />
            </DataTableSearchBar>
          }
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            onChange: handleDateRangeChange,
          }}
          refreshAction={{
            visible: false,
            onRefresh: load,
            loading,
            label: "Recargar historial",
          }}
          pagination={{ page, limit, total }}
          onPageChange={setPage}
          onRowClick={(row) => {
            void openTimeline(row, 1);
          }}
        />
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
