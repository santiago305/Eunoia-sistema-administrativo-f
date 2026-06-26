import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {  ChevronLeft, ChevronRight, Plus, Sheet, Workflow } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { SaleOrderModal } from "@/features/sale-orders/components/SaleOrderModal";
import {
  type SaleOrder,
  type SaleOrderJsonImportRow,
  type SaleOrderSearchSnapshot,
  type SaleOrderSearchStateResponse,
  type SaleOrderStatisticsResponse,
  type SaleOrdersUpdatedPayload,
} from "@/features/sale-orders/types/saleOrder";
import {
  deleteSaleOrderSearchMetric,
  fetchSaleOrderById,
  getSaleOrderPdf,
  getSaleOrderSearchState,
  getSaleOrderStatistics,
  listSaleOrders,
  previewSaleOrdersJsonImport,
  saveSaleOrderSearchMetric,
} from "@/shared/services/saleOrderService";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { SaleOrderSmartSearchPanel } from "@/features/sale-orders/components/SaleOrderSmartSearchPanel";
import {
  buildSaleOrderSearchChips,
  buildSaleOrderSmartSearchColumns,
  createEmptySaleOrderSearchFilters,
  hasSaleOrderSearchCriteria,
  removeSaleOrderSearchKey,
  sanitizeSaleOrderSearchSnapshot,
  upsertSaleOrderSearchRule,
  type SaleOrderSearchFilterKey,
} from "@/features/sale-orders/utils/saleOrderSmartSearch";
import { DataTableSearchBar, DataTableSearchChips, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import { SaleOrderDetailsModal } from "@/features/sale-orders/components/SaleOrderDetailsModal";
import { useCompany } from "@/shared/hooks/useCompany";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { createSaleOrdersSocket } from "@/shared/lib/socket";
import { useAuth } from "@/shared/hooks/useAuth";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { SaleOrderPaymentsOrderModal } from "@/features/sale-orders/components/SaleOrderPaymentsOrderModal";
import { ExcelImportModal } from "@/shared/components/importer";
import { WorkflowEditorModal } from "@/features/workflows/components/WorkflowEditorModal";
import { SaleOrdersBoard } from "./components/sale-order/SaleOrdersBoard";
import { optionalSaleOrderImportFields, saleOrderImportFields } from "./types/saleImporter";


const sanitizeSaleOrderImportRows = (rows: SaleOrderJsonImportRow[]): SaleOrderJsonImportRow[] =>
  rows.map((row) => {
    const next = { ...row };
    optionalSaleOrderImportFields.forEach((key) => {
      if (next[key] === "") delete next[key];
    });
    return next;
  });

export default function SaleOrders() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);
  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const { isAuthenticated, userId } = useAuth();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [searchState, setSearchState] = useState<SaleOrderSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
  const selectedOrderRef = useRef<SaleOrder | null>(null);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentsOrder, setPaymentsOrder] = useState<SaleOrder | null>(null);
  const [workflowEditorOpen, setWorkflowEditorOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfOrderId, setPdfOrderId] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const DEFAULT_LIMIT = 10;
  const [serverPagination, setServerPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const page = paginationState.pageIndex + 1;
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptySaleOrderSearchFilters());
  const [statistics, setStatistics] = useState<SaleOrderStatisticsResponse | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const statisticsRequestRef = useRef(0);

  const draftSnapshot = useMemo(
    () => sanitizeSaleOrderSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );
  const executedSnapshot = useMemo(
    () => sanitizeSaleOrderSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );
  const hasExecutedSearchCriteria = useMemo(
    () => hasSaleOrderSearchCriteria(executedSnapshot),
    [executedSnapshot],
  );
  const smartSearchColumns = useMemo(() => buildSaleOrderSmartSearchColumns(searchState), [searchState]);
  const recentSearches = useMemo<DataTableRecentSearchItem<SaleOrderSearchSnapshot>[]>(() => (searchState?.recent ?? []).map((item) => ({
    id: item.recentId,
    label: item.label,
    snapshot: item.snapshot,
  })), [searchState]);
  const savedMetrics = useMemo<DataTableSavedSearchItem<SaleOrderSearchSnapshot>[]>(() => (searchState?.saved ?? []).map((metric) => ({
    id: metric.metricId,
    name: metric.name,
    label: metric.label,
    snapshot: metric.snapshot,
  })), [searchState]);
  const searchChips = useMemo(() => buildSaleOrderSearchChips(executedSnapshot, searchState), [executedSnapshot, searchState]);

  const openModal = useCallback(() => {
    setEditOrderId(null);
    setOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setOpen(false);
    setEditOrderId(null);
  }, []);
  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, [searchText]);
  const handleSearchTextChange = useCallback((value: string) => {
    startTransition(() => setSearchText(value));
  }, []);

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getSaleOrderSearchState();
      setSearchState(response);
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar el estado del buscador inteligente."));
    }
  }, []);

  const updateSelectedOrder = useCallback((updater: React.SetStateAction<SaleOrder | null>) => {
    setSelectedOrder((current) => {
      const next = typeof updater === "function" ? (updater as (value: SaleOrder | null) => SaleOrder | null)(current) : updater;
      selectedOrderRef.current = next;
      return next;
    });
  }, []);

  const updateUx = async () => {
    await loadOrders();

    if (selectedOrder?.id) {
      const updated = await fetchSaleOrderById(selectedOrder.id);
      syncRealtimeSaleOrder(updated);
    }
  };

  const loadOrders = useCallback(async () => {
    clearFeedback();
    setLoading(true);
    try {
      const res = await listSaleOrders({
        page,
        limit: paginationState.pageSize,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });
      const items = res.items ?? [];
      const nextTotal = res.total ?? 0;
      const nextPage = res.page ?? page;
      const nextLimit = res.limit ?? paginationState.pageSize;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));
      setOrders(items);
      setServerPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });
      if (hasExecutedSearchCriteria) void loadSearchState();
    } catch {
      setOrders([]);
      setServerPagination({
        total: 0,
        page: 1,
        limit: paginationState.pageSize,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      });
      showFeedbackRef.current(errorResponse("Error al listar pedidos."));
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, executedSnapshot, hasExecutedSearchCriteria, loadSearchState, page, paginationState.pageSize]);

  const loadStatistics = useCallback(async () => {
    const requestId = statisticsRequestRef.current + 1;
    statisticsRequestRef.current = requestId;
    setStatisticsLoading(true);
    setStatisticsError(null);

    try {
      const response = await getSaleOrderStatistics({
        q: executedSnapshot.q,
        filters: executedSnapshot.filters,
        includeCancelled: true,
      });
      if (statisticsRequestRef.current !== requestId) return;
      setStatistics(response);
    } catch (error) {
      if (statisticsRequestRef.current !== requestId) return;
      setStatisticsError(
        parseApiError(error, "No se pudieron cargar las estadísticas."),
      );
    } finally {
      if (statisticsRequestRef.current === requestId) {
        setStatisticsLoading(false);
      }
    }
  }, [executedSnapshot]);

  const syncRealtimeSaleOrder = useCallback((updatedOrder: SaleOrder | null | undefined) => {
    if (!updatedOrder?.id) return;

    const mergeOrder = (currentOrder: SaleOrder | null | undefined) => {
      if (!currentOrder) return updatedOrder;

      return {
        ...currentOrder,
        ...updatedOrder,
        currentStateId: updatedOrder.currentStateId !== undefined ? updatedOrder.currentStateId : currentOrder.currentStateId,
        currentState: updatedOrder.currentState !== undefined ? updatedOrder.currentState : currentOrder.currentState,
        client: updatedOrder.client !== undefined ? updatedOrder.client : currentOrder.client,
        warehouse: updatedOrder.warehouse !== undefined ? updatedOrder.warehouse : currentOrder.warehouse,
        workflow: updatedOrder.workflow !== undefined ? updatedOrder.workflow : currentOrder.workflow,
        source: updatedOrder.source !== undefined ? updatedOrder.source : currentOrder.source,
        createdBy: updatedOrder.createdBy !== undefined ? updatedOrder.createdBy : currentOrder.createdBy,
        payments: updatedOrder.payments !== undefined ? updatedOrder.payments : currentOrder.payments,
        items: updatedOrder.items !== undefined ? updatedOrder.items : currentOrder.items,
      };
    };

    setOrders((currentOrders) => {
      const currentOrder = currentOrders.find((order) => order.id === updatedOrder.id);
      if (!currentOrder) return [updatedOrder, ...currentOrders];
      return currentOrders.map((order) => (order.id === updatedOrder.id ? mergeOrder(order) : order));
    });
    updateSelectedOrder((current) => (current?.id === updatedOrder.id ? mergeOrder(current) : current));
    setPaymentsOrder((current) => (current?.id === updatedOrder.id ? mergeOrder(current) : current));
  }, [updateSelectedOrder]);

  const refreshSelectedOrder = useCallback(async (saleOrderId: string) => {
    const updated = await fetchSaleOrderById(saleOrderId);
    syncRealtimeSaleOrder(updated);
    await loadOrders();
  }, [loadOrders, syncRealtimeSaleOrder]);

  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  const refreshSelectedOrderDetail = useCallback(async (saleOrderId: string) => {
    const currentSelectedOrder = selectedOrderRef.current;
    const firstRefresh = await fetchSaleOrderById(saleOrderId);
    if (
      currentSelectedOrder?.id === saleOrderId
      && currentSelectedOrder?.currentStateId === firstRefresh?.currentStateId
    ) {
      const secondRefresh = await fetchSaleOrderById(saleOrderId);
      syncRealtimeSaleOrder(secondRefresh);
      return;
    }
    syncRealtimeSaleOrder(firstRefresh);
  }, [syncRealtimeSaleOrder]);

  const selectOrder = useCallback((order: SaleOrder) => {
    updateSelectedOrder(order);
  }, [updateSelectedOrder]);

  const openOrderDetail = useCallback(async (order: SaleOrder) => {
    updateSelectedOrder(order);
    setDetailOpen(true);
    try {
      const detail = await fetchSaleOrderById(order.id);
      updateSelectedOrder((current) => current?.id === order.id && current?.currentStateId === order.currentStateId ? detail : current);
    } catch (error) {
      showFeedbackRef.current(errorResponse(parseApiError(error, "No se pudo cargar el detalle del pedido.")));
    }
  }, [updateSelectedOrder]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const socket = createSaleOrdersSocket(userId);
    if (!socket) return;
    const onSaleOrdersUpdated = (payload: SaleOrdersUpdatedPayload) => {
      const saleOrderIds = Array.isArray(payload?.saleOrderIds) ? payload.saleOrderIds : [];
      const hasSaleOrdersPayload = Array.isArray(payload?.saleOrders);
      const updatedOrders = hasSaleOrdersPayload ? payload.saleOrders ?? [] : [];
      const updatedOrdersById = new Map(updatedOrders.filter((order) => order?.id).map((order) => [order.id, order]));
      const currentSelectedOrder = selectedOrderRef.current;
      const selectedOrderWasUpdated = Boolean(
        currentSelectedOrder?.id
        && (saleOrderIds.length === 0 || saleOrderIds.includes(currentSelectedOrder.id)),
      );

      updatedOrders.forEach((order) => {
        if (saleOrderIds.length > 0 && !saleOrderIds.includes(order.id)) return;
        syncRealtimeSaleOrder(order);
      });

      if (selectedOrderWasUpdated && currentSelectedOrder?.id && !updatedOrdersById.has(currentSelectedOrder.id)) {
        void refreshSelectedOrderDetail(currentSelectedOrder.id).catch(() => undefined);
      }

      if (payload?.statistics) {
        statisticsRequestRef.current += 1;
        setStatistics(payload.statistics);
        setStatisticsError(null);
        setStatisticsLoading(false);
      } else {
        void loadStatistics();
      }

      if (!hasSaleOrdersPayload) {
        void loadOrders();
      }
    };
    socket.on("sale-orders.updated", onSaleOrdersUpdated);
    return () => {
      socket.off("sale-orders.updated", onSaleOrdersUpdated);
    };
  }, [
    isAuthenticated,
    hasExecutedSearchCriteria,
    loadOrders,
    loadStatistics,
    refreshSelectedOrderDetail,
    syncRealtimeSaleOrder,
    userId,
  ]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  const applySmartSnapshot = useCallback((snapshot: SaleOrderSearchSnapshot) => {
    const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, []);

  const handleImportPreview = async (data: SaleOrderJsonImportRow[]) => {
    setImportLoading(true);
    try {
      const response = await previewSaleOrdersJsonImport(sanitizeSaleOrderImportRows(data));
      const baseMessage = `Importados: ${response.importedRows}. Fallidos: ${response.failedRows}.`;
      const errorDetails = response.errors.slice(0, 3).map((error) => `Fila ${error.rowNumber}: ${error.message}`).join(" ");
      showFeedbackRef.current(
        response.failedRows > 0 ? errorResponse(errorDetails ? `${baseMessage} ${errorDetails}` : baseMessage) : successResponse(baseMessage),
      );
      await updateUx();
      await loadStatistics();
    } catch (error) {
      showFeedbackRef.current(errorResponse(parseApiError(error)));
    } finally {
      setImportLoading(false);
    }
  };

  const handleApplySearchRule = useCallback(
    (rule: any) => {
      startTransition(() => {
        setSearchFilters((current: any) => {
          const next = upsertSaleOrderSearchRule(sanitizeSaleOrderSearchSnapshot({ q: searchText, filters: current }), rule);
          return next.filters;
        });
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchText],
  );

  const handleRemoveSearchRule = useCallback(
    (fieldId: SaleOrderSearchFilterKey) => {
      startTransition(() => {
        setSearchFilters((current: any) => {
          const next = removeSaleOrderSearchKey(sanitizeSaleOrderSearchSnapshot({ q: searchText, filters: current }), fieldId);
          return next.filters;
        });
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchText],
  );

  const handleRemoveChip = useCallback(
    (key: "q" | SaleOrderSearchFilterKey) => {
      const nextSnapshot = removeSaleOrderSearchKey(
        sanitizeSaleOrderSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
        key,
      );
      startTransition(() => {
        setSearchText(nextSnapshot.q ?? "");
        setAppliedSearchText(nextSnapshot.q ?? "");
        setSearchFilters(nextSnapshot.filters);
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [appliedSearchText, searchFilters],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    startTransition(() => setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) })));
  }, []);

  const handleSaveMetric = useCallback(
    async (name: string) => {
      const snapshot = sanitizeSaleOrderSearchSnapshot({ q: appliedSearchText, filters: searchFilters });
      if (!hasSaleOrderSearchCriteria(snapshot)) return false;
      setSavingMetric(true);
      try {
        const response = await saveSaleOrderSearchMetric(name, snapshot);
        if (response.type === "success") {
          showFeedback(successResponse(response.message));
          await loadSearchState();
          return true;
        }
        showFeedback(errorResponse(response.message));
        return false;
      } catch {
        showFeedback(errorResponse("Error al guardar la metrica."));
        return false;
      } finally {
        setSavingMetric(false);
      }
    },
    [appliedSearchText, loadSearchState, searchFilters, showFeedback],
  );

  const handleDeleteMetric = useCallback(
    async (metricId: string) => {
      try {
        const response = await deleteSaleOrderSearchMetric(metricId);
        if (response.type === "success") {
          showFeedback(successResponse(response.message));
          await loadSearchState();
        } else {
          showFeedback(errorResponse(response.message));
        }
      } catch {
        showFeedback(errorResponse("Error al eliminar la metrica."));
      }
    },
    [loadSearchState, showFeedback],
  );


  return (
    <PageShell scrollArea={false} contentClassName="h-full max-w-none gap-0 p-4 scroll-area">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col ">
        <div className="w-full border-b border-zinc-100 pb-3">
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(520px,auto)_auto]">
              <div className="min-w-0">
                <DataTableSearchBar
                  value={searchText}
                  onChange={handleSearchTextChange}
                  onSubmitSearch={submitSearch}
                  searchLabel="Buscar pedido..."
                  searchName="sale-order-smart-search"
                  canSaveMetric={hasExecutedSearchCriteria}
                  saveLoading={savingMetric}
                  onSaveMetric={handleSaveMetric}
                >
                  <SaleOrderSmartSearchPanel
                    recent={recentSearches}
                    saved={savedMetrics}
                    columns={smartSearchColumns}
                    snapshot={draftSnapshot}
                    searchState={searchState}
                    filterQuery={searchText}
                    onApplySnapshot={applySmartSnapshot}
                    onApplyRule={handleApplySearchRule}
                    onRemoveRule={handleRemoveSearchRule}
                    onDeleteMetric={handleDeleteMetric}
                  />
                </DataTableSearchBar>
              </div>

            
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => setWorkflowEditorOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-100 transition hover:bg-zinc-50"
                >
                  <Workflow className="h-4 w-4" />
                  Flujos
                </button>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  disabled={importLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:opacity-50"
                  title={companyActionTitle}
                >
                  <Sheet className="h-4 w-4" />
                  Importar
                </button>
                <button
                  type="button"
                  onClick={openModal}
                  disabled={companyActionDisabled}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                  title={companyActionTitle}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo pedido
                </button>
              </div>
            </div>
          </div>

          <div className="mt-0 flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />
            </div>
          </div>
        </div>
        <SaleOrdersBoard
          orders={orders}
          loading={loading}
          selectedOrder={selectedOrder}
          onSelectOrder={selectOrder}
          onOpenDetail={(order) => void openOrderDetail(order)}
          onEditOrder={(order) => {
            setEditOrderId(order.id);
            setOpen(true);
          }}
          onOpenPdf={(order) => {
            setPdfOrderId(order.id);
            setPdfOpen(true);
          }}
          onOpenPayments={(order) => {
            setPaymentsOrder(order);
            setPaymentsOpen(true);
          }}
          onOrderChanged={refreshSelectedOrder}
          statistics={statistics}
          statisticsLoading={statisticsLoading}
          statisticsError={statisticsError}
          listFooter={
            <nav
              aria-label="Paginación de pedidos"
              className="flex items-center justify-between gap-2 bg-white py-2 text-xs text-zinc-500 sm:justify-start"
            >
              <span>
                Pagina <span className="font-medium text-zinc-800">{serverPagination.page}</span> de{" "}
                <span className="font-medium text-zinc-800">{serverPagination.totalPages}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!serverPagination.hasPrev || loading}
                  onClick={() => handlePageChange(serverPagination.page - 1)}
                  className="grid h-8 w-8 place-items-center rounded-sm text-zinc-600 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!serverPagination.hasNext || loading}
                  onClick={() => handlePageChange(serverPagination.page + 1)}
                  className="grid h-8 w-8 place-items-center rounded-sm text-zinc-600 ring-1 ring-zinc-100 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                  aria-label="Pagina siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-md text-zinc-500">
                {loading ? "Cargando..." : `${orders.length} resultados`}
              </p>
            </nav>
          }
        />
      </div>
      <SaleOrderModal open={open} onClose={closeModal} orderId={editOrderId} onSaved={updateUx} />
      <PdfViewerModal
        open={pdfOpen}
        title="PDF del pedido"
        iframeTitle="PDF del pedido"
        loadWhen={Boolean(pdfOrderId)}
        getPdf={() => {
          if (!pdfOrderId) return Promise.reject(new Error("Pedido no encontrado."));
          return getSaleOrderPdf(pdfOrderId);
        }}
        onClose={() => {
          setPdfOpen(false);
          setPdfOrderId(null);
        }}
      />
      <SaleOrderDetailsModal
        open={detailOpen}
        order={selectedOrder}
        onClose={() => setDetailOpen(false)}
        onOrderChanged={async () => {
          if (!selectedOrder?.id) return;
          const updated = await fetchSaleOrderById(selectedOrder.id);
          setSelectedOrder(updated);
          await loadOrders();
        }}
      />
      {paymentsOpen && paymentsOrder ? (
        <SaleOrderPaymentsOrderModal
          open={paymentsOpen}
          saleOrder={paymentsOrder}
          onClose={() => {
            setPaymentsOpen(false);
            setPaymentsOrder(null);
          }}
          onUpdated={() => {
            void loadOrders();
            if (detailOpen && selectedOrder?.id === paymentsOrder.id) {
              void fetchSaleOrderById(paymentsOrder.id).then(setSelectedOrder).catch(() => undefined);
            }
          }}
        />
      ) : null}
      <WorkflowEditorModal open={workflowEditorOpen} onClose={() => setWorkflowEditorOpen(false)} />
      <ExcelImportModal<SaleOrderJsonImportRow>
        open={importOpen}
        title="Importar pedidos"
        fields={saleOrderImportFields}
        ubigeoConfig={{ departmentKey: "departmentName", provinceKey: "provinceName", districtKey: "districtName", valueMode: "name" }}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImportPreview}
      />
    </PageShell>
  );
}
