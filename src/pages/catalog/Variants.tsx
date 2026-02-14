import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import {createVariant, listVariants, updateVariant, updateVariantActive} from '@/services/catalogService';
import {Variant} from '@/types/variant'
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";

export default function CatalogVariants() {

  const { showFlash, clearFlash } = useFlashMessage();
  const [stock, setStock] = useState({ inventory: [] });
  const [searchText, setSearchText] = useState("");
  const [handleActive, setHandleActive] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    productId: "",
    sku: "",
    barcode: "",
    price: "",
    cost: "",
    attribute: "presentation",
    attributeValue: "",
    isActive: true,
  });

  const loadCatalog = async() =>{
    clearFlash();
    try {
      const res = await listVariants({
        page:1,
        limit:20,
        q:searchText || undefined
      }); 
      setVariants(res.items);
    } catch{
      showFlash(errorResponse("Error al listar variantes"));
    }
  }
  
  const products = variants.reduce<{ productId: string; name: string }[]>((acc, v) => {
      if (!acc.some((p) => p.productId === v.productId)) {
          acc.push({ productId: v.productId, name: v.productName || "Sin nombre" });
      }
      return acc;
  }, []);

  useEffect(()=>{
    loadCatalog()
  }, []);

  const rows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return variants.filter((variant) => {
      const matchesSearch =
        search.length === 0 ||
        variant.sku.toLowerCase().includes(search) ||
        variant.id.toLowerCase().includes(search) ||
        (variant.productName ?? "").toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && variant.isActive) ||
        (statusFilter === "inactive" && !variant.isActive);
      const matchesProduct = productFilter.length === 0 || variant.productId === productFilter;
      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [productFilter, searchText, statusFilter, variants]);

  const startCreate = () => {
    setForm({
      productId: "",
      sku: "",
      barcode: "",
      price: "",
      cost: "",
      attribute: "presentation",
      attributeValue: "",
      isActive: true,
    });
    setOpenCreate(true);
  };

  const startEdit = (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    setForm({
      productId: variant.productId,
      sku: variant.sku,
      barcode: variant.barcode ?? "",
      price: String(variant.price ?? ""),
      cost: variant.cost ? String(variant.cost) : "",
      attribute: variant.attributes?.variant
        ? "variant"
        : variant.attributes?.color
          ? "color"
          : "presentation",
      attributeValue:
        (variant.attributes?.variant as string | undefined) ??
        (variant.attributes?.color as string | undefined) ??
        (variant.attributes?.presentation as string | undefined) ??
        "",
      isActive: variant.isActive,
    });
    setEditingVariantId(variantId);
  };

  const saveCreate = async () => {
      try {
          const attributes: Record<string, string> = {};
          if (form.attributeValue.trim()) {
              attributes[form.attribute] = form.attributeValue.trim();
          }

          await createVariant({
              productId: form.productId,
              barcode: form.barcode.trim() || undefined,
              attributes: Object.keys(attributes).length ? attributes : undefined,
              price: Number(form.price) || 0,
              cost: Number(form.cost) || 0,
              isActive: form.isActive,
          });

          setOpenCreate(false);
          await loadCatalog();
          showFlash(successResponse("Variante creada"));
      } catch {
          showFlash(errorResponse("Error al crear variante"));
      }
  };

  const saveEdit = async () => {
      if (!editingVariantId) return;
      try {
          const attributes: Record<string, string> = {};
          if (form.attributeValue.trim()) {
              attributes[form.attribute] = form.attributeValue.trim();
          }

          await updateVariant(editingVariantId, {
              barcode: form.barcode.trim() || null,
              attributes: Object.keys(attributes).length ? attributes : undefined,
              price: Number(form.price) || 0,
              cost: Number(form.cost) || 0,
          });

          setEditingVariantId(null);
          await loadCatalog();
          showFlash(successResponse("Variante actualizada"));
      } catch {
          showFlash(errorResponse("Error al editar variante"));
      }
  };

  const confirmDelete = async () => {
      if (!deletingVariantId) return;
      try {
          await updateVariantActive(deletingVariantId,  {isActive:handleActive});
          setDeletingVariantId(null);
          await loadCatalog();
          showFlash(successResponse("Variante eliminada"));
      } catch {
          showFlash(errorResponse("Error al eliminar variante"));
      }
  };
  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stock.inventory) {
      const available = item.on_hand - item.reserved;
      map.set(item.id, (map.get(item.id) ?? 0) + available);
    }
    return map;
  }, [stock.inventory]);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catálogo · Variantes" />
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Variantes (SKU)</h1>
            <p className="text-sm text-black/60">Presentaciones y precios por producto.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">
              Total: {variants.length}
            </button>
            <button
              className="rounded-full border border-black/10 bg-black text-white px-3 py-1 text-xs"
              onClick={startCreate}
            >
              Nueva variante
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3">
            <input
              className="h-10 rounded-lg border border-black/10 px-3 text-sm"
              placeholder="Buscar por SKU, producto o ID"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-black/10 px-3 text-sm bg-white"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
            >
              <option value="">Producto (todos)</option>
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.name}
                </option>
              ))}
            </select>
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
            <p className="text-sm font-semibold">Listado de variantes</p>
            <p className="text-xs text-black/60">SKU y pricing</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-black/60">
                <tr className="border-b border-black/10">
                  <th className="py-2 text-left">SKU</th>
                  <th className="py-2 text-left">Producto</th>
                  <th className="py-2 text-left">Presentación</th>
                  <th className="py-2 text-right">Precio</th>
                  <th className="py-2 text-right">Costo</th>
                  <th className="py-2 text-right">Disponible</th>
                  <th className="py-2 text-left">Stock</th>
                  <th className="py-2 text-left">Estado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((variant) => {
                  const available = stockByVariant.get(variant.id) ?? 0;
                  return (
                    <tr key={variant.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{variant.sku}</td>
                      <td className="py-3 text-black/70">{variant.productName}</td>
                      <td className="py-3 text-black/60">
                        {variant.attributes?.presentation ??
                        variant.attributes?.variant ??
                        variant.attributes?.color ??
                        "-"}
                      </td>
                      <td className="py-3 text-right">{variant.price.toFixed(2)}</td>
                      <td className="py-3 text-right">{variant.cost ? variant.cost.toFixed(2) : "-"}</td>
                      <td className="py-3 text-right font-semibold">{available}</td>
                      <td className="py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                            available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {available > 0 ? "En stock" : "Sin stock"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                            variant.isActive? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {variant.isActive? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-black/10"
                            onClick={() => startEdit(variant.id)}
                          >
                            Editar
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-black/10"
                            onClick={() => {
                                setDeletingVariantId(variant.id); 
                                variant.isActive ? setHandleActive(false): setHandleActive(true)
                              }
                            }
                          >
                           {variant.isActive ? "Eliminar" : "Restaurar"} 
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="mt-4 text-sm text-black/60">No hay variantes con los filtros actuales.</p>
            )}
          </div>
        </section>
      </div>

      {openCreate && (
        <Modal title="Nueva variante" onClose={() => setOpenCreate(false)} className="max-w-lg">
          <div className="space-y-3">
            <label className="text-sm">
              Producto
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.productId}
                onChange={(event) => setForm({ ...form, productId: event.target.value })}
              >
                <option value="">Seleccionar producto</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            {/* <label className="text-sm">
              SKU
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </label> */}
            <label className="text-sm">
              Código de barras
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.barcode}
                onChange={(event) => setForm({ ...form, barcode: event.target.value })}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                Precio
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </label>
              <label className="text-sm">
                Costo
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  value={form.cost}
                  onChange={(event) => setForm({ ...form, cost: event.target.value })}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                Atributo
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                  value={form.attribute}
                  onChange={(event) => setForm({ ...form, attribute: event.target.value })}
                >
                  <option value="presentation">Presentación</option>
                  <option value="variant">Variante</option>
                  <option value="color">Color</option>
                </select>
              </label>
              <label className="text-sm">
                Valor
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  value={form.attributeValue}
                  onChange={(event) => setForm({ ...form, attributeValue: event.target.value })}
                />
              </label>
            </div>
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
            <button
              className="rounded-md border border-black/10 px-3 py-2 text-sm"
              onClick={saveCreate}
              disabled={!form.productId}
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {editingVariantId && (
        <Modal title="Editar variante" onClose={() => setEditingVariantId(null)} className="max-w-lg">
          <div className="space-y-3">
            <label className="text-sm">
              Producto
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.productId}
                onChange={(event) => setForm({ ...form, productId: event.target.value })}
              >
                <option value="">Seleccionar producto</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            {/* <label className="text-sm">
              SKU
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </label> */}
            <label className="text-sm">
              Código de barras
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.barcode}
                onChange={(event) => setForm({ ...form, barcode: event.target.value })}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                Precio
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </label>
              <label className="text-sm">
                Costo
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  value={form.cost}
                  onChange={(event) => setForm({ ...form, cost: event.target.value })}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                Atributo
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                  value={form.attribute}
                  onChange={(event) => setForm({ ...form, attribute: event.target.value })}
                >
                  <option value="presentation">Presentación</option>
                  <option value="variant">Variante</option>
                  <option value="color">Color</option>
                </select>
              </label>
              <label className="text-sm">
                Valor
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  value={form.attributeValue}
                  onChange={(event) => setForm({ ...form, attributeValue: event.target.value })}
                />
              </label>
            </div>
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
              onClick={() => setEditingVariantId(null)}
            >
              Cancelar
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={saveEdit}>
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {deletingVariantId && (
        <Modal title= {handleActive? "Restaurar variante" :  "Eliminar variante"} 
          onClose={() => setDeletingVariantId(null)} className="max-w-md">
          <p>¿Estás seguro que quieres {handleActive? "restaurar" : "eliminar"} esta variante?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-black/10 px-3 py-2 text-sm"
              onClick={() => setDeletingVariantId(null)}
            >
              Cancelar
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-sm" onClick={confirmDelete}>
             {handleActive? "Restaurar" : "Eliminar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
