import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Menu } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingSelect } from "@/components/FloatingSelect";
import { FloatingDateRangePicker } from "@/components/date-picker/FloatingDateRangePicker";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { ActionsPopover } from "@/components/ActionsPopover";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { formatDate } from "@/components/TimerToEnd";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { getDocuments } from "@/services/documentService";
import { getDocumentInventoryPdf } from "@/services/pdfServices";
import { buildMonthStartIso, parseDateInputValue, toLocalDateKey, todayIso } from "@/utils/functionPurchases";
import { RoutesPaths } from "@/router/config/routesPaths";
import type { InventoryDocument } from "@/pages/catalog/types/documentInventory";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";
import { DocStatus, DocType, type Warehouse } from "@/pages/warehouse/types/warehouse";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { useCompany } from "@/hooks/useCompany";

const statusLabels: Record<DocStatus, string> = {
    [DocStatus.DRAFT]: "Borrador",
    [DocStatus.POSTED]: "Contabilizado",
    [DocStatus.CANCELLED]: "Anulado",
};

const docTypeLabels: Record<DocType, string> = {
    [DocType.ADJUSTMENT]: "Ajuste",
    [DocType.TRANSFER]: "Transferencia",
    [DocType.IN]: "Ingreso",
    [DocType.OUT]: "Salida",
    [DocType.PRODUCTION]: "Producción",
};

type DocumentRow = {
    id: string;
    document: InventoryDocument;
    numero: string;
    docLabel: string;
    statusLabel: string;
    fromWarehouse: string;
    toWarehouse: string;
    createdBy: string;
    date: string;
    time?: string;
};

export default function DocumentRowMaterial() {
	    const { showFlash, clearFlash } = useFlashMessage();
        const { hasCompany } = useCompany();
	    const navigate = useNavigate();
        const companyActionDisabled = !hasCompany;
        const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

    const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
    const [toDate, setToDate] = useState(() => todayIso());
    const [warehouseId, setWarehouseId] = useState("");
    const [docType, setDocType] = useState<DocType | "">("");
    const [statusFilter, setStatusFilter] = useState<DocStatus | "">("");
    const [page, setPage] = useState(1);
    const limit = 10;
    const [documents, setDocuments] = useState<InventoryDocument[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
    const [openPdfModal, setOpenPdfModal] = useState(false);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

    const docTypeOptions = [
        { value: "", label: "Todos" },
        { value: DocType.ADJUSTMENT, label: docTypeLabels[DocType.ADJUSTMENT] },
        { value: DocType.TRANSFER, label: docTypeLabels[DocType.TRANSFER] },
        { value: DocType.IN, label: docTypeLabels[DocType.IN] },
        { value: DocType.OUT, label: docTypeLabels[DocType.OUT] },
    ];

    const statusOptions = [
        { value: "", label: "Todos" },
        { value: DocStatus.DRAFT, label: statusLabels[DocStatus.DRAFT] },
        { value: DocStatus.POSTED, label: statusLabels[DocStatus.POSTED] },
        { value: DocStatus.CANCELLED, label: statusLabels[DocStatus.CANCELLED] },
    ];

    const loadWarehouses = async () => {
        clearFlash();
        try {
            const res = await listActive();
            const options =
                res?.map((s: Warehouse) => ({
                    value: s.warehouseId,
                    label: s.name,
                })) ?? [];
            setWarehouseOptions([{ value: "", label: "Todos" }, ...options]);
        } catch {
            setWarehouseOptions([{ value: "", label: "Todos" }]);
            showFlash(errorResponse("Error al cargar almacenes"));
        }
    };

    useEffect(() => {
        void loadWarehouses();
    }, []);

    const loadDocuments = async () => {
        clearFlash();
        setLoading(true);
        setError(null);
        try {
            const res = await getDocuments({
                page,
                limit,
                from: fromDate || undefined,
                to: toDate || undefined,
                warehouseId: warehouseId || undefined,
                docType: docType || undefined,
                productType: InventoryDocumentProductType.MATERIAL,
                status: statusFilter || undefined,
            });

            setDocuments(res.items ?? []);
            setTotal(res.total ?? 0);
        } catch {
            setDocuments([]);
            setTotal(0);
            setError("Error al listar documentos");
            showFlash(errorResponse("Error al listar documentos"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadDocuments();
    }, [page, fromDate, toDate, warehouseId, docType, statusFilter]);

    const openDocumentPdf = (id: string) => {
        clearFlash();
        setSelectedDocumentId(id);
        setOpenPdfModal(true);
    };

    const documentRows = useMemo<DocumentRow[]>(
        () =>
            documents.map((document) => {
                const serie = document.serieCode || document.serie || "";
                const sep = document.serieSeparator || "-";
                const num = document.correlative != null ? String(document.correlative) : "";
                const padded = document.seriePadding ? num.padStart(document.seriePadding, "0") : num;
                const numero = [serie, padded].filter(Boolean).join(sep) || document.id;
                const date = document.createdAt ? formatDate(new Date(document.createdAt)) : "-";
                const time = document.createdAt
                    ? new Date(document.createdAt).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                      })
                    : undefined;
                const createdBy = document.createdBy?.name || document.createdBy?.email || "-";

                return {
                    id: document.id ?? numero,
                    document,
                    numero,
                    docLabel: docTypeLabels[document.docType] ?? document.docType,
                    statusLabel: statusLabels[document.status] ?? document.status,
                    fromWarehouse: document.fromWarehouse?.name || document.fromWarehouseName || "-",
                    toWarehouse: document.toWarehouse?.name || document.toWarehouseName || "-",
                    createdBy,
                    date,
                    time,
                };
            }),
        [documents],
    );

    const columns: DataTableColumn<DocumentRow>[] = [
        {
            id: "createdAt",
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
            id: "numero",
            header: "Documento",
            accessorKey: "numero",
            headerClassName: "text-left w-[90px] py-4",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "docLabel",
            header: "Tipo",
            accessorKey: "docLabel",
            headerClassName: "text-left w-[80px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "fromWarehouse",
            header: "Origen",
            accessorKey: "fromWarehouse",
            headerClassName: "text-left w-[110px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "toWarehouse",
            header: "Destino",
            accessorKey: "toWarehouse",
            headerClassName: "text-left w-[110px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "createdBy",
            header: "Usuario",
            accessorKey: "createdBy",
            headerClassName: "text-left w-[110px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "status",
            header: "Estado",
            cell: (row) => (
                <span className="inline-flex rounded-lg px-2 py-1
                 text-[10px] font-medium bg-slate-50 text-slate-700">
                    {row.statusLabel}
                </span>
            ),
            headerClassName: "text-left w-[80px]",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "actions",
            header: "ACCIONES",
            headerClassName: "text-center w-[70px]",
            cell: (row) => (
                <div className="flex justify-center">
                    <ActionsPopover
                        actions={[
                            {
                                id: "open-pdf",
                                label: "Abrir pdf",
                                icon: <Menu className="h-4 w-4 text-black/60" />,
                                onClick: () => openDocumentPdf(row.document.id ?? row.id),
                            },
                        ]}
                        columns={1}
                        compact
                        showLabels
                        triggerIcon={<Menu className="h-4 w-4" />}
                        popoverClassName="min-w-40"
                        popoverBodyClassName="p-2"
                        renderAction={(action, helpers) => (
                            <button
                                key={action.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    helpers.onAction(action);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03]"
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
            <PageTitle title="Documentos" />
            <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between pt-2">
                    <Headed title="Documentos de materia prima" 
                    subtitle="Listado de documentos de inventario de materia prima." 
                    size="lg" />
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-0 text-[10px]">
                            Total: <span className="font-semibold text-black">{total}</span>
                        </div>
                    </div>
                </div>

                <section className="grid grid-cols-1 xl:grid-cols-[2fr_0.5fr] gap-4">
                    <div className="space-y-4">
                        <section className="bg-gray-50 shadow-sm p-4 space-y-4 rounded-2xl border border-black/10">
                            <SectionHeaderForm icon={Filter} title="Filtros" />
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <FloatingDateRangePicker
                                    label="Rango de fechas"
                                    name="documents-row-material-date-range"
                                    startDate={parseDateInputValue(fromDate)}
                                    endDate={parseDateInputValue(toDate)}
                                    onChange={({ startDate, endDate }) => {
                                        setFromDate(startDate ? toLocalDateKey(startDate) : "");
                                        setToDate(endDate ? toLocalDateKey(endDate) : "");
                                        setPage(1);
                                    }}
                                    className="h-9 text-xs"
                                />
                                <FloatingSelect
                                    label="Almacén"
                                    name="warehouse"
                                    value={warehouseId}
                                    onChange={(value) => {
                                        setWarehouseId(value);
                                        setPage(1);
                                    }}
                                    options={warehouseOptions}
                                    searchable
                                    className="h-9 text-xs"
                                />
                                <FloatingSelect
                                    label="Tipo"
                                    name="document-type"
                                    value={docType}
                                    onChange={(value) => {
                                        setDocType(value as DocType | "");
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
                                        setStatusFilter(value as DocStatus | "");
                                        setPage(1);
                                    }}
                                    options={statusOptions}
                                    searchable
                                    className="h-9 text-xs"
                                />
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                            <DataTable
                                tableId="document-row-material-list"
                                data={documentRows}
                                columns={columns}
                                rowKey="id"
                                loading={loading}
                                emptyMessage="No hay documentos con los filtros actuales."
                                hoverable={false}
                                animated={false}
                                pagination={{
                                    page,
                                    limit,
                                    total,
                                }}
                                onPageChange={setPage}
                                tableClassName="text-[10px]"
                            />
                            {error && <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div>}
                        </section>
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                            <p className="text-sm font-semibold">Crear documento rápido</p>
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <SystemButton
                                    className="text-xs"
                                    onClick={() => navigate(RoutesPaths.rowMaterialAdjustments)}
                                    disabled={companyActionDisabled}
                                    title={companyActionTitle}
                                >
                                    Ajuste
                                </SystemButton>
                                <SystemButton
                                    className="text-xs"
                                    onClick={() => navigate(RoutesPaths.rowMaterialTransfer)}
                                    disabled={companyActionDisabled}
                                    title={companyActionTitle}
                                >
                                    Transferencia
                                </SystemButton>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>

            <PdfViewerModal
                open={openPdfModal}
                onClose={() => {
                    setOpenPdfModal(false);
                    setSelectedDocumentId(null);
                }}
                title="Documento de inventario"
                loadWhen={Boolean(selectedDocumentId)}
                reloadKey={selectedDocumentId}
                getPdf={() => getDocumentInventoryPdf(selectedDocumentId!)}
            />
        </PageShell>
    );
}
