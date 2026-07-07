import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Sheet, Workflow } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import {
    ClientType,
    type SaleOrder,
    type SaleOrderJsonImportRow,
    type SaleOrderSearchSnapshot,
    type SaleOrderSearchStateResponse,
    type SaleOrdersUpdatedPayload,
} from "@/features/sale-orders/types/saleOrder";
import {
    deleteSaleOrder,
    deleteSaleOrderSearchMetric,
    fetchSaleOrderById,
    getSaleOrderPdf,
    getSaleOrderSearchState,
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
import { SaleOrderActionsPopover } from "./components/sale-order/SaleOrderActionsPopover";
import { SaleOrderStatusPopover } from "./components/sale-order/SaleOrderStatusPopover";
import { optionalSaleOrderImportFields, saleOrderImportFields } from "./types/saleImporter";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { formatDate } from "@/shared/utils/formatDate";
import { AlertModal } from "@/shared/components/components/AlertModal";

const sanitizeSaleOrderImportRows = (rows: SaleOrderJsonImportRow[]): SaleOrderJsonImportRow[] =>
    rows.map((row) => {
        const next = { ...row };
        optionalSaleOrderImportFields.forEach((key) => {
            if (next[key] === "") delete next[key];
        });
        return next;
    });

const formatMoney = (value?: number | null) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(value ?? 0));

type SaleOrderModalState =
    | { open: false }
    | { open: true; mode: "create"; orderId: null }
    | { open: true; mode: "edit"; orderId: string };

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
    const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
    const selectedOrderRef = useRef<SaleOrder | null>(null);
    const [paymentsOpen, setPaymentsOpen] = useState(false);
    const [paymentsOrder, setPaymentsOrder] = useState<SaleOrder | null>(null);
    const [workflowEditorOpen, setWorkflowEditorOpen] = useState(false);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfOrderId, setPdfOrderId] = useState<string | null>(null);
    const [deleteOrder, setDeleteOrder] = useState<SaleOrder | null>(null);
    const [deletingOrder, setDeletingOrder] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
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
            setPaymentsOrder((current) => (current?.id === updatedOrder.id ? mergeOrder(current) : current));
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
        (rule: any) => {
            startTransition(() => {
                setSearchFilters((current: any) => {
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
                setSearchFilters((current: any) => {
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

    const confirmDeleteOrder = useCallback(async () => {
        if (!deleteOrder?.id) return;
        const deletingOrderId = deleteOrder.id;
        setDeletingOrder(true);
        try {
            const response = await deleteSaleOrder(deletingOrderId);
            showFeedback(successResponse(response.message ?? "Pedido eliminado correctamente."));
            if (selectedOrderRef.current?.id === deletingOrderId) {
                closeModal();
            }
            if (paymentsOrder?.id === deletingOrderId) {
                setPaymentsOrder(null);
                setPaymentsOpen(false);
            }
            setDeleteOrder(null);
            await loadOrders();
        } catch (error) {
            showFeedback(errorResponse(parseApiError(error, "Error al eliminar el pedido.")));
        } finally {
            setDeletingOrder(false);
        }
    }, [closeModal, deleteOrder, loadOrders, paymentsOrder?.id, showFeedback]);

    const columns = useMemo<DataTableColumn<SaleOrder>[]>(
        () => [
            {
                id: "number",
                header: "Pedido",
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
                cell: (order) => {
                    return (
                        <div className="max-w-[120px] space-y-0.5 leading-tight">
                            <div className="flex min-w-0 items-center gap-1">
                                <p className="min-w-0 flex-1 truncate font-medium text-zinc-800" title={order.client?.fullName ?? "Sin cliente"}>
                                    {order.client?.fullName ?? "Sin cliente"}
                                </p>
                            </div>
                        </div>
                    );
                },
                sortable: false,
            },
            {
                id: "document",
                header: "Documento",
                cell: (order) => {
                    return (
                        <div className="max-w-[120px] space-y-0.5 leading-tight">
                            <div className="flex min-w-0 items-center gap-1">
                                <p className="min-w-0 flex-1 truncate font-medium text-zinc-800" title={order.client?.fullName ?? "Sin cliente"}>
                                    {order.client?.docNumber ?? " "}
                                </p>
                            </div>
                        </div>
                    );
                },
                sortable: false,
            },
            {
                id: "phone",
                header: "Teléfono",
                cell: (order) => {
                    return (
                        <div className="max-w-[120px] space-y-0.5 leading-tight">
                            <div className="flex min-w-0 items-center gap-1">
                                <p className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                                    {order.client?.mainPhone ?? "Sin teléfono"}
                                </p>
                            </div>
                        </div>
                    );
                },
                sortable: false,
            },
            {
                id: "location",
                header: "Ubicación",
                cell: (order) => {
                    const department = order.client?.department?.name;
                    const province = order.client?.province?.name;
                    const district = order.client?.district?.name;

                    const location = [department, province, district].filter(Boolean).join(" / ");

                    return (
                        <div className="w-[120px] leading-tight">
                            <p className="line-clamp-3 text-zinc-700" title={location || "Sin ubicación"}>
                                {location || "-"}
                            </p>
                        </div>
                    );
                },
                sortable: false,
            },
            {
                id: "agency",
                header: "Agencia",
                cell: (order) => (
                    <div className="w-[50px] max-w-[200px] leading-tight">
                        <p className="line-clamp-2 text-zinc-700" title={order.agencyDetail ?? "Sin información"}>
                            {order.agencyDetail ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "delivery",
                header: "Dirección",
                cell: (order) => (
                    <div className="max-w-[170px] w-[50px] leading-tight">
                        <p className="line-clamp-2 text-zinc-700" >
                            {order.sendAddress ?? order.client?.address ?? ""}
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
            },
            {
                id: "codefb",
                header: "Codigo FB",
                cell: (order) => (
                    <div className="max-w-[180px] w-[120px] leading-tight">
                        <p className="truncate font-medium text-zinc-700" title={order.advertisingCode ?? "-"}>
                            {order.advertisingCode ?? "-"}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "assignedTo",
                header: "Asignado",
                cell: (order) => (
                    <div className="max-w-[180px] w-[120px] leading-tight">
                        <p className="truncate font-medium text-zinc-700">
                            {order.createdBy?.email ?? " "}
                        </p>
                    </div>
                ),
                sortable: false,
            },
            {
                id: "workflow",
                header: "Tipo",
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
                header: "",
                cell: (order) => (
                    <div onClick={(event) => event.stopPropagation()}>
                        <SaleOrderActionsPopover
                            order={order}
                            onEdit={(selected) => {
                                void openOrderDetail(selected);
                            }}
                            onOpenPdf={(selected) => {
                                setPdfOrderId(selected.id);
                                setPdfOpen(true);
                            }}
                            onOpenPayments={(selected) => {
                                setPaymentsOrder(selected);
                                setPaymentsOpen(true);
                            }}
                            onDelete={setDeleteOrder}
                        />
                    </div>
                ),
                pinned: "right",
                hideable: false,
                sortable: false,
                stopRowClick: true,
            },
        ],
        [openOrderDetail, refreshSelectedOrder],
    );
    return (
        <PageShell className="bg-white">
            <div className="space-y-4">
                <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />
                <DataTable
                    tableId="sale-orders-list"
                    data={orders}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    emptyMessage="No hay pedidos con los filtros actuales."
                    selectableColumns
                    maxHeight="calc(100vh - 165px)"
                    paddingPaginated="py-1"
                    paddingTablePaginated="py-0"
                    toolbarActions={
                        <>
                            <SystemButton size="lg" variant="outline"  leftIcon={<Workflow className="h-4 w-4" />} onClick={() => setWorkflowEditorOpen(true)}>
                                Tipos
                            </SystemButton>
                            <SystemButton size="lg" variant="outline"  leftIcon={<Sheet className="h-4 w-4" />} onClick={() => setImportOpen(true)} disabled={importLoading} title={companyActionTitle}>
                                Importar
                            </SystemButton>
                            <SystemButton size="lg" leftIcon={<Plus className="h-4 w-4" />} onClick={openModal} disabled={companyActionDisabled} title={companyActionTitle}>
                                Nuevo pedido
                            </SystemButton>
                        </>
                    }
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
                        if (modalState.open && modalState.mode === "edit" && selectedOrder?.id === paymentsOrder.id) {
                            void fetchSaleOrderById(paymentsOrder.id)
                                .then(setSelectedOrder)
                                .catch(() => undefined);
                        }
                    }}
                />
            ) : null}
            <AlertModal
                open={Boolean(deleteOrder)}
                type="deleted"
                title="Eliminar pedido"
                message="Estas por eliminar este pedido. Hazlo solo si estas seguro."
                confirmText="Eliminar"
                loading={deletingOrder}
                onClose={() => {
                    if (deletingOrder) return;
                    setDeleteOrder(null);
                }}
                onConfirm={() => {
                    void confirmDeleteOrder();
                }}
            />
            <WorkflowEditorModal open={workflowEditorOpen} onClose={() => setWorkflowEditorOpen(false)} />
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
