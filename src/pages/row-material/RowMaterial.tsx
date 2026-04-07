import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { PageTitle } from "@/components/PageTitle";
import { StatusPill } from "@/components/StatusTag";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useProducts } from "@/hooks/useProducts";
import { listProductsFlat } from "@/services/productService";
import {  motion, useReducedMotion } from "framer-motion";
import { Download,  Menu, Plus } from "lucide-react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { ProductFormModal } from "../catalog/components/ProductFormModal";
import type { Product } from "@/pages/catalog/types/product";
import { money } from "@/utils/functionPurchases";
import { ActionsPopover } from "@/components/ActionsPopover";
import { Headed } from "@/components/Headed";
import { Modal } from "@/components/modales/Modal";
import { getDropdownItemProducts } from "../catalog/data/getDropdownItemProducts";
import { PageShell } from "@/components/layout/PageShell";

const PRIMARY = "hsl(var(--primary))";
const PRODUCT_TYPE = ProductTypes.PRIMA;

export default function RowMaterial() {
    const shouldReduceMotion = useReducedMotion();
    const { showFlash, clearFlash } = useFlashMessage();

    const [openCreate, setOpenCreate] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
    const [editingWorkspaceTab, setEditingWorkspaceTab] = useState<"details" | "variantCreated">("details");
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const limit = 10;

    const [exporting, setExporting] = useState(false);

    const queryParams = useMemo(
        () => ({
            page,
            limit,
            type: PRODUCT_TYPE,
        }),
        [page, limit],
    );

    const { items: products, total, page: apiPage, limit: apiLimit, loading, error, refresh, setActive } = useProducts(queryParams, { flat: true });

    const startCreate = () => {
        setEditingProductId(null);
        setEditingVariantId(null);
        setEditingWorkspaceTab("details");
        setOpenCreate(true);
    };

    const openEdit = useCallback((product: Product) => {
        setOpenCreate(false);
        if (product.sourceType === "VARIANT" && product.productId) {
            setEditingProductId(product.productId);
            setEditingVariantId(product.id);
            setEditingWorkspaceTab("variantCreated");
            return;
        }

        setEditingProductId(product.id);
        setEditingVariantId(null);
        setEditingWorkspaceTab("details");
    }, []);

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

    const columns = useMemo<DataTableColumn<Product>[]>(
        () => [
            {
                id: "sku",
                header: "ID",
                cell: (row) => <span className="font-medium">{row.customSku || "-"}</span>,
                headerClassName: "text-left h-11",
                className: "text-black/70",
            },
            {
                id: "name",
                header: "Materia prima",
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="font-medium leading-5">{row.name}
                         {row.sku ? ` - ${row.sku}` : ""}</p>
                    </div>
                ),
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "description",
                header: "Descripción",
                cell: (row) => <p className="line-clamp-2 text-black/70">{row.description || "-"}</p>,
                headerClassName: "text-left",
                className: "text-black/70",
                visible: false,
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
                headerClassName: "text-left",
                className: "text-black/70",
                visible: false,
            },
            {
                id: "presentation",
                header: "Presentación",
                cell: (row) => <span className="line-clamp-2 text-black/70">{row.attributes?.presentation || "-"}</span>,
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "variant",
                header: "Variante",
                cell: (row) => <span className="line-clamp-2 text-black/70">{row.attributes?.variant || "-"}</span>,
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "color",
                header: "Color",
                cell: (row) => <span className="line-clamp-2 text-black/70">{row.attributes?.color || "-"}</span>,
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "price",
                header: "Precio",
                cell: (row) => <span className="line-clamp-2 text-black/70 tabular-nums">{money(Number(row.price), "PEN")}</span>,
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "cost",
                header: "Costo",
                cell: (row) => <span className="line-clamp-2 text-black/70 tabular-nums">{money(Number(row.cost), "PEN")}</span>,
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "sourceType",
                header: "Origen",
                cell: (row) => (
                    <span className="line-clamp-2 text-black/70">
                        {row.sourceType === "VARIANT" ? "Variante" : "Producto"}
                    </span>
                ),
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "status",
                header: "Estado",
                cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
                headerClassName: "text-left",
                className: "text-black/70",
            },
            {
                id: "actions",
                headerClassName: "text-center",
                header: "ACCIONES",
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
            const baseParams = { isActive: queryParams.isActive, q: queryParams.q, type: queryParams.type };
            const first = await listProductsFlat({ page: 1, limit: pageSize, ...baseParams });
            const allItems = [...(first.items ?? [])];
            const pages = Math.max(1, Math.ceil((first.total ?? allItems.length) / pageSize));

            for (let p = 2; p <= pages; p += 1) {
                const res = await listProductsFlat({ page: p, limit: pageSize, ...baseParams });
                if (res.items?.length) allItems.push(...res.items);
            }

            const sorted = [...allItems].filter((row) => row.type === PRODUCT_TYPE).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

    return (
        <PageShell>
            <PageTitle title="Catálogo · Materias primas" />
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
                >
                    <Headed title="Materias primas y materiales" 
                    size="lg" />

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
                            title="Nueva materia prima"
                        >
                            Nueva materia prima
                        </SystemButton>
                    </div>
                </motion.div>

                <DataTable
                    tableId="row-materials"
                    data={products}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    emptyMessage="No hay materias primas con los filtros actuales."
                    showSearch
                    searchPlaceholder="Buscar en la tabla..."
                    animated={!shouldReduceMotion}
                    tableClassName="table-fixed text-[11px]"
                    pagination={{
                        page: apiPage ?? page,
                        limit: apiLimit ?? limit,
                        total
                    }}
                    selectableColumns
                    onPageChange={(nextPage) => setPage(nextPage)}
                />

            <ProductFormModal
                open={openCreate}
                mode="create"
                productType={PRODUCT_TYPE}
                primaryColor={PRIMARY}
                entityLabel="materia prima"
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    void refresh();
                }}
            />

            <ProductFormModal
                open={Boolean(editingProductId)}
                mode="edit"
                productId={editingProductId}
                initialWorkspaceTab={editingWorkspaceTab}
                initialVariantId={editingVariantId}
                productType={PRODUCT_TYPE}
                primaryColor={PRIMARY}
                entityLabel="materia prima"
                onClose={() => {
                    setEditingProductId(null);
                    setEditingVariantId(null);
                    setEditingWorkspaceTab("details");
                }}
                onSaved={() => {
                    void refresh();
                }}
            />

            <Modal open={deletingProductId ? true : false} title="Confirmar acción" 
            onClose={() => setDeletingProductId(null)} 
            className="max-w-md">
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                    animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                >
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        <span className="font-semibold">Ojo:</span> estás por cambiar el estado de una materia prima. Hazlo solo si estás seguro.
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
        </PageShell>
    );
}
