import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { StatusPill } from "@/components/StatusTag";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useProducts } from "@/hooks/useProducts";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listProducts } from "@/services/productService";
import { fadeUp  } from "@/utils/animations";
import { money } from "@/utils/functionPurchases";
import {  motion, useReducedMotion } from "framer-motion";
import { Download, Filter, Menu, Plus } from "lucide-react";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import type { ListProductsQuery, Product } from "@/pages/catalog/types/product";
import { Headed } from "@/components/Headed";
import { getDropdownItemProducts } from "./data/getDropdownItemProducts";
import { ActionsPopover } from "@/components/ActionsPopover";
import { ProductFormModal } from "./components/ProductFormModal";
import { Modal } from "@/components/modales/Modal";

const PRIMARY = "hsl(var(--primary))";
const PRODUCT_TYPE = ProductTypes.FINISHED;
const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Eliminados" },
];

export default function CatalogProducts() {
    const shouldReduceMotion = useReducedMotion();
    const { showFlash, clearFlash } = useFlashMessage();

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("active");
    const [openCreate, setOpenCreate] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [debouncedName, setDebouncedName] = useState("");
    const limit = 10;

    const [exporting, setExporting] = useState(false);


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
                cell: (row) => <span className="font-medium">{row.customSku || "-"}</span>,
                headerClassName: "text-left w-[100px] h-11",
                className: "text-black/70",
            },
            {
                id: "name",
                header: "Producto",
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="font-medium leading-5">{row.name}
                         {row.sku ? ` - ${row.sku}` : ""}</p>
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
                headerClassName: "text-left w-[80px]",
                className: "text-black/70",
            },
            {
                id: "actions",
                header: "ACCIONES",
                headerClassName: "text-right w-[70px]",
                cell: (row) => (
                    <div className="flex justify-center">
                        <ActionsPopover
                            actions={getDropdownItemProducts(row, {
                                openEdit,
                                setDeletingProductId,
                            })}
                            columns={1}
                            compact
                            showLabels
                            triggerIcon={<Menu className="h-4 w-4" />}
                            popoverClassName="min-w-52"
                            popoverBodyClassName="p-2"
                            renderAction={(action, helpers) => (
                                <button
                                    key={action.id}
                                    type="button"
                                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation();
                                        helpers.onAction(action);
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                                    disabled={action.disabled}
                                >
                                    {action.icon}
                                    {action.label}
                                </button>
                            )}
                        />
                    </div>
                ),
                className: "text-right",
            },
        ],
        [openEdit, setDeletingProductId],
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
            <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 
            sm:px-6 lg:px-8 py-6 space-y-4">
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
                >
                    <Headed title="Productos" size="lg" />
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
                <motion.section initial={shouldReduceMotion ? false : "hidden"} animate={shouldReduceMotion ? false : "show"} 
                variants={fadeUp} className="bg-white shadow-sm overflow-hidden">
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                        <DataTable
                            tableId="catalog-products"
                            data={products}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            emptyMessage="No hay productos con los filtros actuales."
                            animated={!shouldReduceMotion}
                            tableClassName="table-fixed text-[11px]"
                            selectableColumns
                            pagination={{
                                page: apiPage ?? page,
                                limit: apiLimit ?? limit,
                                total
                            }}
                            onPageChange={(nextPage) => setPage(nextPage)}
                        />

                        {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
                    </div>
                </motion.section>
            </div>
            <ProductFormModal
                open={openCreate}
                mode="create"
                productType={PRODUCT_TYPE}
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
                primaryColor={PRIMARY}
                entityLabel="producto"
                onClose={() => setEditingProductId(null)}
                onSaved={() => {
                    void refresh();
                }}
            />

            <Modal open={deletingProductId ? true : false}
            title="Confirmar acción" onClose={() => setDeletingProductId(null)} className="max-w-md">
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                >
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        <span className="font-semibold">Ojo:</span> estas por cambiar el estado de un producto. Hazlo solo si estas seguro.
                    </div>
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
        </div>
    );
}
