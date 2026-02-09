import { useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { getCatalogMock } from "@/data/catalogService";
import { getStockMock } from "@/data/stockService";
import { Modal } from "@/components/settings/modal";

export default function CatalogProducts() {
  const catalog = getCatalogMock();
  const stock = getStockMock();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [products, setProducts] = useState(catalog.products);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true });

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const variant of catalog.variants) {
      const label =
        (variant.attributes?.variante as string | undefined) ??
        (variant.attributes?.color as string | undefined) ??
        (variant.attributes?.presentacion as string | undefined) ??
        variant.sku;
      const list = map.get(variant.product_id) ?? [];
      list.push(label);
      map.set(variant.product_id, list);
    }
    return map;
  }, [catalog.variants]);

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stock.inventory) {
      const available = item.on_hand - item.reserved;
      map.set(item.variant_id, (map.get(item.variant_id) ?? 0) + available);
    }
    return map;
  }, [stock.inventory]);

  const rows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search) ||
        product.product_id.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [products, searchText, statusFilter]);

  const startCreate = () => {
    setForm({ name: "", description: "", is_active: true });
    setOpenCreate(true);
  };

  const startEdit = (productId: string) => {
    const product = products.find((p) => p.product_id === productId);
    if (!product) return;
    setForm({ name: product.name, description: product.description ?? "", is_active: product.is_active });
    setEditingProductId(productId);
  };

  const saveCreate = () => {
    const nextId = `prod-${String(products.length + 1).padStart(3, "0")}`;
    setProducts((prev) => [
      ...prev,
      {
        product_id: nextId,
        name: form.name.trim() || "Producto nuevo",
        description: form.description.trim(),
        is_active: form.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setOpenCreate(false);
  };

  const saveEdit = () => {
    if (!editingProductId) return;
    setProducts((prev) =>
      prev.map((product) =>
        product.product_id === editingProductId
          ? {
              ...product,
              name: form.name.trim() || product.name,
              description: form.description.trim(),
              is_active: form.is_active,
              updated_at: new Date().toISOString(),
            }
          : product
      )
    );
    setEditingProductId(null);
  };

  const confirmDelete = () => {
    if (!deletingProductId) return;
    setProducts((prev) => prev.filter((product) => product.product_id !== deletingProductId));
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
              Total: {products.length}
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
              onChange={(event) => setSearchText(event.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-black/10 px-3 text-sm bg-white"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
                {rows.map((product) => {
                  const variants = variantsByProduct.get(product.product_id) ?? [];
                  const totalAvailable = catalog.variants
                    .filter((variant) => variant.product_id === product.product_id)
                    .reduce((acc, variant) => acc + (stockByVariant.get(variant.variant_id) ?? 0), 0);
                  return (
                    <tr key={product.product_id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{product.name}</td>
                      <td className="py-3 text-black/60">{product.product_id}</td>
                      <td className="py-3 text-black/70">
                        {variants.length > 0
                          ? variants
                              .map((variant) =>
                                variant.toLowerCase() === "ampolla" ? product.name : `${product.name} de ${variant}`
                              )
                              .join(", ")
                          : "-"}
                      </td>
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
                            product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {product.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 text-black/70">{product.description}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-black/10"
                            onClick={() => startEdit(product.product_id)}
                          >
                            Editar
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-black/10"
                            onClick={() => setDeletingProductId(product.product_id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="mt-4 text-sm text-black/60">No hay productos con los filtros actuales.</p>
            )}
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
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) => setForm({ ...form, is_active: event.target.value === "active" })}
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
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) => setForm({ ...form, is_active: event.target.value === "active" })}
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
        <Modal title="Eliminar producto" onClose={() => setDeletingProductId(null)} className="max-w-md">
          <p>¿Estás seguro que quieres eliminar este producto?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-black/10 px-3 py-2 text-sm"
              onClick={() => setDeletingProductId(null)}
            >
              Cancelar
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={confirmDelete}>
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
