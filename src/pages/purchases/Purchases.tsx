import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listAll } from "@/services/supplierService";
import { listActive } from "@/services/warehouseServices";
import { enterPurchaseOrder, listPurchaseOrders, setCancelPurchase, setSentPurchase } from "@/services/purchaseService";
import { money, toDateInputValue, tryShowPicker, todayIso, buildMonthStartIso } from "@/utils/functionPurchases";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentListModal } from "./components/PaymentListModal";
import { QuotaListModal } from "./components/QuotaListModal";
import { useNavigate } from "react-router-dom";
import { SupplierOption } from "../providers/types/supplier";
import { Warehouse } from "../warehouse/types/warehouse";
import { PurchaseOrder } from "./types/purchase";
import { PurchaseOrderStatus, PurchaseOrderStatuses, VoucherDocType, VoucherDocTypes, PaymentFormTypes } from "./types/purchaseEnums";
import TimerToEnd, { formatDate } from "@/components/TimerToEnd";
import { ActionsPopover, type ActionItem } from "@/components/ActionsPopover";
import { Calendar, CreditCard, FileText, Filter, List, Menu, OctagonAlert, PackageCheck, Pencil, Play, Timer, XCircle } from "lucide-react";
import { getPurchaseOrderPdf } from "@/services/pdfServices";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";

const statusLabels: Record<PurchaseOrderStatus, string> = {
    [PurchaseOrderStatuses.DRAFT]: "Borrador",
    [PurchaseOrderStatuses.SENT]: "Esperando",
    [PurchaseOrderStatuses.PARTIAL]: "Parcial",
    [PurchaseOrderStatuses.RECEIVED]: "Recibido",
    [PurchaseOrderStatuses.CANCELLED]: "Cancelado",
};

const docTypeLabels: Record<VoucherDocType, string> = {
    [VoucherDocTypes.FACTURA]: "Factura",
    [VoucherDocTypes.BOLETA]: "Boleta",
    [VoucherDocTypes.NOTA_VENTA]: "Nota de venta",
};

const normalizeNumber = (raw: string) => raw.trim().replace(/\s+/g, "");

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
    const navigate = useNavigate();

    const [numeroInput, setNumeroInput] = useState("");
    const [debouncedNumero, setDebouncedNumero] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
    const [toDate, setToDate] = useState(() => todayIso());
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

    const [supplierOptions, setSupplierOptions] = useState<(SupplierOption & { doc?: string })[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string; address?: string }[]>([]);
    const [modalPayment, setModalPayment] = useState(false);
    const [modalPaymentList, setModalPaymentList] = useState(false);
    const [modalQuotaList, setModalQuotaList] = useState(false);

    const [totalPaid, setTotalPaid] = useState(0);
    const [totalToPay, setTotalToPay] = useState(0);
    const [totalPo, setTotalPo] = useState(0);
    const [poId, setPoId] = useState("");
    const [paymentForm, setPaymentForm] = useState("");
    const [openPdfModal, setOpenPdfModal] = useState(false);
    const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);

    const docTypeOptions = [
        { value: "", label: "todos" },
        { value: VoucherDocTypes.BOLETA, label: "Boleta" },
        { value: VoucherDocTypes.FACTURA, label: "Factura" },
        { value: VoucherDocTypes.NOTA_VENTA, label: "Nota de venta" },
    ];

    const statusOptions = [
        { value: "", label: "todos" },
        { value: PurchaseOrderStatuses.DRAFT, label: "Borrador" },
        { value: PurchaseOrderStatuses.SENT, label: "Enviado" },
        { value: PurchaseOrderStatuses.PARTIAL, label: "Parcial" },
        { value: PurchaseOrderStatuses.RECEIVED, label: "Recibido" },
        { value: PurchaseOrderStatuses.CANCELLED, label: "Cancelado" },
    ];

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedNumero(numeroInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [numeroInput]);

    const loadSuppliers = async () => {
        try {
            const res = await listAll();
            const options =
                res?.map((s) => {
                    const fullName = [s.name, s.lastName].filter(Boolean).join(" ").trim();
                    const display = (fullName || s.tradeName || "").trim();
                    return {
                        value: s.supplierId,
                        label: display || s.supplierId,
                        doc: s.documentNumber ?? "",
                    };
                }) ?? [];
            setSupplierOptions([{ value: "", label: "Todos" }, ...options]);
        } catch {
            setSupplierOptions([{ value: "", label: "Todos" }]);
            showFlash(errorResponse("Error al cargar proveedores"));
        }
    };

    const loadWarehouses = async () => {
        try {
            const res = await listActive();
            const options =
                res?.map((s: Warehouse) => {
                    const address = `${s.department}-${s.province}-${s.district}`;
                    return {
                        value: s.warehouseId,
                        label: s.name,
                        address,
                    };
                }) ?? [];
            setWarehouseOptions([{ value: "", label: "Todos" }, ...options]);
        } catch {
            setWarehouseOptions([{ value: "", label: "Todos" }]);
            showFlash(errorResponse("Error al cargar almacenes"));
        }
    };

    const loadPurchases = async () => {
        clearFlash();
        setLoading(true);
        setError(null);
        const number = normalizeNumber(debouncedNumero);
        try {
            const res = await listPurchaseOrders({
                page,
                limit,
                supplierId: supplierId || undefined,
                warehouseId: warehouseId || undefined,
                documentType: documentType || undefined,
                status: statusFilter || undefined,
                number: number || undefined,
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
            showFlash(errorResponse("Error al listar compras"));
        } finally {
            setLoading(false);
        }
    };

    const setSent = async (id: string) => {
        clearFlash();
        try {
            const res = await setSentPurchase(id);
            if (res.type === "error") {
                showFlash(errorResponse(res.message));
            }
            if (res.type === "success") {
                showFlash(successResponse(res.message));
                loadPurchases();
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
                loadPurchases();
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
                loadPurchases();
            }
            if (res.type === "success") {
                showFlash(successResponse(res.message));
                loadPurchases();
            }
        } catch {
            showFlash(errorResponse("Error al ingresar a almacen"));
            loadPurchases();
        }
    };

    useEffect(() => {
        void loadSuppliers();
        void loadWarehouses();
    }, []);

    useEffect(() => {
        void loadPurchases();
    }, [page, debouncedNumero, supplierId, warehouseId, documentType, statusFilter, fromDate, toDate]);

    const now = new Date().toISOString();

    const supplierMetaById = useMemo(() => {
        const map = new Map<string, { label: string; doc?: string }>();
        supplierOptions.forEach((opt) => {
            if (opt.value) map.set(opt.value, { label: opt.label, doc: opt.doc });
        });
        return map;
    }, [supplierOptions]);

    const warehouseMetaById = useMemo(() => {
        const map = new Map<string, { label: string; address?: string }>();
        warehouseOptions.forEach((opt) => {
            if (opt.value) map.set(opt.value, { label: opt.label, address: opt.address });
        });
        return map;
    }, [warehouseOptions]);

    const supplierSelectOptions = useMemo(
        () =>
            supplierOptions.map((opt) => {
                const doc = opt.doc ? ` (${opt.doc})` : "";
                return {
                    value: opt.value,
                    label: `${opt.label}${doc}`.trim(),
                };
            }),
        [supplierOptions],
    );

    const warehouseSelectOptions = useMemo(
        () =>
            warehouseOptions.map((opt) => {
                return {
                    value: opt.value,
                    label: `${opt.label}`.trim(),
                };
            }),
        [warehouseOptions],
    );

    const purchaseRows = useMemo<PurchaseRow[]>(
        () =>
            purchases.map((purchase) => {
                const numero = [purchase.serie, purchase.correlative].filter((v) => v !== null && v !== undefined && String(v).length > 0).join("-");
                const supplierMeta = purchase.supplierId ? supplierMetaById.get(purchase.supplierId) : undefined;
                const warehouseMeta = purchase.warehouseId ? warehouseMetaById.get(purchase.warehouseId) : undefined;
                const statusLabel = purchase.status ? (statusLabels[purchase.status] ?? purchase.status) : "-";
                const docLabel = purchase.documentType ? (docTypeLabels[purchase.documentType] ?? purchase.documentType) : "-";
                const date = formatDate(new Date(purchase.dateIssue ?? ""));
                const time = purchase.dateIssue
                    ? new Date(purchase.dateIssue).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                      })
                    : undefined;
                const dateEnter = formatDate(new Date(purchase.expectedAt ?? ""));
                const timeEnter = purchase.expectedAt
                    ? new Date(purchase.expectedAt).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                      })
                    : undefined;

                return {
                    id: purchase.poId ?? `${purchase.supplierId}-${purchase.createdAt ?? numero}`,
                    purchase,
                    numero,
                    supplierLabel: supplierMeta?.label ?? "-",
                    supplierDoc: supplierMeta?.doc ?? "",
                    warehouseLabel: warehouseMeta?.label ?? "-",
                    statusLabel,
                    docLabel,
                    date,
                    time,
                    dateEnter,
                    timeEnter,
                };
            }),
        [purchases, supplierMetaById, warehouseMetaById],
    );

    const columns: DataTableColumn<PurchaseRow>[] = [
        {
            id: "dateIssue",
            header: "Emisión",
            cell: (row) => (
                <div className="text-black/70">
                    {row.date}
                    {row.time ? (
                        <>
                            <br />
                            {row.time}
                        </>
                    ) : null}
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
            cell: (row) => <span className="text-black/70">{row.purchase.paymentForm}</span>,
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
            headerClassName: "text-center w-[60px]",
            className: "text-center",
            hideable: true,
            sortable: false,
        },
        {
            id: "expectedAt",
            header: "Ing. Almacen",
            cell: (row) => (
                <div className="text-black/70">
                    {row.dateEnter}
                    {row.timeEnter ? (
                        <>
                            <br />
                            {row.timeEnter}
                        </>
                    ) : null}
                </div>
            ),
            headerClassName: "text-left w-[50px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "actions",
            header: "ACCIONES",
            headerClassName: "text-center w-[50px]",
            cell: (row) => (
                <div className="flex justify-center">
                    <ActionsPopover
                    actions={[
                        (row.purchase.status === PurchaseOrderStatuses.SENT || row.purchase.status === PurchaseOrderStatuses.PARTIAL) && {
                                id: "enter-warehouse",
                                label: "Ingresar Almacen",
                                icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                                onClick: () => EnterToWarehouse(row.purchase.poId ?? ""),
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "process",
                                label: "Procesar",
                                icon: <Play className="h-4 w-4 text-black/60" />,
                                onClick: () => setSent(row.purchase.poId ?? ""),
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
                                onClick: () => navigate(`/compra/${row.purchase.poId}`),
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "cancel",
                                label: "Cancelar",
                                className: "text-rose-700 hover:bg-rose-50",
                                icon: <XCircle className="h-4 w-4" />,
                                onClick: () => cancelOrder(row.purchase.poId ?? ""),
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
    ];

    return (
        <PageShell className="bg-white">
            <PageTitle title="Compras" />
            <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <Headed title="Compras" 
                    size="lg" />

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-0 text-[10px]">
                            Total: <span className="font-semibold text-black">{pagination.total}</span>
                        </div>
                    </div>
                </div>

                <section className="bg-gray-50 shadow-sm p-4 space-y-4 rounded-2xl border border-black/10">
                    <SectionHeaderForm icon={Filter} title="Filtros" />

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.2fr_0.2fr_0.5fr_1fr_1fr_0.5fr_0.6fr]">
                        <FloatingInput
                            label="Fecha inicio"
                            name="from-date"
                            type="date"
                            value={toDateInputValue(fromDate)}
                            onClick={(e) => tryShowPicker(e.currentTarget)}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 text-xs"
                        />
                        <FloatingInput
                            label="Fecha fin"
                            name="to-date"
                            type="date"
                            value={toDateInputValue(toDate)}
                            onClick={(e) => tryShowPicker(e.currentTarget)}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 text-xs"
                        />
                        <FloatingInput label="N. documento" name="document-number" value={numeroInput} onChange={(e) => setNumeroInput(e.target.value)} className="h-9 text-xs" />

                        <FloatingSelect
                            label="Proveedor"
                            name="supplier"
                            value={supplierId}
                            onChange={(value) => {
                                setSupplierId(value);
                                setPage(1);
                            }}
                            options={supplierSelectOptions}
                            searchable
                            className="h-9 text-xs"
                        />

                        <FloatingSelect
                            label="Almacen"
                            name="warehouse"
                            value={warehouseId}
                            onChange={(value) => {
                                setWarehouseId(value);
                                setPage(1);
                            }}
                            options={warehouseSelectOptions}
                            searchable
                            className="h-9 text-xs"
                        />

                        <FloatingSelect
                            label="Tipo"
                            name="document-type"
                            value={documentType}
                            onChange={(value) => {
                                setDocumentType(value);
                                setPage(1);
                            }}
                            options={docTypeOptions}
                            searchable
                            className="h-9 text-xs"
                        />

                        <FloatingSelect
                            label="Estado"
                            name="status"
                            value={statusFilter}
                            onChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                            options={statusOptions}
                            searchable
                            className="h-9 text-xs"
                        />
                    </div>
                </section>

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
                        pagination={{
                            page,
                            limit,
                            total: pagination.total,
                        }}
                        onPageChange={setPage}
                        tableClassName="text-[10px]"
                    />

                    {error && <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div>}
            </div>
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
                title="Orden de producción"
                getPdf={() => getPurchaseOrderPdf(selectedProductionId!)}
            />
        </PageShell>
    );
}
