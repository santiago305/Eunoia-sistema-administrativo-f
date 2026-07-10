import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { Badge } from "@/shared/components/ui/badge";
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
import { ClientFormModal } from "@/features/clients/components/ClientFormModal";
import { ClientSmartSearchPanel } from "@/features/clients/components/ClientSmartSearchPanel";
import { ModalDetailClient } from "@/features/clients/components/ModalDetailClient";
import type { Client, ClientForm } from "@/features/clients/types/client";
import type { ClientListItem } from "@/features/clients/types/clientApi";
import { CLIENT_TYPE_META } from "@/features/clients/constants/clientType";
import type {
  ClientSearchFilters,
  ClientSearchRule,
  ClientSearchSnapshot,
  ClientSearchStateResponse,
} from "@/features/clients/types/clientSearch";
import {
  createClient,
  deleteClientSearchMetric,
  getClientSearchState,
  getClientById,
  listClients,
  saveClientSearchMetric,
  updateClient,
  updateClientActive,
} from "@/shared/services/clientService";
import { getUbigeoCatalog } from "@/shared/services/ubigeoCatalogService";
import {
  applyClientSearchRuleWithDependencies,
  buildClientSearchChips,
  removeClientSearchKeyWithDependencies,
  sanitizeClientSearchSnapshot,
  type ClientSearchFilterKey,
} from "@/features/clients/utils/clientSmartSearch";

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

function mapListItemToClient(item: ClientListItem): Client {
  return {
    id: item.id,
    type: item.type,
    fullName: item.fullName,
    docType: item.docType,
    docNumber: item.docNumber,
    departmentId: item.departmentId,
    provinceId: item.provinceId,
    districtId: item.districtId,
    address: item.address ?? null,
    reference: item.reference ?? null,
    isActive: item.isActive,
  };
}

export default function Clients() {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);
  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const { can } = usePermissions();
  const canManageClients = can("clients.manage");

  const [items, setItems] = useState<Client[]>([]);
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
  const [searchState, setSearchState] = useState<ClientSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [searchFilters, setSearchFilters] = useState<ClientSearchFilters>(() => []);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);

  const [toggleClientId, setToggleClientId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [ubigeoNames, setUbigeoNames] = useState<{
    departmentsById: Record<string, string>;
    provincesById: Record<string, string>;
    districtsById: Record<string, string>;
  }>({
    departmentsById: {},
    provincesById: {},
    districtsById: {},
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const catalog = await getUbigeoCatalog();
        if (cancelled) return;

        const departmentsById: Record<string, string> = {};
        const provincesById: Record<string, string> = {};
        const districtsById: Record<string, string> = {};

        for (const dep of catalog.departments ?? []) departmentsById[dep.id] = dep.name;
        for (const prov of catalog.provinces ?? []) provincesById[prov.id] = prov.name;
        for (const dist of catalog.districts ?? []) districtsById[dist.id] = dist.name;

        setUbigeoNames({ departmentsById, provincesById, districtsById });
      } catch {
        if (!cancelled) {
          setUbigeoNames({ departmentsById: {}, provincesById: {}, districtsById: {} });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const draftSnapshot = useMemo<ClientSearchSnapshot>(
    () => sanitizeClientSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<ClientSearchSnapshot>(
    () => sanitizeClientSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<ClientSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<ClientSearchSnapshot>[]>(
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
      const response = await getClientSearchState();
      setSearchState(response);
    } catch {
      showFeedbackRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    clearFeedback();

    try {
      const response = await listClients({
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
        page,
        limit,
      });

      const mapped = (response.items ?? []).map(mapListItemToClient);
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
      showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudieron cargar los clientes.")));
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, executedSnapshot, limit, loadSearchState, page]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    if (!editingClientId) {
      setEditingClient(null);
      return;
    }

    let cancelled = false;
    setEditingLoading(true);

    void (async () => {
      try {
        const detail = await getClientById(editingClientId);
        if (cancelled) return;

        setEditingClient({
          id: detail.id,
          type: detail.type,
          fullName: detail.fullName,
          docType: detail.docType,
          docNumber: detail.docNumber,
          departmentId: detail.departmentId,
          provinceId: detail.provinceId,
          districtId: detail.districtId,
          address: detail.address ?? null,
          reference: detail.reference ?? null,
          isActive: detail.isActive,
        });
      } catch (error: unknown) {
        if (!cancelled) {
          showFeedbackRef.current(errorResponse(extractErrorMessage(error, "No se pudo cargar el cliente.")));
          setEditingClient(null);
          setEditingClientId(null);
        }
      } finally {
        if (!cancelled) setEditingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingClientId]);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, [searchText]);

  const searchCatalogs = useMemo(() => searchState?.catalogs ?? null, [searchState]);

  const searchChips = useMemo(
    () => buildClientSearchChips(executedSnapshot, searchCatalogs),
    [executedSnapshot, searchCatalogs],
  );

  const applySmartSnapshot = useCallback((snapshot: ClientSearchSnapshot) => {
    const normalized = sanitizeClientSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    });
  }, []);

  const handleApplySearchRule = useCallback(
    (rule: ClientSearchRule) => {
      startTransition(() => {
        setSearchFilters((current) => {
          const next = applyClientSearchRuleWithDependencies(
            sanitizeClientSearchSnapshot({ q: searchText, filters: current }),
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
    (fieldId: "q" | ClientSearchFilterKey) => {
      startTransition(() => {
        if (fieldId === "q") {
          setSearchText("");
          setAppliedSearchText("");
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
          return;
        }

        setSearchFilters((current) => {
          const next = removeClientSearchKeyWithDependencies(
            sanitizeClientSearchSnapshot({ q: searchText, filters: current }),
            fieldId,
          );
          return next.filters;
        });
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    },
    [searchText],
  );

  const canSaveMetric = Boolean(draftSnapshot.q || draftSnapshot.filters.length);

  const handleSaveMetric = useCallback(
    async (name: string) => {
      if (!canSaveMetric || savingMetric) return false;

      clearFeedback();
      setSavingMetric(true);

      try {
        const response = await saveClientSearchMetric(name, draftSnapshot);
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
        const response = await deleteClientSearchMetric(metricId);
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
    async (form: ClientForm) => {
      if (!canManageClients) return;

      clearFeedback();

      try {
        const payload = {
          type: form.type,
          fullName: form.fullName.trim(),
          docType: form.docType,
          docNumber: form.docType === "NONE" ? "" : form.docNumber.trim(),
          reference: form.docType === "NONE" ? form.reference.trim() : form.reference.trim() || undefined,
          address: form.address.trim() || undefined,
          departmentId: form.departmentId,
          provinceId: form.provinceId,
          districtId: form.districtId,
          isActive: form.isActive,
          telephonesReplace: form.telephonesReplace?.length
            ? form.telephonesReplace
                .filter((item) => !item.id && Boolean(item.number?.trim()))
                .map((item) => ({
                  number: item.number!.trim(),
                  isMain: item.isMain,
                }))
            : undefined,
        };

        const response = await createClient(payload);
        showFeedback(successResponse(response.message || "Cliente creado con éxito"));
        setOpenCreate(false);
        await loadClients();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo crear el cliente.")));
      }
    },
    [canManageClients, clearFeedback, loadClients, showFeedback],
  );

  const handleEditSubmit = useCallback(
    async (form: ClientForm) => {
      if (!canManageClients || !editingClientId) return;

      clearFeedback();

      try {
        const payload = {
          type: form.type,
          fullName: form.fullName.trim(),
          docType: form.docType,
          docNumber: form.docType === "NONE" ? "" : form.docNumber.trim(),
          reference: form.docType === "NONE" ? form.reference.trim() : form.reference.trim() || undefined,
          address: form.address.trim() || undefined,
          departmentId: form.departmentId,
          provinceId: form.provinceId,
          districtId: form.districtId,
          telephonesReplace: form.telephonesReplace?.length
            ? form.telephonesReplace
                .map((item) => ({
                  id: item.id,
                  number: item.number?.trim() || undefined,
                  isMain: item.isMain,
                }))
                .filter((item) => Boolean(item.id || item.number))
            : undefined,
        };

        const response = await updateClient(editingClientId, payload);
        showFeedback(successResponse(response.message || "Cliente actualizado con éxito"));
        setEditingClientId(null);
        await loadClients();
      } catch (error: unknown) {
        showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el cliente.")));
      }
    },
    [canManageClients, clearFeedback, editingClientId, loadClients, showFeedback],
  );

  const clientPendingToggle = useMemo(
    () => (toggleClientId ? items.find((row) => row.id === toggleClientId) ?? null : null),
    [items, toggleClientId],
  );

  const confirmToggleActive = useCallback(async () => {
    if (!canManageClients || !toggleClientId || togglingStatus) return;

    clearFeedback();
    setTogglingStatus(true);

    try {
      const nextActive = !Boolean(clientPendingToggle?.isActive);
      const response = await updateClientActive(toggleClientId, { isActive: nextActive });
      showFeedback(successResponse(response.message || "Estado actualizado"));
      setToggleClientId(null);
      await loadClients();
    } catch (error: unknown) {
      showFeedback(errorResponse(extractErrorMessage(error, "No se pudo actualizar el estado del cliente.")));
    } finally {
      setTogglingStatus(false);
    }
  }, [canManageClients, clientPendingToggle?.isActive, clearFeedback, loadClients, showFeedback, toggleClientId, togglingStatus]);

  const columns = useMemo<DataTableColumn<Client>[]>(
    () => [
      {
        id: "fullName",
        header: "Cliente",
        cell: (row) => <span className="text-black/70">{row.fullName}</span>,
        className: "text-black/70",
      },
      {
        id: "type",
        header: "Tipo",
        cell: (row) => (
          <Badge variant="outline" className={CLIENT_TYPE_META[row.type].className}>
            {CLIENT_TYPE_META[row.type].label}
          </Badge>
        ),
      },
      {
        id: "doc",
        header: "Documento",
        cell: (row) => (
          row.docType === "NONE" ? (
            <span className="text-black/70">
              S/D 
            </span>
          ) : (
            <span className="text-black/70">
              {row.docType} - {row.docNumber}
            </span>
          )
        ),
        className: "text-black/70",
      },
      {
        id: "reference",
        header: "Referencia",
        accessorKey: "reference",
        cell: (row) => <span className="text-black/70">{row.reference ?? "—"}</span>,
        className: "text-black/70",
      },
      {
        id: "departmentId",
        header: "Departamento",
        accessorKey: "departmentId",
        cell: (row) => {
          const name = ubigeoNames.departmentsById[row.departmentId];
          return <span className="text-black/70">{name ? `${name}` : row.departmentId}</span>;
        },
        className: "text-black/70",
      },
      {
        id: "provinceId",
        header: "Provincia",
        accessorKey: "provinceId",
        cell: (row) => {
          const name = ubigeoNames.provincesById[row.provinceId];
          return <span className="text-black/70">{name ? `${name}` : row.provinceId}</span>;
        },
        className: "text-black/70",
      },
      {
        id: "districtId",
        header: "Distrito",
        accessorKey: "districtId",
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
                hidden: !canManageClients,
                onClick: () => setEditingClientId(row.id),
              },
              {
                id: "toggle",
                label: row.isActive ? "Eliminar" : "Restaurar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                hidden: !canManageClients,
                className: row.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => setToggleClientId(row.id),
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
    [canManageClients, ubigeoNames.departmentsById, ubigeoNames.districtsById, ubigeoNames.provincesById],
  );

  const companyActionTitle = canManageClients ? undefined : "Sin permisos para gestionar clientes.";

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
          disabled={!canManageClients}
          title={companyActionTitle}
        >
          Crear cliente
        </SystemButton>
      </PageActionsRow>

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => {
          handleRemoveSearchRule(chip.removeKey);
        }}
      />

      <DataTable
        tableId="clients-table"
        data={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        emptyMessage="No hay clientes con los filtros actuales."
        selectableColumns
        hoverable={false}
        animated={false}
        onRowClick={(row) => setDetailClientId(row.id)}
        toolbarSearchContent={
          <DataTableSearchBar
            value={searchText}
            onChange={setSearchText}
            onSubmitSearch={submitSearch}
            searchLabel="Busca tu cliente"
            searchName="client-smart-search"
            canSaveMetric={canSaveMetric}
            saveLoading={savingMetric}
            onSaveMetric={handleSaveMetric}
          >
            <ClientSmartSearchPanel
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

      <ClientFormModal
        open={openCreate && canManageClients}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSubmit={(form) => {
          void handleCreateSubmit(form);
        }}
        primaryColor={PRIMARY}
      />

      <ClientFormModal
        open={Boolean(editingClientId) && canManageClients}
        mode="edit"
        client={editingClient}
        loading={editingLoading}
        onClose={() => setEditingClientId(null)}
        onSubmit={(form) => {
          void handleEditSubmit(form);
        }}
        primaryColor={PRIMARY}
      />

      <AlertModal
        open={Boolean(toggleClientId) && canManageClients}
        type={clientPendingToggle?.isActive ? "warning" : "restore"}
        title={clientPendingToggle?.isActive ? "Eliminar cliente" : "Restaurar cliente"}
        message={
          clientPendingToggle?.isActive
            ? "Estas por eliminar este cliente. Hazlo solo si estas seguro."
            : "Estas por restaurar este cliente. Hazlo solo si estas seguro."
        }
        confirmText={clientPendingToggle?.isActive ? "Eliminar" : "Restaurar"}
        loading={togglingStatus}
        onClose={() => {
          if (togglingStatus) return;
          setToggleClientId(null);
        }}
        onConfirm={() => {
          void confirmToggleActive();
        }}
      />

      <ModalDetailClient
        ubigeoNames={ubigeoNames}
        open={Boolean(detailClientId)}
        clientId={detailClientId}
        onClose={() => setDetailClientId(null)}
      />

    </PageShell>
  );
}
