import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listSuppliers, updateSupplierActive } from "@/services/supplierService";
import type { Supplier } from "@/pages/providers/types/supplier";
import { Pencil, Plus, Power, Search, SlidersHorizontal, Timer } from "lucide-react";
import { SupplierFormModal } from "./components/SupplierFormModal";
import { useSidebarContext } from "@/components/dashboard/SidebarContext";
import { IconButton } from "@/components/IconBoton";
import { StatusPill } from "@/components/StatusTag";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";


export default function Providers() {
  const { showFlash, clearFlash } = useFlashMessage();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [toggleSupplierId, setToggleSupplierId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState(false);
  const { setCollapsed } = useSidebarContext();


  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);
  
  useEffect(() => {
      setCollapsed(true);
  }, []);

  const loadSuppliers = async () => {
    clearFlash();
    setLoading(true);
    setError(null);
    try {
      const res = await listSuppliers({
        page,
        limit,
        q: debouncedSearch || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false",
      });

      setSuppliers(res.items ?? []);
      const nextTotal = res.total ?? 0;
      const nextPage = res.page ?? page;
      const nextLimit = res.limit ?? limit;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / (nextLimit || limit)));
      setPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });
    } catch {
      setSuppliers([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      }));
      setError("Error al listar proveedores");
      showFlash(errorResponse("Error al listar proveedores"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, [page, debouncedSearch, statusFilter]);

  const safePage = Math.max(1, pagination.page || page);
  const totalPages = Math.max(1, pagination.totalPages);
  const startIndex = pagination.total === 0 ? 0 : (safePage - 1) * (pagination.limit || limit) + 1;
  const endIndex = Math.min(safePage * (pagination.limit || limit), pagination.total);

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

  const listKey = useMemo(() => `${page}|${statusFilter}|${debouncedSearch}`, [page, statusFilter, debouncedSearch]);
  const getSupplierDisplayName = (supplier: Supplier) => {
    const fullName = [supplier.name, supplier.lastName].filter(Boolean).join(" ").trim();
    return fullName || supplier.tradeName || "-";
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Proveedores" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-3 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Proveedores</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              Total: <span className="font-semibold text-black">{pagination.total}</span>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
              onClick={startCreate}
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
            >
              <Plus className="h-4 w-4" />
              Nuevo proveedor
            </button>
          </div>
        </div>

        <section className="bg-gray-50 shadow-sm  p-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_280px] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                placeholder="Buscar por nombre, documento, correo o telefono"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select
                className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Estado (todos)</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </section>

        <section className=" border-black/10 bg-white shadow-sm overflow-hidden"> 
          <div className="max-h-[calc(100vh-238px)] min-h-[calc(100vh-238px)] overflow-auto">
            <table className="w-full h-full table-fixed">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-black/10 text-xs text-black/60 text-[11px]">
                  <th className="py-3 px-5 text-left w-30">Documento</th>
                  <th className="py-3 px-5 text-left w-60">Proveedor</th>
                  <th className="py-3 px-5 text-left w-40">Email</th>
                  <th className="py-3 px-5 text-left w-25">Telefono</th>
                  <th className="py-3 px-5 text-left w-40">Direccion</th>
                  <th className="py-3 px-5 text-center w-25">T. Espera</th>
                  <th className="py-3 px-5 text-left w-30">Nota</th>
                  <th className="py-3 px-5 text-left w-20">Estado</th>
                  <th className="py-3 px-5 text-right w-30"></th>
                </tr>
              </thead>

              <tbody key={listKey}>
                {suppliers.map((supplier) => (
                  <tr key={supplier.supplierId} className="border-b border-black/5 text-[11px]">
                    <td className="py-3 px-5">
                      <div className="text-black/60 text-xs">{supplier.documentNumber}</div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-black/70">{getSupplierDisplayName(supplier)}</div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-black/70">{supplier.email || "-"}</div>
                    </td>
                    <td className="py-3 px-5 text-black/70">
                      <div>{supplier.phone || "-"}</div>
                    </td>
                    <td className="py-3 px-5 text-black/70">{supplier.address ?? "-"}</td>
                    <td className="py-3 px-5 text-black/70">
                      <div className="flex items-center justify-center gap-2">
                        {supplier.leadTimeDays ?? "-"}
                        <Timer className="h-4 w-4" />
                      </div>
                    </td>
                    <td className="py-3 px-5 text-black/70">{supplier.note ?? "-"}</td>
                    <td className="py-3 px-5">
                      <StatusPill active={supplier.isActive} PRIMARY={PRIMARY} />
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton
                          title="Editar"
                          onClick={() => openEdit(supplier.supplierId)}
                          PRIMARY={PRIMARY}
                          PRIMARY_HOVER={PRIMARY_HOVER}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          title={supplier.isActive ? "Desactivar" : "Activar"}
                          onClick={() => {
                             setToggleSupplierId(supplier.supplierId);
                             setNextActiveState(!supplier.isActive);
                          }}
                          tone={supplier.isActive ? "danger" : "primary"}
                          PRIMARY={PRIMARY}
                          PRIMARY_HOVER={PRIMARY_HOVER}
                      >
                          <Power className="h-4 w-4" />
                      </IconButton> 
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && suppliers.length === 0 && (
              <div className="px-5 py-8 text-sm text-black/60">No hay proveedores con los filtros actuales.</div>
            )}
            {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
            <span className="hidden sm:inline">
              Mostrando {startIndex}-{endIndex} de {pagination.total}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
                disabled={!pagination.hasPrev || loading}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                type="button"
              >
                Anterior
              </button>

              <span className="tabular-nums">Pagina {safePage} de {totalPages}</span>

              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
                disabled={!pagination.hasNext || loading}
                onClick={() => setPage(safePage + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      <SupplierFormModal
        open={openCreate}
        mode="create"
        onClose={() => setOpenCreate(false)}
        onSaved={() => {
          setPage(1);
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
        <Modal title={nextActiveState ? "Activar proveedor" : "Desactivar proveedor"} onClose={() => setToggleSupplierId(null)} className="max-w-md">
          <p className="text-sm text-black/70">
            {nextActiveState ? "Se activara el proveedor nuevamente." : "Se desactivara el proveedor seleccionado."}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg border border-black/10 px-4 py-2 text-sm" onClick={() => setToggleSupplierId(null)}>
              Cancelar
            </button>
            <button
              className="rounded-lg border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
              onClick={confirmToggleActive}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


