import { useEffect, useMemo, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingSelect } from "@/components/FloatingSelect";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { ActionsPopover } from "@/components/ActionsPopover";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { formatDate } from "@/components/TimerToEnd";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { getDocumentInventoryPdf } from "@/services/pdfServices";
import {
  buildMonthStartIso,
  endOfDayIso,
  parseDateInputValue,
  toLocalDateKey,
  todayIso,
} from "@/utils/functionPurchases";
import type {
  InventoryDocument,
  InventoryDocumentRow,
} from "@/pages/catalog/types/documentInventory";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";
import { DocStatus, DocType, type Warehouse } from "@/pages/warehouse/types/warehouse";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import { getDocuments } from "@/services/documentService";
import { TransferProductsModal } from "@/pages/catalog/components/TransferProductsModal";
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

const buildNumero = (document: InventoryDocument) => {
  const serie = document.serieCode || document.serie || "";
  const sep = document.serieSeparator || "-";
  const num = document.correlative != null ? String(document.correlative) : "";
  const padded = document.seriePadding ? num.padStart(document.seriePadding, "0") : num;
  return [serie, padded].filter(Boolean).join(sep) || document.id;
};

export default function TransferenceProduts() {
  const { showFlash, clearFlash } = useFlashMessage();
  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
  const [toDate, setToDate] = useState(() => endOfDayIso());
  const [warehouseId, setWarehouseId] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "">("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const PRIMARY = "hsl(var(--primary))";

  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        res?.map((warehouse: Warehouse) => ({
          value: warehouse.warehouseId,
          label: warehouse.name,
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

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

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
        docType: DocType.TRANSFER,
        productType: InventoryDocumentProductType.MATERIAL,
        status: statusFilter || undefined,
        q: debouncedQuery || undefined,
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
  }, [page, fromDate, toDate, warehouseId, statusFilter, debouncedQuery]);

  const openDocumentPdf = (id: string) => {
    clearFlash();
    setSelectedDocumentId(id);
    setOpenPdfModal(true);
  };

  const documentRows = useMemo<InventoryDocumentRow[]>(
    () =>
      documents.map((document) => {
        const numero = buildNumero(document);
        const date = document.createdAt ? formatDate(new Date(document.createdAt)) : "-";
        const time = document.createdAt
          ? new Date(document.createdAt).toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : undefined;

        const createdBy = document.createdBy?.name || document.createdBy?.email || "-";
        const fromWarehouse = document.fromWarehouse?.name || document.fromWarehouseName || "-";
        const toWarehouse = document.toWarehouse?.name || document.toWarehouseName || "-";

        return {
          id: document.id ?? numero,
          document,
          numero,
          docLabel: docTypeLabels[document.docType] ?? document.docType,
          statusLabel: statusLabels[document.status] ?? document.status,
          fromWarehouse,
          toWarehouse,
          createdBy,
          date,
          time,
        };
      }),
    [documents],
  );

  const columns: DataTableColumn<InventoryDocumentRow>[] = [
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
      headerClassName: "text-left w-[100px] py-4",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "fromWarehouse",
      header: "Origen",
      accessorKey: "fromWarehouse",
      headerClassName: "text-left w-[140px]",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "toWarehouse",
      header: "Destino",
      accessorKey: "toWarehouse",
      headerClassName: "text-left w-[140px]",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "createdBy",
      header: "Usuario",
      accessorKey: "createdBy",
      headerClassName: "text-left w-[140px]",
      className: "text-black/70",
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
      headerClassName: "text-left w-[90px]",
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
      <PageTitle title="Transferencias" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 ms:grid-cols-1 gap-3 pt-2 items-center">
          <Headed title="Transferencias (Materiales)" size="lg" />
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
              onClick={() => setOpenTransferModal(true)}
              disabled={companyActionDisabled}
              title={companyActionTitle}
            >
              Crear nueva transferencia
            </SystemButton>
          </div>
        </div>

        <DataTable
          tableId="inventory-documents-transfer-products"
          data={documentRows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay documentos con los filtros actuales."
          hoverable={false}
          animated={false}
          selectableColumns
          showSearch
          searchMode="server"
          searchPlaceholder="Buscar documento"
          searchValue={query}
          onSearchChange={(value) => setQuery(value)}
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            onChange: ({ startDate, endDate }) => {
              setFromDate(startDate ? toLocalDateKey(startDate) : "");
              setToDate(endDate ? toLocalDateKey(endDate) : "");
              setPage(1);
            },
          }}
          filterPopoverContent={
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.6fr]">
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
                className="h-11 rounded-sm border-border shadow-sm"
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
                className="h-11 rounded-sm border-border shadow-sm"
              />
            </div>
          }
          pagination={{
            page,
            limit,
            total,
          }}
          onPageChange={setPage}
          tableClassName="text-[10px]"
        />

        {error ? <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div> : null}
      </div>

      <PdfViewerModal
        open={openPdfModal}
        onClose={() => {
          setOpenPdfModal(false);
          setSelectedDocumentId(null);
          loadDocuments();
        }}
        title="Documento de inventario"
        loadWhen={Boolean(selectedDocumentId)}
        reloadKey={selectedDocumentId}
        getPdf={() => getDocumentInventoryPdf(selectedDocumentId!)}
      />

      <TransferProductsModal
        open={openTransferModal}
        onClose={() => setOpenTransferModal(false)}
        onSaved={() => {
          setPage(1);
          void loadDocuments();
        }}
        type={ InventoryDocumentProductType.MATERIAL }
      />
    </PageShell>
  );
}
