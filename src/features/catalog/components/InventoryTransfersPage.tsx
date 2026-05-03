import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Menu, Play, Plus } from "lucide-react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { formatDate } from "@/shared/components/components/TimerToEnd";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { getDocumentInventoryPdf } from "@/shared/services/pdfServices";
import {
  parseDateInputValue,
  toLocalDateKey,
} from "@/shared/utils/functionPurchases";
import type { InventoryDocument, InventoryDocumentRow } from "@/features/catalog/types/documentInventory";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import { DocStatus, DocType } from "@/features/warehouse/types/warehouse";
import { Headed } from "@/shared/components/components/Headed";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  deleteInventoryDocumentsSearchMetric,
  getDocuments,
  getInventoryDocumentsSearchState,
  saveInventoryDocumentsSearchMetric,
  processInventoryDocument,
} from "@/shared/services/documentService";
import { TransferProductsModal } from "@/features/catalog/products/components/TransferProductsModal";
import { useCompany } from "@/shared/hooks/useCompany";
import { DocumentDetailsModal } from "@/shared/components/components/DocumentDetailsModal";
import type {
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchRule,
  InventoryDocumentsSearchSnapshot,
  InventoryDocumentsSearchStateResponse,
} from "@/features/catalog/types/inventoryDocumentsSearch";
import {
  buildInventoryDocumentsSearchChips,
  buildInventoryDocumentsSmartSearchColumns,
  createEmptyInventoryDocumentsSearchFilters,
  hasInventoryDocumentsSearchCriteria,
  removeInventoryDocumentsSearchKey,
  sanitizeInventoryDocumentsSearchSnapshot,
  upsertInventoryDocumentsSearchRule,
} from "@/features/catalog/utils/inventoryDocumentsSmartSearch";
import { InventoryDocumentsSmartSearchPanel } from "@/features/catalog/components/InventoryDocumentsSmartSearchPanel";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import {
  deleteInventoryDocumentsExportPreset,
  exportInventoryDocumentsExcel,
  getInventoryDocumentsExportColumns,
  getInventoryDocumentsExportPresets,
  saveInventoryDocumentsExportPreset,
} from "@/shared/services/documentService";
import { subscribeInventoryStockUpdated } from "@/shared/services/inventoryRealtimeService";

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
  const [searchParams] = useSearchParams();
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
  const limit = 25;

  const [searchState, setSearchState] = useState<InventoryDocumentsSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [exportColumns, setExportColumns] = useState<Array<{ key: string; label: string }>>([]);
  const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: Array<{ key: string; label: string }> }>>([]);
  const [exporting, setExporting] = useState(false);
  const [useTableDateRangeForExport, setUseTableDateRangeForExport] = useState(true);

  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingDocumentId, setProcessingDocumentId] = useState<string | null>(null);
  const showFlashRef = useRef(showFlash);
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showFlashRef.current = showFlash;
  }, [showFlash]);

  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<InventoryDocument | null>(null);

  const draftSnapshot = useMemo<InventoryDocumentsSearchSnapshot>(
    () =>
      sanitizeInventoryDocumentsSearchSnapshot(
        { q: searchText, filters: searchFilters },
        searchState,
        { docType: DocType.TRANSFER },
      ),
    [searchFilters, searchState, searchText],
  );

  const executedSnapshot = useMemo<InventoryDocumentsSearchSnapshot>(
    () =>
      sanitizeInventoryDocumentsSearchSnapshot(
        { q: appliedSearchText, filters: searchFilters },
        searchState,
        { docType: DocType.TRANSFER },
      ),
    [appliedSearchText, searchFilters, searchState],
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

  const loadExportColumns = useCallback(async () => {
    const response = await getInventoryDocumentsExportColumns({
      docType: DocType.TRANSFER,
      productType: config.productType,
    });
    setExportColumns(response ?? []);
  }, [config.productType]);

  const loadExportPresets = useCallback(async () => {
    const response = await getInventoryDocumentsExportPresets({
      docType: DocType.TRANSFER,
      productType: config.productType,
    });
    setExportPresets((response ?? []).map((item) => ({
      metricId: item.metricId,
      name: item.name,
      columns: (item.snapshot?.columns ?? []) as Array<{ key: string; label: string }>,
    })));
  }, [config.productType]);

  useEffect(() => {
    void loadExportColumns();
    void loadExportPresets();
  }, [loadExportColumns, loadExportPresets]);

  const [initialTransferSku, setInitialTransferSku] = useState<{
    skuId: string;
    name?: string;
    backendSku?: string;
    customSku?: string | null;
  } | null>(null);
  const prefillHandledRef = useRef(false);

  useEffect(() => {
    if (prefillHandledRef.current) return;
    const shouldOpen = searchParams.get("openTransferModal") === "1";
    const skuId = searchParams.get("skuId")?.trim();
    if (!shouldOpen || !skuId) return;

    prefillHandledRef.current = true;
    setInitialTransferSku({
      skuId,
      name: searchParams.get("skuName")?.trim() || undefined,
      backendSku: searchParams.get("backendSku")?.trim() || undefined,
      customSku: searchParams.get("customSku")?.trim() || undefined,
    });
    setOpenTransferModal(true);
  }, [searchParams]);

  const smartSearchColumns = useMemo(
    () => buildInventoryDocumentsSmartSearchColumns(searchState, { docType: DocType.TRANSFER }),
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
    () => buildInventoryDocumentsSearchChips(executedSnapshot, searchState, { docType: DocType.TRANSFER }),
    [executedSnapshot, searchState],
  );

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPage(1);
    });
  }, [searchText]);

  const handleApplySnapshot = useCallback((snapshot: InventoryDocumentsSearchSnapshot) => {
    const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot, searchState, { docType: DocType.TRANSFER });
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
          sanitizeInventoryDocumentsSearchSnapshot(
            { q: searchText, filters: current },
            searchState,
            { docType: DocType.TRANSFER },
          ),
          rule,
          searchState,
          { docType: DocType.TRANSFER },
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
          sanitizeInventoryDocumentsSearchSnapshot(
            { q: searchText, filters: current },
            searchState,
            { docType: DocType.TRANSFER },
          ),
          fieldId,
        );
        return next.filters;
      });
      setPage(1);
    });
  }, [searchState, searchText]);

  const handleRemoveChip = useCallback((key: "q" | InventoryDocumentsSearchField) => {
    const nextSnapshot = removeInventoryDocumentsSearchKey(
      sanitizeInventoryDocumentsSearchSnapshot(
        { q: appliedSearchText, filters: searchFilters },
        searchState,
        { docType: DocType.TRANSFER },
      ),
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
    const snapshot = sanitizeInventoryDocumentsSearchSnapshot(
      { q: appliedSearchText, filters: searchFilters },
      searchState,
      { docType: DocType.TRANSFER },
    );
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
    try {
      const res = await getDocuments({
        page,
        limit,
        from: fromDate || undefined,
        to: toDate || undefined,
        docType: DocType.TRANSFER,
        productType: config.productType,
        includeItems: true,
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

  useEffect(() => {
    const unsubscribe = subscribeInventoryStockUpdated(() => {
      if (realtimeRefreshTimeoutRef.current) return;
      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        realtimeRefreshTimeoutRef.current = null;
        void loadDocuments();
      }, 350);
    });
    return () => {
      unsubscribe();
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
    };
  }, [loadDocuments]);

  const openDocumentPdf = (id: string) => {
    clearFlash();
    setSelectedDocumentId(id);
    setOpenPdfModal(true);
  };

  const handleProcessDocument = useCallback(async (documentId: string) => {
    if (!documentId) return;
    setProcessingDocumentId(documentId);
    try {
      const response = await processInventoryDocument(documentId);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadDocuments();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Error al procesar documento"));
    } finally {
      setProcessingDocumentId(null);
    }
  }, [loadDocuments, showFlash]);

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
      headerClassName: "text-left",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "numero",
      header: "Documento",
      accessorKey: "numero",
      headerClassName: "text-left",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "fromWarehouse",
      header: "Origen",
      accessorKey: "fromWarehouse",
      headerClassName: "text-left",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "toWarehouse",
      header: "Destino",
      accessorKey: "toWarehouse",
      headerClassName: "text-left",
      className: "text-black/70",
      hideable: true,
      sortable: false,
    },
    {
      id: "createdBy",
      header: "Usuario",
      accessorKey: "createdBy",
      headerClassName: "text-left",
      className: "text-black/70",
      hideable: true,
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
      headerClassName: "text-center [&>div]:justify-center",
      className: "text-center text-black/70",
      hideable: true,
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
              ...(row.document.status === DocStatus.DRAFT
                ? [{
                    id: "process",
                    label: "Procesar",
                    icon: <Play className="h-4 w-4 text-black/60" />,
                    onClick: () => handleProcessDocument(row.document.id ?? row.id),
                    disabled: processingDocumentId === (row.document.id ?? row.id),
                  }]
                : []),
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
      className: "text-center",
      hideable: true,
      sortable: false,
    },
  ];

  const handleExport = useCallback(async (columnsToExport: Array<{ key: string; label: string }>) => {
    setExporting(true);
    try {
      const file = await exportInventoryDocumentsExcel({
        page,
        limit,
        docType: DocType.TRANSFER,
        productType: config.productType,
        q: executedSnapshot.q,
        filters: JSON.stringify(executedSnapshot.filters),
        from: useTableDateRangeForExport ? (fromDate || undefined) : undefined,
        to: useTableDateRangeForExport ? (toDate || undefined) : undefined,
        columns: columnsToExport,
      } as any);
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      showFlash(successResponse("Excel exportado correctamente"));
    } catch {
      showFlash(errorResponse("No se pudo exportar el Excel"));
    } finally {
      setExporting(false);
    }
  }, [config.productType, executedSnapshot.filters, executedSnapshot.q, fromDate, limit, page, showFlash, toDate, useTableDateRangeForExport]);

  const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: Array<{ key: string; label: string }> }) => {
    await saveInventoryDocumentsExportPreset({
      name: payload.name,
      columns: payload.columns,
      docType: DocType.TRANSFER,
      productType: config.productType,
      useDateRange: useTableDateRangeForExport,
    });
    await loadExportPresets();
  }, [config.productType, loadExportPresets, useTableDateRangeForExport]);

  const handleDeleteExportPreset = useCallback(async (metricId: string) => {
    await deleteInventoryDocumentsExportPreset({
      metricId,
      docType: DocType.TRANSFER,
      productType: config.productType,
    });
    await loadExportPresets();
  }, [config.productType, loadExportPresets]);

  return (
    <PageShell>
      <PageTitle title={config.pageTitle} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Headed title={config.headingTitle} size="lg" />
          <div className="flex justify-end gap-2">
            {exportColumns.length ? (
              <ExportPopover
                columns={exportColumns}
                presets={exportPresets}
                loading={exporting}
                onSavePreset={handleSaveExportPreset}
                onDeletePreset={handleDeleteExportPreset}
                onExport={handleExport}
              />
            ) : null}
            <SystemButton
              size="md"
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
              Crear transferencia
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
          useRangeDatesForExternalExport
          onExternalExportRangeStateChange={(state) => setUseTableDateRangeForExport(state.useDateRange)}
          pagination={{
            page,
            limit,
            total,
          }}
          onPageChange={(nextPage) => startTransition(() => setPage(nextPage))}
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

      <DocumentDetailsModal
        open={openDetailsModal}
        documentId={selectedDocument?.id ?? null}
        document={selectedDocument}
        items={selectedDocument?.items ?? []}
        onClose={() => {
          setOpenDetailsModal(false);
          setSelectedDocument(null);
        }}
      />

      <TransferProductsModal
        open={openTransferModal}
        onClose={() => {
          setOpenTransferModal(false);
          setInitialTransferSku(null);
        }}
        type={config.productType}
        initialSku={initialTransferSku}
        onSaved={() => {
          setPage(1);
          void loadDocuments();
        }}
      />
    </PageShell>
  );
}
