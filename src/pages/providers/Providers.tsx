import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/modales/Modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listSuppliers, updateSupplierActive } from "@/services/supplierService";
import type { Supplier } from "@/pages/providers/types/supplier";
import { Menu, Pencil, Plus, Power, Timer } from "lucide-react";
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

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [toggleSupplierId, setToggleSupplierId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState(false);
  const [methodSupplierId, setMethodSupplierId] = useState<string | null>(null);

  const page = paginationState.pageIndex + 1;

  const getSupplierDisplayName = (supplier: Supplier) => {
    const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
    return fullName || supplier.tradeName || "-";
  };

  const loadSuppliers = async () => {
    clearFlash();
    setLoading(true);

    try {
      const res = await listSuppliers({
        page,
        limit: paginationState.pageSize,
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
  };

  useEffect(() => {
    void loadSuppliers();
  }, [page, paginationState.pageSize]);

  const startCreate = () => {
    setEditingSupplierId(null);
    setOpenCreate(true);
  };

  const openEdit = (supplierId: string) => {
    setOpenCreate(false);
    setEditingSupplierId(supplierId);
  };

  const confirmToggleActive = async () => {
    if (!toggleSupplierId) return;

    try {
      await updateSupplierActive(toggleSupplierId, { isActive: nextActiveState });
      setToggleSupplierId(null);
      await loadSuppliers();
      showFlash(successResponse(nextActiveState ? "Proveedor activado" : "Proveedor desactivado"));
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    }
  };

  const columns = useMemo<DataTableColumn<Supplier>[]>(
    () => [
      {
        id: "documentNumber",
        header: "Documento",
        cell: (row) => <span className="text-black/60 text-xs">{row.documentNumber ?? "-"}</span>,
        className: "text-black/60",
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
        header: "Teléfono",
        cell: (row) => <span className="text-black/70">{row.phone ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "address",
        header: "Dirección",
        cell: (row) => <span className="text-black/70">{row.address ?? "-"}</span>,
        className: "text-black/70",
        showInCards: false,
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
        headerClassName: "text-center",
        className: "text-center text-black/70",
        showInCards: false,
      },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        headerClassName: "text-left",
        sortAccessor: (row) => row.isActive,
      },
      {
        id: "actions",
        header: "ACCIONES",
        cell: (row) => (
          <div className="flex items-center justify-center">
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
                  label: "Métodos de pago",
                  icon: <IconPaymentMethod />,
                  onClick: () => setMethodSupplierId(row.supplierId),
                },
                {
                  id: "toggle",
                  label: row.isActive ? "Eliminar" : "Restaurar",
                  icon: <Power className="h-4 w-4" />,
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
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        showInCards: false,
        sortable: false,
        hideable: false,
      },
    ],
    [getSupplierDisplayName, openEdit, setMethodSupplierId, setNextActiveState, setToggleSupplierId]
  );

  const safePage = serverPagination.page;
  const effectiveLimit = serverPagination.limit;

  return (
    <PageShell>
      <PageTitle title="Proveedores" />
        <div className="flex items-center justify-between">
          <Headed
            title="Proveedores"
            size="lg"
          />
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
        onSaved={() => {
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
          void loadSuppliers();
        }}
        primaryColor={PRIMARY}
      />

      <SupplierFormModal
        open={Boolean(editingSupplierId)}
        mode="edit"
        supplierId={editingSupplierId}
        onClose={() => setEditingSupplierId(null)}
        onSaved={() => {
          void loadSuppliers();
        }}
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
              ? "Se activará el proveedor nuevamente."
              : "Se desactivará el proveedor seleccionado."}
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
          title="Métodos de pago del proveedor"
          supplierId={methodSupplierId}
          close={() => setMethodSupplierId(null)}
          className="w-[600px] max-h-[600px]"
        />
      )}
    </PageShell>
  );
}

