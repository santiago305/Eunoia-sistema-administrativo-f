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
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { getDocumentInventoryPdf } from "@/shared/services/pdfServices";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import type {
  InventoryDocument,
  InventoryDocumentRow,
} from "@/features/catalog/types/documentInventory";
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
import AdjustmentProductModal from "@/features/catalog/products/components/AdjustmentFormProducts";
import type { ProductType } from "@/features/catalog/types/ProductTypes";
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
  const { showFlash } = useFlashMessage();
  const [searchParams] = useSearchParams();
  const showFlashRef = useRef(showFlash);

  useEffect(() => {
    showFlashRef.current = showFlash;
  }, [showFlash]);

  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany
    ? undefined
    : "Primero registra la empresa.";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyInventoryDocumentsSearchFilters());
  const [page, setPage] = useState(1);
  const limit = 25;

  const PRIMARY = "hsl(var(--primary))";

  const [searchState, setSearchState] = useState<InventoryDocumentsSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [exportColumns, setExportColumns] = useState<Array<{ key: string; label: string }>>([]);
  const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: Array<{ key: string; label: string }> }>>([]);
  const [exporting, setExporting] = useState(false);
  const [useTableDateRangeForExport, setUseTableDateRangeForExport] = useState(true);
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<InventoryDocument | null>(null);
  const [openAdjustmentModal, setOpenAdjustmentModal] = useState(false);
  const [initialAdjustmentSku, setInitialAdjustmentSku] = useState<{
    skuId: string;
    name?: string;
    backendSku?: string;
    customSku?: string | null;
  } | null>(null);
  const prefillHandledRef = useRef(false);
  const [documents, setDocuments] = useState<InventoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingDocumentId, setProcessingDocumentId] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setOpenAdjustmentModal(false);
  }, []);

  const draftSnapshot = useMemo<InventoryDocumentsSearchSnapshot>(
    () =>
      sanitizeInventoryDocumentsSearchSnapshot(
        { q: searchText, filters: searchFilters },
        searchState,
        { docType: DocType.ADJUSTMENT },
      ),
    [searchFilters, searchState, searchText],
  );

  const executedSnapshot = useMemo<InventoryDocumentsSearchSnapshot>(
    () =>
      sanitizeInventoryDocumentsSearchSnapshot(
        { q: appliedSearchText, filters: searchFilters },
        searchState,
        { docType: DocType.ADJUSTMENT },
      ),
    [appliedSearchText, searchFilters, searchState],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getInventoryDocumentsSearchState({
        docType: DocType.ADJUSTMENT,
        productType: config.documentProductType,
      });
      setSearchState(response);
    } catch {
      showFlashRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, [config.documentProductType]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  const loadExportColumns = useCallback(async () => {
    const response = await getInventoryDocumentsExportColumns({
      docType: DocType.ADJUSTMENT,
      productType: config.documentProductType,
    });
    setExportColumns(response ?? []);
  }, [config.documentProductType]);

  const loadExportPresets = useCallback(async () => {
    const response = await getInventoryDocumentsExportPresets({
      docType: DocType.ADJUSTMENT,
      productType: config.documentProductType,
    });
    setExportPresets((response ?? []).map((item) => ({
      metricId: item.metricId,
      name: item.name,
      columns: (item.snapshot?.columns ?? []) as Array<{ key: string; label: string }>,
    })));
  }, [config.documentProductType]);

  useEffect(() => {
    void loadExportColumns();
    void loadExportPresets();
  }, [loadExportColumns, loadExportPresets]);

  useEffect(() => {
    if (prefillHandledRef.current) return;
    const shouldOpen = searchParams.get("openAdjustmentModal") === "1";
    const skuId = searchParams.get("skuId")?.trim();
    if (!shouldOpen || !skuId) return;

    prefillHandledRef.current = true;
    setInitialAdjustmentSku({
      skuId,
      name: searchParams.get("skuName")?.trim() || undefined,
      backendSku: searchParams.get("backendSku")?.trim() || undefined,
      customSku: searchParams.get("customSku")?.trim() || undefined,
    });
    setOpenAdjustmentModal(true);
  }, [searchParams]);

  const smartSearchColumns = useMemo(
    () => buildInventoryDocumentsSmartSearchColumns(searchState, { docType: DocType.ADJUSTMENT }),
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
    () => buildInventoryDocumentsSearchChips(executedSnapshot, searchState, { docType: DocType.ADJUSTMENT }),
    [executedSnapshot, searchState],
  );

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPage(1);
    });
  }, [searchText]);

  const handleApplySnapshot = useCallback((snapshot: InventoryDocumentsSearchSnapshot) => {
    const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot, searchState, { docType: DocType.ADJUSTMENT });
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
            { docType: DocType.ADJUSTMENT },
          ),
          rule,
          searchState,
          { docType: DocType.ADJUSTMENT },
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
            { docType: DocType.ADJUSTMENT },
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
        { docType: DocType.ADJUSTMENT },
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
      { docType: DocType.ADJUSTMENT },
    );
    if (!hasInventoryDocumentsSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveInventoryDocumentsSearchMetric({
        name,
        docType: DocType.ADJUSTMENT,
        productType: config.documentProductType,
        snapshot,
      });
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
        return true;
      }

      showFlash(errorResponse(response.message));
      return false;
    } catch {
      showFlash(errorResponse("Error al guardar la metrica"));
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [appliedSearchText, config.documentProductType, loadSearchState, searchFilters, searchState, showFlash]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteInventoryDocumentsSearchMetric({
        metricId,
        docType: DocType.ADJUSTMENT,
        productType: config.documentProductType,
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
  }, [config.documentProductType, loadSearchState, showFlash]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getDocuments({
        page,
        limit,
        from: fromDate || undefined,
        to: toDate || undefined,
        docType: DocType.ADJUSTMENT,
        productType: config.documentProductType,
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
    config.documentProductType,
    executedSnapshot,
    loadSearchState,
  ]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const openDocumentPdf = (documentId: string) => {
    setSelectedDocumentId(documentId);
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
        hideable: true,
        sortable: false,
      },
      {
        id: "numero",
        header: "N. Documento",
        accessorKey: "numero",
        headerClassName: "text-left",
        className: "text-left",
        hideable: true,
        sortable: false,
      },
      {
        id: "warehouse",
        header: "Almacén",
        accessorKey: "fromWarehouse",
        headerClassName: "text-left",
        className: "text-left",
        hideable: true,
        sortable: false,
      },
      {
        id: "createdBy",
        header: "Usuario",
        accessorKey: "createdBy",
        headerClassName: "text-left",
        className: "text-left",
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
        accessorKey: "statusLabel",
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
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
        className: "text-left",
        hideable: true,
        sortable: false,
      },
    ];
  }, [handleProcessDocument, processingDocumentId]);

  const handleExport = useCallback(async (columnsToExport: Array<{ key: string; label: string }>) => {
    setExporting(true);
    try {
      const file = await exportInventoryDocumentsExcel({
        page,
        limit,
        docType: DocType.ADJUSTMENT,
        productType: config.documentProductType,
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
  }, [config.documentProductType, executedSnapshot.filters, executedSnapshot.q, fromDate, limit, page, showFlash, toDate, useTableDateRangeForExport]);

  const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: Array<{ key: string; label: string }> }) => {
    await saveInventoryDocumentsExportPreset({
      name: payload.name,
      columns: payload.columns,
      docType: DocType.ADJUSTMENT,
      productType: config.documentProductType,
      useDateRange: useTableDateRangeForExport,
    });
    await loadExportPresets();
  }, [config.documentProductType, loadExportPresets, useTableDateRangeForExport]);

  const handleDeleteExportPreset = useCallback(async (metricId: string) => {
    await deleteInventoryDocumentsExportPreset({
      metricId,
      docType: DocType.ADJUSTMENT,
      productType: config.documentProductType,
    });
    await loadExportPresets();
  }, [config.documentProductType, loadExportPresets]);

  return (
    <PageShell className="bg-white">
      <PageTitle title="Ajustes" />
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
            onClick={() => setOpenAdjustmentModal(true)}
            disabled={companyActionDisabled}
            title={companyActionTitle}
          >
            Crear ajuste
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

      <AdjustmentProductModal
        open={openAdjustmentModal}
        onClose={() => {
          handleClose();
          setInitialAdjustmentSku(null);
        }}
        onSaved={() => {
          setPage(1);
          void loadDocuments();
        }}
        loadDocuments={() => {
          setPage(1);
          void loadDocuments();
        }}
        type={config.productType}
        initialSku={initialAdjustmentSku}
      />
    </PageShell>
  );
}
