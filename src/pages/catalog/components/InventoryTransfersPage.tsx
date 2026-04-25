import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import { ActionsPopover } from "@/components/ActionsPopover";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { formatDate } from "@/components/TimerToEnd";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { getDocumentInventoryPdf } from "@/services/pdfServices";
import {
  parseDateInputValue,
  toLocalDateKey,
} from "@/utils/functionPurchases";
import type { InventoryDocument, InventoryDocumentRow } from "@/pages/catalog/types/documentInventory";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";
import { DocStatus, DocType } from "@/pages/warehouse/types/warehouse";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import {
  deleteInventoryDocumentsSearchMetric,
  getDocuments,
  getInventoryDocumentsSearchState,
  saveInventoryDocumentsSearchMetric,
} from "@/services/documentService";
import { TransferProductsModal } from "@/pages/catalog/products/components/TransferProductsModal";
import { useCompany } from "@/hooks/useCompany";
import { DocumentInventoryDetails } from "@/components/DocumentInventoryDetails";
import type {
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchRule,
  InventoryDocumentsSearchSnapshot,
  InventoryDocumentsSearchStateResponse,
} from "@/pages/catalog/types/inventoryDocumentsSearch";
import {
  buildInventoryDocumentsSearchChips,
  buildInventoryDocumentsSmartSearchColumns,
  createEmptyInventoryDocumentsSearchFilters,
  hasInventoryDocumentsSearchCriteria,
  removeInventoryDocumentsSearchKey,
  sanitizeInventoryDocumentsSearchSnapshot,
  upsertInventoryDocumentsSearchRule,
} from "@/pages/catalog/utils/inventoryDocumentsSmartSearch";
import { InventoryDocumentsSmartSearchPanel } from "@/pages/catalog/components/InventoryDocumentsSmartSearchPanel";

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
  [DocType.PURCHASE]: "Compra",
};

const buildNumero = (document: InventoryDocument) => {
  const serie = document.serieCode || document.serie || "";
  const sep = document.serieSeparator || "-";
  const num = document.correlative != null ? String(document.correlative) : "";
  const padded = document.seriePadding ? num.padStart(document.seriePadding, "0") : num;
  return [serie, padded].filter(Boolean).join(sep) || document.id;
};

type InventoryTransfersPageConfig = {
  productType: InventoryDocumentProductType;
  pageTitle: string;
  headingTitle: string;
  tableId: string;
  searchName: string;
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

type InventoryTransfersPageProps = {
  config: InventoryTransfersPageConfig;
};

export function InventoryTransfersPage({ config }: InventoryTransfersPageProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyInventoryDocumentsSearchFilters());
  const [page, setPage] = useState(1);

  const PRIMARY = "hsl(var(--primary))";
  const limit = 10;

  const [searchState, setSearchState] = useState<InventoryDocumentsSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);

  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showFlashRef = useRef(showFlash);

  useEffect(() => {
    showFlashRef.current = showFlash;
  }, [showFlash]);

  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<InventoryDocument | null>(null);

  const draftSnapshot = useMemo<InventoryDocumentsSearchSnapshot>(
    () => sanitizeInventoryDocumentsSearchSnapshot({ q: searchText, filters: searchFilters }, searchState),
    [searchFilters, searchState, searchText],
  );

  const executedSnapshot = useMemo<InventoryDocumentsSearchSnapshot>(
    () => sanitizeInventoryDocumentsSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getInventoryDocumentsSearchState({
        docType: DocType.TRANSFER,
        productType: config.productType,
      });
      setSearchState(response);
    } catch {
      showFlashRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, [config.productType]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  const smartSearchColumns = useMemo(
    () => buildInventoryDocumentsSmartSearchColumns(searchState),
    [searchState],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<InventoryDocumentsSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<InventoryDocumentsSearchSnapshot>[]>(
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
    () => buildInventoryDocumentsSearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPage(1);
    });
  }, [searchText]);

  const handleApplySnapshot = useCallback((snapshot: InventoryDocumentsSearchSnapshot) => {
    const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot, searchState);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPage(1);
    });
  }, [searchState]);

  const handleApplySearchRule = useCallback((rule: InventoryDocumentsSearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = upsertInventoryDocumentsSearchRule(
          sanitizeInventoryDocumentsSearchSnapshot({ q: searchText, filters: current }, searchState),
          rule,
          searchState,
        );
        return next.filters;
      });
      setPage(1);
    });
  }, [searchState, searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: InventoryDocumentsSearchField) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = removeInventoryDocumentsSearchKey(
          sanitizeInventoryDocumentsSearchSnapshot({ q: searchText, filters: current }, searchState),
          fieldId,
        );
        return next.filters;
      });
      setPage(1);
    });
  }, [searchState, searchText]);

  const handleRemoveChip = useCallback((key: "q" | InventoryDocumentsSearchField) => {
    const nextSnapshot = removeInventoryDocumentsSearchKey(
      sanitizeInventoryDocumentsSearchSnapshot({ q: appliedSearchText, filters: searchFilters }, searchState),
      key,
    );
    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
      setPage(1);
    });
  }, [appliedSearchText, searchFilters, searchState]);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizeInventoryDocumentsSearchSnapshot({ q: appliedSearchText, filters: searchFilters }, searchState);
    if (!hasInventoryDocumentsSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveInventoryDocumentsSearchMetric({
        name,
        docType: DocType.TRANSFER,
        productType: config.productType,
        snapshot,
      });
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
  }, [appliedSearchText, config.productType, loadSearchState, searchFilters, searchState, showFlash]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteInventoryDocumentsSearchMetric({
        metricId,
        docType: DocType.TRANSFER,
        productType: config.productType,
      });
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Error al eliminar la metrica"));
    }
  }, [config.productType, loadSearchState, showFlash]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getDocuments({
        page,
        limit,
        from: fromDate || undefined,
        to: toDate || undefined,
        docType: DocType.TRANSFER,
        productType: config.productType,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length
          ? JSON.stringify(executedSnapshot.filters)
          : undefined,
      });

      const responseItems = res.items ?? [];
      setDocuments(normalizePaginatedDocuments(responseItems, page, limit));
      setTotal(res.total ?? responseItems.length);

      if (hasInventoryDocumentsSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setDocuments([]);
      setTotal(0);
      setError("Error al listar documentos");
      showFlashRef.current(errorResponse("Error al listar documentos"));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    fromDate,
    toDate,
    config.productType,
    executedSnapshot,
    loadSearchState,
  ]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

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
          {row.date} {row.time}
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
    <PageShell>
      <PageTitle title={config.pageTitle} />
      <div className="space-y-4">
        <div className="grid grid-cols-2 ms:grid-cols-1 gap-3 pt-2 items-center">
          <Headed title={config.headingTitle} size="lg" />
          <div className="flex justify-end">
            <SystemButton
              size="md"
              className="w-full lg:w-auto"
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

        <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />

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
          onRowClick={(row) => {
            setSelectedDocument(row.document);
            setOpenDetailsModal(true);
          }}
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={(value) => startTransition(() => setSearchText(value))}
              onSubmitSearch={submitSearch}
              searchLabel="Buscar documento"
              searchName={config.searchName}
              canSaveMetric={hasInventoryDocumentsSearchCriteria(executedSnapshot)}
              saveLoading={savingMetric}
              onSaveMetric={handleSaveMetric}
            >
              <InventoryDocumentsSmartSearchPanel
                recent={recentSearches}
                saved={savedMetrics}
                columns={smartSearchColumns}
                snapshot={draftSnapshot}
                searchState={searchState}
                filterQuery={searchText}
                onApplySnapshot={handleApplySnapshot}
                onApplyRule={handleApplySearchRule}
                onRemoveRule={handleRemoveSearchRule}
                onDeleteMetric={handleDeleteMetric}
              />
            </DataTableSearchBar>
          }
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            onChange: ({ startDate, endDate }) => {
              startTransition(() => {
                setFromDate(startDate ? toLocalDateKey(startDate) : "");
                setToDate(endDate ? toLocalDateKey(endDate) : "");
                setPage(1);
              });
            },
          }}
          pagination={{
            page,
            limit,
            total,
          }}
          onPageChange={(nextPage) => startTransition(() => setPage(nextPage))}
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

      <TransferProductsModal
        open={openTransferModal}
        onClose={() => setOpenTransferModal(false)}
        type={config.productType}
        onSaved={() => {
          setPage(1);
          void loadDocuments();
        }}
      />
    </PageShell>
  );
}
