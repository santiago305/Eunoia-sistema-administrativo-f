import { useEffect, useMemo, useRef, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { createVariant, getVariantById, listProductPrimaActives, listVariants, updateVariant, updateVariantActive } from "@/services/catalogService";
import type { ProductOption, Variant, VariantForm } from "@/pages/catalog/types/variant";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Layers, Menu, Pencil, Plus, Power, Search, SlidersHorizontal } from "lucide-react";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { listUnits } from "@/services/unitService";
import { ListUnitResponse } from "@/pages/catalog/types/unit";
import { listProductEquivalences } from "@/services/equivalenceService";
import type { ProductEquivalence } from "@/pages/catalog/types/equivalence";
import { EquivalenceFormFields } from "../catalog/components/EquivalenceFormField";
import { VariantFormFields } from "../catalog/components/VariantFormFields";
import { IconButton } from "@/components/IconBoton";
import { StatusPill } from "@/components/StatusTag";
import { money } from "@/utils/functionPurchases";
import { fadeUp, item, list } from "@/utils/animations";
import { Dropdown } from "../purchases/components/PurchaseDropdown";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";

export default function RowVariant() {
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
  const [statusFilter, setStatusFilter] = useState("active");
  const [productFilter, setProductFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [variants, setVariants] = useState<Variant[]>([]);
  const [units, setUnits] = useState<ListUnitResponse>();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);
  const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
  const [loadingEquivalences, setLoadingEquivalences] = useState(false);
  const lastRequestKey = useRef<string | null>(null);
  const inFlightKey = useRef<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [equivalenceVariantId, setEquivalenceVariantId] = useState<string | null>(null);
  const [equivalenceBaseUnitId, setEquivalenceBaseUnitId] = useState<string | null>(null);
  const [sku, setSku] = useState<string | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [nextActiveState, setNextActiveState] = useState<boolean>(false);

  const [form, setForm] = useState<VariantForm>({
    productId: "",
    barcode: "",
    price: "",
    cost: "",
    attributes: {},
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
        const res = await listProductPrimaActives();
        let objets:ProductOption[] = [];
        res.map((r)=>{
          objets.push({
            productId:r.id ?? '',
            name:r.name ?? '',
            sku:r.sku
          })
        })
        setProducts(objets);
    } catch {
        setProducts([]);
        showFlash(errorResponse("Error al cargar productos"));
    }
  };

  const loadUnits = async () => {
    try {
      const res = await listUnits();
      setUnits(res);
    } catch {
      showFlash(errorResponse("Error al cargar unidades"));
    }
  };

  const loadVariants = async () => {
    const requestKey = `${page}|${debouncedSearch}|${statusFilter}|${productFilter}`;
    if (inFlightKey.current === requestKey || lastRequestKey.current === requestKey) return;
    clearFlash();
    setLoading(true);
    inFlightKey.current = requestKey;
    try {
      const res = await listVariants({
        page,
        limit,
        q: debouncedSearch || undefined,
        isActive: statusFilter === "active" ? "true" : "false",
        type: ProductTypes.PRIMA,
        productId: productFilter || undefined,
      });
      setVariants(res.items ?? []);
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
      lastRequestKey.current = requestKey;
    } catch {
      setVariants([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      }));
      showFlash(errorResponse("Error al listar variantes"));
    } finally {
      setLoading(false);
      if (inFlightKey.current === requestKey) {
        inFlightKey.current = null;
      }
    }
  };

  const loadEquivalences = async (productId: string) => {
    setLoadingEquivalences(true);
    try {
      const res = await listProductEquivalences({ productId });
      setEquivalences(res ?? []);
    } catch {
      setEquivalences([]);
      showFlash(errorResponse("Error al cargar equivalencias"));
    } finally {
      setLoadingEquivalences(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    void loadVariants();
  }, [page, debouncedSearch, statusFilter, productFilter]);

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
        return [{ productId: pendingProductFromQuery.productId, name: pendingProductFromQuery.productName, sku: null }, ...prev];
      });
    }

    setProductFilter(pendingProductFromQuery.productId);
    setForm((prev) => ({ ...prev, productId: pendingProductFromQuery.productId }));
    if (pendingProductFromQuery.create) {
      setOpenCreate(true);
    }
    setPendingProductFromQuery(null);
  }, [pendingProductFromQuery, products]);

  const safePage = Math.max(1, pagination.page || page);
  const totalPages = Math.max(1, pagination.totalPages);
  const startIndex = pagination.total === 0 ? 0 : (safePage - 1) * (pagination.limit || limit) + 1;
  const endIndex = Math.min(safePage * (pagination.limit || limit), pagination.total);

  const listKey = useMemo(
    () => `${page}|${statusFilter}|${productFilter}|${debouncedSearch}`,
    [page, statusFilter, productFilter, debouncedSearch],
  );

  const openNew = () => {
    setForm({
      productId: productFilter || "",
      barcode: "",
      price: "",
      cost: "",
      attributes: {},
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
        attributes:{
            presentation: row.attributes?.presentation,
            variant: row.attributes?.variant,
            color: row.attributes?.color
        },
        isActive: row.isActive,
      });
      setEditingVariantId(id);
    } catch {
      showFlash(errorResponse("No se pudo cargar la variante"));
    }
  };

  const openEquivalences = (productId: string, baseUnitId: string, skuValue: string) => {
    loadUnits();
    setEquivalenceVariantId(productId);
    setEquivalenceBaseUnitId(baseUnitId);
    setSku(skuValue);
    void loadEquivalences(productId);
  };

  const saveCreate = async () => {
    if (!form.productId || form.isActive === null) return;
    try {
      await createVariant({
        productId: form.productId,
        barcode: form.barcode.trim() || undefined,
        attributes: form.attributes,
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
      await updateVariant(editingVariantId, {
        barcode: form.barcode.trim() || null,
        attributes: form.attributes,
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

  const attributeLabel = (v: Variant) => v.attributes?.presentation ?? v.attributes?.variant ?? v.attributes?.color ?? "-";

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catalogo · Variantes MP" />

      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Variantes de materia prima (SKU)</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-[11px]">
              Total: <span className="font-semibold text-black">{pagination.total}</span>
            </div>

            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] text-white transition focus:outline-none focus:ring-2"
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

        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className=" bg-gray-50 p-4 sm:p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(120px,1fr)_230px_180px] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2
               text-black/40" />
              <input
                className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                placeholder="Buscar por SKU, producto o ID"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select
                className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                value={productFilter}
                onChange={(e) => {
                  setProductFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Producto (todos)</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <select
                className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="active">Activos</option>
                <option value="inactive">Eliminados</option>
              </select>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={shouldReduceMotion ? false : "hidden"}
          animate={shouldReduceMotion ? false : "show"}
          variants={fadeUp}
          className=" bg-white shadow-sm overflow-hidden"
        >
          <div className="max-h-[calc(100vh-280px)] min-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-black/10 text-[11px] text-black/60">
                    <th className="py-3 px-5 text-left w-28">SKU</th>
                    <th className="py-3 px-5 text-left w-20">Producto</th>
                    <th className="py-3 px-5 text-left w-20">Unidad base</th>
                    <th className="py-3 px-5 text-left w-15">Presentación</th>
                    <th className="py-3 px-5 text-left w-15">Variante</th>
                    <th className="py-3 px-5 text-left w-15">Color</th>
                    <th className="py-3 px-5 text-left w-15">Precio</th>
                    <th className="py-3 px-5 text-left w-15">Costo</th>
                    <th className="py-3 px-5 text-left w-15">Estado</th>
                    <th className="py-3 px-5 text-left w-10"></th>
                </tr>
              </thead>
              <AnimatePresence mode="wait" initial={false}>
                <motion.tbody
                  key={`${page}|${statusFilter}|${productFilter}|${debouncedSearch}`}
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={shouldReduceMotion ? false : { opacity: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                >
                  {variants.map((v) => (
                    <tr key={v.id} className="border-b border-black/5 text-[11px]">
                      <td className="py-3 px-5 font-medium">{v.sku}</td>
                      <td className="py-3 px-5 text-black/70">{v.productName ?? "-"}</td>
                      <td className="py-3 px-5 text-black/70">
                        {v.unitName} ({v.unitCode})
                      </td>
                      <td className="py-4 px-5 text-black/70">
                        <p className="line-clamp-2 max-w-[680px]">{v.attributes?.presentation}</p>
                      </td>
                      <td className="py-4 px-5 text-black/70">
                        <p className="line-clamp-2 max-w-[680px]">{v.attributes?.variant}</p>
                      </td>
                      <td className="py-4 px-5 text-black/70">
                        <p className="line-clamp-2 max-w-[680px]">{v.attributes?.color}</p>
                      </td>     
                      <td className="py-3 px-5 text-black/70">
                          {money(v.price,'PEN')}
                      </td>
                      <td className="py-3 px-5 text-black/70">
                          {money(v.cost, 'PEN')}
                      </td>
                      <td className="py-3 px-5">
                        <StatusPill active={!!v.isActive} PRIMARY={PRIMARY} />
                      </td>
                      <td className="py-3 px-0">
                        <Dropdown
                          trigger={<Menu className="h-4 w-4" />}
                          menuClassName="min-w-52 p-2"
                          itemClassName="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03]"
                          items={[
                            {
                              label: (
                                <>
                                  <Layers className="h-4 w-4 text-black/60" />
                                  Equivalencias
                                </>
                              ),
                              onClick: (e:any) => {
                                e.stopPropagation();
                                openEquivalences(v.productId, v.baseUnitId, v.sku);
                              },
                            },
                            {
                              label: (
                                <>
                                  <Pencil className="h-4 w-4 text-black/60" />
                                  Editar
                                </>
                              ),
                              onClick: (e:any) => {
                                e.stopPropagation();
                                void openEdit(v.id);
                              },
                            },
                            {
                              label: (
                                <>
                                  <Power className="h-4 w-4" />
                                  {v.isActive ? "Eliminar" : "Restaurar"}
                                </>
                              ),
                              className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${
                                v.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50"
                              }`,
                              onClick: (e:any) => {
                                e.stopPropagation();
                                setDeletingVariantId(v.id);
                                setNextActiveState(!v.isActive);
                              },
                            },
                          ].filter(Boolean)}
                        />
                      </td>
                    </tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </table>
            {!loading && variants.length === 0 && <div className="px-5 py-8 text-sm text-black/60">No hay variantes con los filtros actuales.</div>}
          </div>

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
                        <p className="text-[11px] text-black/50">SKU</p>
                        <p className="mt-1 font-semibold truncate">{v.sku}</p>
                        <p className="mt-1 text-sm text-black/70 truncate">{v.productName ?? "-"}</p>
                        <p className="mt-1 text-sm text-black/60 line-clamp-2">{attributeLabel(v)}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusPill active={!!v.isActive} PRIMARY={PRIMARY} />
                          <span className="rounded-full bg-black/[0.03] px-2.5 py-1 text-[11px] text-black/70 tabular-nums">
                            Precio: {money(v.price,'PEN')}
                          </span>
                          <span className="rounded-full bg-black/[0.03] px-2.5 py-1 text-[11px] text-black/70 tabular-nums">
                            Costo: {money(v.cost, 'PEN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-[11px] hover:bg-black/[0.03]"
                          onClick={() => openEquivalences(v.productId, v.baseUnitId, v.sku)}
                        >
                          Equivalencias
                        </button>
                        <IconButton title="Editar" onClick={() => void openEdit(v.id)}
                          PRIMARY={PRIMARY}
                          PRIMARY_HOVER={PRIMARY_HOVER}
                          >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          title={v.isActive ? "Eliminar" : "Restaurar"}
                          onClick={() => {
                            setDeletingVariantId(v.id);
                            setNextActiveState(!v.isActive);
                          }}
                          tone={v.isActive ? "danger" : "primary"}
                          PRIMARY={PRIMARY}
                          PRIMARY_HOVER={PRIMARY_HOVER}
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

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-[11px] text-black/60">
            <span className="hidden sm:inline">Mostrando {startIndex}-{endIndex} de {pagination.total}</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 hover:bg-black/[0.03] disabled:opacity-40"
                disabled={!pagination.hasPrev || loading}
                onClick={() => setPage(Math.max(1, safePage - 1))}
              >
                Anterior
              </button>
              <span className="tabular-nums">Pagina {safePage} de {totalPages}</span>
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 hover:bg-black/[0.03] disabled:opacity-40"
                disabled={!pagination.hasNext || loading}
                onClick={() => setPage(safePage + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {openCreate && (
        <Modal title="Nueva variante" onClose={() => setOpenCreate(false)} className="max-w-lg">
          <VariantFormFields form={form} setForm={setForm} products={products} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenCreate(false)}>
              Cancelar
            </button>
            <button
              className="rounded-lg border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
              onClick={() => void saveCreate()}
              disabled={!form.productId}
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {editingVariantId && (
        <Modal title="Editar variante" onClose={() => setEditingVariantId(null)} className="max-w-lg">
          <VariantFormFields form={form} setForm={setForm} products={products} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg border border-black/10 px-4 py-2 text-sm" onClick={() => setEditingVariantId(null)}>
              Cancelar
            </button>
            <button
              className="rounded-lg border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
              onClick={() => void saveEdit()}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {equivalenceVariantId && equivalenceBaseUnitId && (
        <Modal title={`Equivalencias de variante (${sku})`} onClose={() => setEquivalenceVariantId(null)} className="max-w-2xl">
          <EquivalenceFormFields
            productId={equivalenceVariantId}
            baseUnitId={equivalenceBaseUnitId}
            units={units}
            equivalences={equivalences}
            loading={loadingEquivalences}
            onCreated={async () => {
              await loadEquivalences(equivalenceVariantId);
            }}
            PRIMARY={PRIMARY}
          />
        </Modal>
      )}

      {deletingVariantId && (
        <Modal title={nextActiveState ? "Restaurar variante" : "Eiminar variante"} onClose={() => setDeletingVariantId(null)} className="max-w-md">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
            animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className={"rounded-lg border px-3 py-2 " + (nextActiveState ? "border-teal-200 bg-teal-50" : "border-rose-200 bg-rose-50")}>
              <p className={"text-sm " + (nextActiveState ? "text-teal-800" : "text-rose-800")}>
                {nextActiveState
                  ? "Se restaurara la variante nuevamente."
                  : "Se eliminara la variante seleccionada. Esto puede afectar ventas/stock."}
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                onClick={() => setDeletingVariantId(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg border px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 disabled:opacity-50"
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


