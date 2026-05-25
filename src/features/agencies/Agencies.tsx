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
import { useUbigeoCatalog } from "@/shared/hooks/useUbigeoCatalog";
import { PageShell } from "@/shared/layouts/PageShell";
import { AgencyFormModal } from "@/features/agencies/components/AgencyFormModal";
import { AgencySmartSearchPanel } from "@/features/agencies/components/AgencySmartSearchPanel";
import { ModalDetailAgency } from "@/features/agencies/components/ModalDetailAgency";
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
  getAgencyById,
  getAgencySearchState,
  listAgencies,
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
    reference: item.reference ?? null,
    address: item.address ?? null,
    departmentId: item.departmentId,
    provinceId: item.provinceId,
    districtId: item.districtId,
    isActive: item.isActive,
  };
}

function mapDetailToAgency(detail: AgencyDetail): Agency {
  return {
    id: detail.id,
    name: detail.name,
    reference: detail.reference ?? null,
    address: detail.address ?? null,
    departmentId: detail.departmentId,
    provinceId: detail.provinceId,
    districtId: detail.districtId,
    isActive: detail.isActive,
  };
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
  const [searchFilters, setSearchFilters] = useState<AgencySearchRule[]>(() => []);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [detailAgencyId, setDetailAgencyId] = useState<string | null>(null);

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

      const mapped = (response.items ?? []).map(mapListItemToAgency);
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

      if (executedSnapshot.q || executedSnapshot.filters.length) {
        void loadSearchState();
      }
    } catch (error: unknown) {
      setItems([]);
      showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudieron cargar las agencias.")));
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
        const detail = await getAgencyById(editingAgencyId);
        if (cancelled) return;
        setEditingAgency(mapDetailToAgency(detail));
      } catch (error: unknown) {
        if (!cancelled) {
          showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudo cargar la agencia.")));
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
    setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(nextPage - 1, 0) }));
  }, []);

  const startCreate = useCallback(() => {
    setOpenCreate(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (form: AgencyForm) => {
      if (!canManageAgencies) return;

      clearFeedback();

      try {
        const payload = {
          name: form.name.trim(),
          reference: form.reference.trim() || undefined,
          address: form.address.trim(),
          departmentId: form.departmentId,
          provinceId: form.provinceId,
          districtId: form.districtId,
          isActive: form.isActive,
        };

        const response = await createAgency(payload);
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
        const payload = {
          name: form.name.trim(),
          reference: form.reference.trim() || undefined,
          address: form.address.trim(),
          departmentId: form.departmentId,
          provinceId: form.provinceId,
          districtId: form.districtId,
        };

        const response = await updateAgency(editingAgencyId, payload);
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

  const confirmToggleActive = useCallback(async () => {
    if (!canManageAgencies || !toggleAgencyId || togglingStatus) return;

    clearFeedback();
    setTogglingStatus(true);

    try {
      const nextActive = !Boolean(agencyPendingToggle?.isActive);
      const response = await updateAgencyActive(toggleAgencyId, { isActive: nextActive });
      showFeedback(successResponse(response.message || "Estado actualizado"));
      setToggleAgencyId(null);
      await loadAgencies();
    } catch (error: unknown) {
      showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el estado de la agencia.")));
    } finally {
      setTogglingStatus(false);
    }
  }, [agencyPendingToggle?.isActive, canManageAgencies, clearFeedback, loadAgencies, showFeedback, toggleAgencyId, togglingStatus]);

  const columns = useMemo<DataTableColumn<Agency>[]>(
    () => [
      {
        id: "name",
        header: "Nombre",
        accessorKey: "name",
        cell: (row) => <span className="text-black/70">{row.name}</span>,
        className: "text-black/70",
      },
      {
        id: "departmentId",
        header: "Departamento",
        cell: (row) => {
          const name = ubigeoNames.departmentsById[row.departmentId];
          return <span className="text-black/70">{name ? `${name}` : row.departmentId}</span>;
        },
        className: "text-black/70",
      },
      {
        id: "provinceId",
        header: "Provincia",
        cell: (row) => {
          const name = ubigeoNames.provincesById[row.provinceId];
          return <span className="text-black/70">{name ? `${name}` : row.provinceId}</span>;
        },
        className: "text-black/70",
      },
      {
        id: "districtId",
        header: "Distrito",
        cell: (row) => {
          const name = ubigeoNames.districtsById[row.districtId];
          return <span className="text-black/70">{name ? `${name}` : row.districtId}</span>;
        },
        className: "text-black/70",
      },
      {
        id: "address",
        header: "Dirección",
        cell: (row) => <span className="text-black/70">{row.address ?? "—"}</span>,
        className: "text-black/70",
      },
      {
        id: "reference",
        header: "Referencia",
        cell: (row) => <span className="text-black/70">{row.reference ?? "—"}</span>,
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
                hidden: !canManageAgencies,
                onClick: () => setEditingAgencyId(row.id),
              },
              {
                id: "toggle",
                label: row.isActive ? "Eliminar" : "Restaurar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                hidden: !canManageAgencies,
                className: row.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50",
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
    [canManageAgencies, ubigeoNames.departmentsById, ubigeoNames.districtsById, ubigeoNames.provincesById],
  );

  const companyActionTitle = canManageAgencies ? undefined : "Sin permisos para gestionar agencias.";

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
          disabled={!canManageAgencies}
          title={companyActionTitle}
        >
          Crear agencia
        </SystemButton>
      </PageActionsRow>

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => {
          handleRemoveSearchRule(chip.removeKey);
        }}
      />

      <DataTable
        tableId="agencies-table"
        data={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        emptyMessage="No hay agencias con los filtros actuales."
        selectableColumns
        hoverable={false}
        animated={false}
        onRowClick={(row) => setDetailAgencyId(row.id)}
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
        tableClassName="text-[10px]"
      />

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

      <ModalDetailAgency
        ubigeoNames={ubigeoNames}
        open={Boolean(detailAgencyId)}
        agencyId={detailAgencyId}
        onClose={() => setDetailAgencyId(null)}
      />
    </PageShell>
  );
}

