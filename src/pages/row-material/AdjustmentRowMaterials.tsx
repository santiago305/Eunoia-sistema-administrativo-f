import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { ActionsPopover } from "@/components/ActionsPopover";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
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
import type { InventoryDocument, InventoryDocumentRow } from "@/pages/catalog/types/documentInventory";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";
import { DocStatus, DocType, type Warehouse } from "@/pages/warehouse/types/warehouse";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import { getDocuments } from "@/services/documentService";
import AdjustmentProductModal from "@/pages/catalog/components/AdjustmentFormProducts";
import type { AppliedDataTableFilter, DataTableFilterTree } from "@/components/table/filters";
import { ProductTypes } from "../catalog/types/ProductTypes";
import { RoutesPaths } from "@/router/config/routesPaths";
import { useCompany } from "@/hooks/useCompany";

const statusLabels: Record<DocStatus, string> = {
  [DocStatus.DRAFT]: "Borrador",
  [DocStatus.POSTED]: "Contabilizado",
  [DocStatus.CANCELLED]: "Anulado",
};

const buildNumero = (document: InventoryDocument) => {
  const serie = document.serieCode || document.serie || "";
  const sep = document.serieSeparator || "-";
  const num = document.correlative != null ? String(document.correlative) : "";
  const padded = document.seriePadding ? num.padStart(document.seriePadding, "0") : num;
  return [serie, padded].filter(Boolean).join(sep) || document.id;
};

export default function AdjustmentProduts() {
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
  const [refresh, setRefresh] = useState(0);
  const limit = 10;

  const PRIMARY = "hsl(var(--primary))";

  const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [openAdjustmentModal, setOpenAdjustmentModal] = useState(false);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setOpenAdjustmentModal(false);
  }, []);

  const statusOptions = [
    { value: "", label: "Todos" },
    { value: DocStatus.DRAFT, label: statusLabels[DocStatus.DRAFT] },
    { value: DocStatus.POSTED, label: statusLabels[DocStatus.POSTED] },
    { value: DocStatus.CANCELLED, label: statusLabels[DocStatus.CANCELLED] },
  ];

  const adjustmentTableFilters = useMemo<DataTableFilterTree>(() => {
    const warehouseFilterOptions = warehouseOptions
      .filter((option) => option.value)
      .map((option) => ({
        id: option.value,
        label: option.label,
      }));

    const statusFilterOptions = statusOptions
      .filter((option) => option.value)
      .map((option) => ({
        id: String(option.value),
        label: option.label,
      }));

    return [
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
  }, [statusOptions, warehouseOptions]);

  const adjustmentAppliedFilters = useMemo<AppliedDataTableFilter[]>(() => {
    const filters: AppliedDataTableFilter[] = [];

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
  }, [statusFilter, warehouseId]);

  const handleAdjustmentFiltersChange = useCallback((next: AppliedDataTableFilter[]) => {
    const getFirstOption = (categoryId: string) =>
      next.find((item) => item.categoryId === categoryId)?.optionIds[0] ?? "";

    setWarehouseId(getFirstOption("warehouse"));
    setStatusFilter(getFirstOption("status") as DocStatus | "");
    setPage(1);
  }, []);

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
        docType: DocType.ADJUSTMENT,
        productType: InventoryDocumentProductType.MATERIAL,
        status: statusFilter || undefined,
        q: debouncedQuery || undefined,
      });

      setDocuments(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setError("No se pudieron cargar los documentos.");
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [page, limit, fromDate, toDate, warehouseId, statusFilter, debouncedQuery, refresh]);

  const openDocumentPdf = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setOpenPdfModal(true);
  };

  const documentRows = useMemo<InventoryDocumentRow[]>(() => {
    return (documents ?? []).map((document) => ({
      id: document.id,
      document,
      numero: buildNumero(document),
      docLabel: "Ajuste",
      statusLabel: statusLabels[document.status],
      fromWarehouse: document.fromWarehouseName ?? document.fromWarehouse?.name ?? "-",
      toWarehouse: document.toWarehouseName ?? document.toWarehouse?.name ?? "-",
      createdBy: document.createdBy?.name ?? document.createdBy?.email ?? "-",
      date: new Date(document.createdAt).toLocaleDateString("es-PE"),
      time: new Date(document.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
    }));
  }, [documents]);

  const columns = useMemo<DataTableColumn<InventoryDocumentRow>[]>(() => {
    return [
      {
        id: "numero",
        header: "Número",
        accessorKey: "numero",
        headerClassName: "text-left w-[150px]",
        className: "text-left",
        sortable: false,
      },
      {
        id: "status",
        header: "Estado",
        accessorKey: "statusLabel",
        headerClassName: "text-left w-[140px]",
        className: "text-left",
        sortable: false,
      },
      {
        id: "warehouse",
        header: "Almacén",
        accessorKey: "fromWarehouse",
        headerClassName: "text-left",
        className: "text-left",
        sortable: false,
      },
      {
        id: "createdBy",
        header: "Usuario",
        accessorKey: "createdBy",
        headerClassName: "text-left",
        className: "text-left",
        sortable: false,
      },
      {
        id: "date",
        header: "Fecha",
        cell: (row) => (
          <div className="text-black/70 tabular-nums">
            <div>{row.date}</div>
            <div className="text-[10px] text-black/50">{row.time}</div>
          </div>
        ),
        headerClassName: "text-left w-[140px]",
        className: "text-left",
        sortable: false,
      },
      {
        id: "actions",
        header: "",
        stopRowClick: true,
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
  }, []);

  return (
    <PageShell className="bg-white">
      <PageTitle title="Ajustes" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 ms:grid-cols-1 gap-3 pt-2 items-center">
          <Headed title="Ajustes (Materiales)" size="lg" />
          <div className="flex justify-end">
            <SystemButton
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              style={{
                backgroundColor: PRIMARY,
                borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
              }}
              onClick={() => setOpenAdjustmentModal(true)}
              disabled={companyActionDisabled}
              title={companyActionTitle}
            >
              Crear nuevo ajuste
            </SystemButton>
          </div>
        </div>

        <DataTable
          tableId="inventory-documents-adjustment-products"
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
          filtersConfig={{
            categories: adjustmentTableFilters,
            value: adjustmentAppliedFilters,
            onChange: handleAdjustmentFiltersChange,
          }}
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
          void loadDocuments();
        }}
        title="Documento de inventario"
        getPdf={() => getDocumentInventoryPdf(selectedDocumentId!)}
      />

      <AdjustmentProductModal
        open={openAdjustmentModal}
        onClose={handleClose}
        onSaved={() => setRefresh(prev => prev + 1)}
        loadDocuments={() => setRefresh(prev => prev + 1)}
        type={ProductTypes.MATERIAL}
      />
    </PageShell>
  );
}
