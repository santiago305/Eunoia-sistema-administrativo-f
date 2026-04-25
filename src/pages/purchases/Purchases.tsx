import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import {
    DataTableSearchBar,
    DataTableSearchChips,
    type DataTableRecentSearchItem,
    type DataTableSavedSearchItem,
} from "@/components/table/search";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import {
    deletePurchaseSearchMetric,
    enterPurchaseOrder,
    getPurchaseSearchState,
    listPurchaseOrders,
    savePurchaseSearchMetric,
    setCancelPurchase,
    setSentPurchase,
} from "@/services/purchaseService";
import { money, parseDateInputValue, toLocalDateKey } from "@/utils/functionPurchases";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentListModal } from "./components/PaymentListModal";
import { QuotaListModal } from "./components/QuotaListModal";
import { PurchaseModal } from "./components/PurchaseModal";
import { PurchaseDetailsModal } from "./components/PurchaseDetailsModal";
import type {
    PurchaseOrder,
    PurchaseSearchFilters,
    PurchaseSearchRule,
    PurchaseSearchSnapshot,
    PurchaseSearchStateResponse,
} from "./types/purchase";
import { PurchaseOrderStatus, PurchaseOrderStatuses, VoucherDocType, VoucherDocTypes, PaymentFormTypes } from "./types/purchaseEnums";
import TimerToEnd, { formatDate } from "@/components/TimerToEnd";
import { ActionsPopover, type ActionItem } from "@/components/ActionsPopover";
import { Calendar, CreditCard, FileText, List, Menu, OctagonAlert, PackageCheck, Pencil, Play, Plus, Timer, XCircle } from "lucide-react";
import { getPurchaseOrderPdf } from "@/services/pdfServices";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import {
    buildPurchaseSearchChips,
    buildPurchaseSmartSearchColumns,
    createEmptyPurchaseSearchFilters,
    hasPurchaseSearchCriteria,
    upsertPurchaseSearchRule,
    removePurchaseSearchKey,
    sanitizePurchaseSearchSnapshot,
    type PurchaseSearchFilterKey,
} from "./utils/purchaseSmartSearch";
import { PurchaseSmartSearchPanel } from "./components/PurchaseSmartSearchPanel";
import { useCompany } from "@/hooks/useCompany";

const PRIMARY = "hsl(var(--primary))";

const statusLabels: Record<PurchaseOrderStatus, string> = {
    [PurchaseOrderStatuses.DRAFT]: "Borrador",
    [PurchaseOrderStatuses.SENT]: "Enviado",
    [PurchaseOrderStatuses.PARTIAL]: "Parcial",
    [PurchaseOrderStatuses.RECEIVED]: "Recibido",
    [PurchaseOrderStatuses.CANCELLED]: "Cancelado",
};

const docTypeLabels: Record<VoucherDocType, string> = {
    [VoucherDocTypes.FACTURA]: "Factura",
    [VoucherDocTypes.BOLETA]: "Boleta",
    [VoucherDocTypes.NOTA_VENTA]: "Nota de venta",
};

const paymentFormLabels: Record<string, string> = {
    [PaymentFormTypes.CONTADO]: "Contado",
    [PaymentFormTypes.CREDITO]: "Credito",
};

type PurchaseRow = {
    id: string;
    purchase: PurchaseOrder;
    numero: string;
    supplierLabel: string;
    supplierDoc: string;
    warehouseLabel: string;
    statusLabel: string;
    docLabel: string;
    date: string;
    time?: string;
    dateEnter: string;
    timeEnter?: string;
};

export default function Purchases() {
    const { showFlash, clearFlash } = useFlashMessage();
    const { hasCompany } = useCompany();
    const companyActionDisabled = !hasCompany;
    const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

    const [searchText, setSearchText] = useState("");
    const [appliedSearchText, setAppliedSearchText] = useState("");
    const [searchFilters, setSearchFilters] = useState<PurchaseSearchFilters>(() => createEmptyPurchaseSearchFilters());
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);
    const limit = 8;

    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchState, setSearchState] = useState<PurchaseSearchStateResponse | null>(null);
    const [savingMetric, setSavingMetric] = useState(false);
    const [modalPayment, setModalPayment] = useState(false);
    const [modalPaymentList, setModalPaymentList] = useState(false);
    const [modalQuotaList, setModalQuotaList] = useState(false);
    const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
    const [editPoId, setEditPoId] = useState<string | undefined>(undefined);

    const [totalPaid, setTotalPaid] = useState(0);
    const [totalToPay, setTotalToPay] = useState(0);
    const [totalPo, setTotalPo] = useState(0);
    const [poId, setPoId] = useState("");
    const [paymentForm, setPaymentForm] = useState("");
    const [openPdfModal, setOpenPdfModal] = useState(false);
    const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
    const [selectedPurchaseRow, setSelectedPurchaseRow] = useState<PurchaseRow | null>(null);

    const draftSnapshot = useMemo(
        () =>
            sanitizePurchaseSearchSnapshot({
                q: searchText,
                filters: searchFilters,
            }),
        [searchFilters, searchText],
    );

    const executedSnapshot = useMemo(
        () =>
            sanitizePurchaseSearchSnapshot({
                q: appliedSearchText,
                filters: searchFilters,
            }),
        [appliedSearchText, searchFilters],
    );

    const loadSearchState = useCallback(async () => {
        try {
            const response = await getPurchaseSearchState();
            setSearchState(response);
        } catch {
            showFlashRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
        }
    }, []);

    const submitSearch = useCallback(() => {
        startTransition(() => {
            setAppliedSearchText(searchText.trim());
            setPage(1);
        });
    }, [searchText]);

    const handleSearchTextChange = useCallback((value: string) => {
        startTransition(() => {
            setSearchText(value);
        });
    }, []);

    const loadPurchases = useCallback(async () => {
        clearFlash();
        setLoading(true);
        setError(null);
        try {
            const res = await listPurchaseOrders({
                page,
                limit,
                q: executedSnapshot.q,
                filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
            });
            setPurchases(res.items ?? []);
            const nextTotal = res.total ?? 0;
            const nextPage = res.page ?? page;
            const nextLimit = res.limit ?? limit;
            const nextTotalPages = Math.max(1, Math.ceil(nextTotal / (nextLimit || limit)));
            setPagination({
                total: nextTotal,
                page: nextPage,
                limit: nextLimit,
                totalPages: nextTotalPages,
                hasPrev: nextPage > 1,
                hasNext: nextPage < nextTotalPages,
            });
            if (hasPurchaseSearchCriteria(executedSnapshot)) {
                void loadSearchState();
            }
        } catch {
            setPurchases([]);
            setPagination((prev) => ({
                ...prev,
                total: 0,
                totalPages: 1,
                hasPrev: false,
                hasNext: false,
            }));
            setError("Error al listar compras");
            showFlashRef.current(errorResponse("Error al listar compras"));
        } finally {
            setLoading(false);
        }
    }, [
        clearFlash,
        executedSnapshot,
        fromDate,
        limit,
        loadSearchState,
        page,
        showFlash,
        toDate,
    ]);

    const setSent = async (id: string) => {
        clearFlash();
        try {
            const res = await setSentPurchase(id);
            if (res.type === "error") {
                showFlash(errorResponse(res.message));
            }
            if (res.type === "success") {
                showFlash(successResponse(res.message));
                void loadPurchases();
            }
        } catch {
            showFlash(errorResponse("Error al iniciar espera de mercaderia"));
        }
    };
    const cancelOrder = async (id: string) => {
        clearFlash();
        try {
            const res = await setCancelPurchase(id);
            if (res.type === "error") {
                showFlash(errorResponse(res.message));
            }
            if (res.type === "success") {
                showFlash(successResponse(res.message));
                void loadPurchases();
            }
        } catch {
            showFlash(errorResponse("Error al iniciar espera de mercaderia"));
        }
    };
    const openPurchasePdf = (id: string) => {
        clearFlash();
        setSelectedProductionId(id);
        setOpenPdfModal(true);
    };

    const EnterToWarehouse = async (id: string) => {
        clearFlash();
        try {
            const res = await enterPurchaseOrder(id);
            if (res.type === "error") {
                showFlash(errorResponse(res.message));
                void loadPurchases();
            }
            if (res.type === "success") {
                showFlash(successResponse(res.message));
                void loadPurchases();
            }
        } catch {
            showFlash(errorResponse("Error al ingresar a almacen"));
            void loadPurchases();
        }
    };

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

    useEffect(() => {
        void loadSearchState();
    }, [loadSearchState]);

    const now = useMemo(() => new Date().toISOString(), []);

    const purchaseRows = useMemo<PurchaseRow[]>(
        () =>
            purchases.map((purchase) => {
                const numero = [purchase.serie, purchase.correlative].filter((v) => v !== null && v !== undefined && String(v).length > 0).join("-");
                const statusLabel = purchase.status ? (statusLabels[purchase.status] ?? purchase.status) : "-";
                const docLabel = purchase.documentType ? (docTypeLabels[purchase.documentType] ?? purchase.documentType) : "-";
                const date = formatDate(new Date(purchase.dateIssue ?? ""));
                const time = purchase.dateIssue
                    ? new Date(purchase.dateIssue).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : undefined;
                const dateEnter = formatDate(new Date(purchase.expectedAt ?? ""));
                const timeEnter = purchase.expectedAt
                    ? new Date(purchase.expectedAt).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : undefined;

                return {
                    id: purchase.poId ?? `${purchase.supplierId}-${purchase.createdAt ?? numero}`,
                    purchase,
                    numero,
                    supplierLabel: purchase.supplierName ?? "-",
                    supplierDoc: purchase.supplierDocumentNumber ?? "",
                    warehouseLabel: purchase.warehouseName ?? "-",
                    statusLabel,
                    docLabel,
                    date,
                    time,
                    dateEnter,
                    timeEnter,
                };
            }),
        [purchases],
    );

    const columns = useMemo<DataTableColumn<PurchaseRow>[]>(() => [
        {
            id: "dateIssue",
            header: "Emisión",
            cell: (row) => (
                <div className="text-black/70">
                    {row.date} {row.time}
                </div>
            ),
            headerClassName: "text-left w-[70px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "docLabel",
            header: "Documento",
            accessorKey: "docLabel",
            headerClassName: "text-left w-[80px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
            visible: false,
        },
        {
            id: "numero",
            header: "Numero",
            accessorKey: "numero",
            headerClassName: "text-left w-[70px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "supplier",
            header: "Proveedor",
            cell: (row) => (
                <div className="text-black/70">
                    <div>{row.supplierLabel}</div>
                    {row.supplierDoc ? <div className="text-[10px] text-black/50">{row.supplierDoc}</div> : null}
                </div>
            ),
            headerClassName: "text-left w-[80px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "warehouse",
            header: "Almacen",
            accessorKey: "warehouseLabel",
            headerClassName: "text-left w-[80px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "paymentForm",
            header: "Forma",
            cell: (row) => <span className="text-black/70">{paymentFormLabels[row.purchase.paymentForm ?? ""] ?? row.purchase.paymentForm}</span>,
            headerClassName: "text-left w-[50px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "total",
            header: "Total",
            cell: (row) => <span className="text-black/70 tabular-nums">{money(row.purchase.total ?? 0, row.purchase.currency)}</span>,
            headerClassName: "text-left w-[60px]",
            className: "text-left",
            hideable: true,
            sortable: false,
        },
        {
            id: "totalPaid",
            header: "Pag.",
            cell: (row) => <span className="text-black/70 tabular-nums">{money(row.purchase.totalPaid ?? 0, row.purchase.currency)}</span>,
            headerClassName: "text-left w-[60px]",
            className: "text-left",
            hideable: true,
            sortable: false,
            visible: false,
        },
        {
            id: "totalToPay",
            header: "Pend.",
            cell: (row) => <span className="text-black/70 tabular-nums">{money(row.purchase.totalToPay ?? 0, row.purchase.currency)}</span>,
            headerClassName: "text-left w-[60px]",
            className: "text-left",
            hideable: true,
            sortable: false,
        },
        {
            id: "status",
            header: "Estado",
            cell: (row) => (
                <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                    {row.statusLabel}
                </span>
            ),
            headerClassName: "text-left w-[60px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "expectedAt",
            header: "Ing. Almacen",
            cell: (row) => (
                <div className="text-black/70">
                    {row.dateEnter} {row.timeEnter}
                </div>
            ),
            headerClassName: "text-left w-[50px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "waitTime",
            header: "T. Espera",
            cell: (row) => (
                <div className="flex h-full items-center justify-center">
                    {row.purchase.status === PurchaseOrderStatuses.SENT && (
                        <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                            <TimerToEnd from={now} to={row.purchase.expectedAt ?? ""} loadPurchases={loadPurchases} />
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.PARTIAL && (
                        <span className="flex flex-col items-center rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                            <OctagonAlert className="h-4 w-4" />
                            <span className="mt-1">Por Ing.</span>
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.RECEIVED && (
                        <span className="flex flex-col items-center rounded-lg p-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                            <Timer className="h-4 w-4" />
                            <span className="mt-1">Completado</span>
                        </span>
                    )}
                </div>
            ),
            headerClassName: "w-[60px] text-center [&>div]:justify-center",
            className: "text-center",
            hideable: true,
            sortable: false,
        },

        {
            id: "actions",
            header: "acciones",
            headerClassName: "w-[50px] text-center [&>div]:justify-center",
            stopRowClick: true,
            cell: (row) => (
                <div className="flex justify-center">
                    <ActionsPopover
                        actions={[
                            (row.purchase.status === PurchaseOrderStatuses.SENT || row.purchase.status === PurchaseOrderStatuses.PARTIAL) && {
                                id: "enter-warehouse",
                                label: "Ingresar Almacen",
                                icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                                onClick: () => EnterToWarehouse(row.purchase.poId ?? ""),
                                disabled: companyActionDisabled,
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "process",
                                label: "Procesar",
                                icon: <Play className="h-4 w-4 text-black/60" />,
                                onClick: () => setSent(row.purchase.poId ?? ""),
                                disabled: companyActionDisabled,
                            },
                            row.purchase.paymentForm !== PaymentFormTypes.CREDITO &&
                            row.purchase.totalPaid != row.purchase.total && {
                                id: "payment",
                                label: "Pago",
                                icon: <CreditCard className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    setModalPayment(true);
                                    setTotalPaid(row.purchase.totalPaid ?? 0);
                                    setTotalToPay(row.purchase.totalToPay ?? 0);
                                    setPoId(row.purchase.poId ?? "");
                                },
                                disabled: companyActionDisabled,
                            },
                            row.purchase.paymentForm === PaymentFormTypes.CREDITO && {
                                id: "quotas",
                                label: "Ver cuotas",
                                icon: <Calendar className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    setModalQuotaList(true);
                                    setPoId(row.purchase.poId ?? "");
                                },
                            },
                            {
                                id: "open-pdf",
                                label: "Abrir pdf",
                                icon: <FileText className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    openPurchasePdf(row.purchase.poId ?? "");
                                },
                            },
                            {
                                id: "list-payments",
                                label: "Listar pagos",
                                icon: <List className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    setModalPaymentList(true);
                                    setPoId(row.purchase.poId ?? "");
                                    setTotalPo(row.purchase.total);
                                    setPaymentForm(row.purchase.paymentForm);
                                },
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "edit",
                                label: "Editar",
                                icon: <Pencil className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    const nextPoId = row.purchase.poId ?? "";
                                    if (!nextPoId) return;
                                    setEditPoId(nextPoId);
                                    setOpenPurchaseModal(true);
                                },
                                disabled: companyActionDisabled,
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "cancel",
                                label: "Cancelar",
                                className: "text-rose-700 hover:bg-rose-50",
                                icon: <XCircle className="h-4 w-4" />,
                                onClick: () => cancelOrder(row.purchase.poId ?? ""),
                                disabled: companyActionDisabled,
                            },
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
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                                disabled={action.disabled}
                            >
                                {action.icon}
                                {action.label}
                            </button>
                        )}
                    />
                </div>
            ),
            className: "text-left",
            hideable: true,
            sortable: false,
        },
    ], [companyActionDisabled, loadPurchases, now]);

    const smartSearchColumns = useMemo(
        () => buildPurchaseSmartSearchColumns(searchState),
        [searchState],
    );

    const recentSearches = useMemo<DataTableRecentSearchItem<PurchaseSearchSnapshot>[]>(
        () =>
            (searchState?.recent ?? []).map((item) => ({
                id: item.recentId,
                label: item.label,
                snapshot: item.snapshot,
            })),
        [searchState],
    );

    const savedMetrics = useMemo<DataTableSavedSearchItem<PurchaseSearchSnapshot>[]>(
        () =>
            (searchState?.saved ?? []).map((metric) => ({
                id: metric.metricId,
                name: metric.name,
                label: metric.label,
                snapshot: metric.snapshot,
            })),
        [searchState],
    );

    const searchChips = useMemo(
        () => buildPurchaseSearchChips(executedSnapshot, searchState),
        [executedSnapshot, searchState],
    );

    const applySmartSnapshot = useCallback((snapshot: PurchaseSearchSnapshot) => {
        const normalized = sanitizePurchaseSearchSnapshot(snapshot);
        startTransition(() => {
            setSearchText(normalized.q ?? "");
            setAppliedSearchText(normalized.q ?? "");
            setSearchFilters(normalized.filters);
            setPage(1);
        });
    }, []);

    const handleApplySearchRule = useCallback((rule: PurchaseSearchRule) => {
        startTransition(() => {
            setSearchFilters((current) => {
                const next = upsertPurchaseSearchRule(
                    sanitizePurchaseSearchSnapshot({ q: searchText, filters: current }),
                    rule,
                );
                return next.filters;
            });
            setPage(1);
        });
    }, [searchText]);

    const handleRemoveSearchRule = useCallback((fieldId: PurchaseSearchFilterKey) => {
        startTransition(() => {
            setSearchFilters((current) => {
                const next = removePurchaseSearchKey(
                    sanitizePurchaseSearchSnapshot({ q: searchText, filters: current }),
                    fieldId,
                );
                return next.filters;
            });
            setPage(1);
        });
    }, [searchText]);

    const handleRemoveChip = useCallback((key: "q" | PurchaseSearchFilterKey) => {
        const nextSnapshot = removePurchaseSearchKey(
            sanitizePurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
            key,
        );
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

    const handlePageChange = useCallback((nextPage: number) => {
        startTransition(() => {
            setPage(nextPage);
        });
    }, []);

    const handleSaveMetric = useCallback(async (name: string) => {
        const snapshot = sanitizePurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters });
        if (!hasPurchaseSearchCriteria(snapshot)) return false;

        setSavingMetric(true);
        try {
            const response = await savePurchaseSearchMetric(name, snapshot);
            if (response.type === "success") {
                showFlash(successResponse(response.message));
                await loadSearchState();
                return true;
            } else {
                showFlash(errorResponse(response.message));
                return false;
            }
        } catch {
            showFlash(errorResponse("Error al guardar la metrica"));
            return false;
        } finally {
            setSavingMetric(false);
        }
    }, [appliedSearchText, loadSearchState, searchFilters, showFlash]);

    const handleDeleteMetric = useCallback(async (metricId: string) => {
        try {
            const response = await deletePurchaseSearchMetric(metricId);
            if (response.type === "success") {
                showFlash(successResponse(response.message));
                await loadSearchState();
            } else {
                showFlash(errorResponse(response.message));
            }
        } catch {
            showFlash(errorResponse("Error al eliminar la metrica"));
        }
    }, [loadSearchState, showFlash]);

    return (
        <PageShell className="bg-white">
            <PageTitle title="Compras" />
            <div className="space-y-4">
                <div className="grid grid-cols-2 ms:grid-cols-1 gap-3 pt-2 items-center">
                    <Headed
                        title="Compras"
                        size="lg"
                    />
                    <div className="flex justify-end">
                        <SystemButton
                            size="md"
                            className="w-full lg:w-auto"
                            leftIcon={<Plus className="h-4 w-4" />}
                            style={{
                                backgroundColor: PRIMARY,
                                borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                                boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
                            }}
                            onClick={() => {
                                setEditPoId(undefined);
                                setOpenPurchaseModal(true);
                            }}
                            disabled={companyActionDisabled}
                            title={companyActionTitle}
                        >
                            Nueva compra
                        </SystemButton>
                    </div>
                </div>

                <DataTableSearchChips
                    chips={searchChips}
                    onRemove={(chip) => handleRemoveChip(chip.removeKey)}
                />

                <DataTable
                    tableId="purchase-list"
                    data={purchaseRows}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    emptyMessage="No hay compras con los filtros actuales."
                    hoverable={false}
                    animated={false}
                    selectableColumns
                    toolbarSearchContent={
                        <DataTableSearchBar
                            value={searchText}
                            onChange={handleSearchTextChange}
                            onSubmitSearch={submitSearch}
                            searchLabel="Busca tu compra"
                            searchName="purchase-smart-search"
                            canSaveMetric={hasPurchaseSearchCriteria(executedSnapshot)}
                            saveLoading={savingMetric}
                            onSaveMetric={handleSaveMetric}
                        >
                            <PurchaseSmartSearchPanel
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
                    rangeDates={{
                        startDate: parseDateInputValue(fromDate),
                        endDate: parseDateInputValue(toDate),
                        onChange: handleDateRangeChange,
                    }}
                    pagination={{
                        page,
                        limit,
                        total: pagination.total,
                    }}
                    onRowClick={(row) => {
                        if (!row.purchase.poId) return;
                        setSelectedPurchaseRow(row);
                    }}
                    onPageChange={handlePageChange}
                    tableClassName="text-[10px]"
                />

                {error && <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div>}
            </div>

            <PurchaseModal
                open={openPurchaseModal}
                poId={editPoId}
                onClose={() => {
                    setOpenPurchaseModal(false);
                    setEditPoId(undefined);
                }}
                onSaved={async (poId) => {
                    await loadPurchases();
                    setOpenPurchaseModal(false);
                    setEditPoId(undefined);
                    setSelectedProductionId(poId);
                    setOpenPdfModal(true);
                }}
            />
            <PurchaseDetailsModal
                open={Boolean(selectedPurchaseRow)}
                poId={selectedPurchaseRow?.purchase.poId ?? null}
                purchase={
                    selectedPurchaseRow
                        ? {
                            ...selectedPurchaseRow.purchase,
                            supplierLabel: selectedPurchaseRow.supplierLabel,
                            supplierDoc: selectedPurchaseRow.supplierDoc,
                            warehouseLabel: selectedPurchaseRow.warehouseLabel,
                            statusLabel: selectedPurchaseRow.statusLabel,
                            docLabel: selectedPurchaseRow.docLabel,
                            numero: selectedPurchaseRow.numero,
                            date: selectedPurchaseRow.date,
                            time: selectedPurchaseRow.time,
                            dateEnter: selectedPurchaseRow.dateEnter,
                            timeEnter: selectedPurchaseRow.timeEnter,
                        }
                        : null
                }
                onClose={() => {
                    setSelectedPurchaseRow(null);
                }}
            />
            <PaymentModal
                title="Formulario de Pago"
                close={() => {
                    setModalPayment(false);
                }}
                open={modalPayment}
                className="w-[800px]"
                totalPaid={totalPaid}
                totalToPay={totalToPay}
                poId={poId}
                loadPurchases={loadPurchases}
            />
            <PaymentListModal
                title="Pagos"
                close={() => {
                    setModalPaymentList(false);
                }}
                poId={poId}
                open={modalPaymentList}
                total={totalPo}
                className="w-[800px]"
                loadPurchases={loadPurchases}
                credit={paymentForm === PaymentFormTypes.CONTADO ? false : true}
            />
            <QuotaListModal
                title="Cuotas"
                close={() => {
                    setModalQuotaList(false);
                }}
                open={modalQuotaList}
                poId={poId}
                className="w-[800px]"
                loadPurchases={loadPurchases}
            />
            <PdfViewerModal
                open={openPdfModal}
                onClose={() => {
                    setOpenPdfModal(false);
                    setSelectedProductionId(null);
                }}
                title="Orden de compra"
                loadWhen={Boolean(selectedProductionId)}
                reloadKey={selectedProductionId}
                getPdf={() => getPurchaseOrderPdf(selectedProductionId!)}
            />
        </PageShell>
    );
}
