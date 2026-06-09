import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BanknoteArrowUp, ChevronLeft, ChevronRight, FileText, Menu, Pencil, Plus, Sheet, Workflow } from "lucide-react";
import type { DataTableColumn } from "@/shared/components/table/types";
import { PageShell } from "@/shared/layouts/PageShell";
import { SaleOrderModal } from "@/features/sale-orders/components/SaleOrderModal";
import {
  ClientType,
  type SaleOrder,
  type SaleOrderJsonImportRow,
  type SaleOrderSearchSnapshot,
  type SaleOrderSearchStateResponse,
  type SaleOrderStatisticsResponse,
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
import { ActionsPopover, ActionItem } from "@/shared/components/components/ActionsPopover";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { createNotificationSocket } from "@/shared/lib/socket";
import { useAuth } from "@/shared/hooks/useAuth";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { SaleOrderPaymentsOrderModal } from "@/features/sale-orders/components/SaleOrderPaymentsOrderModal";
import { ExcelImportModal, type ImportField } from "@/shared/components/importer";
import { WorkflowEditorModal } from "@/features/workflows/components/WorkflowEditorModal";
import { SaleOrdersBoard } from "./components/sale-order/SaleOrdersBoard";
import { SaleOrderStatisticsTotals } from "./components/statistics/SaleOrderStatisticsPanel";
import { Checkbox } from "@/shared/components/ui/checkbox";

const saleOrderImportFields: ImportField[] = [
  { key: "workflowName", label: "Workflow", aliases: ["workflow", "flujo", "nombre workflow", "workflow name"] },
  { key: "productName", label: "Producto", aliases: ["producto", "product", "product name", "nombre producto"] },
  { key: "orderDate", label: "Fecha de pedido", type: "date", aliases: ["fecha pedido", "order date", "fecha orden"] },
  { key: "deliveryDate", label: "Fecha de entrega", type: "date", aliases: ["fecha entrega", "delivery date"] },
  { key: "departmentName", label: "Departamento", required: true, aliases: ["departamento", "department"] },
  { key: "provinceName", label: "Provincia", required: true, aliases: ["provincia", "province"] },
  { key: "districtName", label: "Distrito", required: true, aliases: ["distrito", "district"] },
  { key: "recipientName", label: "Destinatario", required: true, aliases: ["destinatario", "recipient", "recipient name", "cliente"] },
  { key: "address", label: "Direccion", aliases: ["direccion", "dirección", "address"] },
  { key: "deliveryNote", label: "Nota de entrega", aliases: ["nota entrega", "delivery note", "observacion", "observación"] },
  { key: "phone", label: "Telefono", required: true, aliases: ["telefono", "teléfono", "phone", "celular"] },
  { key: "couponCode", label: "Cupon", aliases: ["cupon", "cupón", "coupon", "coupon code"] },
  { key: "productCodes", label: "Codigos de producto", required: true, aliases: ["codigos producto", "códigos producto", "product codes", "sku", "eva"] },
  { key: "quantity", label: "Cantidad", type: "number", aliases: ["cantidad", "qty", "quantity"] },
  { key: "total", label: "Total", required: true, type: "number", aliases: ["total", "importe"] },
  { key: "advance", label: "Adelanto", type: "number", aliases: ["adelanto", "advance"] },
  { key: "codAmount", label: "Contra entrega", type: "number", aliases: ["contra entrega", "cod", "cod amount"] },
  { key: "internalNote", label: "Nota interna", aliases: ["nota interna", "internal note", "fuente", "source"] },
  { key: "confirmedBy", label: "Confirmado por", aliases: ["confirmado por", "confirmed by"] },
];

const optionalSaleOrderImportFields = new Set<keyof SaleOrderJsonImportRow>([
  "productName",
  "orderDate",
  "deliveryDate",
  "address",
  "deliveryNote",
  "couponCode",
  "quantity",
  "advance",
  "codAmount",
  "internalNote",
  "confirmedBy",
  "workflowName",
]);

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
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentsOrderId, setPaymentsOrderId] = useState<string | null>(null);
  const [paymentsOrderLabel, setPaymentsOrderLabel] = useState<string | null>(null);
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
  const [includeCancelled, setIncludeCancelled] = useState(false);
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
      if (hasSaleOrderSearchCriteria(executedSnapshot)) void loadSearchState();
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
  }, [clearFeedback, executedSnapshot, loadSearchState, page, paginationState.pageSize]);

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
  }, [executedSnapshot, includeCancelled]);

  const refreshSelectedOrder = useCallback(async (saleOrderId: string) => {
    const updated = await fetchSaleOrderById(saleOrderId);
    setSelectedOrder(updated);
    await loadOrders();
  }, [loadOrders]);

  const selectOrder = useCallback(async (order: SaleOrder) => {
    setSelectedOrder(order);
    try {
      const detail = await fetchSaleOrderById(order.id);
      setSelectedOrder((current) => current?.id === order.id ? detail : current);
    } catch (error) {
      showFeedbackRef.current(errorResponse(parseApiError(error, "No se pudo cargar el detalle del pedido.")));
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  type SaleOrdersUpdatedPayload = { date: string; updated: number; saleOrderIds: string[] };
  const lastRealtimeRefreshRef = useRef(0);
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const socket = createNotificationSocket(userId);
    if (!socket) return;
    const onSaleOrdersUpdated = (payload: SaleOrdersUpdatedPayload) => {
      const now = Date.now();
      if (now - lastRealtimeRefreshRef.current < 800) return;
      lastRealtimeRefreshRef.current = now;
      void loadOrders();
      const saleOrderIds = Array.isArray(payload?.saleOrderIds) ? payload.saleOrderIds : [];
      if (!detailOpen || !selectedOrder?.id || saleOrderIds.length === 0) return;
      if (!saleOrderIds.includes(selectedOrder.id)) return;
      void fetchSaleOrderById(selectedOrder.id).then(setSelectedOrder).catch(() => undefined);
    };
    socket.on("sale-orders.updated", onSaleOrdersUpdated);
    return () => {
      socket.off("sale-orders.updated", onSaleOrdersUpdated);
    };
  }, [detailOpen, isAuthenticated, loadOrders, selectedOrder?.id, userId]);

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
      await loadOrders();
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

  const columns = useMemo<DataTableColumn<SaleOrder>[]>(() => {
    const formatClientLabel = (client: SaleOrder["client"]) => {
      if (!client) return "-";
      const docValue = (client.docNumber ?? client.reference ?? "").trim();
      const docOrRef = docValue ? `(${docValue})` : "";
      return (
        <span className="block min-w-0">
          <span className="block truncate">
            {client.fullName} {docOrRef}
          </span>
          <span className="mt-0.5 block truncate text-[9px] text-black/40">{clientTypeBadge(client.type, client.count)}</span>
        </span>
      );
    };

    const formatMoney = (value: number) => {
      try {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
      } catch {
        return `S/ ${(Number(value) || 0).toFixed(2)}`;
      }
    };
    const statusBadge = (label: string, className: string) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${className}`}>{label}</span>
    );
    const clientTypeBadge = (type?: ClientType | null, count?: number) => {
      if (type === ClientType.NEW) return statusBadge(`Nuevo${count ? ` (${count})` : ""}`, "bg-sky-50 text-sky-700 ring-sky-200");
      if (type === ClientType.LAGGING) return statusBadge(`Rezagado${count ? ` (${count})` : ""}`, "bg-amber-50 text-amber-700 ring-amber-200");
      if (type === ClientType.REPURCHASE) return statusBadge(`Recompra${count ? ` (${count})` : ""}`, "bg-emerald-50 text-emerald-700 ring-emerald-200");
      if (type === ClientType.UNDEFINED) return statusBadge(`Sin definir${count ? ` (${count})` : ""}`, "bg-slate-50 text-slate-500 ring-slate-200");
      return statusBadge("-", "bg-slate-50 text-slate-500 ring-slate-200");
    };
    return [
      { id: "numero", header: "Pedido", className: "text-black/70", cell: (row) => <span className="font-semibold tabular-nums">{(row.serie ?? "-")}-{row.correlative ?? "-"}</span> },
      { id: "scheduleDate", header: "Agenda", className: "text-black/100", cell: (row) => <span className="tabular-nums text-[9px]">{row.scheduleDate ?? "-"}</span> },
      { id: "deliveryDate", header: "Entrega", className: "text-black/100", cell: (row) => <span className="tabular-nums text-[9px]">{row.deliveryDate ?? "-"}</span> },
      { id: "createdBy", header: "Usuario", className: "text-black/70", cell: (row) => <span className="truncate">{row.createdBy ? `${row.createdBy.email}` : "-"}</span> },
      { id: "clientId", header: "Cliente", className: "text-black/70", cell: (row) => <span className="truncate">{formatClientLabel(row.client)}</span> },
      { id: "warehouseId", header: "Almacen", className: "text-black/70", cell: (row) => <span className="truncate">{row.warehouse?.name ?? "-"}</span> },
      { id: "source", header: "Enganche", className: "text-black/70", cell: (row) => <span className="truncate">{row.source?.name ?? "-"}</span> },
      { id: "total", header: "Total", className: "text-black/70", cell: (row) => <span className="tabular-nums">{formatMoney(row.total ?? 0)}</span> },
      { id: "totalPaid", header: "Pagado", className: "text-black/70", cell: (row) => <span className="tabular-nums">{formatMoney(row.totalPaid ?? 0)}</span> },
      { id: "pending", header: "Pend.", className: "text-black/70", cell: (row) => <span className="tabular-nums">{formatMoney(row.pendingAmount ?? 0)}</span> },
      {
        id: "workflowState",
        header: "Estado",
        className: "text-black/70",
        cell: (row) => row.workflowId && row.currentState
          ? (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold"
                style={{
                  color: row.currentState.color,
                  backgroundColor: `${row.currentState.color}18`,
                  boxShadow: `inset 0 0 0 1px ${row.currentState.color}40`,
                }}
              >
                {row.currentState.name}
              </span>
            )
          : statusBadge("Sin workflow", "bg-amber-50 text-amber-700 ring-amber-200"),
      },
      {
        id: "invoiceSend",
        header: "Factura",
        className: "text-black/70",
        cell: (row) =>
          row.invoiceSend
            ? statusBadge("Enviada", "bg-emerald-50 text-emerald-700 ring-emerald-200")
            : statusBadge("Pendiente", "bg-slate-50 text-slate-600 ring-slate-200"),
      },
      {
        id: "actions",
        header: "Acciones",
        headerClassName: "text-center [&>div]:justify-center",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex justify-center">
            <ActionsPopover
              actions={[
                { id: "edit", label: "Editar", icon: <Pencil className="h-4 w-4 text-black/60" />, onClick: () => { setEditOrderId(row.id); setOpen(true); } },
                { id: "pdf", label: "Abrir pdf", icon: <FileText className="h-4 w-4 text-black/60" />, onClick: () => { setPdfOpen(true); setPdfOrderId(row.id); } },
                { id: "payments", label: "Pagos", icon: <BanknoteArrowUp className="h-4 w-4 text-black/60" />, onClick: () => {
                  setPaymentsOrderId(row.id);
                  setPaymentsOrderLabel(`${row.serie ?? "-"}-${row.correlative ?? "-"}`);
                  setPaymentsOpen(true);
                } },
              ].filter(Boolean) as ActionItem[]}
              columns={1}
              compact
              showLabels
              triggerIcon={<Menu className="h-4 w-4" />}
              popoverClassName="min-w-35"
              popoverBodyClassName="p-2"
              renderAction={(action, helpers) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    helpers.onAction(action);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] disabled:pointer-events-none disabled:opacity-50 ${action.className ?? ""}`}
                  disabled={action.disabled}
                >
                  {action.icon}
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              )}
            />
          </div>
        ),
        className: "text-left",
        hideable: true,
        sortable: false,
      },
    ];
  }, []);
  void columns;

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
                  canSaveMetric={hasSaleOrderSearchCriteria(executedSnapshot)}
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

          <div className="mt-3 flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />
            </div>
          </div>
        </div>
        <SaleOrdersBoard
          orders={orders}
          loading={loading}
          selectedOrder={selectedOrder}
          onSelectOrder={(order) => void selectOrder(order)}
          onEditOrder={(order) => {
            setEditOrderId(order.id);
            setOpen(true);
          }}
          onOpenPdf={(order) => {
            setPdfOrderId(order.id);
            setPdfOpen(true);
          }}
          onOpenPayments={(order) => {
            setPaymentsOrderId(order.id);
            setPaymentsOrderLabel(`${order.serie ?? "-"}-${order.correlative ?? "-"}`);
            setPaymentsOpen(true);
          }}
          onOrderChanged={refreshSelectedOrder}
          statistics={statistics}
          statisticsLoading={statisticsLoading}
          statisticsError={statisticsError}
        />
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 sm:justify-start">
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
            </div>

      </div>

      <SaleOrderModal open={open} onClose={closeModal} orderId={editOrderId} onSaved={loadOrders} />
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
      {paymentsOpen && paymentsOrderId ? (
        <SaleOrderPaymentsOrderModal
          open={paymentsOpen}
          saleOrderId={paymentsOrderId}
          saleOrderLabel={paymentsOrderLabel ?? undefined}
          onClose={() => {
            setPaymentsOpen(false);
            setPaymentsOrderId(null);
            setPaymentsOrderLabel(null);
          }}
          onUpdated={() => {
            void loadOrders();
            if (detailOpen && selectedOrder?.id === paymentsOrderId) {
              void fetchSaleOrderById(paymentsOrderId).then(setSelectedOrder).catch(() => undefined);
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
