import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import {
  createSupplier,
  getSupplierById,
  listSuppliers,
  lookupSupplierIdentity,
  updateSupplier,
  updateSupplierActive,
} from "@/services/supplierService";
import type { Supplier, SupplierDniLookupData, SupplierForm, SupplierRucLookupData } from "@/types/supplier";
import { Pencil, Plus, Power, Search, SlidersHorizontal, Timer } from "lucide-react";
import { DocumentType } from "@/types/DocumentType";
import { SupplierFormFields } from "./components/FormProviders";

const PRIMARY = "#21b8a6";

export default function Providers() {
  const { showFlash, clearFlash } = useFlashMessage();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [apiPage, setApiPage] = useState(1);
  const [apiLimit, setApiLimit] = useState(limit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [toggleSupplierId, setToggleSupplierId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [form, setForm] = useState<SupplierForm>({
    documentType: DocumentType.DNI,
    documentNumber: "",
    name: "",
    lastName: "",
    tradeName: "",
    address: "",
    phone: "",
    email: "",
    note: "",
    leadTimeDays: "",
    isActive: true,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

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
      setTotal(res.total ?? 0);
      setApiPage(res.page ?? page);
      setApiLimit(res.limit ?? limit);
    } catch {
      setSuppliers([]);
      setTotal(0);
      setError("Error al listar proveedores");
      showFlash(errorResponse("Error al listar proveedores"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (apiPage !== page) setPage(apiPage);
  }, [apiPage, page]);

  const totalPages = Math.max(1, Math.ceil(total / (apiLimit || limit)));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * (apiLimit || limit) + 1;
  const endIndex = Math.min(apiPage * (apiLimit || limit), total);

  const startCreate = () => {
    setForm({
      documentType: DocumentType.DNI,
      documentNumber: "",
      name: "",
      lastName: "",
      tradeName: "",
      address: "",
      phone: "",
      email: "",
      note: "",
      leadTimeDays: "",
      isActive: true,
    });
    setEditingSupplierId(null);
    setOpenCreate(true);
  };

  const openEdit = async (supplierId: string) => {
    clearFlash();
    try {
      const supplier = await getSupplierById(supplierId);
      setForm({
        documentType: supplier.documentType ?? "",
        documentNumber: supplier.documentNumber ?? "",
        name: supplier.name ?? "",
        lastName: supplier.lastName ?? "",
        tradeName: supplier.tradeName ?? "",
        address: supplier.address ?? "",
        phone: supplier.phone ?? "",
        email: supplier.email ?? "",
        note: supplier.note ?? "",
        leadTimeDays: supplier.leadTimeDays ? String(supplier.leadTimeDays) : "",
        isActive: supplier.isActive,
      });
      setOpenCreate(false);
      setEditingSupplierId(supplierId);
    } catch {
      showFlash(errorResponse("No se pudo cargar el proveedor"));
    }
  };

  const buildPayload = () => ({
    documentType: form.documentType.trim(),
    documentNumber: form.documentNumber.trim(),
    name: form.name.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    tradeName: form.tradeName.trim() || undefined,
    address: form.address.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    note: form.note.trim() || undefined,
    leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
    isActive: form.isActive,
  });

  const saveSupplier = async () => {
    if (!form.documentType.trim() || !form.documentNumber.trim()) return;
    clearFlash();
    try {
      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, buildPayload());
        showFlash(successResponse("Proveedor actualizado"));
        setEditingSupplierId(null);
      } else {
        await createSupplier(buildPayload());
        setOpenCreate(false);
        showFlash(successResponse("Proveedor creado"));
      }
      await loadSuppliers();
    } catch {
      showFlash(errorResponse(editingSupplierId ? "Error al actualizar proveedor" : "Error al crear proveedor"));
    }
  };

  const lookupIdentity = async () => {
      if (!form.documentType.trim() || !form.documentNumber.trim()) return;
      clearFlash();
      setLookupLoading(true);

      try {
          const result = await lookupSupplierIdentity({
              documentType: form.documentType,
              documentNumber: form.documentNumber.trim(),
          });
          const payload = result?.data;
          if (!payload) {
              showFlash(errorResponse("No se pudo obtener la identidad"));
              return;
          }
          if (form.documentType === DocumentType.DNI && "name" in payload) {
              const data = payload as SupplierDniLookupData;

              setForm((prev) => ({
                  ...prev,
                  documentNumber: result.documentNumber ?? prev.documentNumber,
                  name: data.name || prev.name,
                  lastName: data.lastName || prev.lastName,
              }));

              showFlash(successResponse("Datos actualizados"));
              return;
          }
          if (form.documentType === DocumentType.RUC && "tradeName" in payload) {
              const data = payload as SupplierRucLookupData;

              setForm((prev) => ({
                  ...prev,
                  documentNumber: result.documentNumber ?? prev.documentNumber,
                  tradeName: data.tradeName || prev.tradeName,
                  address: data.address || prev.address,
              }));

              showFlash(successResponse("Datos actualizados"));
              return;
          }
          showFlash(errorResponse("Tipo de documento no soportado"));
      } catch {
          showFlash(errorResponse("No se pudo obtener la identidad"));
      } finally {
          setLookupLoading(false);
      }
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

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Proveedores" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              Total: <span className="font-semibold text-black">{total}</span>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
              onClick={startCreate}
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
            >
              <Plus className="h-4 w-4" />
              Nuevo proveedor
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_280px] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                placeholder="Buscar por nombre, documento, correo o telefono"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select
                className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
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

        <section className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
            <p className="text-sm font-semibold">Listado de proveedores</p>
            <div className="text-xs text-black/60 hidden sm:block">
              {loading ? "Cargando..." : `Mostrando ${startIndex}-${endIndex} de ${total}`}
            </div>
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-3 px-5 text-left">Documento</th>
                  <th className="py-3 px-5 text-left">Proveedor</th>
                  <th className="py-3 px-5 text-left">Email</th>
                  <th className="py-3 px-5 text-left">Telefono</th>
                  <th className="py-3 px-5 text-left">Dirección</th>
                  <th className="py-3 px-5 text-center">Tiempo de espera</th>
                  <th className="py-3 px-5 text-left">Nota</th>
                  <th className="py-3 px-5 text-left">Estado</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody key={listKey}>
                {suppliers.map((supplier) => (
                  <tr key={supplier.supplierId} className="border-b border-black/5">
                    <td className="py-3 px-5">
                      <div className="text-black/60 text-xs">{supplier.documentNumber}</div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-black/70">{ supplier.name + " " + supplier.lastName || supplier.tradeName}</div>
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
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                          supplier.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                        ].join(" ")}
                      >
                        {supplier.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]"
                          onClick={() => void openEdit(supplier.supplierId)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]
                             ${supplier.isActive ? "text-rose-500" : "text-emerald-500"}`}
                          
                          onClick={() => {
                            setToggleSupplierId(supplier.supplierId);
                            setNextActiveState(!supplier.isActive);
                          }}
                          title={supplier.isActive ? "Desactivar" : "Activar"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
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
              Mostrando {startIndex}-{endIndex} de {total}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Anterior
              </button>

              <span className="tabular-nums">Pagina {page} de {totalPages}</span>

              <button
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      {openCreate && (
        <Modal title="Nuevo proveedor" onClose={() => setOpenCreate(false)} className="max-w-[750px]">
          <SupplierFormFields
            form={form}
            setForm={setForm}
            PRIMARY={PRIMARY}
            onLookupIdentity={lookupIdentity}
            lookupDisabled={lookupLoading || !form.documentType.trim() || !form.documentNumber.trim()}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenCreate(false)}>
              Cancelar
            </button>
            <button
              className="rounded-2xl border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
              onClick={saveSupplier}
              disabled={!form.documentType.trim() || !form.documentNumber.trim()}
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {editingSupplierId && (
        <Modal title="Editar proveedor" onClose={() => setEditingSupplierId(null)} className="max-w-[750px]">
          <SupplierFormFields
            form={form}
            setForm={setForm}
            PRIMARY={PRIMARY}
            onLookupIdentity={lookupIdentity}
            lookupDisabled={lookupLoading || !form.documentType.trim() || !form.documentNumber.trim()}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setEditingSupplierId(null)}>
              Cancelar
            </button>
            <button
              className="rounded-2xl border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
              onClick={saveSupplier}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {toggleSupplierId && (
        <Modal title={nextActiveState ? "Activar proveedor" : "Desactivar proveedor"} onClose={() => setToggleSupplierId(null)} className="max-w-md">
          <p className="text-sm text-black/70">
            {nextActiveState ? "Se activara el proveedor nuevamente." : "Se desactivara el proveedor seleccionado."}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setToggleSupplierId(null)}>
              Cancelar
            </button>
            <button
              className="rounded-2xl border px-4 py-2 text-sm text-white"
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
