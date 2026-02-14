import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { createVariant, getVariantById, listVariants, updateVariant, updateVariantActive } from "@/services/catalogService";
import { listProducts } from "@/services/productService";
import type { Variant } from "@/types/variant";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pencil, Plus, Power, Search, SlidersHorizontal } from "lucide-react";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";

type ProductOption = { productId: string; name: string };
type VariantForm = {
  productId: string;
  barcode: string;
  price: string;
  cost: string;
  attribute: "presentation" | "variant" | "color";
  attributeValue: string;
  isActive: boolean;
};

export default function CatalogVariants() {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash, clearFlash } = useFlashMessage();
  const [searchParams] = useSearchParams();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [total, setTotal] = useState(0);
  const [apiPage, setApiPage] = useState(1);
  const [apiLimit, setApiLimit] = useState(limit);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState<boolean>(false);

  const [form, setForm] = useState<VariantForm>({
    productId: "",
    barcode: "",
    price: "",
    cost: "",
    attribute: "presentation",
    attributeValue: "",
    isActive: true,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const loadProducts = async () => {
    try {
      const batch = 100;
      const first = await listProducts({ page: 1, limit: batch });
      const all = [...(first.items ?? [])];
      const pages = Math.max(1, Math.ceil((first.total ?? all.length) / batch));
      for (let p = 2; p <= pages; p += 1) {
        const res = await listProducts({ page: p, limit: batch });
        if (res.items?.length) all.push(...res.items);
      }
      setProducts(all.map((p) => ({ productId: p.id, name: p.name })));
    } catch {
      setProducts([]);
      showFlash(errorResponse("Error al cargar productos"));
    }
  };

  const loadVariants = async () => {
    clearFlash();
    setLoading(true);
    try {
      const res = await listVariants({
        page,
        limit,
        q: debouncedSearch || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false",
        productId: productFilter || undefined,
      });
      setVariants(res.items ?? []);
      setTotal(res.total ?? 0);
      setApiPage(res.page ?? page);
      setApiLimit(res.limit ?? limit);
    } catch {
      setVariants([]);
      setTotal(0);
      showFlash(errorResponse("Error al listar variantes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    void loadVariants();
  }, [page, debouncedSearch, statusFilter, productFilter]);

  useEffect(() => {
    if (apiPage !== page) setPage(apiPage);
  }, [apiPage, page]);

  useEffect(() => {
    const productId = searchParams.get("productId") ?? "";
    const create = searchParams.get("create") === "1";
    if (!productId) return;
    setProductFilter(productId);
    setForm((prev) => ({ ...prev, productId }));
    if (create) setOpenCreate(true);
  }, [searchParams]);

  const totalPages = Math.max(1, Math.ceil(total / (apiLimit || limit)));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * (apiLimit || limit) + 1;
  const endIndex = Math.min(apiPage * (apiLimit || limit), total);

  const openNew = () => {
    setForm({
      productId: productFilter || "",
      barcode: "",
      price: "",
      cost: "",
      attribute: "presentation",
      attributeValue: "",
      isActive: true,
    });
    setOpenCreate(true);
  };

  const openEdit = async (id: string) => {
    try {
      const row = await getVariantById(id);
      setForm({
        productId: row.productId,
        barcode: row.barcode ?? "",
        price: String(row.price ?? ""),
        cost: String(row.cost ?? ""),
        attribute: row.attributes?.variant ? "variant" : row.attributes?.color ? "color" : "presentation",
        attributeValue: row.attributes?.variant ?? row.attributes?.color ?? row.attributes?.presentation ?? "",
        isActive: row.isActive,
      });
      setEditingVariantId(id);
    } catch {
      showFlash(errorResponse("No se pudo cargar la variante"));
    }
  };

  const saveCreate = async () => {
    if (!form.productId) return;
    try {
      const attributes: Record<string, string> = {};
      if (form.attributeValue.trim()) attributes[form.attribute] = form.attributeValue.trim();
      await createVariant({
        productId: form.productId,
        barcode: form.barcode.trim() || undefined,
        attributes: Object.keys(attributes).length ? attributes : undefined,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        isActive: form.isActive,
      });
      setOpenCreate(false);
      await loadVariants();
      showFlash(successResponse("Variante creada"));
    } catch {
      showFlash(errorResponse("Error al crear variante"));
    }
  };

  const saveEdit = async () => {
    if (!editingVariantId) return;
    try {
      const attributes: Record<string, string> = {};
      if (form.attributeValue.trim()) attributes[form.attribute] = form.attributeValue.trim();
      await updateVariant(editingVariantId, {
        barcode: form.barcode.trim() || null,
        attributes: Object.keys(attributes).length ? attributes : undefined,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
      });
      setEditingVariantId(null);
      await loadVariants();
      showFlash(successResponse("Variante actualizada"));
    } catch {
      showFlash(errorResponse("Error al editar variante"));
    }
  };

  const confirmToggleActive = async () => {
    if (!deletingVariantId) return;
    try {
      await updateVariantActive(deletingVariantId, { isActive: nextActiveState });
      setDeletingVariantId(null);
      await loadVariants();
      showFlash(successResponse(nextActiveState ? "Variante restaurada" : "Variante desactivada"));
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catalogo · Variantes" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Variantes (SKU)</h1>
            <p className="text-sm text-black/60">Gestion de variantes conectada por API.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">Total: <span className="font-semibold text-black">{total}</span></div>
            <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2" style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY; }}>
              <Plus className="h-4 w-4" /> Nueva variante
            </button>
          </div>
        </motion.div>

        <motion.section initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px_240px] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2" style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties} placeholder="Buscar por SKU, producto o ID" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2" style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties} value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}>
                <option value="">Producto (todos)</option>
                {products.map((p) => <option key={p.productId} value={p.productId}>{p.name}</option>)}
              </select>
            </div>
            <select className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2" style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">Estado (todos)</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </motion.section>

        <section className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
            <p className="text-sm font-semibold">Listado de variantes</p>
            <p className="text-xs text-black/60">{loading ? "Cargando..." : `Mostrando ${startIndex}-${endIndex} de ${total}`}</p>
          </div>
          <div className="max-h-[calc(100vh-330px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-3 px-5 text-left">SKU</th>
                  <th className="py-3 px-5 text-left">Producto</th>
                  <th className="py-3 px-5 text-left">Atributo</th>
                  <th className="py-3 px-5 text-right">Precio</th>
                  <th className="py-3 px-5 text-right">Costo</th>
                  <th className="py-3 px-5 text-left">Estado</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <AnimatePresence mode="wait" initial={false}>
                <motion.tbody key={`${page}|${statusFilter}|${productFilter}|${debouncedSearch}`} initial={shouldReduceMotion ? false : { opacity: 0 }} animate={shouldReduceMotion ? false : { opacity: 1 }} exit={shouldReduceMotion ? undefined : { opacity: 0 }}>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-b border-black/5">
                      <td className="py-3 px-5 font-medium">{v.sku}</td>
                      <td className="py-3 px-5 text-black/70">{v.productName ?? "-"}</td>
                      <td className="py-3 px-5 text-black/60">{v.attributes?.presentation ?? v.attributes?.variant ?? v.attributes?.color ?? "-"}</td>
                      <td className="py-3 px-5 text-right">{Number(v.price).toFixed(2)}</td>
                      <td className="py-3 px-5 text-right">{v.cost ? Number(v.cost).toFixed(2) : "-"}</td>
                      <td className="py-3 px-5">
                        <span className={["inline-flex rounded-full px-2 py-1 text-[11px] font-medium", v.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"].join(" ")}>{v.isActive ? "Activo" : "Inactivo"}</span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]" onClick={() => void openEdit(v.id)}><Pencil className="h-4 w-4" /></button>
                          <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]" onClick={() => { setDeletingVariantId(v.id); setNextActiveState(!v.isActive); }}><Power className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </table>
            {!loading && variants.length === 0 && <div className="px-5 py-8 text-sm text-black/60">No hay variantes con los filtros actuales.</div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
            <span className="hidden sm:inline">Mostrando {startIndex}-{endIndex} de {total}</span>
            <div className="flex items-center gap-2">
              <button className="rounded-2xl border border-black/10 bg-white px-3 py-2 disabled:opacity-40" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span>Pagina {page} de {totalPages}</span>
              <button className="rounded-2xl border border-black/10 bg-white px-3 py-2 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          </div>
        </section>
      </div>

      {openCreate && (
        <Modal title="Nueva variante" onClose={() => setOpenCreate(false)} className="max-w-lg">
          <VariantFormFields form={form} setForm={setForm} products={products} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenCreate(false)}>Cancelar</button>
            <button className="rounded-2xl border px-4 py-2 text-sm text-white" style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }} onClick={() => void saveCreate()} disabled={!form.productId}>Guardar</button>
          </div>
        </Modal>
      )}

      {editingVariantId && (
        <Modal title="Editar variante" onClose={() => setEditingVariantId(null)} className="max-w-lg">
          <VariantFormFields form={form} setForm={setForm} products={products} disableProduct />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setEditingVariantId(null)}>Cancelar</button>
            <button className="rounded-2xl border px-4 py-2 text-sm text-white" style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }} onClick={() => void saveEdit()}>Guardar cambios</button>
          </div>
        </Modal>
      )}

      {deletingVariantId && (
        <Modal title={nextActiveState ? "Restaurar variante" : "Desactivar variante"} onClose={() => setDeletingVariantId(null)} className="max-w-md">
          <p className="text-sm text-black/70">{nextActiveState ? "Se activara la variante nuevamente." : "Se desactivara la variante seleccionada."}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setDeletingVariantId(null)}>Cancelar</button>
            <button className="rounded-2xl border px-4 py-2 text-sm text-white" style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }} onClick={() => void confirmToggleActive()}>Confirmar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function VariantFormFields({
  form,
  setForm,
  products,
  disableProduct = false,
}: {
  form: VariantForm;
  setForm: Dispatch<SetStateAction<VariantForm>>;
  products: ProductOption[];
  disableProduct?: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm">
        Producto
        <select className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white" value={form.productId} onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))} disabled={disableProduct}>
          <option value="">Seleccionar producto</option>
          {products.map((p) => <option key={p.productId} value={p.productId}>{p.name}</option>)}
        </select>
      </label>
      <label className="text-sm">
        Codigo de barras
        <input
          className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/50 cursor-not-allowed"
          value={form.barcode}
          onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
          disabled
          placeholder=""
        />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          Precio
          <input className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
        </label>
        <label className="text-sm">
          Costo
          <input className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm" value={form.cost} onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))} />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          Atributo
          <select className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white" value={form.attribute} onChange={(e) => setForm((prev) => ({ ...prev, attribute: e.target.value as VariantForm["attribute"] }))}>
            <option value="presentation">Presentacion</option>
            <option value="variant">Variante</option>
            <option value="color">Color</option>
          </select>
        </label>
        <label className="text-sm">
          Valor
          <input className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm" value={form.attributeValue} onChange={(e) => setForm((prev) => ({ ...prev, attributeValue: e.target.value }))} />
        </label>
      </div>
      <label className="text-sm">
        Estado
        <select className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white" value={form.isActive ? "active" : "inactive"} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </label>
    </div>
  );
}
