import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { StatusPill } from "@/shared/components/components/StatusTag";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { PageShell } from "@/shared/layouts/PageShell";
import { SourceFormModal } from "@/features/sources/components/SourceFormModal";
import { SourceSmartSearchPanel } from "@/features/sources/components/SourceSmartSearchPanel";
import { ModalDetailSource } from "@/features/sources/components/ModalDetailSource";
import type { Source, SourceForm } from "@/features/sources/types/source";
import type { SourceDetail, SourceListItem } from "@/features/sources/types/sourceApi";
import type { SourceSearchRule, SourceSearchSnapshot, SourceSearchStateResponse } from "@/features/sources/types/sourceSearch";
import {
  createSource,
  deleteSourceSearchMetric,
  getSourceById,
  getSourceSearchState,
  listSources,
  saveSourceSearchMetric,
  updateSource,
  updateSourceActive,
} from "@/shared/services/sourceService";
import {
  applySourceSearchRule,
  buildSourceSearchChips,
  removeSourceSearchKey,
  sanitizeSourceSearchSnapshot,
  type SourceSearchFilterKey,
} from "@/features/sources/utils/sourceSmartSearch";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;

type BackendErrorPayload = {
  message?: string | string[];
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<BackendErrorPayload>(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.find(Boolean) ?? fallback;
  return message || fallback;
}

function mapListItemToSource(item: SourceListItem): Source {
  return {
    id: item.id,
    name: item.name,
    detail: item.detail ?? null,
    isActive: item.isActive,
  };
}

function mapDetailToSource(detail: SourceDetail): Source {
  return {
    id: detail.id,
    name: detail.name,
    detail: detail.detail ?? null,
    isActive: detail.isActive,
  };
}

export default function Sources() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);
  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const { can } = usePermissions();
  const canManageSources = can("sources.manage");

  const [items, setItems] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  const [serverPagination, setServerPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });

  const page = paginationState.pageIndex + 1;
  const limit = paginationState.pageSize;

  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchState, setSearchState] = useState<SourceSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SourceSearchRule[]>(() => []);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [detailSourceId, setDetailSourceId] = useState<string | null>(null);

  const [toggleSourceId, setToggleSourceId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const draftSnapshot = useMemo<SourceSearchSnapshot>(
    () => sanitizeSourceSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<SourceSearchSnapshot>(
    () => sanitizeSourceSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<SourceSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<SourceSearchSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      })),
    [searchState],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getSourceSearchState();
      setSearchState(response);
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, []);

  const loadSources = useCallback(async () => {
    setLoading(true);
    clearFeedback();

    try {
      const response = await listSources({
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
        page,
        limit,
      });

      setItems((response.items ?? []).map(mapListItemToSource));

      const total = response.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / (response.limit ?? limit)));
      const currentPage = response.page ?? page;
      const currentLimit = response.limit ?? limit;

      setServerPagination({
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
      });

      if (executedSnapshot.q || executedSnapshot.filters.length) {
        void loadSearchState();
      }
    } catch (error: unknown) {
      setItems([]);
      showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudieron cargar las campañas.")));
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, executedSnapshot, limit, loadSearchState, page]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    if (!editingSourceId) {
      setEditingSource(null);
      return;
    }

    let cancelled = false;
    setEditingLoading(true);

    void (async () => {
      try {
        const detail = await getSourceById(editingSourceId);
        if (cancelled) return;
        setEditingSource(mapDetailToSource(detail));
      } catch (error: unknown) {
        if (!cancelled) {
          showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudo cargar la campaña.")));
          setEditingSource(null);
          setEditingSourceId(null);
        }
      } finally {
        if (!cancelled) setEditingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingSourceId]);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, [searchText]);

  const searchCatalogs = searchState?.catalogs ?? null;

  const searchChips = useMemo(
    () => buildSourceSearchChips(executedSnapshot, searchCatalogs),
    [executedSnapshot, searchCatalogs],
  );

  const applySmartSnapshot = useCallback((snapshot: SourceSearchSnapshot) => {
    startTransition(() => {
      const normalized = sanitizeSourceSearchSnapshot(snapshot);
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, []);

  const handleApplySearchRule = useCallback(
    (rule: SourceSearchRule) => {
      startTransition(() => {
        setSearchFilters((current) => {
          const next = applySourceSearchRule(sanitizeSourceSearchSnapshot({ q: searchText, filters: current }), rule);
          return next.filters;
        });
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchText],
  );

  const handleRemoveSearchRule = useCallback(
    (fieldId: "q" | SourceSearchFilterKey) => {
      startTransition(() => {
        if (fieldId === "q") {
          setSearchText("");
          setAppliedSearchText("");
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
          return;
        }

        setSearchFilters((current) => {
          const next = removeSourceSearchKey(sanitizeSourceSearchSnapshot({ q: searchText, filters: current }), fieldId);
          return next.filters;
        });

        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchText],
  );

  const canSaveMetric = Boolean(draftSnapshot.q || draftSnapshot.filters.length) && !savingMetric;

  const handleSaveMetric = useCallback(
    async (name: string) => {
      if (!canSaveMetric || savingMetric) return false;

      clearFeedback();
      setSavingMetric(true);

      try {
        const response = await saveSourceSearchMetric(name, draftSnapshot);
        showFeedback(successResponse(response.message || "Métrica guardada"));
        await loadSearchState();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo guardar la métrica.")));
        return false;
      } finally {
        setSavingMetric(false);
      }
    },
    [canSaveMetric, clearFeedback, draftSnapshot, loadSearchState, savingMetric, showFeedback],
  );

  const handleDeleteMetric = useCallback(
    async (metricId: string) => {
      clearFeedback();
      try {
        const response = await deleteSourceSearchMetric(metricId);
        showFeedback(successResponse(response.message || "Métrica eliminada"));
        await loadSearchState();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo eliminar la métrica.")));
      }
    },
    [clearFeedback, loadSearchState, showFeedback],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(nextPage - 1, 0) }));
  }, []);

  const startCreate = useCallback(() => {
    setOpenCreate(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (form: SourceForm) => {
      if (!canManageSources) return;

      clearFeedback();

      try {
        const payload = {
          name: form.name.trim(),
          detail: form.detail.trim() || undefined,
          isActive: form.isActive,
        };

        const response = await createSource(payload);
        showFeedback(successResponse(response.message || "Campaña creada con éxito"));
        setOpenCreate(false);
        await loadSources();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo crear la campaña.")));
      }
    },
    [canManageSources, clearFeedback, loadSources, showFeedback],
  );

  const handleEditSubmit = useCallback(
    async (form: SourceForm) => {
      if (!canManageSources || !editingSourceId) return;

      clearFeedback();

      try {
        const payload = {
          name: form.name.trim(),
          detail: form.detail.trim() || undefined,
        };

        const response = await updateSource(editingSourceId, payload);
        showFeedback(successResponse(response.message || "Campaña actualizada con éxito"));
        setEditingSourceId(null);
        await loadSources();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar la campaña.")));
      }
    },
    [canManageSources, clearFeedback, editingSourceId, loadSources, showFeedback],
  );

  const sourcePendingToggle = useMemo(
    () => (toggleSourceId ? items.find((row) => row.id === toggleSourceId) ?? null : null),
    [items, toggleSourceId],
  );

  const confirmToggleActive = useCallback(async () => {
    if (!canManageSources || !toggleSourceId || togglingStatus) return;

    clearFeedback();
    setTogglingStatus(true);

    try {
      const nextActive = !Boolean(sourcePendingToggle?.isActive);
      const response = await updateSourceActive(toggleSourceId, { isActive: nextActive });
      showFeedback(successResponse(response.message || "Estado actualizado"));
      setToggleSourceId(null);
      await loadSources();
    } catch (error: unknown) {
      showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el estado de la campaña.")));
    } finally {
      setTogglingStatus(false);
    }
  }, [canManageSources, clearFeedback, loadSources, showFeedback, sourcePendingToggle?.isActive, toggleSourceId, togglingStatus]);

  const columns = useMemo<DataTableColumn<Source>[]>(
    () => [
      {
        id: "name",
        header: "Nombre",
        accessorKey: "name",
        cell: (row) => <span className="text-black/70">{row.name}</span>,
        className: "text-black/70",
      },
      {
        id: "detail",
        header: "Detalle",
        cell: (row) => <span className="text-black/70">{row.detail ?? "—"}</span>,
        className: "text-black/70",
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
        sortAccessor: (row) => row.isActive,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        cell: (row) => (
          <ActionsPopover
            actions={[
              {
                id: "edit",
                label: "Editar",
                icon: <Pencil className="h-4 w-4 text-black/60" />,
                hidden: !canManageSources,
                onClick: () => setEditingSourceId(row.id),
              },
              {
                id: "toggle",
                label: row.isActive ? "Eliminar" : "Restaurar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                hidden: !canManageSources,
                className: row.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setToggleSourceId(row.id),
              },
            ]}
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
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition",
                  action.danger ? "text-rose-700 hover:bg-rose-50" : "",
                ].join(" ")}
                disabled={action.disabled}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
              </button>
            )}
          />
        ),
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center text-black/70",
        showInCards: false,
      },
    ],
    [canManageSources],
  );

  const actionTitle = canManageSources ? undefined : "Sin permisos para gestionar enganches.";

  return (
    <PageShell>
      <PageActionsRow>
        <SystemButton
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={startCreate}
          style={{
            backgroundColor: PRIMARY,
            borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
            boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
          }}
          disabled={!canManageSources}
          title={actionTitle}
        >
          Crear enganche
        </SystemButton>
      </PageActionsRow>

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => {
          handleRemoveSearchRule(chip.removeKey);
        }}
      />

      <DataTable
        tableId="sources-table"
        data={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        emptyMessage="No hay enganches con los filtros actuales."
        selectableColumns
        hoverable={false}
        animated={false}
        onRowClick={(row) => setDetailSourceId(row.id)}
        toolbarSearchContent={
          <DataTableSearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmitSearch={submitSearch}
            searchLabel="Busca tu enganche"
            searchName="source-smart-search"
            canSaveMetric={canSaveMetric}
            saveLoading={savingMetric}
            onSaveMetric={handleSaveMetric}
          >
            <SourceSmartSearchPanel
              recent={recentSearches}
              saved={savedMetrics}
              snapshot={draftSnapshot}
              catalogs={searchCatalogs}
              filterQuery={searchText}
              onApplySnapshot={applySmartSnapshot}
              onApplyRule={handleApplySearchRule}
              onRemoveRule={handleRemoveSearchRule}
              onDeleteMetric={handleDeleteMetric}
            />
          </DataTableSearchBar>
        }
        pagination={{
          page: serverPagination.page,
          limit: serverPagination.limit,
          total: serverPagination.total,
        }}
        onPageChange={handlePageChange}
        tableClassName="text-[10px]"
      />

      <SourceFormModal
        open={openCreate && canManageSources}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSubmit={(form) => {
          void handleCreateSubmit(form);
        }}
        primaryColor={PRIMARY}
      />

      <SourceFormModal
        open={Boolean(editingSourceId) && canManageSources}
        mode="edit"
        source={editingSource}
        loading={editingLoading}
        onClose={() => setEditingSourceId(null)}
        onSubmit={(form) => {
          void handleEditSubmit(form);
        }}
        primaryColor={PRIMARY}
      />

      <AlertModal
        open={Boolean(toggleSourceId) && canManageSources}
        type={sourcePendingToggle?.isActive ? "warning" : "restore"}
        title={sourcePendingToggle?.isActive ? "Eliminar enganche" : "Restaurar enganche"}
        message={
          sourcePendingToggle?.isActive
            ? "Estas por eliminar este enganche. Hazlo solo si estas seguro."
            : "Estas por restaurar este enganche. Hazlo solo si estas seguro."
        }
        confirmText={sourcePendingToggle?.isActive ? "Eliminar" : "Restaurar"}
        loading={togglingStatus}
        onClose={() => {
          if (togglingStatus) return;
          setToggleSourceId(null);
        }}
        onConfirm={() => {
          void confirmToggleActive();
        }}
      />

      <ModalDetailSource open={Boolean(detailSourceId)} sourceId={detailSourceId} onClose={() => setDetailSourceId(null)} />
    </PageShell>
  );
}

