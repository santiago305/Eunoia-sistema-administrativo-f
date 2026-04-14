import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Download, Menu, Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { StatusPill } from "@/components/StatusTag";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useProducts } from "@/hooks/useProducts";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listCatalogProducts, updateProductActive } from "@/services/productService";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import type { Product } from "@/pages/catalog/types/product";
import { Headed } from "@/components/Headed";
import { getDropdownItemProducts } from "./data/getDropdownItemProducts";
import { ActionsPopover } from "@/components/ActionsPopover";
import { ProductCreateModal } from "./components/ProductCreateModal";
import { PageShell } from "@/components/layout/PageShell";
import { AlertModal } from "@/components/AlertModal";

const PRIMARY = "hsl(var(--primary))";
const PRODUCT_TYPE = ProductTypes.PRODUCT;

export default function CatalogProducts() {
    const shouldReduceMotion = useReducedMotion();
    const { showFlash, clearFlash } = useFlashMessage();

    const [openCreate, setOpenCreate] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    const limit = 30;

    const queryParams = useMemo(
        () => ({
            page,
            limit,
        }),
        [page],
    );

    const {
        items: products,
        total,
        page: apiPage,
        limit: apiLimit,
        loading,
        refresh,
    } = useProducts(queryParams, { mode: "product" });

    const deletingProduct = useMemo(
        () => products.find((product) => product.id === deletingProductId) ?? null,
        [products, deletingProductId],
    );

    const startCreate = () => {
        setEditingProductId(null);
        setOpenCreate(true);
    };

    const openEdit = useCallback((product: Product) => {
        setOpenCreate(false);
        setEditingProductId(product.id);
    }, []);

    const columns = useMemo<DataTableColumn<Product>[]>(
        () => [
            {
                id: "name",
                header: "Nombre",
                cell: (row) => <span className="font-medium">{row.name}</span>,
            },
            {
                id: "description",
                header: "Descripcion",
                cell: (row) => <p className="line-clamp-2 text-black/70">{row.description || "-"}</p>,
            },
            {
                id: "type",
                header: "Tipo",
                visible: false,
                cell: (row) => <span className="text-black/70">{row.type || "-"}</span>,
            },
            {
                id: "brand",
                header: "Marca",
                cell: (row) => <span className="text-black/70">{row.brand || "-"}</span>,
            },
            {
                id: "skuCount",
                header: "Variantes",
                cell: (row) => <span className="text-black/70">{row.skuCount ?? 0}</span>,
            },
            {
                id: "inventoryTotal",
                header: "Stock",
                cell: (row) => <span className="text-black/70">{row.inventoryTotal ?? 0}</span>,
            },
            {
                id: "status",
                header: "Estado",
                cell: (row) => <StatusPill active={row.isActive} PRIMARY={PRIMARY} />,
            },
            {
                id: "actions",
                header: "ACCIONES",
                headerClassName: "text-center flex justify-center",
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
                            popoverClassName="min-w-35"
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
            },
        ],
        [openEdit],
    );

    const confirmDelete = async () => {
        if (!deletingProductId) return;
        clearFlash();
        try {
            const product = products.find((p) => p.id === deletingProductId);
            if (product) {
            await updateProductActive(deletingProductId, {
                isActive: !product.isActive,
            });
            }  
            await refresh();
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
            brand?: string | null;
            type: string;
            isActive: boolean;
            createdAt: string;
            updatedAt: string | null;
        }>,
    ) => {
        const header = ["id", "name", "description", "type", "brand", "isActive", "createdAt", "updatedAt"];
        const escape = (value: string) => {
            if (value.includes('"') || value.includes(",") || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`;
            return value;
        };
        const formatDate = (value: string | null) => {
            if (!value) return "-";
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
            return [
                csvId,
                row.name,
                row.description ?? "",
                row.type ?? "",
                row.brand ?? "",
                String(row.isActive),
                formatDate(row.createdAt),
                formatDate(row.updatedAt),
            ].map((value) => escape(String(value))).join(",");
        });
        return [header.join(","), ...lines].join("\n");
    };

    const downloadCsv = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const pageSize = 100;
            const first = await listCatalogProducts({ page: 1, limit: pageSize });
            const allItems = [...(first.items ?? [])];
            const pages = Math.max(1, Math.ceil((first.total ?? allItems.length) / pageSize));

            for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
                const response = await listCatalogProducts({ page: currentPage, limit: pageSize });
                if (response.items?.length) allItems.push(...response.items);
            }

            const sorted = [...allItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
        <PageShell>
            <PageTitle title="Catalogo - Productos" />
            <div className="flex items-center justify-between">
                <Headed title="Productos" size="lg" />
                <div className="flex flex-wrap items-center gap-2">
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
            </div>

            <DataTable
                tableId="catalog-products"
                data={products}
                columns={columns}
                rowKey="id"
                loading={loading}
                emptyMessage="No hay productos disponibles."
                showSearch
                searchPlaceholder="Buscar productos..."
                animated={!shouldReduceMotion}
                tableClassName="text-[11px]"
                pagination={{
                    page: apiPage ?? page,
                    limit: apiLimit ?? limit,
                    total,
                }}
                selectableColumns
                onPageChange={(nextPage) => setPage(nextPage)}
            />

            <ProductCreateModal
                open={openCreate}
                productType={PRODUCT_TYPE}
                primaryColor={PRIMARY}
                entityLabel="producto"
                onClose={() => setOpenCreate(false)}
                onSaved={() => {
                    void refresh();
                }}
            />

            <ProductCreateModal
                open={Boolean(editingProductId)}
                mode="edit"
                productId={editingProductId}
                productType={PRODUCT_TYPE}
                primaryColor={PRIMARY}
                entityLabel="producto"
                onClose={() => {
                    setEditingProductId(null);
                }}
                onSaved={() => {
                    void refresh();
                }}
            />

            <AlertModal
                open={!!deletingProductId}
                type={deletingProduct?.isActive ? "deleted" : "restore"}
                title="Confirmar acción"
                onClose={() => setDeletingProductId(null)}
                onConfirm={confirmDelete}
                message={
                    <>
                        {deletingProduct?.isActive ? (
                            <>Estas por eliminar un producto. Hazlo solo si estas seguro.</>
                        ) : (
                            <>Estas por restaurar un producto. Hazlo solo si estas seguro.</>
                        )}
                    </>
                }
                confirmText="Confirmar"
            />
        </PageShell>
    );
}
