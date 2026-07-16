import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, Sheet } from "lucide-react";
import { isAxiosError } from "axios";
import { AlertModal } from "@/shared/components/components/AlertModal";
import type { DataTableColumn } from "@/shared/components/table/types";
import { DataTable } from "@/shared/components/table/DataTable";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { PageShell } from "@/shared/layouts/PageShell";
import { AgencyFormModal } from "@/features/agencies/components/AgencyFormModal";
import { AgencySmartSearchPanel } from "@/features/agencies/components/AgencySmartSearchPanel";
import { ExcelImportModal } from "@/shared/components/importer";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import { agencyImportFields } from "@/features/agencies/types/agencyImporter";
import type { Agency, AgencyForm } from "@/features/agencies/types/agency";
import type {
  AgencyDetail,
  AgencyExportColumn,
  AgencyJsonImportRow,
  AgencyListItem,
} from "@/features/agencies/types/agencyApi";
import type {
  AgencySearchRule,
  AgencySearchSnapshot,
  AgencySearchStateResponse,
} from "@/features/agencies/types/agencySearch";
import {
  createAgency,
  deleteAgencyExportPreset,
  deleteAgencySearchMetric,
  exportAgenciesExcel,
  getAgencyExportColumns,
  getAgencyExportPresets,
  getAgencySearchState,
  getAgencyWithSubsidiaries,
  importCreateAgencies,
  listAgencies,
  listSubsidiaries,
  saveAgencyExportPreset,
  saveAgencySearchMetric,
  updateAgency,
  updateAgencyActive,
} from "@/shared/services/agencyService";
import {
  applyAgencySearchRuleWithDependencies,
  buildAgencySearchChips,
  removeAgencySearchKeyWithDependencies,
  sanitizeAgencySearchSnapshot,
  type AgencySearchFilterKey,
} from "@/features/agencies/utils/agencySmartSearch";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 25;

type BackendErrorPayload = {
  message?: string | string[];
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<BackendErrorPayload>(error)) return fallback;

  const message = error.response?.data?.message;

  if (Array.isArray(message)) return message.find(Boolean) ?? fallback;

  return message || fallback;
}

function mapListItemToAgency(item: AgencyListItem): Agency {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    isActive: item.isActive,
    subsidiaries: item.subsidiaries ?? [],
  };
}

function mapDetailToAgency(detail: AgencyDetail): Agency {
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description ?? null,
    isActive: detail.isActive,
    subsidiaries: detail.subsidiaries ?? [],
  };
}

function mapFormToSubsidiariesPayload(form: AgencyForm) {
  return form.subsidiaries.map((subsidiary) => {
    const basePrice =
      typeof subsidiary.basePrice === "number"
        ? subsidiary.basePrice
        : Number(subsidiary.basePrice || 0);

    return {
      id: subsidiary.id,
      alias: subsidiary.alias.trim(),
      departmentId: subsidiary.departmentId,
      provinceId: subsidiary.provinceId,
      districtId: subsidiary.districtId,
      address: subsidiary.address.trim() || undefined,
      basePrice: Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : 0,
      note: subsidiary.note.trim() || undefined,
      isActive: subsidiary.isActive,
    };
  });
}

export default function Agencies() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);

  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const { can } = usePermissions();
  const canManageAgencies = can("agencies.manage");
  const [items, setItems] = useState<Agency[]>([]);
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
  const [searchState, setSearchState] = useState<AgencySearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [searchFilters, setSearchFilters] = useState<AgencySearchRule[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportColumns, setExportColumns] = useState<AgencyExportColumn[]>([]);
  const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: AgencyExportColumn[] }>>([]);
  const [exporting, setExporting] = useState(false);

  const [toggleAgencyId, setToggleAgencyId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const draftSnapshot = useMemo<AgencySearchSnapshot>(
    () => sanitizeAgencySearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<AgencySearchSnapshot>(
    () => sanitizeAgencySearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<AgencySearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<AgencySearchSnapshot>[]>(
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
      const response = await getAgencySearchState();
      setSearchState(response);
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, []);

  const loadExportColumns = useCallback(async () => {
    try {
      setExportColumns(await getAgencyExportColumns());
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar columnas de exportacion."));
    }
  }, []);

  const loadExportPresets = useCallback(async () => {
    try {
      const response = await getAgencyExportPresets();
      setExportPresets((response ?? []).map((item) => ({
        metricId: item.metricId,
        name: item.name,
        columns: item.snapshot?.columns ?? [],
      })));
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar presets de exportacion."));
    }
  }, []);

  const loadAgencies = useCallback(async () => {
    setLoading(true);
    clearFeedback();

    try {
      const response = await listAgencies({
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
        page,
        limit,
      });

      const agencies = await Promise.all(
        (response.items ?? []).map(async (item) => {
          if (item.subsidiaries !== undefined) {
            return mapListItemToAgency(item);
          }

          try {
            const subsidiaries = await listSubsidiaries({ agencyId: item.id });
            return mapListItemToAgency({ ...item, subsidiaries });
          } catch {
            return mapListItemToAgency(item);
          }
        }),
      );

      setItems(agencies);

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
      showFeedbackRef.current(
        errorResponse(extractErrorMessage(error, "No se pudieron cargar las agencias.")),
      );
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, executedSnapshot, limit, loadSearchState, page]);

  useEffect(() => {
    void loadAgencies();
  }, [loadAgencies]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    void loadExportColumns();
  }, [loadExportColumns]);

  useEffect(() => {
    void loadExportPresets();
  }, [loadExportPresets]);

  useEffect(() => {
    if (!editingAgencyId) {
      setEditingAgency(null);
      return;
    }

    let cancelled = false;
    setEditingLoading(true);

    void (async () => {
      try {
        const detail = await getAgencyWithSubsidiaries(editingAgencyId);
        if (cancelled) return;
        setEditingAgency(mapDetailToAgency(detail));
      } catch (error: unknown) {
        if (!cancelled) {
          showFeedbackRef.current(
            errorResponse(extractErrorMessage(error, "No se pudo cargar la agencia.")),
          );
          setEditingAgency(null);
          setEditingAgencyId(null);
        }
      } finally {
        if (!cancelled) setEditingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingAgencyId]);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, [searchText]);

  const searchCatalogs = useMemo(() => searchState?.catalogs ?? null, [searchState]);

  const searchChips = useMemo(
    () => buildAgencySearchChips(executedSnapshot, searchCatalogs),
    [executedSnapshot, searchCatalogs],
  );

  const applySmartSnapshot = useCallback((snapshot: AgencySearchSnapshot) => {
    const normalized = sanitizeAgencySearchSnapshot(snapshot);

    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, []);

  const handleApplySearchRule = useCallback(
    (rule: AgencySearchRule) => {
      startTransition(() => {
        setSearchFilters((current) => {
          const next = applyAgencySearchRuleWithDependencies(
            sanitizeAgencySearchSnapshot({ q: searchText, filters: current }),
            rule,
          );

          return next.filters;
        });

        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchText],
  );

  const handleRemoveSearchRule = useCallback(
    (fieldId: "q" | AgencySearchFilterKey) => {
      startTransition(() => {
        if (fieldId === "q") {
          setSearchText("");
          setAppliedSearchText("");
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
          return;
        }

        setSearchFilters((current) => {
          const next = removeAgencySearchKeyWithDependencies(
            sanitizeAgencySearchSnapshot({ q: searchText, filters: current }),
            fieldId,
          );

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
        const response = await saveAgencySearchMetric(name, draftSnapshot);
        showFeedback(successResponse(response.message || "Metrica guardada"));
        await loadSearchState();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo guardar la metrica.")));
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
        const response = await deleteAgencySearchMetric(metricId);
        showFeedback(successResponse(response.message || "Metrica eliminada"));
        await loadSearchState();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo eliminar la metrica.")));
      }
    },
    [clearFeedback, loadSearchState, showFeedback],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: Math.max(nextPage - 1, 0),
    }));
  }, []);

  const handleCreateSubmit = useCallback(
    async (form: AgencyForm) => {
      if (!canManageAgencies) return;

      clearFeedback();

      try {
        const response = await createAgency({
          name: form.name.trim(),
          description: form.description?.trim() || null,
          isActive: form.isActive,
          subsidiaries: mapFormToSubsidiariesPayload(form),
        });

        showFeedback(successResponse(response.message || "Agencia creada con exito"));
        setOpenCreate(false);
        await loadAgencies();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo crear la agencia.")));
      }
    },
    [canManageAgencies, clearFeedback, loadAgencies, showFeedback],
  );

  const handleEditSubmit = useCallback(
    async (form: AgencyForm) => {
      if (!canManageAgencies || !editingAgencyId) return;

      clearFeedback();

      try {
        const response = await updateAgency(editingAgencyId, {
          name: form.name.trim(),
          description: form.description?.trim() || null,
          isActive: form.isActive,
          subsidiaries: mapFormToSubsidiariesPayload(form),
        });

        showFeedback(successResponse(response.message || "Agencia actualizada con exito"));
        setEditingAgencyId(null);
        await loadAgencies();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar la agencia.")));
      }
    },
    [canManageAgencies, clearFeedback, editingAgencyId, loadAgencies, showFeedback],
  );

  const handleImportCreate = useCallback(
    async (rows: AgencyJsonImportRow[]) => {
      if (!canManageAgencies || importLoading) return;

      clearFeedback();
      setImportLoading(true);
      try {
        const result = await importCreateAgencies(
          rows.map((row) => ({
            ...row,
            address: row.address?.trim() || undefined,
            price: row.price === undefined || row.price === null ? undefined : Number(row.price),
          })),
        );
        showFeedback(successResponse(`Importadas: ${result.importedRows}. Rechazadas: ${result.failedRows}.`));
        setImportOpen(false);
        await loadAgencies();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudieron importar agencias.")));
      } finally {
        setImportLoading(false);
      }
    },
    [canManageAgencies, clearFeedback, importLoading, loadAgencies, showFeedback],
  );

  const handleSaveExportPreset = useCallback(
    async (payload: { name: string; columns: AgencyExportColumn[] }) => {
      await saveAgencyExportPreset(payload);
      await loadExportPresets();
    },
    [loadExportPresets],
  );

  const handleDeleteExportPreset = useCallback(
    async (metricId: string) => {
      await deleteAgencyExportPreset(metricId);
      await loadExportPresets();
    },
    [loadExportPresets],
  );

  const handleExport = useCallback(
    async (columns: AgencyExportColumn[]) => {
      if (!columns.length || exporting) return;
      setExporting(true);
      try {
        const result = await exportAgenciesExcel({
          columns,
          q: executedSnapshot.q,
          filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
        });
        const url = URL.createObjectURL(result.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo exportar agencias.")));
      } finally {
        setExporting(false);
      }
    },
    [executedSnapshot, exporting, showFeedback],
  );

  const agencyPendingToggle = useMemo(
    () => (toggleAgencyId ? items.find((row) => row.id === toggleAgencyId) ?? null : null),
    [items, toggleAgencyId],
  );

  const confirmToggleActive = useCallback(async () => {
    if (!canManageAgencies || !toggleAgencyId || togglingStatus) return;

    clearFeedback();
    setTogglingStatus(true);

    try {
      const nextActive = !agencyPendingToggle?.isActive;

      const response = await updateAgencyActive(toggleAgencyId, {
        isActive: nextActive,
      });

      showFeedback(successResponse(response.message || "Estado actualizado"));
      setToggleAgencyId(null);
      await loadAgencies();
    } catch (error: unknown) {
      showFeedback(
        errorResponse(extractErrorMessage(error, "No se pudo actualizar el estado de la agencia.")),
      );
    } finally {
      setTogglingStatus(false);
    }
  }, [
    agencyPendingToggle?.isActive,
    canManageAgencies,
    clearFeedback,
    loadAgencies,
    showFeedback,
    toggleAgencyId,
    togglingStatus,
  ]);

  const columns = useMemo<DataTableColumn<Agency>[]>(
    () => [
      {
        id: "name",
        header: "Nombre",
        accessorKey: "name",
        cell: (row) => (
          <div className="max-w-[200px] leading-tight">
            <span className="block text-xs font-semibold text-black/75">{row.name}</span>
          </div>
        ),
        className: "text-black/70",
      },
      {
        id: "description",
        header: "Descripcion",
        cell: (row) => (
          <div className="max-w-[260px] leading-tight">
            <p className="line-clamp-2 text-zinc-600" title={row.description ?? "Sin descripcion"}>
              {row.description || "-"}
            </p>
          </div>
        ),
        sortable: false,
      },
      {
        id: "subsidiaries",
        header: "Sucursales",
        headerClassName:"flex justify-center",
        cell: (row) => (
          <div className="max-w-[260px] leading-tight text-center">
             <span className="block text-[13px] font-semibold text-black/80">
              {(row.subsidiaries ?? []).length}
            </span>
          </div>
        ),
        sortable: false,
      }
    ],
    [],
  );

  return (
    <PageShell className="bg-white" scrollArea>
      <div className="space-y-4">
        <DataTableSearchChips
          chips={searchChips}
          onRemove={(chip) => handleRemoveSearchRule(chip.removeKey)}
        />
        <DataTable
          tableId="agencies-list"
          data={items}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay agencias con los filtros actuales."
          selectableColumns
          maxHeight="calc(100vh - 165px)"
          paddingPaginated="py-1"
          paddingTablePaginated="py-0"
          toolbarActions={
            <>
              <SystemButton
                size="icon"
                variant="outline"
                className="h-11 rounded-md shadow"
                leftIcon={<Sheet className="h-4 w-4" />}
                onClick={() => setImportOpen(true)}
                disabled={!canManageAgencies || importLoading}
                title="Importar agencias"
                tooltip="Importar"
              />
              {exportColumns.length ? (
                <ExportPopover
                  buttonLabel=""
                  buttonSize="icon"
                  buttonClass="h-11"
                  buttonVariant="outline"
                  buttonTooltip="Exportar"
                  columns={exportColumns}
                  loading={exporting}
                  presets={exportPresets}
                  onSavePreset={handleSaveExportPreset}
                  onDeletePreset={handleDeleteExportPreset}
                  onExport={handleExport}
                />
              ) : null}
              <SystemButton
                size="icon"
                className="h-11 rounded-md shadow"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setOpenCreate(true)}
                disabled={!canManageAgencies}
                tooltip="Nueva agencia"
              />
            </>
          }
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={setSearchText}
              onSubmitSearch={submitSearch}
              searchLabel="Busca tu agencia"
              searchName="agency-smart-search"
              canSaveMetric={canSaveMetric}
              saveLoading={savingMetric}
              onSaveMetric={handleSaveMetric}
            >
              <AgencySmartSearchPanel
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
          onRowClick={(agency) => setEditingAgencyId(agency.id)}
          tableClassName="text-[10px] [&_th]:h-8 [&_th]:whitespace-nowrap [&_th]:px-2 [&_td]:px-2 [&_td]:py-2"
        />
      </div>

      <AgencyFormModal
        open={openCreate && canManageAgencies}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSubmit={(form) => {
          void handleCreateSubmit(form);
        }}
        primaryColor={PRIMARY}
      />

      <AgencyFormModal
        open={Boolean(editingAgencyId) && canManageAgencies}
        mode="edit"
        agency={editingAgency}
        loading={editingLoading}
        onClose={() => setEditingAgencyId(null)}
        onSubmit={(form) => {
          void handleEditSubmit(form);
        }}
        primaryColor={PRIMARY}
      />

      <ExcelImportModal<AgencyJsonImportRow>
        open={importOpen}
        title="Importar agencias"
        fields={agencyImportFields}
        ubigeoConfig={{
          departmentKey: "department",
          provinceKey: "province",
          districtKey: "district",
          valueMode: "name",
        }}
        onClose={() => setImportOpen(false)}
        onSubmit={(rows) => {
          void handleImportCreate(rows);
        }}
      />

      <AlertModal
        open={Boolean(toggleAgencyId) && canManageAgencies}
        type={agencyPendingToggle?.isActive ? "warning" : "restore"}
        title={agencyPendingToggle?.isActive ? "Eliminar agencia" : "Restaurar agencia"}
        message={
          agencyPendingToggle?.isActive
            ? "Estas por eliminar esta agencia. Hazlo solo si estas seguro."
            : "Estas por restaurar esta agencia. Hazlo solo si estas seguro."
        }
        confirmText={agencyPendingToggle?.isActive ? "Eliminar" : "Restaurar"}
        loading={togglingStatus}
        onClose={() => {
          if (togglingStatus) return;
          setToggleAgencyId(null);
        }}
        onConfirm={() => {
          void confirmToggleActive();
        }}
      />
    </PageShell>
  );
}

