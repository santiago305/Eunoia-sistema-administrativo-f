import { startTransition, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Menu, Plus } from "lucide-react";
import { StatusPill } from "@/shared/components/components/StatusTag";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { DataTable } from "@/shared/components/table/DataTable";
import {
    DataTableSearchBar,
    DataTableSearchChips,
    type DataTableRecentSearchItem,
    type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type { DataTableColumn } from "@/shared/components/table/types";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { useProducts } from "@/shared/hooks/useProducts";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
    deleteProductSearchMetric,
    deleteProductExportPreset,
    exportProductExcel,
    getProductExportColumns,
    getProductExportPresets,
    getProductSearchState,
    listCatalogProducts,
    saveProductExportPreset,
    saveProductSearchMetric,
    updateProductActive,
} from "@/shared/services/productService";
import type { Product, ProductCatalogProductType} from "@/features/catalog/types/product";
import type { ProductSearchStateResponse } from "@/features/catalog/types/productSearch";
import { getDropdownItemProducts } from "../data/getDropdownItemProducts";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { ProductCreateModal } from "./ProductCreateModal";
import { ProductDetailsModal } from "./ProductDetailsModal";
import { PageShell } from "@/shared/layouts/PageShell";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import { useCompany } from "@/shared/hooks/useCompany";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { ProductSmartSearchPanel } from "./ProductSmartSearchPanel";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { getProductCatalogPermissions } from "../utils/catalogPermissions";
import {
    buildProductSearchChips,
    buildProductSmartSearchColumns,
    createEmptyProductSearchFilters,
    hasProductSearchCriteria,
    removeProductSearchKey,
    sanitizeProductSearchSnapshot,
    upsertProductSearchRule,
    type ProductSearchFilterKey,
    type ProductSearchRule,
    type ProductSearchSnapshot,
} from "../utils/productSmartSearch";


const PRIMARY = "hsl(var(--primary))";

const formatQuantityWithUnit = (quantity?: number | null, unitCode?: string | null) => {
    const safeQuantity = Number(quantity ?? 0);
    const normalizedUnit = unitCode?.trim();
    return normalizedUnit ? `${safeQuantity} ${normalizedUnit}` : `${safeQuantity}`;
};

type CatalogListFn = typeof listCatalogProducts;

type ProductCatalogPageConfig = {
    productType: ProductCatalogProductType;
    pageTitle: string;
    mode: "product" | "material";
    listAll: CatalogListFn;
    headingTitle: string;
    tableId: string;
    searchLabel: string;
    searchName: string;
    emptyMessage: string;
    createTitle: string;
    createLabel: string;
    entityLabel: string;
    csvFileName: string;
    updateSuccessMessage: string;
    updateErrorMessage: string;
    deleteMessage: string;
    restoreMessage: string;
};

export function ProductCatalogPage({ config }: { config: ProductCatalogPageConfig }) {
    const { showFeedback, clearFeedback } = useFeedbackToast();
    const { hasCompany } = useCompany();
    const { can } = usePermissions();
    const permissions = useMemo(() => getProductCatalogPermissions(config.productType, can), [can, config.productType]);
    const companyActionDisabled = !hasCompany;

    const [openCreate, setOpenCreate] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
    const [openDetails, setOpenDetails] = useState(false);
    const limit = 25;
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState("");
    const [executedSearchText, setExecutedSearchText] = useState("");
    const [searchFilters, setSearchFilters] = useState(() => createEmptyProductSearchFilters());
    const debouncedSearchText = useDebouncedValue(searchText.trim(), 400);
    const [searchState, setSearchState] = useState<ProductSearchStateResponse | null>(null);
    const [savingMetric, setSavingMetric] = useState(false);
    const [exportColumns, setExportColumns] = useState<Array<{ key: string; label: string }>>([]);
    const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: Array<{ key: string; label: string }> }>>([]);
    const [exporting, setExporting] = useState(false);

    const queryParams = useMemo(
    () => ({
        page,
        limit,
        q: executedSearchText || undefined,
        filters: searchFilters.length ? JSON.stringify(searchFilters) : undefined,
    }),
    [page, limit, executedSearchText, searchFilters],
    );

    useEffect(() => {
        setExecutedSearchText(debouncedSearchText);
    }, [debouncedSearchText]);

    const smartSearchColumns = useMemo(() => buildProductSmartSearchColumns(), []);

    const draftSnapshot = useMemo<ProductSearchSnapshot>(
        () => sanitizeProductSearchSnapshot({ q: searchText, filters: searchFilters }),
        [searchFilters, searchText],
    );

    const executedSnapshot = useMemo<ProductSearchSnapshot>(
        () => sanitizeProductSearchSnapshot({ q: executedSearchText, filters: searchFilters }),
        [executedSearchText, searchFilters],
    );

    const searchChips = useMemo(() => buildProductSearchChips(executedSnapshot), [executedSnapshot]);

    const applySnapshot = useCallback((snapshot: ProductSearchSnapshot) => {
        const normalized = sanitizeProductSearchSnapshot(snapshot);
        startTransition(() => {
            setSearchText(normalized.q ?? "");
            setExecutedSearchText(normalized.q ?? "");
            setSearchFilters(normalized.filters);
            setPage(1);
        });
    }, []);

    const handleApplySearchRule = useCallback((rule: ProductSearchRule) => {
        startTransition(() => {
            const next = upsertProductSearchRule(
                sanitizeProductSearchSnapshot({ q: searchText, filters: searchFilters }),
                rule,
            );
            setSearchFilters(next.filters);
            setPage(1);
        });
    }, [searchFilters, searchText]);

    const handleRemoveSearchRule = useCallback((fieldId: ProductSearchFilterKey) => {
        startTransition(() => {
            const next = removeProductSearchKey(
                sanitizeProductSearchSnapshot({ q: searchText, filters: searchFilters }),
                fieldId,
            );
            setSearchFilters(next.filters);
            setPage(1);
        });
    }, [searchFilters, searchText]);

    const submitSearch = useCallback(() => {
        const nextQ = searchText.trim();
        startTransition(() => {
            setExecutedSearchText(nextQ);
            setPage(1);
        });
    }, [searchText]);

    const handleRemoveChip = useCallback((key: "q" | ProductSearchFilterKey) => {
        const nextSnapshot = removeProductSearchKey(
            sanitizeProductSearchSnapshot({ q: executedSearchText, filters: searchFilters }),
            key,
        );
        startTransition(() => {
            setSearchText(nextSnapshot.q ?? "");
            setExecutedSearchText(nextSnapshot.q ?? "");
            setSearchFilters(nextSnapshot.filters);
            setPage(1);
        });
    }, [executedSearchText, searchFilters]);


    const {
        items: products,
        total,
        page: apiPage,
        limit: apiLimit,
        loading,
        refresh,
    } = useProducts(queryParams, { mode: config.mode });


    const loadSearchState = useCallback(async () => {
        try {
            const response = await getProductSearchState({ type: config.productType });
            setSearchState(response);
        } catch {
            showFeedback(errorResponse("Error al cargar el estado del buscador inteligente"));
        }
    }, [config.productType, showFeedback]);

    useEffect(() => {
        void loadSearchState();
    }, [loadSearchState]);

    useEffect(() => {
        if (loading) return;
        if (!hasProductSearchCriteria(executedSnapshot)) return;
        void loadSearchState();
    }, [executedSnapshot, loading, loadSearchState]);

    const loadExportColumns = useCallback(async () => {
        const response = await getProductExportColumns({
            type: config.productType,
            q: executedSearchText || undefined,
            filters: searchFilters.length ? JSON.stringify(searchFilters) : undefined,
        });
        setExportColumns(response ?? []);
    }, [config.productType, executedSearchText, searchFilters]);

    const loadExportPresets = useCallback(async () => {
        const response = await getProductExportPresets({ type: config.productType });
        setExportPresets((response ?? []).map((item) => ({
            metricId: item.metricId,
            name: item.name,
            columns: item.snapshot?.columns ?? [],
        })));
    }, [config.productType]);

    useEffect(() => {
        if (!permissions.export) {
            setExportColumns([]);
            setExportPresets([]);
            return;
        }
        void loadExportColumns();
        void loadExportPresets();
    }, [loadExportColumns, loadExportPresets, permissions.export]);

    const recentSearches = useMemo<DataTableRecentSearchItem<ProductSearchSnapshot>[]>(
        () =>
            (searchState?.recent ?? []).map((item) => ({
                id: item.recentId,
                label: item.label,
                snapshot: item.snapshot,
            })),
        [searchState],
    );

    const savedMetrics = useMemo<DataTableSavedSearchItem<ProductSearchSnapshot>[]>(
        () =>
            (searchState?.saved ?? []).map((metric) => ({
                id: metric.metricId,
                name: metric.name,
                label: metric.label,
                snapshot: metric.snapshot,
            })),
        [searchState],
    );

    const handleSaveMetric = useCallback(async (name: string) => {
        const snapshot = sanitizeProductSearchSnapshot({ q: executedSearchText, filters: searchFilters });
        if (!hasProductSearchCriteria(snapshot)) return false;

        setSavingMetric(true);
        try {
            const response = await saveProductSearchMetric(name, snapshot, { type: config.productType });
            if (response.type === "success") {
                showFeedback(successResponse(response.message));
                await loadSearchState();
                return true;
            } else {
                showFeedback(errorResponse(response.message));
                return false;
            }
        } catch {
            showFeedback(errorResponse("Error al guardar la metrica"));
            return false;
        } finally {
            setSavingMetric(false);
        }
    }, [config.productType, executedSearchText, loadSearchState, searchFilters, showFeedback]);

    const handleDeleteMetric = useCallback(async (metricId: string) => {
        try {
            const response = await deleteProductSearchMetric(metricId, { type: config.productType });
            if (response.type === "success") {
                showFeedback(successResponse(response.message));
                await loadSearchState();
            } else {
                showFeedback(errorResponse(response.message));
            }
        } catch {
            showFeedback(errorResponse("Error al eliminar la metrica"));
        }
    }, [config.productType, loadSearchState, showFeedback]);

    const handleExportExcel = useCallback(async (columns: Array<{ key: string; label: string }>) => {
        if (!permissions.export) return;
        setExporting(true);
        try {
            const file = await exportProductExcel({
                ...queryParams,
                type: config.productType,
                columns,
            });
            const url = window.URL.createObjectURL(file.blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            showFeedback(errorResponse("No se pudo exportar el catalogo"));
        } finally {
            setExporting(false);
        }
    }, [config.productType, permissions.export, queryParams, showFeedback]);

    const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: Array<{ key: string; label: string }> }) => {
        await saveProductExportPreset({
            ...payload,
            type: config.productType,
        });
        await loadExportPresets();
    }, [config.productType, loadExportPresets]);

    const handleDeleteExportPreset = useCallback(async (metricId: string) => {
        await deleteProductExportPreset({
            metricId,
            type: config.productType,
        });
        await loadExportPresets();
    }, [config.productType, loadExportPresets]);

    const deletingProduct = useMemo(
        () => products.find((product) => product.id === deletingProductId) ?? null,
        [products, deletingProductId],
    );

    const startCreate = () => {
        if (!permissions.create) return;
        setEditingProductId(null);
        setOpenCreate(true);
    };

    const openEdit = useCallback((product: Product) => {
        if (!permissions.update) return;
        setOpenCreate(false);
        setEditingProductId(product.id);
    }, [permissions.update]);

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
                id: "brand",
                header: "Marca",
                cell: (row) => <span className="text-black/70">{row.brand || "-"}</span>,
            },
            {
                id: "skuCount",
                header: "Variantes",
                headerClassName: "text-center [&>div]:justify-center",
                className: "text-center",
                cell: (row) => <span className="text-black/70">{row.skuCount ?? 0}</span>,
            },
            {
                id: "inventoryTotal",
                header: "Stock",
                headerClassName: "text-center [&>div]:justify-center",
                className: "text-center",
                cell: (row) => (
                    <span className="text-black/70">
                        {formatQuantityWithUnit(row.inventoryTotal, row.baseUnitCode ?? row.baseUnitName)}
                    </span>
                ),
            },
            {
                id: "status",
                header: "Estado",
                headerClassName: "text-center [&>div]:justify-center",
                className: "text-center",
                cell: (row) => (
                    <div className="flex justify-center">
                        <StatusPill active={row.isActive} PRIMARY={PRIMARY} />
                    </div>
                ),
            },
            {
                id: "actions",
                header: "Acciones",
                headerClassName: "text-center flex justify-center",
                stopRowClick: true,
                cell: (row) => (
                    <div className="flex justify-center">
                        <ActionsPopover
                            actions={getDropdownItemProducts(row, {
                                openEdit,
                                setDeletingProductId,
                            })
                                .filter((action) => {
                                    if (action.id === "edit") return permissions.update;
                                    if (action.id === "toggle") return row.isActive ? permissions.delete : permissions.restore;
                                    return true;
                                })
                                .map((action) => ({
                                    ...action,
                                    disabled: companyActionDisabled || action.disabled,
                                }))}
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
        [companyActionDisabled, openEdit, permissions.delete, permissions.restore, permissions.update],
    );

    const confirmDelete = async () => {
        if (!deletingProductId) return;
        clearFeedback();
        try {
            const product = products.find((p) => p.id === deletingProductId);
            if (!product) return;
            if (product.isActive && !permissions.delete) return;
            if (!product.isActive && !permissions.restore) return;
            if (product) {
            await updateProductActive(deletingProductId, {
                isActive: !product.isActive,
            });
            }  
            setDeletingProductId(null);
            showFeedback(successResponse(config.updateSuccessMessage));
            await refresh();
        } catch {
            showFeedback(errorResponse(config.updateErrorMessage));
        }
    };

    return (
        <PageShell>
            <PageTitle title={config.pageTitle} />
            <PageActionsRow>
                    {permissions.export && exportColumns.length ? (
                        <ExportPopover
                            columns={exportColumns}
                            loading={exporting}
                            presets={exportPresets}
                            onExport={handleExportExcel}
                            onSavePreset={handleSaveExportPreset}
                            onDeletePreset={handleDeleteExportPreset}
                        />
                    ) : null}
                    {permissions.create ? (
                        <SystemButton
                            size="sm"
                            onClick={startCreate}
                            leftIcon={<Plus className="h-4 w-4" />}
                            title={config.createTitle}
                            disabled={companyActionDisabled}
                        >
                            {config.createLabel}
                        </SystemButton>
                    ) : null}
            </PageActionsRow>

            <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />

            <DataTable
                tableId={config.tableId}
                data={products}
                columns={columns}
                rowKey="id"
                loading={loading}
                emptyMessage={config.emptyMessage}
                toolbarSearchContent={
                    <DataTableSearchBar
                        value={searchText}
                        onChange={(value) => {
                            setSearchText(value);
                            setPage(1);
                        }}
                        onSubmitSearch={submitSearch}
                        searchLabel={config.searchLabel}
                        searchName={config.searchName}
                        canSaveMetric={hasProductSearchCriteria(executedSnapshot)}
                        saveLoading={savingMetric}
                        onSaveMetric={handleSaveMetric}
                    >
                        <ProductSmartSearchPanel
                            recent={recentSearches}
                            saved={savedMetrics}
                            columns={smartSearchColumns}
                            snapshot={draftSnapshot}
                            filterQuery={searchText}
                            onApplySnapshot={applySnapshot}
                            onApplyRule={handleApplySearchRule}
                            onRemoveRule={handleRemoveSearchRule}
                            onDeleteMetric={handleDeleteMetric}
                        />
                    </DataTableSearchBar>
                }
                hoverable={false}
                animated={false}
                tableClassName="text-[11px]"
                pagination={{
                    page: apiPage ?? page,
                    limit: apiLimit ?? limit,
                    total,
                }}
                selectableColumns
                onRowClick={(row) => {
                    if (!permissions.viewDetail) return;
                    setSelectedProductForDetails(row);
                    setOpenDetails(true);
                }}
                onPageChange={(nextPage) => setPage(nextPage)}
            />

            <ProductCreateModal
                open={openCreate}
                productType={config.productType}
                primaryColor={PRIMARY}
                entityLabel={config.entityLabel}
                onClose={() => setOpenCreate(false)}
                onSaved={refresh}
                permissions={permissions}
            />

            <ProductDetailsModal
                open={openDetails}
                productType={config.productType}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedProductForDetails(null);
                }}
                product={selectedProductForDetails}
            />

            <ProductCreateModal
                open={Boolean(editingProductId)}
                mode="edit"
                productId={editingProductId}
                productType={config.productType}
                primaryColor={PRIMARY}
                entityLabel={config.entityLabel}
                onClose={() => setEditingProductId(null)}
                onSaved={refresh}
                permissions={permissions}
            />

            <AlertModal
                open={!!deletingProductId}
                type={deletingProduct?.isActive ? "deleted" : "restore"}
                title="Confirmar acciÃ³n"
                onClose={() => setDeletingProductId(null)}
                onConfirm={confirmDelete}
                message={
                    <>
                        {deletingProduct?.isActive ? (
                            <>{config.deleteMessage}</>
                        ) : (
                            <>{config.restoreMessage}</>
                        )}
                    </>
                }
                confirmText="Confirmar"
            />
        </PageShell>
    );
}

