import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  DataTableSearchPanel,
  type DataTableSearchChip,
  type DataTableSearchColumn,
  type DataTableRecentSearchItem,
  type DataTableSearchSnapshot,
} from "@/shared/components/table/search";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse } from "@/shared/common/utils/response";
import { listActive } from "@/shared/services/warehouseServices";
import { getDocumentInventoryPdf } from "@/shared/services/pdfServices";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import type {
  InventoryDocument,
  InventoryDocumentRow,
} from "@/features/catalog/types/documentInventory";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import {
  DocStatus,
  DocType,
  type Warehouse,
} from "@/features/warehouse/types/warehouse";
import { Headed } from "@/shared/components/components/Headed";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { getDocuments } from "@/shared/services/documentService";
import AdjustmentProductModal from "@/features/catalog/products/components/AdjustmentFormProducts";
import type { ProductType } from "@/features/catalog/types/ProductTypes";
import { useCompany } from "@/shared/hooks/useCompany";
import { DocumentInventoryDetails } from "@/shared/components/components/DocumentInventoryDetails";
import {
  loadLocalRecentSearches,
  pushLocalRecentSearch,
} from "@/shared/utils/localRecentSearches";

type AdjustmentSearchFilterKey = "warehouse" | "status";

const statusLabels: Record<DocStatus, string> = {
  [DocStatus.DRAFT]: "Borrador",
  [DocStatus.POSTED]: "Contabilizado",
  [DocStatus.CANCELLED]: "Anulado",
};

type InventoryAdjustmentsPageConfig = {
  documentProductType: InventoryDocumentProductType;
  productType: ProductType;
  headingTitle: string;
  recentStorageKey: string;
  tableId: string;
  searchName: string;
};

const buildNumero = (document: InventoryDocument) => {
  const serie = document.serieCode || document.serie || "";
  const sep = document.serieSeparator || "-";
  const num = document.correlative != null ? String(document.correlative) : "";
  const padded = document.seriePadding
    ? num.padStart(document.seriePadding, "0")
    : num;
  return [serie, padded].filter(Boolean).join(sep) || document.id;
};


const normalizePaginatedDocuments = (
  items: InventoryDocument[],
  currentPage: number,
  pageSize: number,
) => {
  if (items.length <= pageSize) return items;

  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

type InventoryAdjustmentsPageProps = {
  config: InventoryAdjustmentsPageConfig;
};

export function InventoryAdjustmentsPage({
  config,
}: InventoryAdjustmentsPageProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const showFlashRef = useRef(showFlash);
  const clearFlashRef = useRef(clearFlash);

  useEffect(() => {
    showFlashRef.current = showFlash;
    clearFlashRef.current = clearFlash;
  }, [showFlash, clearFlash]);

  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany
    ? undefined
    : "Primero registra la empresa.";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "">("");
  const [searchText, setSearchText] = useState("");
  const [executedSearchText, setExecutedSearchText] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const PRIMARY = "hsl(var(--primary))";

  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [recentSearches, setRecentSearches] = useState<
    DataTableRecentSearchItem<
      DataTableSearchSnapshot<AdjustmentSearchFilterKey>
    >[]
  >(() => loadLocalRecentSearches(config.recentStorageKey));
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<InventoryDocument | null>(null);
  const [openAdjustmentModal, setOpenAdjustmentModal] = useState(false);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setOpenAdjustmentModal(false);
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: DocStatus.DRAFT, label: statusLabels[DocStatus.DRAFT] },
      { value: DocStatus.POSTED, label: statusLabels[DocStatus.POSTED] },
      { value: DocStatus.CANCELLED, label: statusLabels[DocStatus.CANCELLED] },
    ],
    [],
  );

  const smartSearchColumns = useMemo<
    DataTableSearchColumn<AdjustmentSearchFilterKey>[]
  >(() => {
    const warehouseFilterOptions = warehouseOptions
      .filter((option) => option.value)
      .map((option) => ({ id: option.value, label: option.label }));

    const statusFilterOptions = statusOptions
      .filter((option) => option.value)
      .map((option) => ({ id: String(option.value), label: option.label }));

    return [
      {
        id: "warehouse",
        label: "Almacén",
        options: warehouseFilterOptions,
        visible: true,
      },
      {
        id: "status",
        label: "Estado",
        options: statusFilterOptions,
        visible: true,
      },
    ];
  }, [statusOptions, warehouseOptions]);

  const executedSnapshot = useMemo<
    DataTableSearchSnapshot<AdjustmentSearchFilterKey>
  >(
    () => ({
      q: executedSearchText || undefined,
      filters: {
        warehouse: warehouseId ? [warehouseId] : [],
        status: statusFilter ? [String(statusFilter)] : [],
      },
    }),
    [executedSearchText, statusFilter, warehouseId],
  );

  const buildRecentLabel = useCallback(
    (snapshot: DataTableSearchSnapshot<AdjustmentSearchFilterKey>) => {
      const parts: string[] = [];

      if (snapshot.q) {
        parts.push(`Busqueda: ${snapshot.q}`);
      }

      const warehouseValue = snapshot.filters.warehouse?.[0];
      if (warehouseValue) {
        const label =
          warehouseOptions.find((option) => option.value === warehouseValue)
            ?.label ?? warehouseValue;
        parts.push(`Almacén: ${label}`);
      }

      const statusValue = snapshot.filters.status?.[0];
      if (statusValue) {
        parts.push(
          `Estado: ${statusLabels[statusValue as DocStatus] ?? statusValue}`,
        );
      }

      return parts.join(" · ") || "Búsqueda";
    },
    [warehouseOptions],
  );

  const recordRecentSearch = useCallback(
    (snapshot: DataTableSearchSnapshot<AdjustmentSearchFilterKey>) => {
      const hasFilters =
        Boolean(snapshot.filters.warehouse?.length) ||
        Boolean(snapshot.filters.status?.length);
      const hasQuery = Boolean(snapshot.q);
      if (!hasFilters && !hasQuery) return;

      const id = JSON.stringify(snapshot);
      const label = buildRecentLabel(snapshot);

      setRecentSearches(
        pushLocalRecentSearch(config.recentStorageKey, {
          id,
          label,
          snapshot,
        }),
      );
    },
    [buildRecentLabel, config.recentStorageKey],
  );

  const searchChips = useMemo<
    DataTableSearchChip<AdjustmentSearchFilterKey>[]
  >(() => {
    const chips: DataTableSearchChip<AdjustmentSearchFilterKey>[] = [];

    if (executedSnapshot.q) {
      chips.push({
        id: "q",
        label: `Busqueda: ${executedSnapshot.q}`,
        removeKey: "q",
      });
    }

    const warehouseValue = executedSnapshot.filters.warehouse?.[0];
    if (warehouseValue) {
      const label =
        warehouseOptions.find((option) => option.value === warehouseValue)
          ?.label ?? warehouseValue;
      chips.push({
        id: "warehouse",
        label: `Almacén: ${label}`,
        removeKey: "warehouse",
      });
    }

    const statusValue = executedSnapshot.filters.status?.[0];
    if (statusValue) {
      chips.push({
        id: "status",
        label: `Estado: ${statusLabels[statusValue as DocStatus] ?? statusValue}`,
        removeKey: "status",
      });
    }

    return chips;
  }, [
    executedSnapshot.filters.status,
    executedSnapshot.filters.warehouse,
    executedSnapshot.q,
    warehouseOptions,
  ]);

  const handleRemoveChip = useCallback(
    (chip: DataTableSearchChip<AdjustmentSearchFilterKey>) => {
      if (chip.removeKey === "q") {
        setSearchText("");
        setExecutedSearchText("");
        recordRecentSearch({
          filters: {
            warehouse: warehouseId ? [warehouseId] : [],
            status: statusFilter ? [String(statusFilter)] : [],
          },
        });
        setPage(1);
        return;
      }

      if (chip.removeKey === "warehouse") {
        setWarehouseId("");
        recordRecentSearch({
          q: executedSearchText || undefined,
          filters: {
            warehouse: [],
            status: statusFilter ? [String(statusFilter)] : [],
          },
        });
        setPage(1);
        return;
      }

      if (chip.removeKey === "status") {
        setStatusFilter("");
        recordRecentSearch({
          q: executedSearchText || undefined,
          filters: {
            warehouse: warehouseId ? [warehouseId] : [],
            status: [],
          },
        });
        setPage(1);
      }
    },
    [executedSearchText, recordRecentSearch, statusFilter, warehouseId],
  );

  const handleToggleSearchOption = useCallback(
    (columnId: AdjustmentSearchFilterKey, optionId: string) => {
      if (columnId === "warehouse") {
        setWarehouseId((prev) => {
          const nextWarehouseId = prev === optionId ? "" : optionId;
          recordRecentSearch({
            q: executedSearchText || undefined,
            filters: {
              warehouse: nextWarehouseId ? [nextWarehouseId] : [],
              status: statusFilter ? [String(statusFilter)] : [],
            },
          });
          return nextWarehouseId;
        });
        setPage(1);
        return;
      }

      if (columnId === "status") {
        setStatusFilter((prev) => {
          const nextStatus =
            String(prev) === optionId ? "" : (optionId as DocStatus);
          recordRecentSearch({
            q: executedSearchText || undefined,
            filters: {
              warehouse: warehouseId ? [warehouseId] : [],
              status: nextStatus ? [String(nextStatus)] : [],
            },
          });
          return nextStatus;
        });
        setPage(1);
      }
    },
    [executedSearchText, recordRecentSearch, statusFilter, warehouseId],
  );

  const applySnapshot = useCallback(
    (snapshot: DataTableSearchSnapshot<AdjustmentSearchFilterKey>) => {
      recordRecentSearch({
        ...snapshot,
        q: snapshot.q?.trim() || undefined,
      });
      const nextWarehouseId = snapshot.filters.warehouse?.[0] ?? "";
      const nextStatus = snapshot.filters.status?.[0] ?? "";
      setWarehouseId(nextWarehouseId);
      setStatusFilter(nextStatus as DocStatus | "");
      setSearchText(snapshot.q ?? "");
      setExecutedSearchText((snapshot.q ?? "").trim());
      setPage(1);
    },
    [recordRecentSearch],
  );

  const submitSearch = useCallback(() => {
    const nextQ = searchText.trim();
    recordRecentSearch({
      q: nextQ || undefined,
      filters: {
        warehouse: warehouseId ? [warehouseId] : [],
        status: statusFilter ? [String(statusFilter)] : [],
      },
    });

    setExecutedSearchText(nextQ);
    setPage(1);
  }, [recordRecentSearch, searchText, statusFilter, warehouseId]);

  const loadWarehouses = useCallback(async () => {
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
      showFlashRef.current(errorResponse("Error al cargar almacenes"));
    }
  }, []);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getDocuments({
        page,
        limit,
        from: fromDate || undefined,
        to: toDate || undefined,
        warehouseId: warehouseId || undefined,
        docType: DocType.ADJUSTMENT,
        productType: config.documentProductType,
        status: statusFilter || undefined,
        q: executedSearchText || undefined,
      });

      const responseItems = res.items ?? [];
      setDocuments(normalizePaginatedDocuments(responseItems, page, limit));
      setTotal(res.total ?? responseItems.length);
    } catch {
      setDocuments([]);
      setTotal(0);
      showFlashRef.current(
        errorResponse("No se pudieron cargar los documentos."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    fromDate,
    toDate,
    warehouseId,
    statusFilter,
    executedSearchText,
    config.documentProductType,
  ]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

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
      fromWarehouse:
        document.fromWarehouseName ?? document.fromWarehouse?.name ?? "-",
      toWarehouse:
        document.toWarehouseName ?? document.toWarehouse?.name ?? "-",
      createdBy: document.createdBy?.name ?? document.createdBy?.email ?? "-",
      date: new Date(document.createdAt).toLocaleDateString("es-PE"),
      time: new Date(document.createdAt).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [documents]);

  const columns = useMemo<DataTableColumn<InventoryDocumentRow>[]>(() => {
    return [
      {
        id: "date",
        header: "Emisiòn",
        cell: (row) => (
          <div className="text-black/70">
           {row.date} {row.time}
          </div>
        ),
        sortable: false,
      },
      {
        id: "numero",
        header: "N. Documento",
        accessorKey: "numero",
        headerClassName: "text-left",
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
        id: "status",
        header: "Estado",
        cell: (row) => (
        <div className="flex justify-center">
          <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
            {row.statusLabel}
          </span>
        </div>
      ),
        accessorKey: "statusLabel",
        headerClassName: "text-center [&>div]:justify-center",
        sortable: false,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        headerClassName: "text-center [&>div]:justify-center",
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
        <div className="flex items-center justify-between">
          <Headed title={config.headingTitle} size="lg" />

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
              Crear ajuste
            </SystemButton>
          </div>
        </div>

        <DataTableSearchChips chips={searchChips} onRemove={handleRemoveChip} />

        <DataTable
          tableId={config.tableId}
          data={documentRows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay documentos con los filtros actuales."
          hoverable={false}
          animated={false}
          selectableColumns
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={setSearchText}
              onSubmitSearch={submitSearch}
              searchLabel="Buscar documento"
              searchName={config.searchName}
            >
              <DataTableSearchPanel
                recent={recentSearches}
                columns={smartSearchColumns}
                snapshot={executedSnapshot}
                onApplySnapshot={applySnapshot}
                onToggleOption={handleToggleSearchOption}
              />
            </DataTableSearchBar>
          }
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            onChange: ({ startDate, endDate }) => {
              setFromDate(startDate ? toLocalDateKey(startDate) : "");
              setToDate(endDate ? toLocalDateKey(endDate) : "");
              setPage(1);
            },
          }}
          pagination={{
            page,
            limit,
            total,
          }}
          onPageChange={setPage}
          onRowClick={(row) => {
            setSelectedDocument(row.document);
            setOpenDetailsModal(true);
          }}
          tableClassName="text-[10px]"
        />

      <PdfViewerModal
        open={openPdfModal}
        onClose={() => {
          setOpenPdfModal(false);
          setSelectedDocumentId(null);
          void loadDocuments();
        }}
        title="Documento de inventario"
        loadWhen={Boolean(selectedDocumentId)}
        reloadKey={selectedDocumentId}
        getPdf={() => getDocumentInventoryPdf(selectedDocumentId!)}
      />

      <DocumentInventoryDetails
        open={openDetailsModal}
        documentId={selectedDocument?.id ?? null}
        document={selectedDocument}
        items={[]}
        onClose={() => {
          setOpenDetailsModal(false);
          setSelectedDocument(null);
        }}
      />

      <AdjustmentProductModal
        open={openAdjustmentModal}
        onClose={handleClose}
        onSaved={() => {
          setPage(1);
          void loadDocuments();
        }}
        loadDocuments={() => {
          setPage(1);
          void loadDocuments();
        }}
        type={config.productType}
      />
    </PageShell>
  );
}
