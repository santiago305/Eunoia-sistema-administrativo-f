import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Building2, ChevronLeft, ChevronRight, MapPin, Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { StatusPill } from "@/shared/components/components/StatusTag";
import type { DataTableColumn } from "@/shared/components/table/types";
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
import { useUbigeoCatalog } from "@/shared/hooks/useUbigeoCatalog";
import { PageShell } from "@/shared/layouts/PageShell";
import { AgencyFormModal } from "@/features/agencies/components/AgencyFormModal";
import { AgencySmartSearchPanel } from "@/features/agencies/components/AgencySmartSearchPanel";
import type { Agency, AgencyForm } from "@/features/agencies/types/agency";
import type { AgencyDetail, AgencyListItem } from "@/features/agencies/types/agencyApi";
import type {
  AgencySearchRule,
  AgencySearchSnapshot,
  AgencySearchStateResponse,
} from "@/features/agencies/types/agencySearch";
import {
  createAgency,
  deleteAgencySearchMetric,
  getAgencySearchState,
  getAgencyWithSubsidiaries,
  listAgencies,
  listSubsidiaries,
  updateAgency,
  updateAgencyActive,
  saveAgencySearchMetric,
} from "@/shared/services/agencyService";
import {
  applyAgencySearchRuleWithDependencies,
  buildAgencySearchChips,
  removeAgencySearchKeyWithDependencies,
  sanitizeAgencySearchSnapshot,
  type AgencySearchFilterKey,
} from "@/features/agencies/utils/agencySmartSearch";

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

function mapListItemToAgency(item: AgencyListItem): Agency {
  return {
    id: item.id,
    name: item.name,
    isActive: item.isActive,
    subsidiaries: item.subsidiaries ?? [],
  };
}

function mapDetailToAgency(detail: AgencyDetail): Agency {
  return {
    id: detail.id,
    name: detail.name,
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
  const { namesById: ubigeoNames } = useUbigeoCatalog(true);

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
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

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
      setSelectedAgencyId((current) =>
        current && agencies.some((agency) => agency.id === current)
          ? current
          : agencies[0]?.id ?? null,
      );

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
        const response = await deleteAgencySearchMetric(metricId);
        showFeedback(successResponse(response.message || "Métrica eliminada"));
        await loadSearchState();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo eliminar la métrica.")));
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
          isActive: form.isActive,
          subsidiaries: mapFormToSubsidiariesPayload(form),
        });

        showFeedback(successResponse(response.message || "Agencia creada con éxito"));
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
          isActive: form.isActive,
          subsidiaries: mapFormToSubsidiariesPayload(form),
        });

        showFeedback(successResponse(response.message || "Agencia actualizada con éxito"));
        setEditingAgencyId(null);
        await loadAgencies();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar la agencia.")));
      }
    },
    [canManageAgencies, clearFeedback, editingAgencyId, loadAgencies, showFeedback],
  );

  const agencyPendingToggle = useMemo(
    () => (toggleAgencyId ? items.find((row) => row.id === toggleAgencyId) ?? null : null),
    [items, toggleAgencyId],
  );

  const selectedAgency = useMemo(
    () => items.find((agency) => agency.id === selectedAgencyId) ?? null,
    [items, selectedAgencyId],
  );

  const confirmToggleActive = useCallback(async () => {
    if (!canManageAgencies || !toggleAgencyId || togglingStatus) return;

    clearFeedback();
    setTogglingStatus(true);

    try {
      const nextActive = !Boolean(agencyPendingToggle?.isActive);

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
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-black/75">{row.name}</span>
            <span className="block text-[10px] text-black/40">
              {(row.subsidiaries ?? []).length} sucursal
              {(row.subsidiaries ?? []).length === 1 ? "" : "es"}
            </span>
          </div>
        ),
        className: "text-black/70",
      },
      {
        id: "subsidiaries",
        header: "Sucursales y ubicación",
        cell: (row) => {
          const subsidiaries = row.subsidiaries ?? [];

          if (!subsidiaries.length) {
            return <span className="text-black/40">Sin sucursales</span>;
          }

          return (
            <div className="flex max-w-[720px] flex-wrap gap-1.5">
              {subsidiaries.slice(0, 3).map((item, index) => {
                const department =
                  ubigeoNames.departmentsById[item.departmentId] ?? item.departmentId;

                const province =
                  ubigeoNames.provincesById[item.provinceId] ?? item.provinceId;

                const district =
                  ubigeoNames.districtsById[item.districtId] ?? item.districtId;

                return (
                  <div
                    key={item.id ?? `${row.id}-${index}`}
                    className="h-[60px] w-[210px] rounded-lg border border-black/10 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
                    title={`${item.alias || `Sucursal ${index + 1}`} - ${district}, ${province}, ${department}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="max-w-[125px] truncate text-[10px] font-semibold text-black/75">
                        {item.alias || `Sucursal ${index + 1}`}
                      </span>

                      <span
                        className={[
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] leading-none",
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {item.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-[9px] leading-3 text-black/50 ">
                      <div className="flex items-center gap-1 truncate"> 
                        <p className="flex items-center gap-1 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0 text-black/35" />
                          <span className="truncate">
                            {district || "Sin distrito"}
                          </span>
                        </p>

                        <p className="truncate pl-3.5">
                          {[province, department].filter(Boolean).join(" · ") || "Sin ubicación"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 truncate"> 
                        <p className="truncate pl-3.5 text-black/40">
                          {item.address || "Sin dirección"}
                        </p>

                        {typeof item.basePrice === "number" && item.basePrice > 0 ? (
                          <p className="truncate pl-3.5 font-medium text-black/50">
                            S/ {item.basePrice.toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {subsidiaries.length > 3 ? (
                <div className="flex h-[60px] w-[50px] items-center justify-center rounded-lg border border-dashed border-black/15 text-[10px] text-black/45">
                  +{subsidiaries.length - 3}
                </div>
              ) : null}
            </div>
          );
        },
        className: "text-black/70 [&>div]:justify-start",
        headerClassName: "text-center [&>div]:justify-center",
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
                hidden: !canManageAgencies,
                onClick: () => setEditingAgencyId(row.id),
              },
              {
                id: "toggle",
                label: row.isActive ? "Eliminar" : "Restaurar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                hidden: !canManageAgencies,
                className: row.isActive
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setToggleAgencyId(row.id),
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
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-50",
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
    [
      canManageAgencies,
      ubigeoNames.departmentsById,
      ubigeoNames.districtsById,
      ubigeoNames.provincesById,
    ],
  );
  void columns;

  return (
    <PageShell scrollArea={false} contentClassName="h-full max-w-none gap-0 p-4">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <header className="border-b border-zinc-100 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="uppercase tracking-[0.16em]">Logística</span>
                <span className="text-zinc-300">/</span>
                <span>{serverPagination.total} agencias</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                Agencias y sucursales
              </h1>
            </div>

            <div className="flex w-full items-center gap-2 xl:max-w-[760px]">
              <div className="min-w-0 flex-1">
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
              </div>

              <SystemButton
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setOpenCreate(true)}
                disabled={!canManageAgencies}
              >
                Nueva agencia
              </SystemButton>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <DataTableSearchChips
              chips={searchChips}
              onRemove={(chip) => handleRemoveSearchRule(chip.removeKey)}
            />

            <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
              <span>
                Página <b className="text-zinc-800">{serverPagination.page}</b> de{" "}
                <b className="text-zinc-800">{serverPagination.totalPages}</b>
              </span>
              <button
                type="button"
                disabled={!serverPagination.hasPrev}
                onClick={() => handlePageChange(serverPagination.page - 1)}
                className="grid h-8 w-8 place-items-center rounded-sm ring-1 ring-zinc-100 hover:bg-zinc-50 disabled:text-zinc-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!serverPagination.hasNext}
                onClick={() => handlePageChange(serverPagination.page + 1)}
                className="grid h-8 w-8 place-items-center rounded-sm ring-1 ring-zinc-100 hover:bg-zinc-50 disabled:text-zinc-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex min-h-[300px] flex-col border-b border-zinc-100 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="border-b border-zinc-100 py-3 pr-4">
              <p className="text-sm font-semibold text-zinc-950">Lista de agencias</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {loading ? "Cargando..." : `${items.length} resultados en esta página`}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto pr-4">
              {items.map((agency) => {
                const selected = agency.id === selectedAgencyId;
                return (
                  <button
                    key={agency.id}
                    type="button"
                    onClick={() => setSelectedAgencyId(agency.id)}
                    className={[
                      "flex w-full items-center gap-3 border-b border-zinc-100 px-2 py-3 text-left transition",
                      selected ? "bg-zinc-50" : "hover:bg-zinc-50/70",
                    ].join(" ")}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-zinc-100 text-zinc-500">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900">{agency.name}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {(agency.subsidiaries ?? []).length} sucursal{(agency.subsidiaries ?? []).length === 1 ? "" : "es"}
                      </span>
                    </span>
                    <span className={agency.isActive ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-zinc-300"} />
                  </button>
                );
              })}

              {!loading && !items.length ? (
                <div className="grid min-h-[280px] place-items-center text-center text-sm text-zinc-400">
                  No hay agencias para mostrar.
                </div>
              ) : null}
            </div>
          </aside>

          <main className="min-h-[520px] min-w-0 overflow-auto lg:min-h-0 lg:pl-5">
            {selectedAgency ? (
              <div className="py-4">
                <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{selectedAgency.name}</h2>
                      <StatusPill active={selectedAgency.isActive} PRIMARY={PRIMARY} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {(selectedAgency.subsidiaries ?? []).length} sucursales registradas
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <SystemButton variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />} disabled={!canManageAgencies} onClick={() => setEditingAgencyId(selectedAgency.id)}>
                      Editar
                    </SystemButton>
                    <SystemButton variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} disabled={!canManageAgencies} onClick={() => setToggleAgencyId(selectedAgency.id)}>
                      {selectedAgency.isActive ? "Eliminar" : "Restaurar"}
                    </SystemButton>
                  </div>
                </div>

                <div className="grid gap-px bg-zinc-100 sm:grid-cols-2 xl:grid-cols-3">
                  {(selectedAgency.subsidiaries ?? []).map((subsidiary, index) => {
                    const department = ubigeoNames.departmentsById[subsidiary.departmentId] ?? subsidiary.departmentId;
                    const province = ubigeoNames.provincesById[subsidiary.provinceId] ?? subsidiary.provinceId;
                    const district = ubigeoNames.districtsById[subsidiary.districtId] ?? subsidiary.districtId;

                    return (
                      <article key={subsidiary.id ?? index} className="min-h-[170px] bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">{subsidiary.alias || `Sucursal ${index + 1}`}</p>
                            <p className="mt-1 text-xs text-zinc-400">Sucursal {String(index + 1).padStart(2, "0")}</p>
                          </div>
                          <span className={subsidiary.isActive ? "text-xs font-medium text-emerald-600" : "text-xs font-medium text-zinc-400"}>
                            {subsidiary.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </div>

                        <div className="mt-5 space-y-2 text-xs text-zinc-500">
                          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{[district, province, department].filter(Boolean).join(", ") || "Sin ubicación"}</span></p>
                          <p className="pl-5">{subsidiary.address || "Sin dirección registrada"}</p>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                          <span className="text-zinc-400">Tarifa base</span>
                          <span className="font-semibold text-zinc-900">S/ {Number(subsidiary.basePrice ?? 0).toFixed(2)}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-[420px] place-items-center text-center text-sm text-zinc-400">
                Selecciona una agencia para ver sus sucursales.
              </div>
            )}
          </main>
        </div>
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
