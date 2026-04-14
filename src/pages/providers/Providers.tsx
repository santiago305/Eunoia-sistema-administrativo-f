import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/modales/Modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listSuppliers, updateSupplierActive } from "@/services/supplierService";
import type { Supplier } from "@/pages/providers/types/supplier";
import { Menu, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { SupplierFormModal } from "./components/SupplierFormModal";
import { ProviderMethodListModal } from "./components/ProviderMethodListModal";
import { SystemButton } from "@/components/SystemButton";
import { ActionsPopover } from "@/components/ActionsPopover";
import { StatusPill } from "@/components/StatusTag";
import { IconPaymentMethod } from "@/components/dashboard/icons";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 500;

export default function Providers() {
  const { showFlash, clearFlash } = useFlashMessage();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [toggleSupplierId, setToggleSupplierId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState(false);
  const [methodSupplierId, setMethodSupplierId] = useState<string | null>(null);

  const page = paginationState.pageIndex + 1;

  useEffect(() => {
    if (debouncedSearch === appliedSearch) return;

    if (paginationState.pageIndex !== 0) {
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
      return;
    }

    setAppliedSearch(debouncedSearch);
  }, [appliedSearch, debouncedSearch, paginationState.pageIndex]);

  const getSupplierDisplayName = useCallback((supplier: Supplier) => {
    const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
    return fullName || supplier.tradeName || "-";
  }, []);

  const loadSuppliers = useCallback(async () => {
    clearFlash();
    setLoading(true);

    try {
      const res = await listSuppliers({
        page,
        limit: paginationState.pageSize,
        q: appliedSearch || undefined,
      });

      const items = res.items ?? [];
      const nextTotal = res.total ?? 0;
      const nextPage = res.page ?? page;
      const nextLimit = res.limit ?? paginationState.pageSize;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));

      setSuppliers(items);
      setServerPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });
    } catch {
      setSuppliers([]);
      setServerPagination({
        total: 0,
        page: 1,
        limit: paginationState.pageSize,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      });
      showFlash(errorResponse("Error al listar proveedores"));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, clearFlash, page, paginationState.pageSize, showFlash]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const startCreate = useCallback(() => {
    setEditingSupplierId(null);
    setOpenCreate(true);
  }, []);

  const openEdit = useCallback((supplierId: string) => {
    setOpenCreate(false);
    setEditingSupplierId(supplierId);
  }, []);

  const confirmToggleActive = useCallback(async () => {
    if (!toggleSupplierId) return;

    try {
      await updateSupplierActive(toggleSupplierId, { isActive: nextActiveState });
      setToggleSupplierId(null);
      await loadSuppliers();
      showFlash(successResponse(nextActiveState ? "Proveedor activado" : "Proveedor desactivado"));
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    }
  }, [loadSuppliers, nextActiveState, showFlash, toggleSupplierId]);

  const handleCreateSaved = useCallback(() => {
    if (paginationState.pageIndex === 0) {
      void loadSuppliers();
      return;
    }

    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [loadSuppliers, paginationState.pageIndex]);

  const handleEditSaved = useCallback(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const columns = useMemo<DataTableColumn<Supplier>[]>(
    () => [
      {
        id: "documentNumber",
        header: "Documento",
        cell: (row) => <span className="text-black/60 text-xs">{row.documentNumber ?? "-"}</span>,
        className: "text-black/60",
        visible: false,
      },
      {
        id: "supplier",
        header: "Proveedor",
        cell: (row) => <span className="text-black/70">{getSupplierDisplayName(row)}</span>,
        className: "text-black/70",
        cardTitle: true,
      },
      {
        id: "email",
        header: "Correo",
        cell: (row) => <span className="text-black/70">{row.email ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "phone",
        header: "Telefono",
        cell: (row) => <span className="text-black/70">{row.phone ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "address",
        header: "Direccion",
        cell: (row) => <span className="text-black/70">{row.address ?? "-"}</span>,
        className: "text-black/70",
        showInCards: false,
        visible: false,
      },
      {
        id: "leadTimeDays",
        header: "T. Espera",
        cell: (row) => (
          <div className="flex items-center justify-center gap-2 text-black/70">
            {row.leadTimeDays ?? "-"}
            <Timer className="h-4 w-4" />
          </div>
        ),
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center text-black/70",
        showInCards: false,
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
        header: "ACCIONES",
        cell: (row) => (
          <ActionsPopover
            actions={[
              {
                id: "edit",
                label: "Editar",
                icon: <Pencil className="h-4 w-4 text-black/60" />,
                onClick: () => openEdit(row.supplierId),
              },
              {
                id: "methods",
                label: "Metodos de pago",
                icon: <IconPaymentMethod />,
                onClick: () => setMethodSupplierId(row.supplierId),
              },
              {
                id: "toggle",
                label: row.isActive ? "Eliminar" : "Restaurar",
                icon: <Trash2 className="h-4 w-4" />,
                danger: row.isActive,
                className: row.isActive
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-cyan-700 hover:bg-cyan-50",
                onClick: () => {
                  setToggleSupplierId(row.supplierId);
                  setNextActiveState(!row.isActive);
                },
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
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                disabled={action.disabled}
              >
                {action.icon}
                {action.label}
              </button>
            )}
          />
        ),
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        showInCards: false,
        sortable: false,
        hideable: false,
      },
    ],
    [getSupplierDisplayName, openEdit]
  );

  const safePage = serverPagination.page;
  const effectiveLimit = serverPagination.limit;

  return (
    <PageShell>
      <PageTitle title="Proveedores" />
      <div className="flex items-center justify-between">
        <Headed title="Proveedores" size="lg" />
        <SystemButton
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={startCreate}
          style={{
            backgroundColor: PRIMARY,
            borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
            boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
          }}
        >
          Crear proveedor
        </SystemButton>
      </div>

      <DataTable
        tableId="providers-table"
        data={suppliers}
        columns={columns}
        rowKey="supplierId"
        loading={loading}
        emptyMessage="No hay proveedores con los filtros actuales."
        showSearch
        searchPlaceholder="Buscar proveedores..."
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchMode="server"
        selectableColumns
        hoverable={false}
        animated={false}
        pagination={{
          page: safePage,
          limit: effectiveLimit,
          total: serverPagination.total,
        }}
        onPageChange={(nextPage) => {
          setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) }));
        }}
        tableClassName="text-[10px]"
      />

      <SupplierFormModal
        open={openCreate}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSaved={handleCreateSaved}
        primaryColor={PRIMARY}
      />

      <SupplierFormModal
        open={Boolean(editingSupplierId)}
        mode="edit"
        supplierId={editingSupplierId}
        onClose={() => setEditingSupplierId(null)}
        onSaved={handleEditSaved}
        primaryColor={PRIMARY}
      />

      {toggleSupplierId && (
        <Modal
          open={true}
          title={nextActiveState ? "Activar proveedor" : "Desactivar proveedor"}
          onClose={() => setToggleSupplierId(null)}
          className="max-w-md"
        >
          <p className="text-sm text-black/70">
            {nextActiveState
              ? "Se activara el proveedor nuevamente."
              : "Se desactivara el proveedor seleccionado."}
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <SystemButton variant="outline" size="sm" onClick={() => setToggleSupplierId(null)}>
              Cancelar
            </SystemButton>

            <SystemButton
              variant={nextActiveState ? "primary" : "danger"}
              size="sm"
              onClick={confirmToggleActive}
            >
              Confirmar
            </SystemButton>
          </div>
        </Modal>
      )}

      {methodSupplierId && (
        <ProviderMethodListModal
          title="Metodos de pago del proveedor"
          supplierId={methodSupplierId}
          close={() => setMethodSupplierId(null)}
          className="w-[600px] max-h-[600px]"
        />
      )}
    </PageShell>
  );
}
