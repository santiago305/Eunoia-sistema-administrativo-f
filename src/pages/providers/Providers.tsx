import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/modales/Modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listSuppliers, updateSupplierActive } from "@/services/supplierService";
import type { Supplier } from "@/pages/providers/types/supplier";
import { Filter, Menu, Pencil, Plus, Power, Timer } from "lucide-react";
import { SupplierFormModal } from "./components/SupplierFormModal";
import { ProviderMethodListModal } from "./components/ProviderMethodListModal";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { ActionsPopover } from "@/components/ActionsPopover";
import { StatusPill } from "@/components/StatusTag";
import { IconPaymentMethod } from "@/components/dashboard/icons";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { Headed } from "@/components/Headed";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;

const statusOptions = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Eliminados" },
];

export default function Providers() {
  const { showFlash, clearFlash } = useFlashMessage();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPaginationState((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchText]);

  const getSupplierDisplayName = (supplier: Supplier) => {
    const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
    return fullName || supplier.tradeName || "-";
  };

  const loadSuppliers = async () => {
    clearFlash();
    setLoading(true);
    setError(null);

    try {
      const res = await listSuppliers({
        page,
        limit: paginationState.pageSize,
        q: debouncedSearch || undefined,
        isActive: statusFilter === "active" ? "true" : "false",
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
      setError("Error al listar proveedores");
      showFlash(errorResponse("Error al listar proveedores"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, [page, paginationState.pageSize, debouncedSearch, statusFilter]);

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
      // {
      //   id: "note",
      //   header: "Nota",
      //   cell: (row) => <span className="text-black/70">{row.note ?? "-"}</span>,
      //   className: "text-black/70",
      //   showInCards: false,
      // },
      {
        id: "status",
        header: "Estado",
        cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
        headerClassName: "text-left",
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex items-center justify-end">
            <ActionsPopover
              actions={[
                {
                  id: "edit",
                  label: "Editar",
                  icon: <Pencil className="h-4 w-4" />,
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
                  onClick: () => {
                    setToggleSupplierId(row.supplierId);
                    setNextActiveState(!row.isActive);
                  },
                },
              ]}
              columns={1}
              triggerIcon={<Menu className="h-4 w-4" />}
              triggerVariant="ghost"
              compact
              popoverClassName="min-w-52 p-2"
              itemClassName="justify-start px-3 py-2 text-[11px]"
            />
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        showInCards: false,
      },
    ],
    [getSupplierDisplayName, openEdit, setMethodSupplierId, setNextActiveState, setToggleSupplierId]
  );

  const safePage = serverPagination.page;
  const effectiveLimit = serverPagination.limit;

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <PageTitle title="Proveedores" />

      <div className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pt-2
       sm:px-6 lg:px-8 2xl:max-w-[1700px] 3xl:max-w-[1700px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between my-4">
          <Headed
            title="Proveedores"
            size="lg"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-1 text-[10px]">
              Total: <span className="font-semibold text-black">{serverPagination.total}</span>
            </div>

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
              Nuevo proveedor
            </SystemButton>
          </div>
        </div>

        <section className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm space-y-4">
          <SectionHeaderForm icon={Filter} title="Filtros" />

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-[0.45fr_0.25fr_0.2fr]">
            <FloatingInput
              label="Buscar"
              name="provider-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="h-10 text-sm"
            />

            <FloatingSelect
              label="Estado"
              name="provider-status"
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => {
                setStatusFilter(value);
                setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="h-10 text-sm"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <DataTable
              tableId="providers-table"
              data={suppliers}
              columns={columns}
              rowKey="supplierId"
              loading={loading}
              emptyMessage="No hay proveedores con los filtros actuales."
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

            {error && <div className="px-4 py-3 text-sm text-rose-600">{String(error)}</div>}
        </section>
      </div>

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
    </div>
  );
}
