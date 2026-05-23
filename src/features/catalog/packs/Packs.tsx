import { startTransition, useCallback, useEffect, useMemo, useRef, useState , type MouseEvent } from "react";
import { Menu, Plus, Pencil, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { PageShell } from "@/shared/layouts/PageShell";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { StatusPill } from "@/shared/components/components/StatusTag";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import type { PackListEntry, PackRow } from "@/features/catalog/types/pack";
import type { PackSearchRule, PackSearchSnapshot, PackSearchStateResponse } from "@/features/catalog/types/packSearch";
import { PackSmartSearchPanel } from "@/features/catalog/components/PackSmartSearchPanel";
import {
  buildPackSearchChips,
  hasPackSearchCriteria,
  removePackSearchKey,
  sanitizePackSearchSnapshot,
  upsertPackSearchRule,
  type PackSearchFilterKey,
} from "@/features/catalog/utils/packSmartSearch";
import {
  createPack,
  deletePackSearchMetric,
  getPackById,
  getPackSearchState,
  listPacks,
  savePackSearchMetric,
  updatePack,
  updatePackActive,
} from "@/shared/services/packService";
import { PackFormModal } from "@/features/catalog/packs/components/PackFormModal";
import { ModalDetailPack } from "@/features/catalog/packs/components/ModalDetailPack";
import type { PackDetailResponse } from "@/features/catalog/types/pack";

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

function mapListEntryToRow(entry: PackListEntry): PackRow {
  const pack = entry.pack;
  const packId = typeof pack.packId === "string" ? pack.packId : pack.packId?.value ?? "";
  const items = entry.items ?? [];
  const preview = items.slice(0, 3).map(buildSkuLabelFromDetailItem);

  return {
    packId,
    description: pack.description,
    total: pack.total,
    isActive: pack.isActive,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
    itemsPreview: preview,
    itemsCount: items.length,
  };
}
const buildSkuLabelFromDetailItem = (
  item: PackDetailResponse["items"][number],
) => {
  const name = item.sku?.name?.trim() || "SKU";

  const attrsText = (item.sku?.attributes ?? [])
    .map((attr) => attr.value?.trim())
    .filter(Boolean)
    .join(" ");

  const code = item.sku?.backendSku || item.sku?.customSku || item.skuId;
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  const codePart = code ? ` (${code})` : "";

  return `${name}${attrsPart}${codePart},`.trim();
};

export default function CatalogPacks() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);
  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const [items, setItems] = useState<PackRow[]>([]);
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
  const [searchFilters, setSearchFilters] = useState<PackSearchRule[]>(() => []);
  const [searchState, setSearchState] = useState<PackSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editPackId, setEditPackId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editDetail, setEditDetail] = useState<PackDetailResponse | null>(null);
  const [updating, setUpdating] = useState(false);
  const [detailPackId, setDetailPackId] = useState<string | null>(null);

  const [togglePackId, setTogglePackId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const draftSnapshot = useMemo<PackSearchSnapshot>(
    () => sanitizePackSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<PackSearchSnapshot>(
    () => sanitizePackSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<PackSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<PackSearchSnapshot>[]>(
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
      const response = await getPackSearchState();
      setSearchState(response);
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, []);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    clearFeedback();

    try {
      const response = await listPacks({
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
        page,
        limit,
      });

      const mapped = (response.items ?? []).map(mapListEntryToRow);
      setItems(mapped);

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

      if (hasPackSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch (error: unknown) {
      setItems([]);
      showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudieron cargar los packs.")));
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, executedSnapshot, limit, loadSearchState, page]);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    if (!editPackId) {
      setEditDetail(null);
      return;
    }

    let cancelled = false;
    setEditLoading(true);

    void (async () => {
      try {
        const response = await getPackById(editPackId);
        if (cancelled) return;
        setEditDetail(response);
      } catch (error: unknown) {
        if (!cancelled) {
          showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudo cargar el pack.")));
          setEditDetail(null);
          setEditPackId(null);
        }
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editPackId]);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, [searchText]);

  const searchCatalogs = useMemo(() => searchState?.catalogs ?? null, [searchState]);

  const searchChips = useMemo(
    () => buildPackSearchChips(executedSnapshot, searchCatalogs),
    [executedSnapshot, searchCatalogs],
  );

  const applyPackSnapshotToForm = useCallback((snapshot: PackSearchSnapshot) => {
    const normalized = sanitizePackSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, []);

  const handleApplySearchRule = useCallback(
    (rule: PackSearchRule) => {
      startTransition(() => {
        const next = upsertPackSearchRule(sanitizePackSearchSnapshot({ q: searchText, filters: searchFilters }), rule);
        setSearchFilters(next.filters);
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchFilters, searchText],
  );

  const handleRemoveSearchRule = useCallback(
    (fieldId: "q" | PackSearchFilterKey) => {
      startTransition(() => {
        const next = removePackSearchKey(sanitizePackSearchSnapshot({ q: searchText, filters: searchFilters }), fieldId);
        setSearchText(next.q ?? "");
        setSearchFilters(next.filters);
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchFilters, searchText],
  );

  const canSaveMetric = useMemo(
    () => hasPackSearchCriteria(executedSnapshot) && !savingMetric,
    [executedSnapshot, savingMetric],
  );

  const handleSaveMetric = useCallback(
    async (name: string) => {
      const snapshot = sanitizePackSearchSnapshot({ q: appliedSearchText, filters: searchFilters });
      if (!hasPackSearchCriteria(snapshot)) return false;

      setSavingMetric(true);
      try {
        const response = await savePackSearchMetric(name, snapshot);
        if (response.type === "success") {
          showFeedback(successResponse(response.message || "Métrica guardada"));
          await loadSearchState();
          return true;
        }
        showFeedback(errorResponse(response.message || "No se pudo guardar la métrica"));
        return false;
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "Error al guardar la métrica")));
        return false;
      } finally {
        setSavingMetric(false);
      }
    },
    [appliedSearchText, loadSearchState, searchFilters, showFeedback],
  );

  const handleDeleteMetric = useCallback(
    async (metricId: string) => {
      clearFeedback();
      try {
        const response = await deletePackSearchMetric(metricId);
        if (response.type === "success") {
          showFeedback(successResponse(response.message || "Métrica eliminada"));
          await loadSearchState();
          return;
        }
        showFeedback(errorResponse(response.message || "No se pudo eliminar la métrica"));
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo eliminar la métrica.")));
      }
    },
    [clearFeedback, loadSearchState, showFeedback],
  );

  const handleCreatePack = useCallback(
    async (payload: Parameters<typeof createPack>[0]) => {
      setCreating(true);
      clearFeedback();
      try {
        const response = await createPack(payload);
        showFeedback(successResponse(response.message || "Pack creado con éxito"));
        setOpenCreate(false);
        await loadPacks();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo crear el pack.")));
      } finally {
        setCreating(false);
      }
    },
    [clearFeedback, loadPacks, showFeedback],
  );

  const handleUpdatePack = useCallback(
    async (id: string, payload: Parameters<typeof updatePack>[1]) => {
      if (updating) return;
      setUpdating(true);
      clearFeedback();
      try {
        const response = await updatePack(id, payload);
        showFeedback(successResponse(response.message || "Pack actualizado con éxito"));
        setEditPackId(null);
        await loadPacks();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el pack.")));
      } finally {
        setUpdating(false);
      }
    },
    [clearFeedback, loadPacks, showFeedback, updating],
  );

  const packPendingToggle = useMemo(
    () => (togglePackId ? items.find((row) => row.packId === togglePackId) ?? null : null),
    [items, togglePackId],
  );

  const confirmToggleActive = useCallback(async () => {
    if (!togglePackId || togglingStatus) return;

    clearFeedback();
    setTogglingStatus(true);

    try {
      const nextActive = !Boolean(packPendingToggle?.isActive);
      const response = await updatePackActive(togglePackId, { isActive: nextActive });
      showFeedback(successResponse(response.message || "Estado actualizado"));
      setTogglePackId(null);
      await loadPacks();
    } catch (error: unknown) {
      showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el estado del pack.")));
    } finally {
      setTogglingStatus(false);
    }
  }, [clearFeedback, loadPacks, packPendingToggle?.isActive, showFeedback, togglePackId, togglingStatus]);

  const handlePageChange = useCallback((nextPage: number) => {
    setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(nextPage - 1, 0) }));
  }, []);

  const columns = useMemo<DataTableColumn<PackRow>[]>(
    () => [
      {
        id: "description",
        header: "Descripción",
        cell: (row) => (
          <div className="min-w-0">
            <div className="truncate text-black/80">{row.description}</div>
            {row.itemsPreview.length ? (
              <div className="mt-0.5 truncate text-[10px] text-black/45">
                {row.itemsPreview.join(" · ")}
                {row.itemsCount > row.itemsPreview.length
                  ? ` · +${row.itemsCount - row.itemsPreview.length} más`
                  : ""}
              </div>
            ) : null}
          </div>
        ),
        className: "text-black/80",
      },
      {
        id: "total",
        header: "Total",
        cell: (row) => <span className="tabular-nums font-semibold">{row.total.toFixed(2)}</span>,
        className: "tabular-nums",
      },
      {
        id: "isActive",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
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
                onClick: () => setEditPackId(row.packId),
              },
              {
                id: "toggle",
                label: row.isActive ? "Desactivar" : "Reactivar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                className: row.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setTogglePackId(row.packId),
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
      }
    ],
    [],
  );

  return (
    <PageShell>
      <PageTitle title="Packs" />

      <PageActionsRow>
        <div className="flex flex-wrap items-center gap-2">
          <SystemButton
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpenCreate(true)}
            style={{
              backgroundColor: PRIMARY,
              borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
              boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
            }}
          >
            Crear pack
          </SystemButton>
        </div>
      </PageActionsRow>

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => {
          handleRemoveSearchRule(chip.removeKey);
        }}
      />

      <DataTable
        tableId="packs-table"
        data={items}
        columns={columns}
        rowKey="packId"
        loading={loading}
        emptyMessage="No hay packs con los filtros actuales."
        selectableColumns
        hoverable={false}
        animated={false}
        onRowClick={(row) => setDetailPackId(row.packId)}
        toolbarSearchContent={
          <DataTableSearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmitSearch={submitSearch}
            searchLabel="Buscar packs..."
            searchName="pack-smart-search"
            canSaveMetric={canSaveMetric}
            saveLoading={savingMetric}
            onSaveMetric={handleSaveMetric}
          >
            <PackSmartSearchPanel
              recent={recentSearches}
              saved={savedMetrics}
              snapshot={draftSnapshot}
              catalogs={searchCatalogs}
              filterQuery={searchText}
              onApplySnapshot={applyPackSnapshotToForm}
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

      <PackFormModal
        open={openCreate}
        onClose={() => {
          if (creating) return;
          setOpenCreate(false);
        }}
        onSubmit={(payload) => void handleCreatePack(payload)}
        primaryColor={PRIMARY}
        loading={creating}
      />

      <PackFormModal
        mode="edit"
        open={Boolean(editPackId)}
        detail={editDetail}
        detailLoading={editLoading}
        onClose={() => {
          if (updating || editLoading) return;
          setEditPackId(null);
        }}
        onSubmit={(payload) => {
          if (!editPackId) return;
          void handleUpdatePack(editPackId, payload);
        }}
        primaryColor={PRIMARY}
        loading={updating}
      />

      <AlertModal
        open={Boolean(togglePackId)}
        type={packPendingToggle?.isActive ? "warning" : "restore"}
        title={packPendingToggle?.isActive ? "Desactivar pack" : "Reactivar pack"}
        message={
          packPendingToggle?.isActive
            ? "Estas por desactivar este pack. Hazlo solo si estas seguro."
            : "Estas por reactivar este pack. Hazlo solo si estas seguro."
        }
        confirmText={packPendingToggle?.isActive ? "Desactivar" : "Reactivar"}
        loading={togglingStatus}
        onClose={() => {
          if (togglingStatus) return;
          setTogglePackId(null);
        }}
        onConfirm={() => {
          void confirmToggleActive();
        }}
      />

      <ModalDetailPack
        open={Boolean(detailPackId)}
        packId={detailPackId}
        primaryColor={PRIMARY}
        onClose={() => setDetailPackId(null)}
      />
    </PageShell>
  );
}
