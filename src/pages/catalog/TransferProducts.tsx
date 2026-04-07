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
import { createTransfer } from "@/services/documentService";
import { getStock } from "@/services/inventoryService";
import { money, parseDecimalInput } from "@/utils/functionPurchases";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate } from "react-router-dom";
import { buildEmptyFormTransfer, buildEmptyItemTransfer, buildStockSummary, CreateTransfer, Stock, TransferItem, TransferItemRow } from "./types/transfer";
import { TransferItemModal } from "@/pages/catalog/components/TransferItemModal";
import { TransferResultModal } from "@/pages/catalog/components/TransferResultModal";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";

const CURRENCY = "PEN";

export default function TransferProducts() {
    const { showFlash, clearFlash } = useFlashMessage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CreateTransfer>(() => buildEmptyFormTransfer());
    const [pendingItem, setPendingItem] = useState<TransferItem>(() => buildEmptyItemTransfer());
    const [openItemModal, setOpenItemModal] = useState(false);
    const [openNavigateModal, setOpenNavigateModal] = useState(false);
    const [lastSavedTransferId, setLastSavedTransferId] = useState("");
    const [products, setProducts] = useState<FinishedProducts[]>([]);
    const [searchResults, setSearchResults] = useState<FinishedProducts[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
    const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
    const [query, setQuery] = useState("");
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);
    const [stockSummaryFrom, setStockSummaryFrom] = useState<Stock | null>(null);
    const [stockSummaryTo, setStockSummaryTo] = useState<Stock | null>(null);

    const resetForm = () => {
        setForm(buildEmptyFormTransfer());
        setPendingItem(buildEmptyItemTransfer());
        setSerie({ value: "", label: "" });
        setProducts([]);
        setStockSummaryFrom(null);
        setStockSummaryTo(null);
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
            setStockSummaryFrom(null);
            setStockSummaryTo(null);
            setStockError(null);
            return;
        }
        try {
            const res = await listDocumentSeries({ warehouseId, docType: DocType.TRANSFER, isActive: true });
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
                label: `${v.productName ?? "Materia prima"} ${v.attributes?.presentation ?? ""} ${v.attributes?.variant ?? ""} ${v.attributes?.color ?? ""}${v.sku ? ` - ${v.sku}` : ""} (${v.customSku ?? "-"})`,
            })),
        ],
        [searchResults]
    );

    const addItem = () => {
        const { stockItemId, quantity } = pendingItem;
        const selected =
            searchResults.find((p) => (p.itemId ?? p.id) === stockItemId) ??
            products.find((p) => (p.itemId ?? p.id) === stockItemId);

        if (!stockItemId) {
            showFlash(errorResponse("Selecciona un producto"));
            return;
        }
        if (quantity === 0) {
            showFlash(errorResponse("La cantidad no puede ser 0"));
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
            items: [...(prev.items ?? []), { stockItemId, quantity }],
        }));
        setProducts((prev) => {
            const selectedId = selected.itemId ?? selected.id;
            if (!selectedId) return prev;
            const exists = prev.some((p) => (p.itemId ?? p.id) === selectedId);
            return exists ? prev : [...prev, selected];
        });
        setPendingItem(buildEmptyItemTransfer());
    };

    const removeItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            items: (prev.items ?? []).filter((_, i) => i !== index),
        }));
    };

    const updateItem = (index: number, patch: Partial<TransferItem>) => {
        setForm((prev) => ({
            ...prev,
            items: (prev.items ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }));
    };

    const totalCost = useMemo(() => {
        return (form.items ?? []).reduce((acc, item) => acc + item.quantity * (item.unitCost ?? 0), 0);
    }, [form.items]);

    const itemRows = useMemo<TransferItemRow[]>(() => {
        return (form.items ?? []).map((item, index) => {
            const product = products.find((p) => (p.itemId ?? p.id) === item.stockItemId);
            return {
                ...item,
                rowIndex: index,
                sku: product?.sku,
                customSku: product?.customSku,
                productName: product?.productName,
                unitName: product?.unitName,
                attributes: product?.attributes,
            };
        });
    }, [form.items, products]);

    const columns = useMemo<DataTableColumn<TransferItemRow>[]>(
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
                cell: (row) => (
                    <span className="text-black/70">
                        {`${row.productName ?? ""} ${row.attributes?.presentation ?? ""} ${row.attributes?.variant ?? ""} ${row.attributes?.color ?? ""} (${row.sku ?? "-"})`}
                    </span>
                ),
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
                        <SystemButton
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600"
                            onClick={() => removeItem(row.rowIndex)}
                            title="Eliminar"
                        >
                            <Trash2 className="h-4 w-4" />
                        </SystemButton>
                    </div>
                ),
                headerClassName: "text-right w-[50px]",
                className: "text-right",
            },
        ],
        [removeItem, updateItem]
    );

    const saveTransfer = async () => {
        clearFlash();
        if (!form.fromWarehouseId || !form.toWarehouseId || !form.serieId) {
            showFlash(errorResponse("Completa los datos del documento"));
            return;
        }
        if (!form.items?.length) {
            showFlash(errorResponse("Agrega al menos un item"));
            return;
        }

        setLoading(true);
        try {
            const payload: CreateTransfer = {
                ...form,
                note: form.note?.trim() || undefined,
                items: form.items ?? [],
            };
            const res = await createTransfer(payload);
            const nextId = res.id ?? (res as { docId?: string }).docId ?? "";
            setLastSavedTransferId(nextId);
            showFlash(successResponse("Transferencia registrada"));
            setOpenNavigateModal(true);
        } catch {
            showFlash(errorResponse("Error al guardar la transferencia"));
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

    const fetchStockValue = async (warehouseId: string, itemId: string) => {
        const data = await getStock({ warehouseId, itemId });
        return extractStockValue(data);
    };

    const handleRowClick = async (row: TransferItemRow) => {
        if (!form.fromWarehouseId) {
            showFlash(errorResponse("Selecciona el almacén de origen"));
            return;
        }
        setStockLoading(true);
        setStockError(null);
        try {
            const fromPromise = fetchStockValue(form.fromWarehouseId, row.stockItemId);
            const toPromise = form.toWarehouseId
                ? fetchStockValue(form.toWarehouseId, row.stockItemId)
                : Promise.resolve(null);
            const [fromValue, toValue] = await Promise.all([fromPromise, toPromise]);

            setStockSummaryFrom(buildStockSummary(row, fromValue));
            setStockSummaryTo(form.toWarehouseId ? buildStockSummary(row, toValue) : null);
        } catch {
            setStockError("Error al obtener stock");
            setStockSummaryFrom(buildStockSummary(row, null));
            setStockSummaryTo(form.toWarehouseId ? buildStockSummary(row, null) : null);
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

    const summaryBase = stockSummaryFrom ?? stockSummaryTo;
    const selectedRowId = stockSummaryFrom?.itemId ?? stockSummaryTo?.itemId;

    return (
        <PageShell className="bg-white">
            <PageTitle title="Transferencia de productos" />
            <div className="space-y-4">
                <Headed title="Transferencia entre almacenes" 
                subtitle="El almacén de origen debe tener un stock mayor a (0)." 
                size="lg" />

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr] max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
                    <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
                        <div className="border-b border-black/10 p-3 sm:p-4">
                            <SectionHeaderForm icon={Boxes} title="Productos" />
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <FloatingSelect
                                    label="Seleccionar producto"
                                    name="transfer-product"
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
                                tableId="transfer-products-items"
                                data={itemRows}
                                columns={columns}
                                rowKey="stockItemId"
                                emptyMessage="Aún no agregas items."
                                animated={false}
                                tableClassName="table-fixed text-[11px]"
                                onRowClick={handleRowClick}
                                rowClassName={(row) => (row.stockItemId === selectedRowId ? "bg-primary/5" : undefined)}
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
                        <div className="border-b border-black/10 px-3 sm:px-4 py-2 mt-2">
                            <SectionHeaderForm icon={FileText} title="Datos de documento" />
                        </div>
                        <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <FloatingSelect
                                  label="Almacén de origen"
                                  name="transfer-warehouse-from"
                                  value={form.fromWarehouseId ?? ""}
                                  options={warehouseOptions}
                                  onChange={(value) => {
                                      setForm((prev) => ({ ...prev, fromWarehouseId: value, serieId: "" }));
                                      setStockSummaryFrom(null);
                                      setStockSummaryTo(null);
                                      setStockError(null);
                                      void loadSeries(value);
                                  }}
                                  className="h-9 text-xs"
                                  searchable
                              />
                              <FloatingSelect
                                  label="Almacén de destino"
                                  name="transfer-warehouse-to"
                                  value={form.toWarehouseId ?? ""}
                                  options={warehouseOptions}
                                  onChange={(value) => {
                                      setForm((prev) => ({ ...prev, toWarehouseId: value }));
                                      setStockSummaryTo(null);
                                      setStockError(null);
                                  }}
                                  className="h-9 text-xs"
                                  searchable
                              />
                              <FloatingInput
                                  label="Serie"
                                  name="transfer-serie"
                                  value={serie.label}
                                  disabled
                                  className="h-9 text-xs text-black/90"
                              />
                              <FloatingInput
                                  label="Nota"
                                  name="transfer-note"
                                  value={form.note ?? ""}
                                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                                  className="h-9 text-xs"
                              />
                            </div>
                            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 mt-2">
                                <p className="text-[11px] font-semibold text-black">Resumen</p>
                                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Producto</span>
                                        <span className="font-semibold text-right">{summaryBase?.name ?? "-"}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>SKU</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {summaryBase?.sku ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>SKU interno</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {summaryBase?.customSku ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Presentación</span>
                                        <span className="font-semibold text-right">
                                            {summaryBase?.attributes?.presentation ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Variante</span>
                                        <span className="font-semibold text-right">
                                            {summaryBase?.attributes?.variant ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Color</span>
                                        <span className="font-semibold text-right">
                                            {summaryBase?.attributes?.color ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Unidad</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {summaryBase?.unit ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Stock origen</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockLoading
                                                ? "Cargando..."
                                                : stockError
                                                    ? "-"
                                                    : stockSummaryFrom?.value ?? "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Stock destino</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {!form.toWarehouseId
                                                ? "-"
                                                : stockLoading
                                                    ? "Cargando..."
                                                    : stockError
                                                        ? "-"
                                                        : stockSummaryTo?.value ?? "-"}
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
                                <SystemButton
                                    className="flex-1"
                                    disabled={
                                        loading ||
                                        !form.fromWarehouseId ||
                                        !form.toWarehouseId ||
                                        !form.serieId ||
                                        !(form.items ?? []).length
                                    }
                                    onClick={saveTransfer}
                                >
                                    {loading ? "Guardando..." : "Guardar"}
                                </SystemButton>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <TransferItemModal
                open={openItemModal}
                pendingItem={pendingItem}
                onChange={(patch) => setPendingItem((prev) => ({ ...prev, ...patch }))}
                onClose={() => {
                    setOpenItemModal(false);
                    setPendingItem(buildEmptyItemTransfer());
                }}
                onAdd={() => {
                    addItem();
                    setOpenItemModal(false);
                }}
            />

            <TransferResultModal
                open={openNavigateModal}
                onClose={() => setOpenNavigateModal(false)}
                onNew={() => {
                    setOpenNavigateModal(false);
                    resetForm();
                    setLastSavedTransferId("");
                    navigate(RoutesPaths.catalogTransfer);
                }}
                onGoToList={() => {
                    setOpenNavigateModal(false);
                    navigate(RoutesPaths.KardexFinished);
                }}
                transferId={lastSavedTransferId}
                title="Transferencia de inventario procesada"
                goToLabel="Ir a kardex de productos terminados"
            />
        </PageShell>
    );
}
