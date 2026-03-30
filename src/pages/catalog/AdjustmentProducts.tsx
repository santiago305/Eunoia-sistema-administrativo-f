import { useEffect, useMemo, useState } from "react";
import { Boxes, FileText, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { createAdjustment } from "@/services/documentService";
import { getStock } from "@/services/inventoryService";
import { money, parseDecimalInput } from "@/utils/functionPurchases";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { AdjustmentItem, AdjustmentItemRow, CreateAdjustment } from "@/pages/catalog/types/adjustment";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate } from "react-router-dom";
import { AdjustmentItemModal } from "@/pages/catalog/components/AdjustmentItemModal";
import { AdjustmentResultModal } from "@/pages/catalog/components/AdjustmentResultModal";

const CURRENCY = "PEN";

const buildEmptyForm = (): CreateAdjustment => ({
    docType: DocType.ADJUSTMENT,
    serieId: "",
    fromWarehouseId: "",
    note: "",
    items: [],
});

const buildEmptyItem = (): AdjustmentItem => ({
    stockItemId: "",
    quantity: 0,
});

export default function AdjustmentProducts() {
    const { showFlash, clearFlash } = useFlashMessage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CreateAdjustment>(() => buildEmptyForm());
    const [pendingItem, setPendingItem] = useState<AdjustmentItem>(() => buildEmptyItem());
    const [openItemModal, setOpenItemModal] = useState(false);
    const [openNavigateModal, setOpenNavigateModal] = useState(false);
    const [lastSavedAdjustmentId, setLastSavedAdjustmentId] = useState("");
    const [products, setProducts] = useState<FinishedProducts[]>([]);
    const [searchResults, setSearchResults] = useState<FinishedProducts[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
    const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
    const [query, setQuery] = useState("");
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);
    const [stockSummary, setStockSummary] = useState<{
        itemId: string;
        name?: string;
        sku?: string;
        customSku?: string;
        attributes?: {
            presentation?: string;
            variant?: string;
            color?: string;
        };
        unit?: string;
        value?: number | null;
    } | null>(null);

    const resetForm = () => {
        setForm(buildEmptyForm());
        setPendingItem(buildEmptyItem());
        setSerie({ value: "", label: "" });
        setProducts([]);
        setStockSummary(null);
        setStockError(null);
    };

    const loadWarehouses = async () => {
        clearFlash();
        try {
            const res = await listActive();
            const options =
                res?.map((s) => ({
                    value: s.warehouseId,
                    label: s.name,
                })) ?? [];
            setWarehouseOptions(options);
        } catch {
            setWarehouseOptions([]);
            showFlash(errorResponse("Error al cargar almacenes"));
        }
    };

    const loadSeries = async (warehouseId: string) => {
        if (!warehouseId) {
            setSerie({ value: "", label: "" });
            setForm((prev) => ({ ...prev, serieId: "" }));
            setStockSummary(null);
            setStockError(null);
            return;
        }
        try {
            const res = await listDocumentSeries({ warehouseId, docType: DocType.ADJUSTMENT, isActive: true });
            if (!res?.length) {
                setSerie({ value: "", label: "" });
                setForm((prev) => ({ ...prev, serieId: "" }));
                return;
            }
            const nextSerie = res[0];
            const nextNumber = Number(nextSerie.nextNumber ?? 0);
            setSerie({
                value: nextSerie.id,
                label: `${nextSerie.code}-${nextNumber}`,
            });
            setForm((prev) => ({ ...prev, serieId: nextSerie.id }));
        } catch {
            setSerie({ value: "", label: "" });
            setForm((prev) => ({ ...prev, serieId: "" }));
            showFlash(errorResponse("Error al cargar series"));
        }
    };

    const searchProducts = async () => {
        try {
            const res = await searchProductAndVariant({
                q: query,
                raw: false,
            });
            setSearchResults(res ?? []);
        } catch {
            setSearchResults([]);
            showFlash(errorResponse("Error al cargar productos"));
        }
    };

    const productOptions = useMemo(
        () => [
            { value: "", label: "Seleccionar producto" },
            ...(searchResults ?? []).map((v) => ({
                value: v.itemId ?? v.id ?? "",
                 label: `${v.productName ?? "Materia prima"} ${v.attributes?.presentation ?? ""} ${v.attributes?.variant ?? ""} ${v.attributes?.color ?? ""}
                ${v.sku ? ` - ${v.sku}`: ""} (${v.customSku ?? "-"})`,
            })),
        ],
        [searchResults],
    );

    const addItem = () => {
        const { stockItemId, quantity, adjustmentType } = pendingItem;
        const selected = searchResults.find((p) => (p.itemId ?? p.id) === stockItemId) ?? products.find((p) => (p.itemId ?? p.id) === stockItemId);

        if (!stockItemId) {
            showFlash(errorResponse("Selecciona un producto"));
            return;
        }
        if (quantity === 0) {
            showFlash(errorResponse("La cantidad no puede ser 0"));
            return;
        }
        if (adjustmentType === "REDUCIR" && quantity >= 0) {
            showFlash(errorResponse("Para reducir, ingresa una cantidad negativa"));
            return;
        }
        if (adjustmentType === "AUMENTAR" && quantity <= 0) {
            showFlash(errorResponse("Para aumentar, ingresa una cantidad positiva"));
            return;
        }
        if (!selected) {
            showFlash(errorResponse("Producto no encontrado"));
            return;
        }
        const alreadyAdded = (form.items ?? []).some((item) => item.stockItemId === stockItemId);
        if (alreadyAdded) {
            showFlash(errorResponse("El producto ya fue agregado"));
            return;
        }

        setForm((prev) => ({
            ...prev,
            items: [...(prev.items ?? []), { stockItemId, quantity, adjustmentType }],
        }));
        setProducts((prev) => {
            const selectedId = selected.itemId ?? selected.id;
            if (!selectedId) return prev;
            const exists = prev.some((p) => (p.itemId ?? p.id) === selectedId);
            return exists ? prev : [...prev, selected];
        });
        setPendingItem(buildEmptyItem());
    };

    const removeItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            items: (prev.items ?? []).filter((_, i) => i !== index),
        }));
    };

    const updateItem = (index: number, patch: Partial<AdjustmentItem>) => {
        setForm((prev) => ({
            ...prev,
            items: (prev.items ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }));
    };

    const totalCost = useMemo(() => {
        return (form.items ?? []).reduce((acc, item) => acc + item.quantity * (item.unitCost ?? 0), 0);
    }, [form.items]);

    const itemRows = useMemo<AdjustmentItemRow[]>(() => {
        return (form.items ?? []).map((item, index) => {
            const product = products.find((p) => (p.itemId ?? p.id) === item.stockItemId);
            return {
                ...item,
                rowIndex: index,
                sku: product?.sku,
                customSku:product?.customSku,
                productName: product?.productName,
                unitName: product?.unitName,
                attributes:product?.attributes
            };
        });
    }, [form.items, products]);

    const columns = useMemo<DataTableColumn<AdjustmentItemRow>[]>(
        () => [
            {
                id: "sku",
                header: "SKU",
                cell: (row) => <span className="text-black/70">{row.customSku ?? "-"}</span>,
                headerClassName: "text-left w-[90px]",
                className: "text-black/70",
            },
            {
                id: "product",
                header: "Producto",
                cell: (row) => <span className="text-black/70"> {`${row.productName ? `${row.productName}` : "" } ${row.attributes?.presentation ?? ""}
                 ${row.attributes?.variant ?? ""}  ${row.attributes?.color ?? ""} (${row.sku ?? "-"})`}</span>,
                headerClassName: "text-left w-[170px]",
                className: "text-black/70",
            },
            {
                id: "unit",
                header: "Unidad",
                cell: (row) => <span className="text-black/70">{row.unitName ?? "-"}</span>,
                headerClassName: "text-left w-[110px]",
                className: "text-black/70",
            },
            {
                id: "type",
                header: "Tipo de ajuste",
                cell: (row) => (
                    <span className="text-black/70">{row.adjustmentType}</span>
                ),
                headerClassName: "text-left w-[130px]",
                className: "text-black/70",
            },
            {
                id: "quantity",
                header: "Cantidad",
                cell: (row) => (
                    <FloatingInput
                        label="Cantidad"
                        name={`qty-${row.rowIndex}`}
                        type="number"
                        value={String(row.quantity)}
                        onChange={(e) => updateItem(row.rowIndex, { quantity: parseDecimalInput(e.target.value) })}
                        className="h-8 text-[10px]"
                    />
                ),
                headerClassName: "text-left w-[130px]",
                className: "text-black/70",
            },
            {
                id: "actions",
                header: "",
                cell: (row) => (
                    <div className="flex justify-end">
                        <SystemButton variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => removeItem(row.rowIndex)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                        </SystemButton>
                    </div>
                ),
                headerClassName: "text-right w-[50px]",
                className: "text-right",
            },
        ],
        [removeItem, updateItem],
    );

    const saveAdjustment = async () => {
        clearFlash();
        if (!form.fromWarehouseId || !form.serieId) {
            showFlash(errorResponse("Completa los datos del documento"));
            return;
        }
        if (!form.items?.length) {
            showFlash(errorResponse("Agrega al menos un item"));
            return;
        }

        setLoading(true);
        try {
            const payload: CreateAdjustment = {
                ...form,
                note: form.note?.trim() || undefined,
                items: form.items ?? [],
            };
            const res = await createAdjustment(payload);
            const nextId = res.id ?? (res as { docId?: string }).docId ?? "";
            setLastSavedAdjustmentId(nextId);
            showFlash(successResponse("Ajuste registrado"));
            setOpenNavigateModal(true);
        } catch {
            showFlash(errorResponse("Error al guardar el ajuste"));
        } finally {
            setLoading(false);
        }
    };

    const extractStockValue = (data: any) => {
        if (data == null) return null;
        if (typeof data === "number") return data;
        const candidates = ["stock", "quantity", "available", "balance", "total", "onHand"];
        for (const key of candidates) {
            const value = data?.[key];
            if (typeof value === "number") return value;
        }
        return null;
    };

    const handleRowClick = async (row: AdjustmentItemRow) => {
        if (!form.fromWarehouseId) {
            showFlash(errorResponse("Selecciona un almacén"));
            return;
        }
        setStockLoading(true);
        setStockError(null);
        try {
            const data = await getStock({
                warehouseId: form.fromWarehouseId,
                itemId: row.stockItemId,
            });
            const value = extractStockValue(data);
            setStockSummary({
                itemId: row.stockItemId,
                sku: row.sku,
                customSku: row.customSku,
                attributes:row.attributes,
                name: row.productName,
                unit: row.unitName,
                value,
            });
        } catch {
            setStockError("Error al obtener stock");
            setStockSummary({
                itemId: row.stockItemId,
                sku: row.sku,
                customSku: row.customSku,
                attributes: row.attributes,
                name: row.productName,
                unit: row.unitName,
                value: null,
            });
        } finally {
            setStockLoading(false);
        }
    };

    useEffect(() => {
        const id = setTimeout(() => {
            if (query.trim()) {
                void searchProducts();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(id);
    }, [query]);

    useEffect(() => {
        resetForm();
        void loadWarehouses();
    }, []);

    return (
        <div className="w-full min-h-screen bg-white">
            <PageTitle title="Ajuste de productos" />
            <div className="mx-auto w-full max-w-[1500px] px-4 pt-2 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">Ajuste de productos terminados</h1>
                        <p className="text-sm">Al reducir stock solo puedes reducir hasta dejarlo en (0)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr] max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
                    <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
                        <div className="border-b border-black/10 p-3 sm:p-4">
                            <SectionHeaderForm icon={Boxes} title="Productos" />
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <FloatingSelect
                                    label="Seleccionar producto"
                                    name="adjustment-product"
                                    value={pendingItem.stockItemId}
                                    options={productOptions}
                                    onChange={(value) => {
                                        setPendingItem((prev) => ({ ...prev, stockItemId: value }));
                                        setOpenItemModal(Boolean(value));
                                    }}
                                    searchable
                                    searchPlaceholder="Buscar producto..."
                                    onSearchChange={(text) => setQuery(text)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <DataTable
                                tableId="adjustment-products-items"
                                data={itemRows}
                                columns={columns}
                                rowKey="stockItemId"
                                emptyMessage="Aún no agregas items."
                                animated={false}
                                tableClassName="table-fixed text-[11px]"
                                onRowClick={handleRowClick}
                                rowClassName={(row) => (row.stockItemId === stockSummary?.itemId ? "bg-primary/5" : undefined)}
                            />
                        </div>

                        <div className="border-t border-black/10 px-3 sm:px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-[11px] text-black/60">Total costo items</div>
                                <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                                    <span className="font-semibold text-black tabular-nums">{money(totalCost, CURRENCY)}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-auto flex flex-col max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
                        <div className="border-b border-black/10 px-3 sm:px-4 py-2">
                            <SectionHeaderForm icon={FileText} title="Datos de documento" />
                        </div>
                        <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <FloatingSelect
                                    label="Almacén"
                                    name="adjustment-warehouse"
                                    value={form.fromWarehouseId ?? ""}
                                    options={warehouseOptions}
                                    onChange={(value) => {
                                        setForm((prev) => ({ ...prev, fromWarehouseId: value, serieId: "" }));
                                        void loadSeries(value);
                                    }}
                                    className="h-9 text-xs"
                                    searchable
                                />
                                <FloatingInput 
                                    label="Serie" 
                                    name="adjustment-serie" 
                                    value={serie.label} 
                                    disabled 
                                    className="h-9 text-xs text-black/90" />
                            </div>
                            <FloatingInput
                                label="Nota"
                                name="adjustment-note"
                                value={form.note ?? ""}
                                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                                className="h-9 text-xs"
                            />
                            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 mt-2">
                                <p className="text-[11px] font-semibold text-black">Resumen</p>
                                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Producto</span>
                                        <span className="font-semibold text-right">{stockSummary?.name ?? "-"}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>SKU</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockSummary?.sku ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>SKU interno</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockSummary?.customSku ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Presentación</span>
                                        <span className="font-semibold text-right">
                                            {stockSummary?.attributes?.presentation ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Variante</span>
                                        <span className="font-semibold text-right">
                                            {stockSummary?.attributes?.variant ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Color</span>
                                        <span className="font-semibold text-right">
                                            {stockSummary?.attributes?.color ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Unidad</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockSummary?.unit ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Stock</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockLoading ? "Cargando..." : stockError ? "-" : stockSummary?.value ?? "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-black/10 px-3 sm:px-4 py-3">
                            <div className="flex gap-2">
                                <SystemButton variant="outline" className="flex-1" onClick={resetForm}>
                                    Limpiar
                                </SystemButton>
                                <SystemButton className="flex-1" disabled={loading || !form.fromWarehouseId || !form.serieId || !(form.items ?? []).length} onClick={saveAdjustment}>
                                    {loading ? "Guardando..." : "Guardar"}
                                </SystemButton>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <AdjustmentItemModal
                open={openItemModal}
                pendingItem={pendingItem}
                sectionTitle="Productos"
                messages={{
                    missingType: "Debe ingresas el tipo de ajuste",
                    zeroQuantity: "La cantidad no puede ser cero",
                }}
                onChange={(patch) => setPendingItem((prev) => ({ ...prev, ...patch }))}
                onClose={() => {
                    setOpenItemModal(false);
                    setPendingItem(buildEmptyItem());
                }}
                onAdd={() => {
                    addItem();
                    setOpenItemModal(false);
                }}
            />

            <AdjustmentResultModal
                open={openNavigateModal}
                onClose={() => setOpenNavigateModal(false)}
                onNew={() => {
                    setOpenNavigateModal(false);
                    resetForm();
                    setLastSavedAdjustmentId("");
                    navigate(RoutesPaths.catalogAdjustments);
                }}
                onGoToList={() => {
                    setOpenNavigateModal(false);
                    navigate(RoutesPaths.KardexFinished);
                }}
                adjustmentId={lastSavedAdjustmentId}
                title="Ajuste de inventario procesado"
                goToLabel="Ir a kardex de productos terminados"
            />
        </div>
    );
}
