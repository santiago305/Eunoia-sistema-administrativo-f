import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Sheet, Workflow } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import {
    ClientType,
    type SaleOrder,
    type SaleOrderExportColumn,
    type SaleOrderJsonImportRow,
    type SaleOrderSearchRule,
    type SaleOrderSearchSnapshot,
    type SaleOrderSearchStateResponse,
    type SaleOrdersUpdatedPayload,
} from "@/features/sale-orders/types/saleOrder";
import {
    bulkAssignSaleOrders,
    bulkChangeSaleOrderState,
    deleteSaleOrderExportPreset,
    deleteSaleOrderSearchMetric,
    exportSaleOrdersExcel,
    fetchSaleOrderById,
    getSaleOrderPdf,
    getSaleOrderSearchState,
    listSaleOrders,
    previewSaleOrdersJsonImport,
    saveSaleOrderExportPreset,
    saveSaleOrderSearchMetric,
    type SaleOrderBulkActionResponse,
} from "@/shared/services/saleOrderService";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { SaleOrderSmartSearchPanel } from "@/features/sale-orders/components/SaleOrderSmartSearchPanel";
import {
    buildSaleOrderSearchChips,
    buildSaleOrderSmartSearchColumns,
    createEmptySaleOrderSearchFilters,
    findSaleOrderSearchRule,
    hasSaleOrderSearchCriteria,
    removeSaleOrderSearchKey,
    SaleOrderSearchFields,
    SaleOrderSearchOperators,
    sanitizeSaleOrderSearchSnapshot,
    upsertSaleOrderSearchRule,
    type SaleOrderSearchFilters,
    type SaleOrderSearchFilterKey,
} from "@/features/sale-orders/utils/saleOrderSmartSearch";
import { DataTableSearchBar, DataTableSearchChips, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import { SaleOrderDetailsModal } from "@/features/sale-orders/components/SaleOrderDetailsModal";
import { useCompany } from "@/shared/hooks/useCompany";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { createSaleOrdersSocket } from "@/shared/lib/socket";
import { useAuth } from "@/shared/hooks/useAuth";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { ExcelImportModal } from "@/shared/components/importer";
import { WorkflowEditorModal } from "@/features/workflows/components/WorkflowEditorModal";
import {
    SaleOrderBulkActionsBar,
    SaleOrderBulkAssignModal,
    SaleOrderBulkChangeStateModal,
    SaleOrderBulkResultModal,
    type SaleOrderBulkChangeStateSelection,
} from "./components/bulk";
import { SaleOrderActionsPopover } from "./components/sale-order/SaleOrderActionsPopover";
import { SaleOrderStatusPopover } from "./components/sale-order/SaleOrderStatusPopover";
import { optionalSaleOrderImportFields, saleOrderImportFields } from "./types/saleImporter";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { formatDate } from "@/shared/utils/formatDate";
import { getDateKey, parseDateOnly } from "@/shared/components/components/date-picker/dateUtils";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import {
    invalidateSaleOrderExportPresetsCache,
    loadSaleOrderExportColumnsCached,
    loadSaleOrderExportPresetsCached,
} from "@/features/sale-orders/utils/saleOrderExportCache";

const sanitizeSaleOrderImportRows = (rows: SaleOrderJsonImportRow[]): SaleOrderJsonImportRow[] =>
    rows.map((row) => {
        const next = { ...row };
        optionalSaleOrderImportFields.forEach((key) => {
            if (next[key] === "") delete next[key];
        });
        return next;
    });

const TABLE_DATE_FIELD_OPTIONS = [
    { value: SaleOrderSearchFields.CREATED_AT, label: "Fecha creacion" },
    { value: SaleOrderSearchFields.SCHEDULE_DATE, label: "Fecha agenda" },
    { value: SaleOrderSearchFields.DELIVERY_DATE, label: "Fecha entrega" },
];

const parseTableDateRange = (rule: SaleOrderSearchRule | null) => ({
    startDate: rule?.operator === SaleOrderSearchOperators.BETWEEN ? parseDateOnly(rule.range?.start) : null,
    endDate: rule?.operator === SaleOrderSearchOperators.BETWEEN ? parseDateOnly(rule.range?.end) : null,
});

const formatMoney = (value?: number | null) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(value ?? 0));

const buildBulkActionFeedback = (result: SaleOrderBulkActionResponse) => {
    const { requested, succeeded, failed, partiallyCompleted = 0 } = result.data;
    return `Procesados: ${requested}. Exitosos: ${succeeded}. Fallidos: ${failed}. Parciales: ${partiallyCompleted}.`;
};

type SaleOrderModalState =
    | { open: false }
    | { open: true; mode: "create"; orderId: null }
    | { open: true; mode: "edit"; orderId: string };

const CLIENT_TYPE_CONFIG: Record<
    ClientType,
    {
        label: string;
        className: string;
    }
> = {
    [ClientType.NEW]: {
        label: "Nuevo",
        className: "border-blue-600 bg-blue-600 text-white",
    },
    [ClientType.LAGGING]: {
        label: "Rezagado",
        className: "border-amber-500 bg-amber-500 text-white",
    },
    [ClientType.REPURCHASE]: {
        label: "Recompra",
        className: "border-emerald-600 bg-emerald-600 text-white",
    },
    [ClientType.UNDEFINED]: {
        label: "Sin definir",
        className: "border-zinc-500 bg-zinc-500 text-white",
    },
};

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

    const [modalState, setModalState] = useState<SaleOrderModalState>({ open: false });
    const modalStateRef = useRef<SaleOrderModalState>({ open: false });
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<SaleOrder[]>([]);
    const [searchState, setSearchState] = useState<SaleOrderSearchStateResponse | null>(null);
    const [savingMetric, setSavingMetric] = useState(false);
    const [exportColumns, setExportColumns] = useState<SaleOrderExportColumn[]>([]);
    const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: SaleOrderExportColumn[] }>>([]);
    const [exporting, setExporting] = useState(false);
    const [useTableDateRangeForExport, setUseTableDateRangeForExport] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
    const selectedOrderRef = useRef<SaleOrder | null>(null);
    const [workflowEditorOpen, setWorkflowEditorOpen] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfOrderId, setPdfOrderId] = useState<string | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkChangeStateOpen, setBulkChangeStateOpen] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [bulkResult, setBulkResult] = useState<SaleOrderBulkActionResponse | null>(null);
    const [selectedSaleOrderIds, setSelectedSaleOrderIds] = useState<string[]>([]);
    const DEFAULT_LIMIT = 25;
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

    const draftSnapshot = useMemo(
        () =>
            sanitizeSaleOrderSearchSnapshot({
                q: searchText,
                filters: searchFilters,
            }),
        [searchFilters, searchText],
    );
    const executedSnapshot = useMemo(
        () =>
            sanitizeSaleOrderSearchSnapshot({
                q: appliedSearchText,
                filters: searchFilters,
            }),
        [appliedSearchText, searchFilters],
    );
    const hasExecutedSearchCriteria = useMemo(() => hasSaleOrderSearchCriteria(executedSnapshot), [executedSnapshot]);
    const smartSearchColumns = useMemo(() => buildSaleOrderSmartSearchColumns(searchState), [searchState]);
    const recentSearches = useMemo<DataTableRecentSearchItem<SaleOrderSearchSnapshot>[]>(
        () =>
            (searchState?.recent ?? []).map((item) => ({
                id: item.recentId,
                label: item.label,
                snapshot: item.snapshot,
            })),
        [searchState],
    );
    const savedMetrics = useMemo<DataTableSavedSearchItem<SaleOrderSearchSnapshot>[]>(
        () =>
            (searchState?.saved ?? []).map((metric) => ({
                id: metric.metricId,
                name: metric.name,
                label: metric.label,
                snapshot: metric.snapshot,
            })),
        [searchState],
    );
    const searchChips = useMemo(() => buildSaleOrderSearchChips(executedSnapshot, searchState), [executedSnapshot, searchState]);
    const [tableDateField, setTableDateField] = useState<SaleOrderSearchFilterKey>(SaleOrderSearchFields.CREATED_AT);
    const tableDateRule = useMemo(
        () => findSaleOrderSearchRule(draftSnapshot, tableDateField),
        [draftSnapshot, tableDateField],
    );
    const tableDateRuleRange = useMemo(() => parseTableDateRange(tableDateRule), [tableDateRule]);
    const [tableDateDraftRange, setTableDateDraftRange] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>(tableDateRuleRange);
    const selectedSaleOrders = useMemo(
        () => orders.filter((order) => selectedSaleOrderIds.includes(order.id)),
        [orders, selectedSaleOrderIds],
    );

    useEffect(() => {
        setTableDateDraftRange(tableDateRuleRange);
    }, [tableDateRuleRange]);

    const openModal = useCallback(() => {
        selectedOrderRef.current = null;
        setSelectedOrder(null);
        setModalState({ open: true, mode: "create", orderId: null });
    }, []);
    const closeModal = useCallback(() => {
        setModalState({ open: false });
        selectedOrderRef.current = null;
        setSelectedOrder(null);
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

    const loadExportColumns = useCallback(async () => {
        try {
            const response = await loadSaleOrderExportColumnsCached();
            setExportColumns(response ?? []);
        } catch {
            showFeedbackRef.current(errorResponse("Error al cargar columnas de exportacion."));
        }
    }, []);

    const loadExportPresets = useCallback(async () => {
        try {
            const response = await loadSaleOrderExportPresetsCached(userId);
            setExportPresets(
                (response ?? []).map((item) => ({
                    metricId: item.metricId,
                    name: item.name,
                    columns: item.snapshot?.columns ?? [],
                })),
            );
        } catch {
            showFeedbackRef.current(errorResponse("Error al cargar presets de exportacion."));
        }
    }, [userId]);

    const updateSelectedOrder = useCallback((updater: React.SetStateAction<SaleOrder | null>) => {
        setSelectedOrder((current) => {
            const next = typeof updater === "function" ? (updater as (value: SaleOrder | null) => SaleOrder | null)(current) : updater;
            selectedOrderRef.current = next;
            return next;
        });
    }, []);

    useEffect(() => {
        modalStateRef.current = modalState;
    }, [modalState]);

    useEffect(() => {
        void loadExportColumns();
    }, [loadExportColumns]);

    useEffect(() => {
        void loadExportPresets();
    }, [loadExportPresets]);

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

    const syncRealtimeSaleOrder = useCallback(
        (updatedOrder: SaleOrder | null | undefined) => {
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
            updateSelectedOrder((current) => {
                if (current?.id === updatedOrder.id) return mergeOrder(current);
                const editingOrderId = modalStateRef.current.open && modalStateRef.current.mode === "edit" ? modalStateRef.current.orderId : null;
                return editingOrderId === updatedOrder.id ? updatedOrder : current;
            });
        },
        [updateSelectedOrder],
    );

    const refreshSelectedOrder = useCallback(
        async (saleOrderId: string) => {
            const updated = await fetchSaleOrderById(saleOrderId);
            syncRealtimeSaleOrder(updated);
            await loadOrders();
        },
        [loadOrders, syncRealtimeSaleOrder],
    );

    useEffect(() => {
        selectedOrderRef.current = selectedOrder;
    }, [selectedOrder]);

    const refreshSelectedOrderDetail = useCallback(
        async (saleOrderId: string) => {
            const currentSelectedOrder = selectedOrderRef.current;
            const firstRefresh = await fetchSaleOrderById(saleOrderId);
            if (currentSelectedOrder?.id === saleOrderId && currentSelectedOrder?.currentStateId === firstRefresh?.currentStateId) {
                const secondRefresh = await fetchSaleOrderById(saleOrderId);
                syncRealtimeSaleOrder(secondRefresh);
                return;
            }
            syncRealtimeSaleOrder(firstRefresh);
        },
        [syncRealtimeSaleOrder],
    );

    const openOrderDetail = useCallback(
        async (order: SaleOrder) => {
            const summaryOrder = { ...order, items: [] };
            selectedOrderRef.current = summaryOrder;
            updateSelectedOrder(summaryOrder);
            setModalState({ open: true, mode: "edit", orderId: order.id });
            try {
                const detail = await fetchSaleOrderById(order.id);
                updateSelectedOrder((current) => (current?.id === order.id && current?.currentStateId === order.currentStateId ? detail : current));
            } catch (error) {
                showFeedbackRef.current(errorResponse(parseApiError(error, "No se pudo cargar el detalle del pedido.")));
            }
        },
        [updateSelectedOrder],
    );

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        setSelectedSaleOrderIds((current) => {
            const visibleIds = new Set(orders.map((order) => order.id));
            const next = current.filter((id) => visibleIds.has(id));
            return next.length === current.length ? current : next;
        });
    }, [orders]);

    useEffect(() => {
        if (!isAuthenticated || !userId) return;
        const socket = createSaleOrdersSocket(userId);
        if (!socket) return;
        const onSaleOrdersUpdated = (payload: SaleOrdersUpdatedPayload) => {
            const saleOrderIds = Array.isArray(payload?.saleOrderIds) ? payload.saleOrderIds : [];
            const hasSaleOrdersPayload = Array.isArray(payload?.saleOrders);
            const updatedOrders = hasSaleOrdersPayload ? (payload.saleOrders ?? []) : [];
            const updatedOrdersById = new Map(updatedOrders.filter((order) => order?.id).map((order) => [order.id, order]));
            const currentSelectedOrder = selectedOrderRef.current;
            const openOrderId = currentSelectedOrder?.id ?? (modalStateRef.current.open && modalStateRef.current.mode === "edit" ? modalStateRef.current.orderId : null);
            updatedOrders.forEach((order) => {
                if (saleOrderIds.length > 0 && !saleOrderIds.includes(order.id)) return;
                syncRealtimeSaleOrder(order);
            });

            if (openOrderId && (saleOrderIds.length === 0 || saleOrderIds.includes(openOrderId)) && !updatedOrdersById.has(openOrderId)) {
                void refreshSelectedOrderDetail(openOrderId).catch(() => undefined);
            }

            if (!hasSaleOrdersPayload) {
                void loadOrders();
            }
        };
        socket.on("sale-orders.updated", onSaleOrdersUpdated);
        return () => {
            socket.off("sale-orders.updated", onSaleOrdersUpdated);
        };
    }, [isAuthenticated, hasExecutedSearchCriteria, loadOrders, refreshSelectedOrderDetail, syncRealtimeSaleOrder, userId]);

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
            const errorDetails = response.errors
                .slice(0, 3)
                .map((error) => `Fila ${error.rowNumber}: ${error.message}`)
                .join(" ");
            showFeedbackRef.current(response.failedRows > 0 ? errorResponse(errorDetails ? `${baseMessage} ${errorDetails}` : baseMessage) : successResponse(baseMessage));
            await updateUx();
        } catch (error) {
            showFeedbackRef.current(errorResponse(parseApiError(error)));
        } finally {
            setImportLoading(false);
        }
    };

    const handleApplySearchRule = useCallback(
        (rule: SaleOrderSearchRule) => {
            startTransition(() => {
                setSearchFilters((current: SaleOrderSearchFilters) => {
                    const next = upsertSaleOrderSearchRule(
                        sanitizeSaleOrderSearchSnapshot({
                            q: searchText,
                            filters: current,
                        }),
                        rule,
                    );
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
                setSearchFilters((current: SaleOrderSearchFilters) => {
                    const next = removeSaleOrderSearchKey(
                        sanitizeSaleOrderSearchSnapshot({
                            q: searchText,
                            filters: current,
                        }),
                        fieldId,
                    );
                    return next.filters;
                });
                setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
            });
        },
        [searchText],
    );

    const handleTableDateRangeChange = useCallback(
        ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
            setTableDateDraftRange({ startDate, endDate });

            if (!startDate && !endDate) {
                handleRemoveSearchRule(tableDateField);
                return;
            }

            if (!startDate || !endDate) return;

            handleApplySearchRule({
                field: tableDateField,
                operator: SaleOrderSearchOperators.BETWEEN,
                range: {
                    start: getDateKey(startDate),
                    end: getDateKey(endDate),
                },
            });
        },
        [handleApplySearchRule, handleRemoveSearchRule, tableDateField],
    );

    const handleTableDateFieldChange = useCallback(
        (fieldId: string) => {
            const nextField = fieldId as SaleOrderSearchFilterKey;
            const previousField = tableDateField;
            setTableDateField(nextField);

            const { startDate, endDate } = tableDateDraftRange;
            if (!startDate || !endDate || previousField === nextField) return;

            startTransition(() => {
                setSearchFilters((current: SaleOrderSearchFilters) => {
                    const snapshot = sanitizeSaleOrderSearchSnapshot({
                        q: searchText,
                        filters: current,
                    });
                    const withoutPrevious = removeSaleOrderSearchKey(snapshot, previousField);
                    const next = upsertSaleOrderSearchRule(withoutPrevious, {
                        field: nextField,
                        operator: SaleOrderSearchOperators.BETWEEN,
                        range: {
                            start: getDateKey(startDate),
                            end: getDateKey(endDate),
                        },
                    });
                    return next.filters;
                });
                setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
            });
        },
        [searchText, tableDateDraftRange, tableDateField],
    );

    const handleRemoveChip = useCallback(
        (key: "q" | SaleOrderSearchFilterKey) => {
            const nextSnapshot = removeSaleOrderSearchKey(
                sanitizeSaleOrderSearchSnapshot({
                    q: appliedSearchText,
                    filters: searchFilters,
                }),
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
        startTransition(() =>
            setPaginationState((prev) => ({
                ...prev,
                pageIndex: Math.max(0, nextPage - 1),
            })),
        );
    }, []);

    const handleSaveMetric = useCallback(
        async (name: string) => {
            const snapshot = sanitizeSaleOrderSearchSnapshot({
                q: appliedSearchText,
                filters: searchFilters,
            });
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

    const handleExport = useCallback(async (columnsToExport: SaleOrderExportColumn[]) => {
        setExporting(true);
        try {
            const filters = useTableDateRangeForExport
                ? executedSnapshot.filters
                : executedSnapshot.filters.filter((rule) => !TABLE_DATE_FIELD_OPTIONS.some((field) => field.value === rule.field));
            const file = await exportSaleOrdersExcel({
                columns: columnsToExport,
                q: executedSnapshot.q,
                filters: filters as unknown as Record<string, unknown>[],
                useDateRange: useTableDateRangeForExport,
            });
            const url = URL.createObjectURL(file.blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = file.filename;
            anchor.click();
            URL.revokeObjectURL(url);
            showFeedback(successResponse("Excel exportado correctamente."));
        } catch {
            showFeedback(errorResponse("No se pudo exportar el Excel."));
        } finally {
            setExporting(false);
        }
    }, [executedSnapshot.filters, executedSnapshot.q, showFeedback, useTableDateRangeForExport]);

    const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: SaleOrderExportColumn[] }) => {
        await saveSaleOrderExportPreset({
            name: payload.name,
            columns: payload.columns,
            useDateRange: useTableDateRangeForExport,
        });
        invalidateSaleOrderExportPresetsCache(userId);
        await loadExportPresets();
        showFeedback(successResponse("Preset de exportacion guardado."));
    }, [loadExportPresets, showFeedback, useTableDateRangeForExport, userId]);

    const handleDeleteExportPreset = useCallback(async (metricId: string) => {
        await deleteSaleOrderExportPreset(metricId);
        invalidateSaleOrderExportPresetsCache(userId);
        await loadExportPresets();
        showFeedback(successResponse("Preset eliminado."));
    }, [loadExportPresets, showFeedback, userId]);

    const handleBulkAssign = useCallback(
        async (input: { assignedBy: string | null; saleOrderIds: string[] }) => {
            const saleOrderIds = [...input.saleOrderIds];
            if (saleOrderIds.length === 0) return;

            setBulkActionLoading(true);
            try {
                const result = await bulkAssignSaleOrders({
                    saleOrderIds,
                    assignedBy: input.assignedBy,
                });
                setBulkResult(result);
                showFeedback(
                    result.data.failed > 0
                        ? errorResponse(buildBulkActionFeedback(result))
                        : successResponse(buildBulkActionFeedback(result)),
                );
                setBulkAssignOpen(false);
                setSelectedSaleOrderIds([]);
                await loadOrders();
            } catch (error) {
                showFeedback(errorResponse(parseApiError(error, "Error al asignar asesores de forma masiva.")));
            } finally {
                setBulkActionLoading(false);
            }
        },
        [loadOrders, showFeedback],
    );

    const loadBulkFilteredOrders = useCallback(
        async (input: { page: 1; limit: 100; filters: SaleOrderSearchRule[] }) => {
            const response = await listSaleOrders({
                page: input.page,
                limit: input.limit,
                filters: input.filters.length ? input.filters : undefined,
            });
            return response.items ?? [];
        },
        [],
    );

    const handleBulkChangeState = useCallback(
        async (selection: SaleOrderBulkChangeStateSelection) => {
            const saleOrderIds = [...selection.saleOrderIds];
            if (saleOrderIds.length === 0 || !selection.targetStateId) return;

            setBulkActionLoading(true);
            try {
                const result = await bulkChangeSaleOrderState({
                    saleOrderIds,
                    targetStateId: selection.targetStateId,
                });

                const failedIds = result.data.results
                    .filter((row) => row.status === "failed")
                    .map((row) => row.saleOrderId);

                setBulkResult(result);
                showFeedback(
                    result.data.failed > 0
                        ? errorResponse(buildBulkActionFeedback(result))
                        : successResponse(buildBulkActionFeedback(result)),
                );
                setBulkChangeStateOpen(false);
                setSelectedSaleOrderIds((current) =>
                    current.filter((saleOrderId) => failedIds.includes(saleOrderId)),
                );
                await loadOrders();
            } catch (error) {
                showFeedback(errorResponse(parseApiError(error, "Error al cambiar estados de forma masiva.")));
            } finally {
                setBulkActionLoading(false);
            }
        },
        [loadOrders, showFeedback],
    );

    const centeredHeaderClassName = "text-center [&>div]:justify-center";
    const columns = useMemo<DataTableColumn<SaleOrder>[]>(
        () => [
            {
                id: "number",
                header: "Pedido",
                headerClassName: centeredHeaderClassName,
                cell: (order) => {
                    const rawClientType = order.client?.type;
                    const clientType = Object.values(ClientType).includes(rawClientType as ClientType) ? (rawClientType as ClientType) : ClientType.UNDEFINED;
                    const typeConfig = CLIENT_TYPE_CONFIG[clientType];
                    return (
                        <div className="min-w-[50px] space-y-1 leading-tight">
                            <p className="whitespace-nowrap text-[11px] font-semibold text-zinc-900">
                                {order.serie ?? "-"}-{order.correlative ?? "-"}
                            </p>
                            <span
                                className={`inline-flex max-w-full items-center justify-center truncate 
                                whitespace-nowrap rounded-sm px-1.5 py-1 text-[9px] font-semibold text-white ${typeConfig.className}`}
                                title={typeConfig.label}
                            >
                                {typeConfig.label}
                                {order.client?.count ? ` (${order.client.count})` : ""}
                            </span>
                        </div>
                    );
                },
                sortable: false,
                hideable: false,
            },
            {
                id: "dateCreated",
                header: "Creación",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="min-w-[50px] space-y-0.5 leading-tight">
                        <div className="grid grid-cols-[50px_1fr] items-center gap-0">
                            <span className="whitespace-nowrap font-medium tabular-nums text-zinc-800">{order.createdAt ? formatDate(order.createdAt) : "-"}</span>
                        </div>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "dateAgenda",
                header: "Agenda",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="min-w-[50px] space-y-0.5 leading-tight">
                        <div className="grid grid-cols-[50px_1fr] items-center gap-0">
                            <span className="whitespace-nowrap font-medium tabular-nums text-zinc-800">{order.scheduleDate ? formatDate(order.scheduleDate) : "-"}</span>
                        </div>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "dateDelivery",
                header: "Entrega",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="min-w-[50px] space-y-0.5 leading-tight">
                        <div className="grid grid-cols-[50px_1fr] items-center gap-0">
                            <span className="whitespace-nowrap font-medium tabular-nums text-zinc-800">{order.deliveryDate ? formatDate(order.deliveryDate) : "-"}</span>
                        </div>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "client",
                header: "Cliente",
                headerClassName: centeredHeaderClassName,
                copy: true,
                cell: (order) => (
                    <div className="max-w-[120px]  w-[120px] space-y-0.5 leading-tight">
                        <p className="line-clamp-2 text-zinc-700">
                            {order.client?.fullName ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "document",
                header: "Documento",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="max-w-[120px] space-y-0.5 leading-tight">
                        <p className="line-clamp-2 text-zinc-700" title={order.client?.docNumber ?? "Sin información"}>
                            {order.client?.docNumber ?? "-"}
                        </p>                    
                    </div>
                ),
                sortable: false,
                stopRowClick: true,
                copy: true,
            },
            {
                id: "phone",
                header: "Teléfono",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="max-w-[120px] space-y-0.5 leading-tight">
                        <p className="line-clamp-2 text-zinc-700" title={order.client?.mainPhone ?? "Sin información"}>
                            {order.client?.mainPhone ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
                stopRowClick: true,
                copy: true,
            },
            {
                id: "location",
                header: "Ubicación",
                headerClassName: centeredHeaderClassName,
                cell: (order) => {
                    const department = order.client?.department?.name;
                    const province = order.client?.province?.name;
                    const district = order.client?.district?.name;
                    const location = [department, province, district].filter(Boolean).join(" / ");
                    return (
                        <div className="w-[120px] leading-tight">
                            <p className="text-zinc-700" title={location || "Sin ubicación"}>
                                {location || "-"}
                            </p>
                        </div>
                    );
                },
                sortable: false,
            },
            {
                id: "agency",
                header: "Agencia/Dirección",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="w-[220px] leading-tight">
                        <p className=" text-zinc-700" title={order.agencyDetail ?? "Sin información"}>
                            {order.agencyDetail ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "warehouse",
                header: "Almacén",
                cell: (order) => (
                    <div className="max-w-[120px] leading-tight">
                        <p className="line-clamp-2 text-zinc-700" title={order.warehouse?.name ?? "Sin información"}>
                            {order.warehouse?.name ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "source",
                header: "Enganche",
                cell: (order) => (
                    <div className="max-w-[120px] leading-tight">
                        <p className="truncate font-medium text-zinc-700" title={order.source?.name ?? "-"}>
                            {order.source?.name ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
                visible: false
            },
            {
                id: "codefb",
                header: "Codigo FB",
                headerClassName: centeredHeaderClassName,
                copy: true,
                cell: (order) => (
                    <div className="max-w-[180px] w-[130px] leading-tight">
                        <p className="truncate font-medium text-zinc-700" title={order.advertisingCode ?? "Sin información"}>
                            {order.advertisingCode ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
                stopRowClick: true,
                visible: false
            },
            {
                id: "createdTo",
                header: "Creado",
                headerClassName: centeredHeaderClassName,
                copy: true,
                cell: (order) => (
                    <div className="max-w-[180px] w-[130px] leading-tight">
                        <p className="truncate font-medium text-zinc-700">
                            {order.createdBy?.email ?? " "}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "assignedTo",
                header: "Asignado",
                headerClassName: centeredHeaderClassName,
                copy: true,
                cell: (order) => (
                    <div className="max-w-[180px] w-[130px] leading-tight">
                        <p className="truncate font-medium text-zinc-700">
                            {order.assignedBy?.email ?? " "}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "workflow",
                header: "Tipo",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="max-w-[140px] space-y-1 leading-tight">
                        <p className="truncate text-zinc-700 text-[10px]" title={order.workflow?.name ?? "Sin tipo"}>
                            {order.workflow?.name ?? "Sin tipo"}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "status",
                header: "Estados",
                headerClassName: centeredHeaderClassName,
                cell: (order) => (
                    <div className="max-w-[140px] space-y-1 leading-tight" onClick={(event) => event.stopPropagation()}>
                        <SaleOrderStatusPopover order={order} onOrderChanged={refreshSelectedOrder} />
                    </div>
                ),
                sortable: false,
                stopRowClick: true,
            },
            {
                id: "amounts",
                header: "Montos",
                headerClassName:centeredHeaderClassName,
                cell: (order) => (
                    <div className="min-w-[115px] space-y-0.5 leading-tight">
                        <p className="flex justify-between gap-2 whitespace-nowrap">
                            <span className="text-zinc-500">Total:</span>
                            <span className="font-medium tabular-nums text-zinc-800">{formatMoney(order.total)}</span>
                        </p>
                        <p className="flex justify-between gap-2 whitespace-nowrap">
                            <span className="text-zinc-500">Pagado:</span>
                            <span className="font-medium tabular-nums text-emerald-700">{formatMoney(order.totalPaid)}</span>
                        </p>
                        <p className="flex justify-between gap-2 whitespace-nowrap">
                            <span className="text-zinc-500">Debe:</span>
                            <span className={`font-medium tabular-nums ${Number(order.pendingAmount ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>{formatMoney(order.pendingAmount)}</span>
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "lookup",
                header: "Seguimiento",
                headerClassName: centeredHeaderClassName,
                cell: (order) => {
                    const isPaid = Number(order.pendingAmount ?? 0) <= 0;
                    return (
                        <div className="flex min-w-[95px] flex-col items-start gap-1">
                            <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[9px] font-medium ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {isPaid ? "Pagado" : "Pago pendiente"}
                            </span>

                            <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[9px] font-medium ${order.invoiceSend ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {order.invoiceSend ? "Comprobante enviado" : "Sin comprobante"}
                            </span>
                        </div>
                    );
                },
                sortable: false,
            },
            {
                id: "actions",
                header: "Acciones",
                cell: (order) => (
                    <div onClick={(event) => event.stopPropagation()} className="flex justify-center">
                        <SaleOrderActionsPopover
                            order={order}
                            onOpenPdf={(selected) => {
                                setPdfOrderId(selected.id);
                                setPdfOpen(true);
                            }}
                        />
                    </div>
                ),
                pinned: "right",
                hideable: false,
                sortable: false,
                stopRowClick: true,
            },
        ],
        [refreshSelectedOrder],
    );
    return (
        <PageShell className="bg-white" scrollArea>
            <div className="space-y-4">
                <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />
                <SaleOrderBulkActionsBar
                    selectedCount={selectedSaleOrderIds.length}
                    disabled={bulkActionLoading}
                    onOpenAssign={() => setBulkAssignOpen(true)}
                    onOpenChangeState={() => setBulkChangeStateOpen(true)}
                    onClearSelection={() => setSelectedSaleOrderIds([])}
                />
                <DataTable
                    tableId="sale-orders-list"
                    showSelectionInfo={false}
                    data={orders}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    selectableRows
                    selectedRowKeys={selectedSaleOrderIds}
                    onSelectedRowKeysChange={(keys) => setSelectedSaleOrderIds(keys)}
                    emptyMessage="No hay pedidos con los filtros actuales."
                    selectableColumns
                    maxHeight="calc(100vh - 165px)"
                    paddingPaginated="py-1"
                    paddingTablePaginated="py-0"
                    toolbarActions={
                        <>
                            <SystemButton size="icon" variant="outline"  className="rounded-md h-11 shadow" tooltip="Tipos"
                                leftIcon={<Workflow className="h-4 w-4" />} onClick={() => setWorkflowEditorOpen(true)} title="Tipos">
                            </SystemButton>
                            <SystemButton size="icon" variant="outline"  className="rounded-md h-11 shadow" tooltip="Importar"
                            leftIcon={<Sheet className="h-4 w-4" />} onClick={() => setImportOpen(true)} disabled={importLoading} title={companyActionTitle ?? "Importar pedidos"}>
                            </SystemButton>
                            {exportColumns.length ? (
                                <ExportPopover
                                    buttonLabel=""
                                    buttonSize="icon"
                                    buttonClass="h-11 shadow"
                                    buttonTooltip="Exportar"
                                    buttonVariant="outline"
                                    columns={exportColumns}
                                    loading={exporting}
                                    presets={exportPresets}
                                    onSavePreset={handleSaveExportPreset}
                                    onDeletePreset={handleDeleteExportPreset}
                                    onExport={handleExport}
                                />
                            ) : null}
                            <SystemButton size="icon" className="rounded-md h-11 shadow" tooltip="Nuevo pedido"
                            leftIcon={<Plus className="h-4 w-4" />} onClick={openModal} disabled={companyActionDisabled} title={companyActionTitle ?? "Nuevo pedido"}>
                            </SystemButton>
                        </>
                    }
                    rangeDates={{
                        startDate: tableDateDraftRange.startDate,
                        endDate: tableDateDraftRange.endDate,
                        onChange: handleTableDateRangeChange,
                        label: "Fechas",
                        name: "sale-orders-range-dates",
                        // fields: TABLE_DATE_FIELD_OPTIONS,
                        // fieldValue: tableDateField,
                        onFieldChange: handleTableDateFieldChange,
                    }}
                    useRangeDatesForExternalExport
                    onExternalExportRangeStateChange={(state) => {
                        setUseTableDateRangeForExport(state.useDateRange);
                    }}
                    toolbarSearchContent={
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
                    }
                    pagination={{
                        page: serverPagination.page,
                        limit: serverPagination.limit,
                        total: serverPagination.total,
                    }}
                    onPageChange={handlePageChange}
                    onRowClick={(order) => void openOrderDetail(order)}
                    tableClassName="
                        text-[10px]
                        [&_th]:h-8
                        [&_th]:whitespace-nowrap
                        [&_th]:px-2
                        [&_td]:px-2
                        [&_td]:py-2
                    "
                />
            </div>
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
                open={modalState.open}
                mode={modalState.open ? modalState.mode : "create"}
                order={selectedOrder}
                onClose={closeModal}
                onSaved={async () => {
                    closeModal();
                    await loadOrders();
                }}
            />
            <WorkflowEditorModal open={workflowEditorOpen} onClose={() => setWorkflowEditorOpen(false)} />
            <SaleOrderBulkAssignModal
                open={bulkAssignOpen}
                selectedOrders={selectedSaleOrders}
                selectedOrderIds={selectedSaleOrderIds}
                loading={bulkActionLoading}
                onClose={() => setBulkAssignOpen(false)}
                onDiscardOrder={(saleOrderId) =>
                    setSelectedSaleOrderIds((current) => current.filter((id) => id !== saleOrderId))
                }
                onLoadFilteredOrders={loadBulkFilteredOrders}
                onSubmit={handleBulkAssign}
            />
            <SaleOrderBulkChangeStateModal
                open={bulkChangeStateOpen}
                selectedOrders={selectedSaleOrders}
                selectedOrderIds={selectedSaleOrderIds}
                loading={bulkActionLoading}
                onClose={() => setBulkChangeStateOpen(false)}
                onDiscardOrder={(saleOrderId) =>
                    setSelectedSaleOrderIds((current) => current.filter((id) => id !== saleOrderId))
                }
                onLoadFilteredOrders={loadBulkFilteredOrders}
                onSubmit={handleBulkChangeState}
            />
            <SaleOrderBulkResultModal
                open={Boolean(bulkResult)}
                result={bulkResult}
                knownOrders={orders}
                onClose={() => setBulkResult(null)}
            />
            <ExcelImportModal<SaleOrderJsonImportRow>
                open={importOpen}
                title="Importar pedidos"
                fields={saleOrderImportFields}
                ubigeoConfig={{
                    departmentKey: "departmentName",
                    provinceKey: "provinceName",
                    districtKey: "districtName",
                    valueMode: "name",
                }}
                onClose={() => setImportOpen(false)}
                onSubmit={handleImportPreview}
            />
        </PageShell>
    );
}

