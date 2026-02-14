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
  attribute: "" | "presentation" | "variant" | "color";
  attributeValue: string;
  isActive: boolean | null;
};

export default function CatalogVariants() {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash, clearFlash } = useFlashMessage();
  const [searchParams] = useSearchParams();
  const [pendingProductFromQuery, setPendingProductFromQuery] = useState<{
    productId: string;
    productName: string;
    create: boolean;
  } | null>(null);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("");
  const [productFilterText, setProductFilterText] = useState("");
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
    attribute: "",
    attributeValue: "",
    isActive: null,
  });
  const [formProductText, setFormProductText] = useState("");

  // Minimal + clean animations
  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
  };

  const list = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.02 },
    },
    exit: { opacity: 0, transition: { duration: 0.12 } },
  };

  const item = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.14 } },
    exit: { opacity: 0, y: 6, transition: { duration: 0.1 } },
  };

  const resolveProductIdByName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return "";
    const found = products.find((p) => p.name.trim().toLowerCase() === normalized);
    return found?.productId ?? "";
  };

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
    const productName = searchParams.get("productName") ?? "";
    const create = searchParams.get("create") === "1";
    if (!productId) return;
    setPendingProductFromQuery({ productId, productName, create });
  }, [searchParams]);

  useEffect(() => {
    if (!pendingProductFromQuery) return;
    const exists = products.some((p) => p.productId === pendingProductFromQuery.productId);
    if (!exists && pendingProductFromQuery.productName) {
      setProducts((prev) => {
        if (prev.some((p) => p.productId === pendingProductFromQuery.productId)) return prev;
        return [{ productId: pendingProductFromQuery.productId, name: pendingProductFromQuery.productName }, ...prev];
      });
    }

    setProductFilter(pendingProductFromQuery.productId);
    setProductFilterText(pendingProductFromQuery.productName);
    setForm((prev) => ({ ...prev, productId: pendingProductFromQuery.productId }));
    setFormProductText(pendingProductFromQuery.productName);
    if (pendingProductFromQuery.create) {
      setOpenCreate(true);
    }
    setPendingProductFromQuery(null);
  }, [pendingProductFromQuery, products]);

  useEffect(() => {
    if (!productFilter) {
      setProductFilterText("");
      return;
    }
    const p = products.find((x) => x.productId === productFilter);
    if (p) setProductFilterText(p.name);
  }, [productFilter, products]);

  const totalPages = Math.max(1, Math.ceil(total / (apiLimit || limit)));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * (apiLimit || limit) + 1;
  const endIndex = Math.min(apiPage * (apiLimit || limit), total);

  const listKey = useMemo(() => `${page}|${statusFilter}|${productFilter}|${debouncedSearch}`, [page, statusFilter, productFilter, debouncedSearch]);

  const openNew = () => {
    const selectedProductName = products.find((p) => p.productId === productFilter)?.name ?? "";
    setForm({
      productId: productFilter || "",
      barcode: "",
      price: "",
      cost: "",
      attribute: "",
      attributeValue: "",
      isActive: null,
    });
    setFormProductText(selectedProductName);
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
        attribute: row.attributes?.variant ? "variant" : row.attributes?.color ? "color" : row.attributes?.presentation ? "presentation" : "",
        attributeValue: row.attributes?.variant ?? row.attributes?.color ?? row.attributes?.presentation ?? "",
        isActive: row.isActive,
      });
      setFormProductText(row.productName ?? products.find((p) => p.productId === row.productId)?.name ?? "");
      setEditingVariantId(id);
    } catch {
      showFlash(errorResponse("No se pudo cargar la variante"));
    }
  };

  const saveCreate = async () => {
    if (!form.productId || form.isActive === null) return;
    try {
      const attributes: Record<string, string> = {};
      if (form.attribute && form.attributeValue.trim()) attributes[form.attribute] = form.attributeValue.trim();
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
      if (form.attribute && form.attributeValue.trim()) attributes[form.attribute] = form.attributeValue.trim();
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

  const StatusPill = ({ active }: { active: boolean }) => (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        active ? "bg-teal-50 text-teal-700 ring-teal-200" : "bg-rose-50 text-rose-700 ring-rose-200",
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", active ? "bg-teal-500" : "bg-rose-500"].join(" ")} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );

  const IconButton = ({
  onClick,
  title,
  children,
  tone = "neutral",
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "danger";
}) => {
  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2";

  if (tone === "primary") {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={[base, "text-white focus:ring-[rgba(33,184,166,0.25)]"].join(" ")}
        style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
        }}
      >
        {children}
      </button>
    );
  }

  if (tone === "danger") {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={[
          base,
          "border-rose-600/20 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-600/20",
        ].join(" ")}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={[base, "border-black/10 bg-white hover:bg-black/[0.03] focus:ring-black/10"].join(" ")}
    >
      {children}
    </button>
  );
};


  const formatMoney = (value: any) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    return num.toFixed(2);
  };

  const attributeLabel = (v: Variant) => v.attributes?.presentation ?? v.attributes?.variant ?? v.attributes?.color ?? "-";

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catalogo · Variantes" />

      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Variantes (SKU)</h1>
            <p className="text-sm text-black/60">Gestión de variantes conectada por API.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              Total: <span className="font-semibold text-black">{total}</span>
            </div>

            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white transition focus:outline-none focus:ring-2"
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva variante
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_240px] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                placeholder="Buscar por SKU, producto o ID"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                list="variants-products-filter-options"
                className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                placeholder="Producto (todos)"
                value={productFilterText}
                onChange={(e) => {
                  const text = e.target.value;
                  setProductFilterText(text);
                  setPage(1);
                  const matchedId = resolveProductIdByName(text);
                  setProductFilter(matchedId);
                }}
              />
              <datalist id="variants-products-filter-options">
                {products.map((p) => (
                  <option key={p.productId} value={p.name} />
                ))}
              </datalist>
            </div>

            <select
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
              style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
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
        </motion.section>

        {/* List */}
        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
            <div>
              <p className="text-sm font-semibold">Listado de variantes</p>
              <p className="text-xs text-black/60">Scroll interno, header fijo y acciones claras.</p>
            </div>
            <p className="text-xs text-black/60">{loading ? "Cargando..." : `Mostrando ${startIndex}-${endIndex} de ${total}`}</p>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
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
                  <motion.tbody
                    key={listKey}
                    variants={shouldReduceMotion ? undefined : list}
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate={shouldReduceMotion ? false : "show"}
                    exit={shouldReduceMotion ? undefined : "exit"}
                  >
                    {variants.map((v) => (
                      <motion.tr
                        key={v.id}
                        variants={shouldReduceMotion ? undefined : item}
                        layout
                        className="border-b border-black/5 hover:bg-black/[0.02]"
                      >
                        <td className="py-3 px-5 font-medium">{v.sku}</td>
                        <td className="py-3 px-5 text-black/70">{v.productName ?? "-"}</td>
                        <td className="py-3 px-5 text-black/60">{attributeLabel(v)}</td>
                        <td className="py-3 px-5 text-right tabular-nums">{formatMoney(v.price)}</td>
                        <td className="py-3 px-5 text-right tabular-nums">{v.cost ? formatMoney(v.cost) : "-"}</td>
                        <td className="py-3 px-5">
                          <StatusPill active={!!v.isActive} />
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-end gap-2">
                            <IconButton title="Editar" onClick={() => void openEdit(v.id)}>
                              <Pencil className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              title={v.isActive ? "Desactivar" : "Activar"}
                              onClick={() => {
                                setDeletingVariantId(v.id);
                                setNextActiveState(!v.isActive);
                              }}
                              tone={v.isActive ? "danger" : "primary"}
                            >
                              <Power className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
              </table>

              {!loading && variants.length === 0 && (
                <div className="px-5 py-8 text-sm text-black/60">No hay variantes con los filtros actuales.</div>
              )}
            </div>
          </div>

          {/* Mobile/Tablet cards */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={listKey}
                variants={shouldReduceMotion ? undefined : list}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={shouldReduceMotion ? false : "show"}
                exit={shouldReduceMotion ? undefined : "exit"}
                className="max-h-[calc(100vh-360px)] overflow-auto p-4 sm:p-5 space-y-3"
              >
                {variants.map((v) => (
                  <motion.div
                    key={v.id}
                    variants={shouldReduceMotion ? undefined : item}
                    layout
                    className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-black/50">SKU</p>
                        <p className="mt-1 font-semibold truncate">{v.sku}</p>
                        <p className="mt-1 text-sm text-black/70 truncate">{v.productName ?? "-"}</p>
                        <p className="mt-1 text-sm text-black/60 line-clamp-2">{attributeLabel(v)}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusPill active={!!v.isActive} />
                          <span className="rounded-full bg-black/[0.03] px-2.5 py-1 text-[11px] text-black/70 tabular-nums">
                            Precio: S/ {formatMoney(v.price)}
                          </span>
                          <span className="rounded-full bg-black/[0.03] px-2.5 py-1 text-[11px] text-black/70 tabular-nums">
                            Costo: S/ {v.cost ? formatMoney(v.cost) : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <IconButton title="Editar" onClick={() => void openEdit(v.id)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          title={v.isActive ? "Desactivar" : "Activar"}
                          onClick={() => {
                            setDeletingVariantId(v.id);
                            setNextActiveState(!v.isActive);
                          }}
                          tone={v.isActive ? "danger" : "primary"}
                        >
                          <Power className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {!loading && variants.length === 0 && (
                  <div className="rounded-3xl border border-black/10 bg-white p-4 text-sm text-black/60">
                    No hay variantes con los filtros actuales.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
            <span className="hidden sm:inline">Mostrando {startIndex}-{endIndex} de {total}</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 hover:bg-black/[0.03] disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span className="tabular-nums">Página {page} de {totalPages}</span>
              <button
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 hover:bg-black/[0.03] disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Modals */}
      {openCreate && (
        <Modal title="Nueva variante" onClose={() => setOpenCreate(false)} className="max-w-lg">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <VariantFormFields
              form={form}
              setForm={setForm}
              products={products}
              formProductText={formProductText}
              setFormProductText={setFormProductText}
              resolveProductIdByName={resolveProductIdByName}
              primary={PRIMARY}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                onClick={() => setOpenCreate(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-2xl border px-4 py-2 text-sm text-white disabled:opacity-50 focus:outline-none focus:ring-2"
                style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                onClick={() => void saveCreate()}
                disabled={!form.productId || form.isActive === null}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                }}
              >
                Guardar
              </button>
            </div>
          </motion.div>
        </Modal>
      )}

      {editingVariantId && (
        <Modal title="Editar variante" onClose={() => setEditingVariantId(null)} className="max-w-lg">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <VariantFormFields
              form={form}
              setForm={setForm}
              products={products}
              formProductText={formProductText}
              setFormProductText={setFormProductText}
              resolveProductIdByName={resolveProductIdByName}
              disableProduct
              primary={PRIMARY}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                onClick={() => setEditingVariantId(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-2xl border px-4 py-2 text-sm text-white focus:outline-none focus:ring-2"
                style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                onClick={() => void saveEdit()}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                }}
              >
                Guardar cambios
              </button>
            </div>
          </motion.div>
        </Modal>
      )}

      {deletingVariantId && (
        <Modal title={nextActiveState ? "Restaurar variante" : "Desactivar variante"} onClose={() => setDeletingVariantId(null)} className="max-w-md">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className={"rounded-2xl border px-3 py-2 " + (nextActiveState ? "border-teal-200 bg-teal-50" : "border-rose-200 bg-rose-50")}>
              <p className={"text-sm " + (nextActiveState ? "text-teal-800" : "text-rose-800")}>
                {nextActiveState
                  ? "Se activará la variante nuevamente."
                  : "Se desactivará la variante seleccionada. Esto puede afectar ventas/stock."}
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                onClick={() => setDeletingVariantId(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-2xl border px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 disabled:opacity-50"
                style={
                  nextActiveState
                    ? ({ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties)
                    : ({ backgroundColor: "#e11d48", borderColor: "#e11d4833", "--tw-ring-color": "#e11d4822" } as React.CSSProperties)
                }
                onClick={() => void confirmToggleActive()}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </Modal>
      )}
    </div>
  );
}

function VariantFormFields({
  form,
  setForm,
  products,
  formProductText,
  setFormProductText,
  resolveProductIdByName,
  disableProduct = false,
  primary,
}: {
  form: VariantForm;
  setForm: Dispatch<SetStateAction<VariantForm>>;
  products: ProductOption[];
  formProductText: string;
  setFormProductText: Dispatch<SetStateAction<string>>;
  resolveProductIdByName: (name: string) => string;
  disableProduct?: boolean;
  primary: string;
}) {
  const ringStyle = { "--tw-ring-color": `${primary}33` } as React.CSSProperties;

  return (
    <div className="space-y-3">
      <label className="text-sm">
        Producto
        <input
          list="variants-products-form-options"
          className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 disabled:bg-black/[0.02]"
          style={ringStyle}
          placeholder="Seleccionar producto"
          value={formProductText}
          onChange={(e) => {
            const text = e.target.value;
            setFormProductText(text);
            const matchedId = resolveProductIdByName(text);
            setForm((prev) => ({ ...prev, productId: matchedId }));
          }}
          disabled={disableProduct}
        />
        <datalist id="variants-products-form-options">
          {products.map((p) => (
            <option key={p.productId} value={p.name} />
          ))}
        </datalist>
      </label>

      <label className="text-sm">
        Código de barras
        <input
          className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-sm text-black/50 cursor-not-allowed"
          value={form.barcode}
          onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
          disabled
          placeholder=""
        />
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          Precio (S/)
          <div className="mt-2 relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/50">S/</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="h-11 w-full rounded-2xl border border-black/10 pl-10 pr-3 text-sm outline-none focus:ring-2"
              style={ringStyle}
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            />
          </div>
        </label>

        <label className="text-sm">
          Costo (S/)
          <div className="mt-2 relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/50">S/</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="h-11 w-full rounded-2xl border border-black/10 pl-10 pr-3 text-sm outline-none focus:ring-2"
              style={ringStyle}
              value={form.cost}
              onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
            />
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          Atributo
          <select
            className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm bg-white outline-none focus:ring-2"
            style={ringStyle}
            value={form.attribute}
            onChange={(e) => setForm((prev) => ({ ...prev, attribute: e.target.value as VariantForm["attribute"] }))}
          >
            <option value="">Seleccionar atributo</option>
            <option value="presentation">Presentación</option>
            <option value="variant">Variante</option>
            <option value="color">Color</option>
          </select>
        </label>

        <label className="text-sm">
          Valor
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
            style={ringStyle}
            value={form.attributeValue}
            onChange={(e) => setForm((prev) => ({ ...prev, attributeValue: e.target.value }))}
          />
        </label>
      </div>

      <label className="text-sm">
        Estado
        <select
          className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm bg-white outline-none focus:ring-2"
          style={ringStyle}
          value={form.isActive === null ? "" : form.isActive ? "active" : "inactive"}
          onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "" ? null : e.target.value === "active" }))}
        >
          <option value="">Seleccionar estado</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </label>
    </div>
  );
}
