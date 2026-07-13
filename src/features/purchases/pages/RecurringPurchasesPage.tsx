import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  cancelRecurringPurchase,
  createRecurringPurchase,
  deleteRecurringPurchaseSearchMetric,
  deleteRecurringPurchaseExportPreset,
  exportRecurringPurchasesExcel,
  generateCurrentRecurringPayable,
  getRecurringPurchaseExportColumns,
  getRecurringPurchaseExportPresets,
  getRecurringPurchaseSearchState,
  listRecurringPurchases,
  pauseRecurringPurchase,
  resumeRecurringPurchase,
  saveRecurringPurchaseExportPreset,
  saveRecurringPurchaseSearchMetric,
} from "@/shared/services/recurringPurchaseService";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import { RecurringPurchaseFormModal } from "../components/recurrent/RecurringPurchaseFormModal";
import { RecurringPurchasePaymentModal } from "../components/recurrent/RecurringPurchasePaymentModal";
import { RecurringPurchaseSmartSearchPanel } from "../components/recurrent/RecurringPurchaseSmartSearchPanel";
import { RecurringPurchaseTable } from "../components/recurrent/RecurringPurchaseTable";
import { RecurringPurchaseTypesInfoModal } from "../components/recurrent/RecurringPurchaseTypesInfoModal";
import type {
  CreateRecurringPurchasePayload,
  ListRecurringPurchasesResponse,
  RecurringPurchase,
  RecurringPurchaseExportColumn,
  RecurringPurchaseSearchCatalogs,
  RecurringPurchaseSearchRule,
  RecurringPurchaseSearchSnapshot,
  RecurringPurchaseSearchStateResponse,
} from "../types/recurring-purchase.types";
import {
  buildRecurringPurchaseSearchChips,
  buildRecurringPurchaseSmartSearchColumns,
  createEmptyRecurringPurchaseSearchFilters,
  hasRecurringPurchaseSearchCriteria,
  removeRecurringPurchaseSearchKey,
  sanitizeRecurringPurchaseSearchSnapshot,
  upsertRecurringPurchaseSearchRule,
  type RecurringPurchaseSearchFilterKey,
} from "../utils/recurringPurchaseSmartSearch";

const DEFAULT_LIMIT = 25;

export default function RecurringPurchasesPage() {
  const { showFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canExportRecurringPurchases = can("recurring_purchases.export");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openRecurringTypesInfo, setOpenRecurringTypesInfo] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<RecurringPurchase | null>(null);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyRecurringPurchaseSearchFilters());
  const [searchState, setSearchState] = useState<RecurringPurchaseSearchStateResponse | null>(null);
  const [exportColumns, setExportColumns] = useState<RecurringPurchaseExportColumn[]>([]);
  const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: RecurringPurchaseExportColumn[] }>>([]);
  const [exporting, setExporting] = useState(false);
  const [savingMetric, setSavingMetric] = useState(false);
  const [items, setItems] = useState<RecurringPurchase[]>([]);
  const [pagination, setPagination] = useState<Pick<ListRecurringPurchasesResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const catalogs = useMemo<RecurringPurchaseSearchCatalogs>(
    () => searchState?.catalogs ?? { suppliers: [] },
    [searchState],
  );

  const draftSnapshot = useMemo(
    () => sanitizeRecurringPurchaseSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () => sanitizeRecurringPurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const smartSearchColumns = useMemo(
    () => buildRecurringPurchaseSmartSearchColumns(catalogs),
    [catalogs],
  );

  const searchChips = useMemo(
    () => buildRecurringPurchaseSearchChips(executedSnapshot, catalogs),
    [catalogs, executedSnapshot],
  );

  const loadSearchState = useCallback(async () => {
    try {
      setSearchState(await getRecurringPurchaseSearchState());
    } catch {
      showFeedback(errorResponse("Error al cargar el estado del buscador inteligente."));
    }
  }, [showFeedback]);

  const loadExportColumns = useCallback(async () => {
    try {
      setExportColumns(await getRecurringPurchaseExportColumns());
    } catch {
      showFeedback(errorResponse("Error al cargar columnas de exportacion."));
    }
  }, [showFeedback]);

  const loadExportPresets = useCallback(async () => {
    try {
      const response = await getRecurringPurchaseExportPresets();
      setExportPresets(
        (response ?? []).map((item) => ({
          metricId: item.metricId,
          name: item.name,
          columns: item.snapshot?.columns ?? [],
        })),
      );
    } catch {
      showFeedback(errorResponse("Error al cargar presets de exportacion."));
    }
  }, [showFeedback]);

  const loadRecurring = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRecurringPurchases({
        page: pagination.page,
        limit: DEFAULT_LIMIT,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? DEFAULT_LIMIT,
      });
      if (hasRecurringPurchaseSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setItems([]);
      showFeedback(errorResponse("No se pudo cargar compras recurrentes."));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, loadSearchState, pagination.page, showFeedback]);

  useEffect(() => {
    void loadRecurring();
  }, [loadRecurring]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    if (!canExportRecurringPurchases) return;
    void loadExportColumns();
    void loadExportPresets();
  }, [canExportRecurringPurchases, loadExportColumns, loadExportPresets]);

  const recentSearches = useMemo<DataTableRecentSearchItem<RecurringPurchaseSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<RecurringPurchaseSearchSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      })),
    [searchState],
  );

  const submitSearch = useCallback(() => {
    setAppliedSearchText(searchText.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchText]);

  const applySmartSnapshot = useCallback((snapshot: RecurringPurchaseSearchSnapshot) => {
    const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
    setSearchText(normalized.q ?? "");
    setAppliedSearchText(normalized.q ?? "");
    setSearchFilters(normalized.filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleApplySearchRule = useCallback((rule: RecurringPurchaseSearchRule) => {
    setSearchFilters((current) => {
      const next = upsertRecurringPurchaseSearchRule(
        sanitizeRecurringPurchaseSearchSnapshot({ q: searchText, filters: current }),
        rule,
      );
      return next.filters;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: RecurringPurchaseSearchFilterKey) => {
    setSearchFilters((current) => {
      const next = removeRecurringPurchaseSearchKey(
        sanitizeRecurringPurchaseSearchSnapshot({ q: searchText, filters: current }),
        fieldId,
      );
      return next.filters;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | RecurringPurchaseSearchFilterKey) => {
    const nextSnapshot = removeRecurringPurchaseSearchKey(
      sanitizeRecurringPurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    setSearchText(nextSnapshot.q ?? "");
    setAppliedSearchText(nextSnapshot.q ?? "");
    setSearchFilters(nextSnapshot.filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [appliedSearchText, searchFilters]);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizeRecurringPurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters });
    if (!hasRecurringPurchaseSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveRecurringPurchaseSearchMetric(name, snapshot);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadSearchState();
        return true;
      }
      showFeedback(errorResponse(response.message));
      return false;
    } catch {
      showFeedback(errorResponse("Error al guardar la metrica."));
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [appliedSearchText, loadSearchState, searchFilters, showFeedback]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteRecurringPurchaseSearchMetric(metricId);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadSearchState();
        return;
      }
      showFeedback(errorResponse(response.message));
    } catch {
      showFeedback(errorResponse("Error al eliminar la metrica."));
    }
  }, [loadSearchState, showFeedback]);

  const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: RecurringPurchaseExportColumn[] }) => {
    await saveRecurringPurchaseExportPreset(payload);
    await loadExportPresets();
    showFeedback(successResponse("Preset de exportacion guardado."));
  }, [loadExportPresets, showFeedback]);

  const handleDeleteExportPreset = useCallback(async (metricId: string) => {
    await deleteRecurringPurchaseExportPreset(metricId);
    await loadExportPresets();
    showFeedback(successResponse("Preset eliminado."));
  }, [loadExportPresets, showFeedback]);

  const handleExport = useCallback(async (columnsToExport: RecurringPurchaseExportColumn[]) => {
    setExporting(true);
    try {
      const file = await exportRecurringPurchasesExcel({
        columns: columnsToExport,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      showFeedback(successResponse("Excel exportado correctamente."));
    } catch {
      showFeedback(errorResponse("No se pudo exportar el Excel."));
    } finally {
      setExporting(false);
    }
  }, [executedSnapshot.filters, executedSnapshot.q, showFeedback]);

  const createTemplate = async (payload: CreateRecurringPurchasePayload) => {
    try {
      await createRecurringPurchase(payload);
      showFeedback(successResponse("Compra recurrente creada."));
      await loadRecurring();
    } catch {
      showFeedback(errorResponse("No se pudo crear la compra recurrente."));
    }
  };

  const runAction = async (
    item: RecurringPurchase,
    action: (id: string) => Promise<unknown>,
    successMessage: string,
    errorMessage: string,
  ) => {
    try {
      await action(item.recurringPurchaseTemplateId);
      showFeedback(successResponse(successMessage));
      await loadRecurring();
    } catch {
      showFeedback(errorResponse(errorMessage));
    }
  };

  const generatePayable = async (item: RecurringPurchase) => {
    try {
      const result = await generateCurrentRecurringPayable(item.recurringPurchaseTemplateId);
      showFeedback(
        successResponse(
          result.generated
            ? "Cuenta por pagar generada."
            : "La cuenta del periodo ya fue generada o aun no vence.",
        ),
      );
      await loadRecurring();
    } catch {
      showFeedback(errorResponse("No se pudo generar la cuenta por pagar."));
    }
  };

  return (
    <PageShell>
      <PageTitle title="Compras recurrentes" />
      <div className="flex flex-col gap-4">
        <PageActionsRow>
          <SystemButton
            className="w-9"
            size="sm"
            variant="outline"
            leftIcon={<AlertCircle className="h-4 w-4" />}
            onClick={() => setOpenRecurringTypesInfo(true)}
            aria-label="Ver tipos recurrentes"
          />
          {canExportRecurringPurchases && exportColumns.length ? (
            <ExportPopover
              columns={exportColumns}
              loading={exporting}
              presets={exportPresets}
              onSavePreset={handleSaveExportPreset}
              onDeletePreset={handleDeleteExportPreset}
              onExport={handleExport}
            />
          ) : null}
          {can("recurring_purchases.create") ? (
            <SystemButton onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva recurrente
            </SystemButton>
          ) : null}
        </PageActionsRow>

        <DataTableSearchChips
          chips={searchChips}
          onRemove={(chip) => handleRemoveChip(chip.removeKey)}
        />

        <RecurringPurchaseTable
          items={items}
          loading={loading}
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPause={(item) =>
            void runAction(item, pauseRecurringPurchase, "Recurrencia pausada.", "No se pudo pausar.")
          }
          onResume={(item) =>
            void runAction(item, resumeRecurringPurchase, "Recurrencia reanudada.", "No se pudo reanudar.")
          }
          onCancel={(item) =>
            void runAction(item, cancelRecurringPurchase, "Recurrencia cancelada.", "No se pudo cancelar.")
          }
          onGenerate={(item) => void generatePayable(item)}
          onRegisterPayment={(item) => setPaymentTarget(item)}
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={setSearchText}
              onSubmitSearch={submitSearch}
              searchLabel="Busca recurrente"
              searchName="recurring-purchase-smart-search"
              canSaveMetric={hasRecurringPurchaseSearchCriteria(executedSnapshot)}
              saveLoading={savingMetric}
              onSaveMetric={handleSaveMetric}
            >
              <RecurringPurchaseSmartSearchPanel
                columns={smartSearchColumns}
                snapshot={draftSnapshot}
                recent={recentSearches}
                saved={savedMetrics}
                catalogs={catalogs}
                filterQuery={searchText}
                onApplySnapshot={applySmartSnapshot}
                onApplyRule={handleApplySearchRule}
                onRemoveRule={handleRemoveSearchRule}
                onDeleteMetric={handleDeleteMetric}
              />
            </DataTableSearchBar>
          }
          permissions={{
            canPause: can("recurring_purchases.pause"),
            canCancel: can("recurring_purchases.cancel"),
            canGenerate: can("recurring_purchases.pay"),
            canRegisterPayment: can("recurring_purchases.register_payment"),
          }}
        />
      </div>

      <RecurringPurchaseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createTemplate}
      />

      <RecurringPurchaseTypesInfoModal
        open={openRecurringTypesInfo}
        onClose={() => setOpenRecurringTypesInfo(false)}
      />

      <RecurringPurchasePaymentModal
        open={Boolean(paymentTarget)}
        item={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSaved={() => {
          showFeedback(successResponse("Pago recurrente registrado."));
          void loadRecurring();
        }}
        canUploadEvidence={can("recurring_purchases.upload_payment_evidence")}
      />
    </PageShell>
  );
}
