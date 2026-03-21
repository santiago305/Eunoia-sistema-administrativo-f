import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listSuppliers, updateSupplierActive } from "@/services/supplierService";
import type { Supplier } from "@/pages/providers/types/supplier";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { SupplierFormModal } from "./components/SupplierFormModal";
import { ProviderMethodListModal } from "./components/ProviderMethodListModal";
import { ProviderExpandedRow } from "./components/data-table/ProviderExpandedRow";
import { getProvidersColumns } from "./components/data-table/Provider.columns";
import { providerExpandedFields } from "./components/data-table/providerExpandedFields";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTableColumnMenu } from "@/components/data-table/DataTableColumnMenu";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { hasHiddenExpandableFields } from "@/components/data-table/expanded-hidden-fields/hasHiddenExpandableFields";

import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
  type PaginationState,
  type VisibilityState,
} from "@tanstack/react-table";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;

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

  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });

  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    tradeName: false,
    address: false,
    note: false,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

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
      setExpanded({});
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

  useEffect(() => {
    setExpanded({});
  }, [columnVisibility]);

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

  const columns = useMemo(
    () =>
      getProvidersColumns({
        primaryColor: PRIMARY,
        columnVisibility,
        getSupplierDisplayName,
        onEdit: openEdit,
        onOpenMethods: setMethodSupplierId,
        onToggleActive: (supplier) => {
          setToggleSupplierId(supplier.supplierId);
          setNextActiveState(!supplier.isActive);
        },
      }),
    [columnVisibility]
  );
  const canExpandRows = useMemo(
    () => hasHiddenExpandableFields(providerExpandedFields, columnVisibility),
    [columnVisibility]
  );

  const table = useReactTable({
    data: suppliers,
    columns,
    state: {
      pagination: paginationState,
      expanded,
      columnVisibility,
    },
    onPaginationChange: setPaginationState,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => canExpandRows,
    getRowId: (row) => row.supplierId,
    manualPagination: true,
    pageCount: serverPagination.totalPages,
  });

  const safePage = serverPagination.page;
  const totalPages = serverPagination.totalPages;
  const startIndex =
    serverPagination.total === 0 ? 0 : (safePage - 1) * serverPagination.limit + 1;
  const endIndex = Math.min(safePage * serverPagination.limit, serverPagination.total);

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <PageTitle title="Proveedores" />

      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-3 sm:px-6 lg:px-8 2xl:max-w-[1700px] 3xl:max-w-[1900px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Proveedores</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              Total: <span className="font-semibold text-black">{serverPagination.total}</span>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
              onClick={startCreate}
              style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
            >
              <Plus className="h-4 w-4" />
              Nuevo proveedor
            </button>
          </div>
        </div>

        <section className="space-y-3 bg-gray-50 p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_280px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)` } as CSSProperties}
                placeholder="Buscar por nombre, documento, correo o telefono"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select
                className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)` } as CSSProperties}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPaginationState((prev) => ({
                    ...prev,
                    pageIndex: 0,
                  }));
                  setExpanded({});
                }}
              >
                <option value="active">Activos</option>
                <option value="inactive">Eliminados</option>
              </select>
            </div>

            <DataTableColumnMenu
              table={table}
              open={showColumnMenu}
              onToggleOpen={() => setShowColumnMenu((prev) => !prev)}
              hiddenColumnIds={["expander", "actions"]}
            />
          </div>
        </section>

        <section className="overflow-hidden bg-white shadow-sm">
          <DataTable
            table={table}
            loading={loading}
            error={error}
            emptyMessage="No hay proveedores con los filtros actuales."
            renderExpandedRow={(row) => (
              <ProviderExpandedRow
                supplier={row.original}
                columnVisibility={columnVisibility}
              />
            )}
            headerCellClassName={(header) => {
              if (header.column.id === "actions") return "px-5 py-3 text-right";
              if (header.column.id === "leadTimeDays") return "px-5 py-3 text-center";
              if (header.column.id === "expander") return "px-5 py-3 text-center";
              return "px-5 py-3 text-left";
            }}
            bodyCellClassName={(cell) => {
              if (cell.column.id === "actions") return "px-5 py-3 align-middle text-right";
              if (cell.column.id === "leadTimeDays") return "px-5 py-3 align-middle text-center";
              if (cell.column.id === "expander") return "px-5 py-3 align-middle text-center";
              return "px-5 py-3 align-middle";
            }}
          />

          <DataTablePagination
            loading={loading}
            total={serverPagination.total}
            page={safePage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={paginationState.pageSize}
            hasPrev={serverPagination.hasPrev}
            hasNext={serverPagination.hasNext}
            onPageSizeChange={(value) => {
              setPaginationState({
                pageIndex: 0,
                pageSize: value,
              });
              setExpanded({});
            }}
            onPrevious={() => table.previousPage()}
            onNext={() => table.nextPage()}
          />
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
            <button
              className="rounded-lg border border-black/10 px-4 py-2 text-sm"
              onClick={() => setToggleSupplierId(null)}
            >
              Cancelar
            </button>

            <button
              className="rounded-lg border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
              onClick={confirmToggleActive}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {methodSupplierId && (
        <ProviderMethodListModal
          title="Metodos de pago del proveedor"
          supplierId={methodSupplierId}
          close={() => setMethodSupplierId(null)}
          className="max-w-[600px]"
        />
      )}
    </div>
  );
}
