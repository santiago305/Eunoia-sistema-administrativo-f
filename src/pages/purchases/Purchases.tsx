import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import type { AppliedDataTableFilter, DataTableFilterTree } from "@/components/table/filters";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listSuppliers } from "@/services/supplierService";
import { listActiveWarehouses } from "@/services/warehouseServices";
import { enterPurchaseOrder, listPurchaseOrders, setCancelPurchase, setSentPurchase } from "@/services/purchaseService";
import { money, parseDateInputValue, toLocalDateKey } from "@/utils/functionPurchases";
import { PaymentModal } from "./components/PaymentModal";
import { PaymentListModal } from "./components/PaymentListModal";
import { QuotaListModal } from "./components/QuotaListModal";
import { SupplierOption } from "../providers/types/supplier";
import { PurchaseOrder } from "./types/purchase";
import { PurchaseOrderStatus, PurchaseOrderStatuses, VoucherDocType, VoucherDocTypes, PaymentFormTypes } from "./types/purchaseEnums";
import TimerToEnd, { formatDate } from "@/components/TimerToEnd";
import { ActionsPopover, type ActionItem } from "@/components/ActionsPopover";
import { Calendar, CreditCard, FileText, List, Menu, OctagonAlert, PackageCheck, Pencil, Play, Plus, Timer, XCircle } from "lucide-react";
import { getPurchaseOrderPdf } from "@/services/pdfServices";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import { PurchaseModal } from "./components/PurchaseModal";

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

    const [numeroInput, setNumeroInput] = useState("");
    const [debouncedNumero, setDebouncedNumero] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);
    const [appliedSupplierSearch, setAppliedSupplierSearch] = useState("");
    const [appliedWarehouseSearch, setAppliedWarehouseSearch] = useState("");
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
    const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
    const [editPoId, setEditPoId] = useState<string | undefined>(undefined);

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

    const loadSuppliers = useCallback(async (appliedSearch: string) => {
        clearFlash();
        try {
          const res = await listSuppliers({
            page: 1,
            limit: 100,
            q: appliedSearch?.trim() || undefined,
          });
          const options = (res.items ?? []).map((s) => {
            const fullName = [s.name, s.lastName].filter(Boolean).join(" ").trim();
            const display = (fullName || s.tradeName || "").trim();
            const doc = s.documentNumber ? ` (${s.documentNumber})` : "";
            return {
              value: s.supplierId,
              label: `${display}${doc}`.trim() || s.supplierId,
              days: s.leadTimeDays,
            };
          });
          setSupplierOptions([{
                value: "",
                label: "Todos",
                days: undefined,
            }, ...options]);
        } catch {
          setSupplierOptions([]);
          showFlash(errorResponse("Error al cargar proveedores"));
        }
    }, [clearFlash, showFlash]);

    const loadWarehouses = useCallback(async (q:string) => {
    clearFlash();
    try {
      const res = await listActiveWarehouses({ page: 1, limit: 100, q });
      const options =
        (res.items ?? []).map((warehouse) => ({
          value: warehouse.warehouseId,
          label: warehouse.name,
        })) ?? [];
      setWarehouseOptions([{value:"", label:"Todos"}, ...options]);
    } catch {
      setWarehouseOptions([]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  }, [clearFlash, showFlash]);

    const loadPurchases = useCallback(async () => {
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
    }, [
        clearFlash,
        debouncedNumero,
        documentType,
        fromDate,
        limit,
        page,
        showFlash,
        statusFilter,
        supplierId,
        toDate,
        warehouseId,
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
        void loadWarehouses(appliedWarehouseSearch);
    }, [appliedWarehouseSearch, loadWarehouses]);
    
    useEffect(() => {
        void loadSuppliers(appliedSupplierSearch);
    }, [appliedSupplierSearch, loadSuppliers]);

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

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

    const purchaseTableFilters = useMemo<DataTableFilterTree>(() => {
        const supplierFilterOptions = supplierSelectOptions
            .filter((option) => option.value)
            .map((option) => ({
                id: option.value,
                label: option.label,
            }));

        const warehouseFilterOptions = warehouseSelectOptions
            .filter((option) => option.value)
            .map((option) => ({
                id: option.value,
                label: option.label,
            }));

        const documentTypeFilterOptions = docTypeOptions
            .filter((option) => option.value)
            .map((option) => ({
                id: option.value,
                label: option.label,
            }));

        const statusFilterOptions = statusOptions
            .filter((option) => option.value)
            .map((option) => ({
                id: option.value,
                label: option.label,
            }));

        return [
            {
                id: "supplier",
                label: "Proveedor",
                modes: [
                    {
                        id: "select",
                        label: "Seleccionar",
                        groups: [
                            {
                                id: "options",
                                label: "Proveedores",
                                searchable: true,
                                options: supplierFilterOptions,
                            },
                        ],
                    },
                ],
            },
            {
                id: "warehouse",
                label: "Almacén",
                modes: [
                    {
                        id: "select",
                        label: "Seleccionar",
                        groups: [
                            {
                                id: "options",
                                label: "Almacenes",
                                searchable: true,
                                options: warehouseFilterOptions,
                            },
                        ],
                    },
                ],
            },
            {
                id: "documentType",
                label: "Tipo",
                modes: [
                    {
                        id: "select",
                        label: "Seleccionar",
                        groups: [
                            {
                                id: "options",
                                label: "Tipos",
                                options: documentTypeFilterOptions,
                            },
                        ],
                    },
                ],
            },
            {
                id: "status",
                label: "Estado",
                modes: [
                    {
                        id: "select",
                        label: "Seleccionar",
                        groups: [
                            {
                                id: "options",
                                label: "Estados",
                                options: statusFilterOptions,
                            },
                        ],
                    },
                ],
            },
        ];
    }, [docTypeOptions, statusOptions, supplierSelectOptions, warehouseSelectOptions]);

    const purchaseAppliedFilters = useMemo<AppliedDataTableFilter[]>(() => {
        const filters: AppliedDataTableFilter[] = [];

        if (supplierId) {
            filters.push({
                id: "supplier:select:options",
                categoryId: "supplier",
                modeId: "select",
                groupId: "options",
                operator: "OR",
                optionIds: [supplierId],
            });
        }

        if (warehouseId) {
            filters.push({
                id: "warehouse:select:options",
                categoryId: "warehouse",
                modeId: "select",
                groupId: "options",
                operator: "OR",
                optionIds: [warehouseId],
            });
        }

        if (documentType) {
            filters.push({
                id: "documentType:select:options",
                categoryId: "documentType",
                modeId: "select",
                groupId: "options",
                operator: "OR",
                optionIds: [documentType],
            });
        }

        if (statusFilter) {
            filters.push({
                id: "status:select:options",
                categoryId: "status",
                modeId: "select",
                groupId: "options",
                operator: "OR",
                optionIds: [statusFilter],
            });
        }

        return filters;
    }, [documentType, statusFilter, supplierId, warehouseId]);

    const handlePurchaseFiltersChange = useCallback((next: AppliedDataTableFilter[]) => {
        const getFirstOption = (categoryId: string) =>
            next.find((item) => item.categoryId === categoryId)?.optionIds[0] ?? "";

        setSupplierId(getFirstOption("supplier"));
        setWarehouseId(getFirstOption("warehouse"));
        setDocumentType(getFirstOption("documentType"));
        setStatusFilter(getFirstOption("status"));
        setPage(1);
    }, []);

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
                                onClick: () => {
                                    const nextPoId = row.purchase.poId ?? "";
                                    if (!nextPoId) return;
                                    setEditPoId(nextPoId);
                                    setOpenPurchaseModal(true);
                                },
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
               <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <Headed 
                        title="Compras" 
                        size="lg"
                    />
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
                    >
                        Nueva compra
                    </SystemButton>
                </div>

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
                    showSearch
                    searchMode="server"
                    searchPlaceholder="N. documento"
                    searchValue={numeroInput}
                    onSearchChange={(value) => {
                        setNumeroInput(value);
                        setPage(1);
                    }}
                    rangeDates={{
                        startDate: parseDateInputValue(fromDate),
                        endDate: parseDateInputValue(toDate),
                        onChange: ({ startDate, endDate }) => {
                            setFromDate(startDate ? toLocalDateKey(startDate) : "");
                            setToDate(endDate ? toLocalDateKey(endDate) : "");
                            setPage(1);
                        },
                    }}
                    filtersConfig={{
                        categories: purchaseTableFilters,
                        value: purchaseAppliedFilters,
                        onChange: handlePurchaseFiltersChange,
                    }}
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

            <PurchaseModal
                open={openPurchaseModal}
                poId={editPoId}
                onClose={() => {
                    setOpenPurchaseModal(false);
                    setEditPoId(undefined);
                }}
                onSaved={() => loadPurchases()}
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
                title="Orden de producción"
                getPdf={() => getPurchaseOrderPdf(selectedProductionId!)}
            />
        </PageShell>
    );
}
