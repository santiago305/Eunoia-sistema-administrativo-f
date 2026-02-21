import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PageTitle } from "@/components/PageTitle";
import { Modal } from "@/components/settings/modal";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useProducts } from "@/hooks/useProducts";
import { createProductEquivalence, deleteProductEquivalence, listProductEquivalences } from "@/services/equivalenceService";
import { getProductById, listProducts } from "@/services/productService";
import { listUnits } from "@/services/unitService";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Pencil, Plus, Power, Search, SlidersHorizontal } from "lucide-react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { ProductTypes } from "@/types/ProductTypes";
import type { ProductEquivalence } from "@/types/equivalence";
import type { ListUnitResponse } from "@/types/unit";

const PRIMARY = "#21b8a6";
const PRIMARY_HOVER = "#1aa392";
const PRODUCT_TYPE = ProductTypes.PRIMA;

type ProductForm = {
  name: string;
  description: string;
  isActive: boolean;
  barcode: string;
  price: string;
  cost: string;
  attribute: "" | "presentation" | "variant" | "color";
  attributeValue: string;
  baseUnitId: string;
};

export default function RowMaterial() {
  const shouldReduceMotion = useReducedMotion();
  const { showFlash, clearFlash } = useFlashMessage();

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [openCreate, setOpenCreate] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const [units, setUnits] = useState<ListUnitResponse>();
  const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
  const [loadingEquivalences, setLoadingEquivalences] = useState(false);
  const [equivalenceProductId, setEquivalenceProductId] = useState<string | null>(null);
  const [equivalenceProductName, setEquivalenceProductName] = useState<string | null>(null);
  const [equivalenceBaseUnitId, setEquivalenceBaseUnitId] = useState("");

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    isActive: true,
    barcode: "",
    price: "",
    cost: "",
    attribute: "",
    attributeValue: "",
    baseUnitId: "",
  });
  const [page, setPage] = useState(1);
  const [debouncedName, setDebouncedName] = useState("");
  const limit = 10;

  const [exporting, setExporting] = useState(false);

  // --- Animation (minimal + smooth) ---
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

  const queryParams = useMemo(
      () => ({
          page,
          limit,
          isActive: (statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false") as ListProductsQuery["isActive"],
          q: debouncedName.trim() || undefined,
          type: PRODUCT_TYPE,
      }),
      [page, limit, statusFilter, debouncedName],
  );

  const { items: products, total, page: apiPage, limit: apiLimit, loading, error, create, update, setActive } =
    useProducts(queryParams);

  useEffect(() => {
    if (apiPage && apiPage !== page) setPage(apiPage);
  }, [apiPage, page]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(searchText.trim());
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchText]);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const res = await listUnits();
        setUnits(res);
      } catch {
        showFlash(errorResponse("Error al cargar unidades"));
      }
    };
    void loadUnits();
  }, [showFlash]);

  const effectiveLimit = apiLimit ?? limit;
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
  const startIndex = total === 0 ? 0 : (apiPage - 1) * effectiveLimit + 1;
  const endIndex = Math.min(apiPage * effectiveLimit, total);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [products]);

  const listKey = useMemo(() => `${page}|${statusFilter}|${debouncedName}`, [page, statusFilter, debouncedName]);

  const startCreate = () => {
    setForm({
      name: "",
      description: "",
      isActive: true,
      barcode: "",
      price: "",
      cost: "",
      attribute: "",
      attributeValue: "",
      baseUnitId: "",
    });
    setEditingProductId(null);
    setOpenCreate(true);
  };

  const openEdit = async (productId: string) => {
    clearFlash();
    try {
      const product = await getProductById(productId);
      setForm({
        name: product.name,
        description: product.description ?? "",
        isActive: product.isActive,
        barcode: product.barcode ?? "",
        price: product.price ? String(product.price) : "",
        cost: product.cost ? String(product.cost) : "",
        attribute: product.attributes?.variant
          ? "variant"
          : product.attributes?.color
          ? "color"
          : product.attributes?.presentation
          ? "presentation"
          : "",
        attributeValue: product.attributes?.variant ?? product.attributes?.color ?? product.attributes?.presentation ?? "",
        baseUnitId: product.baseUnitId ?? "",
      });
      setOpenCreate(false);
      setEditingProductId(productId);
    } catch {
      showFlash(errorResponse("No se pudo cargar la materia prima"));
    }
  };

  const saveProduct = async () => {
    if (!form.name.trim()) return;
    clearFlash();
    try {
      const attributes: Record<string, string> = {};
      if (form.attribute && form.attributeValue.trim()) attributes[form.attribute] = form.attributeValue.trim();
      if (editingProductId) {
        await update(editingProductId, {
          name: form.name.trim() || undefined,
          description: form.description.trim() || null,
          barcode: form.barcode.trim() || null,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          baseUnitId: form.baseUnitId,
          attributes: Object.keys(attributes).length ? attributes : undefined,
        });
        await setActive(editingProductId, form.isActive);
        setEditingProductId(null);
        showFlash(successResponse("Materia prima actualizada"));
      } else {
        await create({
          type: PRODUCT_TYPE,
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
          barcode: form.barcode.trim() || null,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          baseUnitId: form.baseUnitId,
          attributes: Object.keys(attributes).length ? attributes : undefined,
        });
        setOpenCreate(false);
        showFlash(successResponse("Materia prima creada"));
      }
    } catch {
      showFlash(
        errorResponse(editingProductId ? "Error al actualizar materia prima" : "Error al crear materia prima")
      );
    }
  };

  const confirmDelete = async () => {
    if (!deletingProductId) return;
    clearFlash();
    try {
      const product = products.find((p) => p.id === deletingProductId);
      if (product) await setActive(deletingProductId, !product.isActive);
      setDeletingProductId(null);
      showFlash(successResponse("Estado de materia prima actualizado"));
    } catch {
      showFlash(errorResponse("Error al cambiar estado de la materia prima"));
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

  const openEquivalences = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    try {
      const fresh = await getProductById(productId);
      setEquivalenceProductId(fresh.id);
      setEquivalenceProductName(fresh.name);
      setEquivalenceBaseUnitId(fresh.baseUnitId ?? "");
    } catch {
      setEquivalenceProductId(product.id);
      setEquivalenceProductName(product.name);
      setEquivalenceBaseUnitId(product.baseUnitId ?? "");
    }
    void loadEquivalences(product.id);
  };

  const closeEquivalences = () => {
    setEquivalenceProductId(null);
    setEquivalenceProductName(null);
    setEquivalenceBaseUnitId("");
    setEquivalences([]);
  };

  const buildCsv = (
    rows: Array<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  ) => {
    const header = ["id", "name", "description", "isActive", "createdAt", "updatedAt"];
    const escape = (value: string) => {
      if (value.includes('"') || value.includes(",") || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`;
      return value;
    };
    const formatDate = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };
    const lines = rows.map((row, index) => {
      const csvId = String(index + 1).padStart(5, "0");
      return [csvId, row.name, row.description ?? "", String(row.isActive), formatDate(row.createdAt), formatDate(row.updatedAt)]
        .map((v) => escape(String(v)))
        .join(",");
    });
    return [header.join(","), ...lines].join("\n");
  };

  const downloadCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const pageSize = 100;
      const first = await listProducts({ page: 1, limit: pageSize });
      const allItems = [...(first.items ?? [])];
      const pages = Math.max(1, Math.ceil((first.total ?? allItems.length) / pageSize));

      for (let p = 2; p <= pages; p += 1) {
        const res = await listProducts({ page: p, limit: pageSize });
        if (res.items?.length) allItems.push(...res.items);
      }

      const sorted = [...allItems]
        .filter((row) => row.type === PRODUCT_TYPE)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const csv = `\uFEFF${buildCsv(sorted)}`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "materias_primas.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const StatusPill = ({ active }: { active: boolean }) => (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        active ? "bg-[color:var(--p-50)] text-[color:var(--p-700)] ring-[color:var(--p-200)]" : "bg-rose-50 text-rose-700 ring-rose-200",
      ].join(" ")}
      style={
        active
          ? ({
              "--p-50": `${PRIMARY}14`,
              "--p-200": `${PRIMARY}33`,
              "--p-700": PRIMARY,
            } as React.CSSProperties)
          : undefined
      }
    >
      <span
        className={["h-1.5 w-1.5 rounded-full", active ? "bg-[color:var(--p-dot)]" : "bg-rose-500"].join(" ")}
        style={active ? ({ "--p-dot": PRIMARY } as React.CSSProperties) : undefined}
      />
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
    const styles =
      tone === "primary"
        ? "border-[color:var(--p-200)] bg-[color:var(--p)] text-white hover:bg-[color:var(--p-hover)] focus:ring-[color:var(--p-200)]"
        : tone === "danger"
        ? "border-rose-600/20 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-600/25"
        : "border-black/10 bg-white hover:bg-black/[0.03] focus:ring-black/10";

    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={[
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
          styles,
          "focus:outline-none focus:ring-2",
        ].join(" ")}
        style={
          tone === "primary"
          ? ({
              "--p": PRIMARY,
              "--p-hover": PRIMARY_HOVER,
              "--p-200": `${PRIMARY}33`,
            } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </button>
    );
  };

  return (
    <div className="w-full min-h-screen bg-white text-black">
          <PageTitle title="Catálogo · Materias primas" />
          <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {/* Header */}
              <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
              >
                  <div className="space-y-1">
                      <h1 className="text-2xl font-semibold tracking-tight">Materias primas</h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                          Total: <span className="font-semibold text-black">{total}</span>
                      </div>

                      <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                          onClick={downloadCsv}
                          disabled={exporting}
                          title="Exportar CSV"
                      >
                          <Download className="h-4 w-4" />
                          {exporting ? "Exportando..." : "Exportar CSV"}
                      </button>

                      <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
                          onClick={startCreate}
                          title="Nueva materia prima"
                          style={{
                              backgroundColor: PRIMARY,
                              borderColor: `${PRIMARY}33`,
                              boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
                          }}
                          onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_HOVER;
                          }}
                          onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY;
                          }}
                      >
                          <Plus className="h-4 w-4" />
                          Nueva materia prima
                      </button>
                  </div>
              </motion.div>

              {/* Filtros */}
              <motion.section
                  initial={shouldReduceMotion ? false : "hidden"}
                  animate={shouldReduceMotion ? false : "show"}
                  variants={fadeUp}
                  className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm"
              >
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_280px] gap-3">
                      <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                          <input
                              className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2"
                              style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                              placeholder="Buscar por nombre (exacto)"
                              value={searchText}
                              onChange={(event) => {
                                  setSearchText(event.target.value);
                                  setPage(1);
                              }}
                          />
                      </div>

                      <div className="relative">
                          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                          <select
                              className="h-11 w-full appearance-none rounded-2xl border border-black/10 bg-white pl-10 pr-9 text-sm outline-none focus:ring-2"
                              style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
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
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/40">▾</span>
                      </div>
                  </div>
              </motion.section>

              {/* Listado */}
              <motion.section
                  initial={shouldReduceMotion ? false : "hidden"}
                  animate={shouldReduceMotion ? false : "show"}
                  variants={fadeUp}
                  className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden"
              >
                  <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/10">
                      <div>
                          <p className="text-sm font-semibold">Listado de materias primas</p>
                      </div>
                      <div className="text-xs text-black/60 hidden sm:block">{loading ? "Cargando..." : `Mostrando ${startIndex}-${endIndex} de ${total}`}</div>
                  </div>

                  {/* DESKTOP: tabla */}
                  <div className="hidden lg:block">
                      <div className="max-h-[calc(100vh-340px)] overflow-auto">
                          <table className="w-full text-sm">
                              <thead className="sticky top-0 z-10 bg-white">
                                  <tr className="border-b border-black/10 text-xs text-black/60">
                                      <th className="py-3 px-5 text-left">SKU</th>
                                      <th className="py-3 px-5 text-left">Materia prima</th>
                                      <th className="py-3 px-5 text-left">Descripción</th>
                                      <th className="py-3 px-5 text-left">Unidad</th>
                                      <th className="py-3 px-5 text-left">Atributo</th>
                                      <th className="py-3 px-5 text-left">Precio</th>
                                      <th className="py-3 px-5 text-left">Costo</th>
                                      <th className="py-3 px-5 text-left">Estado</th>
                                      <th className="py-3 px-5 text-left">Acciones</th>
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
                                      {sortedProducts.map((product) => {
                                          return (
                                              <motion.tr key={product.id} variants={shouldReduceMotion ? undefined : item} layout className="border-b border-black/5 hover:bg-black/[0.02]">
                                                  <td className="py-4 px-5">
                                                      <p className="font-medium max-w-[680px]">{product.sku || "-"}</p>
                                                  </td>
                                                  <td className="py-4 px-5  text-black/70">
                                                      <div className="min-w-0">
                                                          <p className="font-medium leading-5 truncate">{product.name}</p>
                                                      </div>
                                                  </td>
                                                  <td className="py-4 px-5 text-black/70">
                                                      <p className="line-clamp-2 max-w-[800px]">{product.description || "-"}</p>
                                                  </td>
                                                  <td className="py-4 px-5 text-black/70">
                                                      <p className="line-clamp-2 max-w-[680px]">
                                                          {product.baseUnitName} ({product.baseUnitCode})
                                                      </p>
                                                  </td>
                                                  <td className="py-4 px-5 text-black/70">
                                                      <p className="line-clamp-2 max-w-[680px]">{product.attributes ? Object.values(product.attributes).filter(Boolean).join(" · ") || "-" : "-"}</p>
                                                  </td>
                                                  <td className="py-4 px-5 text-black/70">
                                                      <p className="line-clamp-2 max-w-[680px]">{product.price || "-"}</p>
                                                  </td>
                                                  <td className="py-4 px-5 text-black/70">
                                                      <p className="line-clamp-2 max-w-[680px]">{product.cost || "-"}</p>
                                                  </td>

                                                  <td className="py-4 px-5">
                                                      <StatusPill active={product.isActive} />
                                                  </td>

                                                  <td className="py-4 px-0">
                                                      <div className="flex items-center justify-left gap-2">
                                                          <button
                                                              type="button"
                                                              className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs hover:bg-black/[0.03]"
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  void openEquivalences(product.id);
                                                              }}
                                                          >
                                                              Equivalencias
                                                          </button>

                                                          <IconButton
                                                              title="Editar"
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  void openEdit(product.id);
                                                              }}
                                                          >
                                                              <Pencil className="h-4 w-4" />
                                                          </IconButton>

                                                          <IconButton
                                                              title={product.isActive ? "Desactivar" : "Activar"}
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setDeletingProductId(product.id);
                                                              }}
                                                              tone={product.isActive ? "danger" : "primary"}
                                                          >
                                                              <Power className="h-4 w-4" />
                                                          </IconButton>
                                                      </div>
                                                  </td>
                                              </motion.tr>
                                          );
                                      })}
                                  </motion.tbody>
                              </AnimatePresence>
                          </table>

                          {products.length === 0 && !loading && <div className="px-5 py-8 text-sm text-black/60">No hay materias primas con los filtros actuales.</div>}
                          {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
                      </div>
                  </div>

                  {/* MOBILE/TABLET: cards */}
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
                              {sortedProducts.map((product) => {
                                  return (
                                      <motion.div key={product.id} variants={shouldReduceMotion ? undefined : item} layout className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                                          <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                  <p className="mt-1 font-semibold truncate">{product.name}</p>
                                                  <p className="mt-1 text-sm text-black/70 line-clamp-2">{product.description || "-"}</p>
                                                  <div className="mt-3">
                                                      <StatusPill active={product.isActive} />
                                                  </div>
                                              </div>

                                              <div className="flex flex-col gap-2">
                                                  <button
                                                      type="button"
                                                      className="inline-flex h-8 items-center justify-center rounded-xl border border-black/10 bg-white px-2.5 text-xs hover:bg-black/[0.03] disabled:opacity-50"
                                                      onClick={() => void openEquivalences(product.id)}
                                                     
                                                  >
                                                      Equivalencias
                                                  </button>

                                                  <IconButton
                                                      title="Editar"
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          void openEdit(product.id);
                                                      }}
                                                  >
                                                      <Pencil className="h-4 w-4" />
                                                  </IconButton>

                                                  <IconButton
                                                      title={product.isActive ? "Desactivar" : "Activar"}
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          setDeletingProductId(product.id);
                                                      }}
                                                      tone={product.isActive ? "danger" : "primary"}
                                                  >
                                                      <Power className="h-4 w-4" />
                                                  </IconButton>
                                              </div>
                                          </div>

                                          <div className="mt-3 text-[11px] text-black/50 truncate">UUID: {product.id}</div>
                                      </motion.div>
                                  );
                              })}

                              {products.length === 0 && !loading && (
                                  <div className="rounded-3xl border border-black/10 bg-white p-4 text-sm text-black/60">No hay materias primas con los filtros actuales.</div>
                              )}
                              {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
                          </motion.div>
                      </AnimatePresence>
                  </div>

                  {/* Footer paginación */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-xs text-black/60">
                      <span className="hidden sm:inline">
                          Mostrando {startIndex}-{endIndex} de {total}
                      </span>

                      <div className="flex items-center gap-2">
                          <button
                              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-black/10"
                              disabled={page === 1}
                              onClick={() => setPage(page - 1)}
                              type="button"
                          >
                              Anterior
                          </button>

                          <span className="tabular-nums">
                              Página {page} de {totalPages}
                          </span>

                          <button
                              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-black/10"
                              disabled={page === totalPages || totalPages === 0}
                              onClick={() => setPage(page + 1)}
                              type="button"
                          >
                              Siguiente
                          </button>
                      </div>
                  </div>
              </motion.section>
          </div>

          {/* MODALES */}
          {openCreate && (
              <Modal title="Nueva materia prima" onClose={() => setOpenCreate(false)} className="max-w-[700px]">
                  <ProductFormFields form={form} setForm={setForm} units={units} />
                  <div className="mt-4 flex justify-end gap-2">
                      <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenCreate(false)}>
                          Cancelar
                      </button>
                      <button
                          className="rounded-2xl border px-4 py-2 text-sm text-white"
                          style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                          onClick={saveProduct}
                          disabled={!form.name.trim()}
                      >
                          Guardar
                      </button>
                  </div>
              </Modal>
          )}

          {editingProductId && (
              <Modal title="Editar materia prima" onClose={() => setEditingProductId(null)} className="max-w-[700px]">
                  <ProductFormFields form={form} setForm={setForm} units={units} />
                  <div className="mt-4 flex justify-end gap-2">
                      <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={() => setEditingProductId(null)}>
                          Cancelar
                      </button>
                      <button className="rounded-2xl border px-4 py-2 text-sm text-white" style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }} onClick={saveProduct}>
                          Guardar cambios
                      </button>
                  </div>
              </Modal>
          )}

          {deletingProductId && (
              <Modal title="Confirmar acción" onClose={() => setDeletingProductId(null)} className="max-w-md">
                  <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                  >
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                          <span className="font-semibold">Ojo:</span> estás por cambiar el estado de una materia prima. Hazlo solo si estás seguro.
                      </div>

                      <p className="mt-3 text-sm text-black/70">¿Confirmas esta acción? Puede afectar reportes, catálogo visible y procesos internos.</p>

                      <div className="mt-4 flex justify-end gap-2">
                          <button
                              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                              onClick={() => setDeletingProductId(null)}
                          >
                              Cancelar
                          </button>
                          <button
                              className="rounded-2xl border border-rose-600/20 bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600/25"
                              onClick={confirmDelete}
                          >
                              Confirmar
                          </button>
                      </div>
                  </motion.div>
              </Modal>
          )}

          {equivalenceProductId && (
              <Modal title={`Equivalencias · ${equivalenceProductName ?? "-"}`} onClose={closeEquivalences} className="max-w-2xl">
                  <EquivalenceFormFields
                      productId={equivalenceProductId}
                      baseUnitId={equivalenceBaseUnitId}
                      units={units}
                      equivalences={equivalences}
                      loading={loadingEquivalences}
                      onCreated={async () => {
                          await loadEquivalences(equivalenceProductId);
                      }}
                  />
              </Modal>
          )}
      </div>
  );
}

function ProductFormFields({
  form,
  setForm,
  units,
}: {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  units?: ListUnitResponse;
}) {
  const unitOptions = (units ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }));

  return (
    <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                  Nombre
                  <input
                      className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                      style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
              </label>
              <label className="text-sm">
                  <div className="mb-2">Unidad base</div>
                  <FilterableSelect
                      value={form.baseUnitId}
                      onChange={(value) => setForm((prev) => ({ ...prev, baseUnitId: value }))}
                      options={unitOptions}
                      placement="bottom"
                      placeholder="Seleccionar unidad"
                      searchPlaceholder="Buscar unidad..."
                  />
              </label>
          </div>
          <label className="text-sm">
              Descripción
              <textarea
                  className="mt-2 min-h-[90px] w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
          </label>
          <div className="mt-3">
              <label className="text-sm ">
                  Codigo de barras
                  <input
                      className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/50 cursor-not-allowed"
                      value={form.barcode}
                      onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                      disabled
                      placeholder=""
                  />
              </label>
          </div>
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
                          className="h-10 w-full rounded-lg border border-black/10 pl-10 pr-3 text-sm"
                          value={form.price}
                          onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
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
                          className="h-10 w-full rounded-lg border border-black/10 pl-10 pr-3 text-sm"
                          value={form.cost}
                          onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
                      />
                  </div>
              </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                  Atributo
                  <select
                      className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                      value={form.attribute}
                      onChange={(event) => setForm((prev) => ({ ...prev, attribute: event.target.value as ProductForm["attribute"] }))}
                  >
                      <option value="">Seleccionar</option>
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
                      onChange={(event) => setForm((prev) => ({ ...prev, attributeValue: event.target.value }))}
                  />
              </label>
          </div>
      </div>
  );
}

function EquivalenceFormFields({
  productId,
  baseUnitId,
  units,
  equivalences,
  loading,
  onCreated,
}: {
  productId: string;
  baseUnitId: string;
  units?: ListUnitResponse;
  equivalences: ProductEquivalence[];
  loading: boolean;
  onCreated: () => Promise<void>;
}) {
  const [fromUnitId, setFromUnitId] = useState("");
  const [factor, setFactor] = useState("1");

  const unitOptions = (units ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }));

  const baseUnitLabel =
    (units ?? []).find((u) => u.id === baseUnitId)?.name ?? (baseUnitId ? baseUnitId : "Sin unidad base");

  const handleCreate = async () => {
    if (!productId || !baseUnitId || !fromUnitId || !factor) return;
    await createProductEquivalence({
      productId,
      fromUnitId,
      toUnitId: baseUnitId,
      factor: Number(factor),
    });
    setFromUnitId("");
    setFactor("1");
    await onCreated();
  };

  const deleteEquivalence = async (id: string) => {
    try {
      await deleteProductEquivalence(id);
      await onCreated();
    } catch {
      console.log("algo salio mal");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_45px]">
        <label className="text-sm">
          <div className="mb-2">Unidad origen</div>
          <input
            className="h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/60"
            value={baseUnitLabel}
            disabled
          />
        </label>
        <label className="text-sm">
          <div className="mb-2">Factor</div>
          <input
            type="number"
            min="0"
            step="0.0001"
            className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <div className="mb-2">Unidad destino</div>
          <FilterableSelect
            value={fromUnitId}
            onChange={setFromUnitId}
            options={unitOptions}
            placement="bottom"
            placeholder="Seleccionar unidad"
            searchPlaceholder="Buscar unidad..."
          />
        </label>
        <button
          type="button"
          className="rounded-xl border h-10 text-xl text-white mt-7"
          style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
          onClick={() => void handleCreate()}
          disabled={!productId || !baseUnitId || !fromUnitId || !factor}
        >
          +
        </button>
      </div>

      <div className="flex justify-end"></div>

      <div className="rounded-2xl border border-black/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 text-xs text-black/60">
          <span>Listado de equivalencias</span>
          <span>{loading ? "Cargando..." : `${equivalences.length} registros`}</span>
        </div>
        <div className="max-h-56 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-black/10 text-xs text-black/60">
                <th className="py-2 px-5 text-left">Unidad origen</th>
                <th className="py-2 px-5 text-center">Factor</th>
                <th className="py-2 px-5 text-right">Unidad destino</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {equivalences.map((eq) => {
                const fromLabel = (units ?? []).find((u) => u.id === eq.fromUnitId);
                const toLabel = (units ?? []).find((u) => u.id === eq.toUnitId);
                return (
                  <tr key={eq.id} className="border-b border-black/5">
                    <td className="py-2 px-5">{toLabel ? `${toLabel.name} (${toLabel.code})` : eq.toUnitId}</td>
                    <td className="py-2 px-5 text-center">{eq.factor}</td>
                    <td className="py-2 px-5 text-right">{fromLabel ? `${fromLabel.name} (${fromLabel.code})` : eq.fromUnitId}</td>
                    <td>
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-red-500 text-lime-50 font-semibold hover:bg-red-400"
                        onClick={() => {
                          void deleteEquivalence(eq.id);
                        }}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && equivalences.length === 0 && (
            <div className="px-4 py-4 text-sm text-black/60">No hay equivalencias registradas.</div>
          )}
        </div>
      </div>
    </div>
  );
}
