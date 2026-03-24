import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { Modal } from "@/components/settings/modal";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { StatusPill } from "@/components/StatusTag";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useProducts } from "@/hooks/useProducts";
import { errorResponse, successResponse } from "@/common/utils/response";
import { IconButton } from "@/components/IconBoton";
import { listProductEquivalences } from "@/services/equivalenceService";
import { getById, listProducts } from "@/services/productService";
import { listProductRecipes } from "@/services/productRecipeService";
import { listUnits } from "@/services/unitService";
import { getVariantByIdp, listRowMaterials } from "@/services/catalogService";
import { fadeUp, item, list } from "@/utils/animations";
import { money } from "@/utils/functionPurchases";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Filter, Menu, Pencil, Plus, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import type { ProductEquivalence } from "@/pages/catalog/types/equivalence";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { ListProductsQuery, Product } from "@/pages/catalog/types/product";
import type { ProductRecipe } from "@/pages/catalog/types/productRecipe";
import type { PrimaVariant, VariantListItem } from "@/pages/catalog/types/variant";
import { Dropdown } from "../../components/Dropdown";
import { EquivalenceFormFields } from "./components/EquivalenceFormField";
import { ProductFormModal } from "./components/ProductFormModal";
import { RecipeFormFields } from "./components/RecipeFormFields";
import { VariantList } from "./components/VariantList";
import { getDropdownItemProducts } from "./data/getDropdownItemProducts";

const PRIMARY = "hsl(var(--primary))";
const PRIMARY_HOVER = "#1aa392";
const PRODUCT_TYPE = ProductTypes.FINISHED;
const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Eliminados" },
];

export default function CatalogProducts() {
    const shouldReduceMotion = useReducedMotion();
    const { showFlash, clearFlash } = useFlashMessage();
    const navigate = useNavigate();

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
    const [recipeVariantId, setRecipeVariantId] = useState<string | null>(null);
    const [sku, setSku] = useState<string | null>(null);
    const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [primaVariants, setPrimaVariants] = useState<PrimaVariant[]>([]);
    const [variantsProduct, setVariantsProduct] = useState<{ id: string; name: string } | null>(null);
    const [variants, setVariants] = useState<VariantListItem[]>([]);
    const [variantsLoading, setVariantsLoading] = useState(false);
    const [variantsError, setVariantsError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [debouncedName, setDebouncedName] = useState("");
    const limit = 10;

    const [exporting, setExporting] = useState(false);

    const loadRecipes = async (variantId: string) => {
        setLoadingRecipes(true);
        try {
            const res = await listProductRecipes({ variantId });
            setRecipes(res ?? []);
        } catch {
            setRecipes([]);
            showFlash(errorResponse("Error al cargar recetas"));
        } finally {
            setLoadingRecipes(false);
        }
    };

    const openRecipes = (id: string, sku: string) => {
        if (!id) {
            showFlash(errorResponse("Producto sin variante por defecto"));
            return;
        }
        setRecipeVariantId(id);
        setSku(sku);

        void loadPrimaVariants();
        void loadRecipes(id);
    };

    const loadPrimaVariants = async () => {
        try {
            const result = await listRowMaterials();
            const normalized = (result ?? [])
                .map((row) => ({
                    ...row,
                    id: row.id ?? row.primaId ?? row.itemId,
                    isActive: row.isActive ?? true,
                }))
                .filter((row) => row.id);
            setPrimaVariants(normalized);
            console.log("Prima variants loaded:", result);
        } catch {
            setPrimaVariants([]);
            showFlash(errorResponse("Error al cargar variantes PRIMA"));
        }
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

    const { items: products, total, page: apiPage, limit: apiLimit, loading, error, refresh, setActive } = useProducts(queryParams);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedName(searchText.trim());
            setPage(1);
        }, 450);
        return () => clearTimeout(handler);
    }, [searchText]);

    const loadUnits = async () => {
        try {
            const res = await listUnits();
            setUnits(res);
        } catch {
            showFlash(errorResponse("Error al cargar unidades"));
        }
    };

    const effectiveLimit = apiLimit ?? limit;
    const safePage = Math.max(1, apiPage || page);
    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));
    const startIndex = total === 0 ? 0 : (safePage - 1) * effectiveLimit + 1;
    const endIndex = Math.min(safePage * effectiveLimit, total);
    const hasPrev = safePage > 1;
    const hasNext = safePage < totalPages;

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [products]);

    const listKey = useMemo(() => `${page}|${statusFilter}|${debouncedName}`, [page, statusFilter, debouncedName]);

    const startCreate = () => {
        setEditingProductId(null);
        setOpenCreate(true);
    };

    const openEdit = (productId: string) => {
        setOpenCreate(false);
        setEditingProductId(productId);
    };

    const columns = useMemo<DataTableColumn<Product>[]>(
        () => [
            {
                id: "sku",
                header: "SKU",
                cell: (row) => <span className="font-medium">{row.sku || "-"}</span>,
                headerClassName: "text-left w-[100px]",
                className: "text-black/70",
            },
            {
                id: "name",
                header: "Producto",
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="font-medium leading-5 truncate">{row.name}</p>
                    </div>
                ),
                headerClassName: "text-left w-[120px]",
                className: "text-black/70",
            },
            {
                id: "description",
                header: "Descripción",
                cell: (row) => <p className="line-clamp-2 text-black/70">{row.description || "-"}</p>,
                headerClassName: "text-left w-[120px]",
                className: "text-black/70",
            },
            {
                id: "unit",
                header: "Unidad",
                cell: (row) => {
                    if (!row.baseUnitName) return <span className="text-black/70">-</span>;
                    return (
                        <span className="line-clamp-2 text-black/70">
                            {row.baseUnitName} {row.baseUnitCode ? `(${row.baseUnitCode})` : ""}
                        </span>
                    );
                },
                headerClassName: "text-left w-[120px]",
                className: "text-black/70",
            },
            {
                id: "presentation",
                header: "Presentación",
                cell: (row) => <span className="line-clamp-2 text-black/70">{row.attributes?.presentation || "-"}</span>,
                headerClassName: "text-left w-[110px]",
                className: "text-black/70",
            },
            {
                id: "variant",
                header: "Variante",
                cell: (row) => <span className="line-clamp-2 text-black/70">{row.attributes?.variant || "-"}</span>,
                headerClassName: "text-left w-[110px]",
                className: "text-black/70",
            },
            {
                id: "color",
                header: "Color",
                cell: (row) => <span className="line-clamp-2 text-black/70">{row.attributes?.color || "-"}</span>,
                headerClassName: "text-left w-[100px]",
                className: "text-black/70",
            },
            {
                id: "price",
                header: "Precio",
                cell: (row) => <span className="line-clamp-2 text-black/70 tabular-nums">{money(Number(row.price), "PEN")}</span>,
                headerClassName: "text-left w-[90px]",
                className: "text-black/70",
            },
            {
                id: "cost",
                header: "Costo",
                cell: (row) => <span className="line-clamp-2 text-black/70 tabular-nums">{money(Number(row.cost), "PEN")}</span>,
                headerClassName: "text-left w-[90px]",
                className: "text-black/70",
            },
            {
                id: "status",
                header: "Estado",
                cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
                headerClassName: "text-left w-[90px]",
                className: "text-black/70",
            },
            {
                id: "actions",
                header: "",
                cell: (row) => (
                    <div className="flex justify-end">
                        <Dropdown
                            trigger={<Menu className="h-4 w-4" />}
                            menuClassName="min-w-52 p-2"
                            itemClassName="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03]"
                            items={getDropdownItemProducts(row, {
                                openEdit,
                                setDeletingProductId,
                            })}
                        />
                    </div>
                ),
                headerClassName: "text-right w-[40px]",
                className: "text-right",
            },
        ],
        [openEdit],
    );

    const confirmDelete = async () => {
        if (!deletingProductId) return;
        clearFlash();
        try {
            const product = products.find((p) => p.id === deletingProductId);
            if (product) await setActive(deletingProductId, !product.isActive);
            setDeletingProductId(null);
            showFlash(successResponse("Estado de producto actualizado"));
        } catch {
            showFlash(errorResponse("Error al cambiar estado del producto"));
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
        loadUnits();
        try {
            const fresh = await getById(productId);
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

    const openVariantsModal = async (productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        setVariantsProduct({ id: product.id, name: product.name });
        setVariantsLoading(true);
        setVariantsError(null);
        try {
            const res = await getVariantByIdp(productId);
            setVariants(res ?? []);
        } catch {
            setVariants([]);
            setVariantsError("Error al cargar variantes");
        } finally {
            setVariantsLoading(false);
        }
    };

    const closeVariantsModal = () => {
        setVariantsProduct(null);
        setVariants([]);
        setVariantsLoading(false);
        setVariantsError(null);
    };

    const goToCreateVariant = () => {
        if (!variantsProduct) return;
        const params = new URLSearchParams({
            productId: variantsProduct.id,
            productName: variantsProduct.name,
            create: "1",
        });
        navigate(`/catalago/variantes?${params.toString()}`);
    };

    const buildCsv = (
        rows: Array<{
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        }>,
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
            return [csvId, row.name, row.description ?? "", String(row.isActive), formatDate(row.createdAt), formatDate(row.updatedAt)].map((v) => escape(String(v))).join(",");
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

            const sorted = [...allItems].filter((row) => row.type === PRODUCT_TYPE).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const csv = `\uFEFF${buildCsv(sorted)}`;

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "productos.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-white text-black">
            <PageTitle title="Catalogo - Productos" />
            <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
                >
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Productos</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-[11px]">
                            Total: <span className="font-semibold text-black">{total}</span>
                        </div>

                        <SystemButton
                            variant="outline"
                            size="sm"
                            className="text-[11px]"
                            onClick={downloadCsv}
                            loading={exporting}
                            leftIcon={<Download className="h-4 w-4" />}
                            title="Exportar CSV"
                        >
                            {exporting ? "Exportando..." : "Exportar CSV"}
                        </SystemButton>

                        <SystemButton
                            size="sm"
                            className="text-[11px]"
                            onClick={startCreate}
                            leftIcon={<Plus className="h-4 w-4" />}
                            title="Nuevo producto"
                        >
                            Nuevo producto
                        </SystemButton>
                    </div>
                </motion.div>

                <motion.section
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate={shouldReduceMotion ? false : "show"}
                    variants={fadeUp}
                    className="bg-gray-50 p-4 sm:p-5 shadow-sm rounded-2xl border border-black/10"
                >
                    <SectionHeaderForm icon={Filter} title="Filtros" />

                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_280px] gap-3">
                        <FloatingInput
                            label="Buscar por nombre (exacto)"
                            name="product-search"
                            value={searchText}
                            onChange={(event) => {
                                setSearchText(event.target.value);
                                setPage(1);
                            }}
                            className="h-9 text-xs"
                        />

                        <FloatingSelect
                            label="Estado"
                            name="status-filter"
                            value={statusFilter}
                            options={STATUS_OPTIONS}
                            onChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                            className="h-9 text-xs"
                        />
                    </div>
                </motion.section>
                <motion.section initial={shouldReduceMotion ? false : "hidden"} animate={shouldReduceMotion ? false : "show"} variants={fadeUp} className="bg-white shadow-sm overflow-hidden">
                    <div className="hidden lg:block">
                        <div className="max-h-[calc(100vh-280px)] overflow-auto">
                            <DataTable
                                tableId="catalog-products"
                                data={sortedProducts}
                                columns={columns}
                                rowKey="id"
                                loading={loading}
                                emptyMessage="No hay productos con los filtros actuales."
                                animated={!shouldReduceMotion}
                                className="overflow-hidden"
                                tableClassName="table-fixed text-[10px]"
                            />

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
                                        <motion.div key={product.id} variants={shouldReduceMotion ? undefined : item} layout className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="mt-1 font-semibold truncate">{product.name}</p>
                                                    <p className="mt-1 text-sm text-black/70 line-clamp-2">{product.description || "-"}</p>
                                                    <div className="mt-3">
                                                        <StatusPill active={product.isActive} PRIMARY={PRIMARY} />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <SystemButton
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-[11px] h-8"
                                                        onClick={() => void openEquivalences(product.id)}
                                                    >
                                                        Equivalencias
                                                    </SystemButton>
                                                    <SystemButton
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-[11px] h-8"
                                                        onClick={() => openRecipes(product.id, product.sku ?? "-")}
                                                    >
                                                        Recetas
                                                    </SystemButton>

                                                    <IconButton
                                                        title="Editar"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void openEdit(product.id);
                                                        }}
                                                        PRIMARY={PRIMARY}
                                                        PRIMARY_HOVER={PRIMARY_HOVER}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </IconButton>

                                                    <IconButton
                                                        title={product.isActive ? "Eliminar" : "Restaurar"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingProductId(product.id);
                                                        }}
                                                        tone={product.isActive ? "danger" : "primary"}
                                                        PRIMARY={PRIMARY}
                                                        PRIMARY_HOVER={PRIMARY_HOVER}
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
                                    <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60">No hay productos con los filtros actuales.</div>
                                )}
                                {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer paginaci�n */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-[11px] text-black/60">
                        <span className="hidden sm:inline">
                            Mostrando {startIndex}-{endIndex} de {total}
                        </span>

                        <div className="flex items-center gap-2">
                            <SystemButton
                                variant="outline"
                                size="sm"
                                className="text-[11px] h-8"
                                disabled={!hasPrev || loading}
                                onClick={() => setPage(Math.max(1, safePage - 1))}
                                type="button"
                            >
                                Anterior
                            </SystemButton>

                            <span className="tabular-nums">
                                Pagina {safePage} de {totalPages}
                            </span>

                            <SystemButton
                                variant="outline"
                                size="sm"
                                className="text-[11px] h-8"
                                disabled={!hasNext || loading}
                                onClick={() => setPage(safePage + 1)}
                                type="button"
                            >
                                Siguiente
                            </SystemButton>
                        </div>
                    </div>
                </motion.section>
            </div>

            {/* MODALES */}
            <ProductFormModal
                open={openCreate}
                mode="create"
                productType={PRODUCT_TYPE}
                units={units}
                primaryColor={PRIMARY}
                entityLabel="producto"
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    void refresh();
                }}
            />

            <ProductFormModal
                open={Boolean(editingProductId)}
                mode="edit"
                productId={editingProductId}
                productType={PRODUCT_TYPE}
                units={units}
                primaryColor={PRIMARY}
                entityLabel="producto"
                onClose={() => setEditingProductId(null)}
                onSaved={() => {
                    void refresh();
                }}
            />

            {deletingProductId && (
                <Modal title="Confirmar acción" onClose={() => setDeletingProductId(null)} className="max-w-md">
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.16 }}
                    >
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                            <span className="font-semibold">Ojo:</span> estas por cambiar el estado de un producto. Hazlo solo si estas seguro.
                        </div>

                        <p className="mt-3 text-sm text-black/70">¿Confirmas esta acción? Puede afectar reportes, catalogo visible y procesos internos.</p>

                        <div className="mt-4 flex justify-end gap-2">
                            <SystemButton
                                variant="outline"
                                size="sm"
                                className="text-[11px]"
                                onClick={() => setDeletingProductId(null)}
                            >
                                Cancelar
                            </SystemButton>
                            <SystemButton
                                variant="danger"
                                size="sm"
                                className="text-[11px]"
                                onClick={confirmDelete}
                            >
                                Confirmar
                            </SystemButton>
                        </div>
                    </motion.div>
                </Modal>
            )}
            {variantsProduct && (
                <Modal title={`Variantes · ${variantsProduct.name}`} onClose={closeVariantsModal} className="max-w-xl">
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.16 }}
                        className="space-y-3"
                    >
                        <VariantList
                            variantsLoading={variantsLoading}
                            variantsError={variantsError}
                            variants={variants}
                            primary={PRIMARY}
                            primaryHover={PRIMARY_HOVER}
                            onCreateVariant={goToCreateVariant}
                        />
                    </motion.div>
                </Modal>
            )}

            {equivalenceProductId && (
                <Modal title={`Equivalencias - ${equivalenceProductName ?? "-"}`} onClose={closeEquivalences} className="max-w-2xl">
                    <EquivalenceFormFields
                        productId={equivalenceProductId}
                        baseUnitId={equivalenceBaseUnitId}
                        units={units}
                        equivalences={equivalences}
                        loading={loadingEquivalences}
                        onCreated={async () => {
                            await loadEquivalences(equivalenceProductId);
                        }}
                        PRIMARY={PRIMARY}
                    />
                </Modal>
            )}
            {recipeVariantId && (
                <Modal title={`Recetas de variante (${sku})`} onClose={() => setRecipeVariantId(null)} className="max-w-2xl">
                    <RecipeFormFields
                        finishedVariantId={recipeVariantId}
                        units={units}
                        primaVariants={primaVariants}
                        recipes={recipes}
                        loading={loadingRecipes}
                        onCreated={async () => {
                            await loadRecipes(recipeVariantId);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
}
