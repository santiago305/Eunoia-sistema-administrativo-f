import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { useProducts } from "@/hooks/useProducts";

export default function CatalogProducts() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isActive: true });
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      isActive: statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false",
      q: searchText.trim() || undefined,
    }),
    [page, limit, statusFilter, searchText]
  );

  const {
    items: products,
    total,
    page: apiPage,
    limit: apiLimit,
    loading,
    error,
    create,
    update,
    setActive,
  } = useProducts(queryParams);

  useEffect(() => {
    if (apiPage && apiPage !== page) {
      setPage(apiPage);
    }
  }, [apiPage, page]);

  const effectiveLimit = apiLimit ?? limit;
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * effectiveLimit + 1;
  const endIndex = Math.min(apiPage * effectiveLimit, total);

  const startCreate = () => {
    setForm({ name: "", description: "", isActive: true });
    setOpenCreate(true);
  };

  const startEdit = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setForm({ name: product.name, description: product.description ?? "", isActive: product.isActive });
    setEditingProductId(productId);
  };

  const saveCreate = async () => {
    if (!form.name.trim()) return;
    await create({
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    });
    setOpenCreate(false);
  };

  const saveEdit = async () => {
    if (!editingProductId) return;
    await update(editingProductId, {
      name: form.name.trim() || undefined,
      description: form.description.trim() || null,
    });
    await setActive(editingProductId, form.isActive);
    setEditingProductId(null);
  };

  const confirmDelete = async () => {
    if (!deletingProductId) return;
    const product = products.find((p) => p.id === deletingProductId);
    if (product) {
      await setActive(deletingProductId, !product.isActive);
    }
    setDeletingProductId(null);
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catálogo · Productos" />
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Productos</h1>
            <p className="text-sm text-black/60">Catálogo maestro de productos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">
              Total: {total}
            </button>
            <button className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">
              Exportar CSV
            </button>
            <button
              className="rounded-full border border-black/10 bg-black text-white px-3 py-1 text-xs"
              onClick={startCreate}
            >
              Nuevo producto
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <input
              className="h-10 rounded-lg border border-black/10 px-3 text-sm"
              placeholder="Buscar por nombre o ID"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(1);
              }}
            />
            <select
              className="h-10 rounded-lg border border-black/10 px-3 text-sm bg-white"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Estado (todos)</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Listado de productos</p>
            <p className="text-xs text-black/60">Catálogo base</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-black/60">
                <tr className="border-b border-black/10">
                  <th className="py-2 text-left">Producto</th>
                  <th className="py-2 text-left">ID</th>
                  <th className="py-2 text-left">Variantes</th>
                  <th className="py-2 text-right">Disponible</th>
                  <th className="py-2 text-left">Stock</th>
                  <th className="py-2 text-left">Estado</th>
                  <th className="py-2 text-left">Descripción</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const totalAvailable = 0;
                  return (
                    <tr key={product.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{product.name}</td>
                      <td className="py-3 text-black/60">{product.id}</td>
                      <td className="py-3 text-black/70">-</td>
                      <td className="py-3 text-right font-semibold">{totalAvailable}</td>
                      <td className="py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                            totalAvailable > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {totalAvailable > 0 ? "En stock" : "Sin stock"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                            product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 text-black/70">{product.description}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-black/10"
                            onClick={() => startEdit(product.id)}
                          >
                            Editar
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-black/10"
                            onClick={() => setDeletingProductId(product.id)}
                          >
                            {product.isActive ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && !loading && (
              <p className="mt-4 text-sm text-black/60">No hay productos con los filtros actuales.</p>
            )}
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-black/60">
            <span>Mostrando {startIndex}-{endIndex} de {total}</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-black/10 px-2 py-1 text-xs disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Anterior
              </button>
              <span>PÃ¡gina {page} de {totalPages}</span>
              <button
                className="rounded-md border border-black/10 px-2 py-1 text-xs disabled:opacity-40"
                disabled={page === totalPages || totalPages === 0}
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
        <Modal title="Nuevo producto" onClose={() => setOpenCreate(false)} className="max-w-lg">
          <div className="space-y-3">
            <label className="text-sm">
              Nombre
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Descripción
              <textarea
                className="mt-2 min-h-[90px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Estado
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={() => setOpenCreate(false)}>
              Cancelar
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={saveCreate}>
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {editingProductId && (
        <Modal title="Editar producto" onClose={() => setEditingProductId(null)} className="max-w-lg">
          <div className="space-y-3">
            <label className="text-sm">
              Nombre
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Descripción
              <textarea
                className="mt-2 min-h-[90px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Estado
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-black/10 px-3 py-2 text-sm"
              onClick={() => setEditingProductId(null)}
            >
              Cancelar
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={saveEdit}>
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {deletingProductId && (
        <Modal title="Cambiar estado" onClose={() => setDeletingProductId(null)} className="max-w-md">
          <p>¿Seguro que quieres cambiar el estado de este producto?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-black/10 px-3 py-2 text-sm"
              onClick={() => setDeletingProductId(null)}
            >
              Cancelar
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={confirmDelete}>
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
