import { useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { Boxes, Trash2 } from "lucide-react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { listActive } from "@/shared/services/warehouseServices";
import { listDocumentSeries } from "@/shared/services/documentSeriesService";
import { createTransfer, getStockSku } from "@/shared/services/documentService";
import { listSkus } from "@/shared/services/skuService";
import { money, parseDecimalInput } from "@/shared/utils/functionPurchases";
import { DocType, type WarehouseSelectOption } from "@/features/warehouse/types/warehouse";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { useNavigate } from "react-router-dom";
import { TransferItemModal } from "@/features/catalog/products/components/TransferItemModal";
import { TransferResultModal } from "@/features/catalog/products/components/TransferResultModal";
import { Headed } from "@/shared/components/components/Headed";
import { PageShell } from "@/shared/layouts/PageShell";
import type { ListSkusResponse, ProductSkuWithAttributes } from "@/features/catalog/types/product";
import {
    TransferProductsProps,
    CreateTransfer,
    buildEmptyFormTransfer,
    TransferItem,
    buildEmptyItemTransfer,
    StockDetailState,
    emptyStockDetail,
    TransferItemRow,
    getSkuUnitName,
    buildStockSummary,
    buildSkuLabelWithAttributes,
} from "@/features/catalog/types/transfer";
import { skuStock } from "@/features/catalog/types/documentInventory";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";

const CURRENCY = "PEN";

export default function TransferProducts({ inModal = false, onClose, onSaved, type }: TransferProductsProps) {
    const { showFlash, clearFlash } = useFlashMessage();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CreateTransfer>(() => buildEmptyFormTransfer());
    const [pendingItem, setPendingItem] = useState<TransferItem>(() => buildEmptyItemTransfer());

    const [openItemModal, setOpenItemModal] = useState(false);
    const [openNavigateModal, setOpenNavigateModal] = useState(false);
    const [lastSavedTransferId, setLastSavedTransferId] = useState("");

    const [searchResults, setSearchResults] = useState<ListSkusResponse>();
    const [selectedSkus, setSelectedSkus] = useState<ProductSkuWithAttributes[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
    const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
    const [query, setQuery] = useState("");
    const [stockDetail, setStockDetail] = useState<StockDetailState>(emptyStockDetail);
    const quantityTextBySkuIdRef = useRef<Record<string, string>>({});
    const [, setQuantityTextBySkuId] = useState<Record<string, string>>({});
    const [editingQuantitySkuId, setEditingQuantitySkuId] = useState<string | null>(null);

    useEffect(() => {
        setQuantityTextBySkuId((previous) => {
            const next: Record<string, string> = {};
            const items = form.items ?? [];

            for (const item of items) {
                const skuId = item.skuId;
                const keepExisting = editingQuantitySkuId === skuId && previous[skuId] !== undefined;
                next[skuId] = keepExisting ? previous[skuId]! : String(item.quantity);
            }

            quantityTextBySkuIdRef.current = next;
            return next;
        });
    }, [editingQuantitySkuId, form.items]);

    const resetForm = () => {
        setForm(buildEmptyFormTransfer());
        setPendingItem(buildEmptyItemTransfer());
        setSerie({ value: "", label: "" });
        setSearchResults(undefined);
        setSelectedSkus([]);
        setStockDetail(emptyStockDetail);
    };

    const loadWarehouses = useCallback(async () => {
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
    }, [clearFlash, showFlash]);

    const loadSeries = async (warehouseId: string) => {
        if (!warehouseId) {
            setSerie({ value: "", label: "" });
            setForm((prev) => ({ ...prev, serieId: "" }));
            setStockDetail(emptyStockDetail);
            return;
        }

        try {
            const response = await listDocumentSeries({
                warehouseId,
                docType: DocType.TRANSFER,
                isActive: true,
            });

            const seriesList = Array.isArray(response) ? response : response ? [response] : [];

            if (seriesList.length === 0) {
                setSerie({ value: "", label: "" });
                setForm((prev) => ({ ...prev, serieId: "" }));
                return;
            }

            const nextSerie = seriesList[0];
            const nextNumber = Number(nextSerie.nextNumber ?? 0);
            const paddedNumber = String(nextNumber).padStart(Number(nextSerie.padding ?? 0), "0");

            setSerie({
                value: nextSerie.id,
                label: `${nextSerie.code}${nextSerie.separator ?? "-"}${paddedNumber}`,
            });

            setForm((prev) => ({ ...prev, serieId: nextSerie.id }));
        } catch {
            setSerie({ value: "", label: "" });
            setForm((prev) => ({ ...prev, serieId: "" }));
            showFlash(errorResponse("Error al cargar series"));
        }
    };

    const searchSkus = useCallback(async () => {
        const requestQuery = query.trim();
        try {
            const res = await listSkus({
                q: requestQuery || undefined,
                productType: type ?? ProductTypes.PRODUCT,
                isActive: true,
                page: 1,
                limit: 10,
            });

            setSearchResults(res);
        } catch {
            setSearchResults(undefined);
            showFlash(errorResponse("Error al cargar SKUs"));
        }
    }, [query, showFlash, type]);

    const addItem = () => {
        const { skuId, quantity } = pendingItem;
        const selected = (searchResults?.items ?? []).find((s) => s.sku.id === skuId) ?? selectedSkus.find((s) => s.sku.id === skuId);

        if (!skuId) {
            showFlash(errorResponse("Selecciona un SKU"));
            return;
        }

        if (!selected) {
            showFlash(errorResponse("SKU no encontrado"));
            return;
        }

        const alreadyAdded = (form.items ?? []).some((item) => item.skuId === skuId);
        if (alreadyAdded) {
            showFlash(errorResponse("El SKU ya fue agregado"));
            return;
        }

        setForm((prev) => ({
            ...prev,
            items: [...(prev.items ?? []), { skuId, quantity, unitCost: pendingItem.unitCost ?? 0 }],
        }));

        setSelectedSkus((prev) => {
            const exists = prev.some((s) => s.sku.id === selected.sku.id);
            return exists ? prev : [...prev, selected];
        });

        setPendingItem(buildEmptyItemTransfer());
    };

    const removeItem = (skuId: string) => {
        setForm((prev) => ({
            ...prev,
            items: (prev.items ?? []).filter((item) => item.skuId !== skuId),
        }));

        setStockDetail((prev) => (prev.selectedSkuId === skuId ? emptyStockDetail : prev));
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
            const skuData = selectedSkus.find((s) => s.sku.id === item.skuId);

            return {
                rowIndex: index,
                skuId: item.skuId,
                backendSku: skuData?.sku.backendSku ?? "-",
                customSku: skuData?.sku.customSku ?? null,
                name: skuData ? buildSkuLabelWithAttributes(skuData) : "-",
                unit: skuData ? getSkuUnitName(skuData) : "-",
                quantity: item.quantity,
            };
        });
    }, [form.items, selectedSkus]);

    const columns = useMemo<DataTableColumn<TransferItemRow>[]>(
        () => [
            {
                id: "name",
                header: "Nombre",
                cell: (row) => (
                    <span className="text-black/70">{row.name}</span>
                ),
                headerClassName: "text-left w-[240px]",
                className: "text-black/70",
            },
            {
                id: "unit",
                header: "Unidad",
                cell: (row) => <span className="text-black/70">{row.unit}</span>,
                headerClassName: "text-left w-[100px]",
                className: "text-black/70",
            },
            {
                id: "quantity",
                header: "Cantidad",
                stopRowClick: true,
                cell: (row) => (
                    <FloatingInput
                        label="Cantidad"
                        name={`qty-${row.skuId}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={quantityTextBySkuIdRef.current[row.skuId] ?? String(row.quantity)}
                        onFocus={(event) => {
                            setEditingQuantitySkuId(row.skuId);
                            event.currentTarget.select();
                        }}
                        onBlur={() => {
                            setEditingQuantitySkuId((previous) => (previous === row.skuId ? null : previous));

                            const currentText = quantityTextBySkuIdRef.current[row.skuId] ?? String(row.quantity);
                            const parsed = parseDecimalInput(currentText);
                            const next = parsed < 0 ? Math.abs(parsed) : parsed;

                            setQuantityTextBySkuId((previous) => {
                                const updated = { ...previous, [row.skuId]: String(next) };
                                quantityTextBySkuIdRef.current = updated;
                                return updated;
                            });

                            updateItem(row.rowIndex, { quantity: next });
                        }}
                        onChange={(e) => {
                            const nextText = e.target.value;

                            setQuantityTextBySkuId((previous) => {
                                const updated = { ...previous, [row.skuId]: nextText };
                                quantityTextBySkuIdRef.current = updated;
                                return updated;
                            });

                            const parsed = parseDecimalInput(nextText);
                            const next = parsed < 0 ? Math.abs(parsed) : parsed;
                            updateItem(row.rowIndex, { quantity: next });
                        }}
                        className="h-8 text-[10px]"
                    />
                ),
                headerClassName: "text-left w-[130px]",
                className: "text-black/70",
            },
            {
                id: "actions",
                header: "",
                stopRowClick: true,
                cell: (row) => (
                    <div className="flex justify-end">
                        <SystemButton variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => removeItem(row.skuId)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                        </SystemButton>
                    </div>
                ),
                headerClassName: "text-right w-[50px]",
                className: "text-right",
            },
        ],
        [],
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
            const payload = {
                ...form,
                note: form.note?.trim() || undefined,
                items: (form.items ?? []).map((item) => ({
                    skuId: item.skuId,
                    quantity: item.quantity,
                    unitCost: item.unitCost ?? 0,
                })),
            };

            const res = await createTransfer(payload);
            const transferId = res.data?.documentId ?? "";

            setLastSavedTransferId(transferId);
            showFlash(successResponse("Transferencia registrada"));

            if (transferId) {
                await onSaved?.(transferId);
            }

            setOpenNavigateModal(true);
        } catch {
            showFlash(errorResponse("Error al guardar la transferencia"));
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = async (row: TransferItemRow) => {
        if (!form.fromWarehouseId) {
            showFlash(errorResponse("Selecciona el almacén de origen"));
            return;
        }

        const skuData = selectedSkus.find((s) => s.sku.id === row.skuId);
        if (!skuData) {
            showFlash(errorResponse("No se encontró el SKU seleccionado"));
            return;
        }

        setStockDetail({
            loading: true,
            error: null,
            selectedSkuId: row.skuId,
            from: null,
            to: null,
        });
        try {
            const [fromStock, toStock] = await Promise.all([
                getStockSku({
                    warehouseId: form.fromWarehouseId,
                    skuId: row.skuId,
                }) as Promise<skuStock>,
                form.toWarehouseId
                    ? (getStockSku({
                          warehouseId: form.toWarehouseId,
                          skuId: row.skuId,
                      }) as Promise<skuStock>)
                    : Promise.resolve(null),
            ]);

            setStockDetail({
                loading: false,
                error: null,
                selectedSkuId: row.skuId,
                from: buildStockSummary(skuData, fromStock),
                to: form.toWarehouseId ? buildStockSummary(skuData, toStock) : null,
            });
        } catch {
            setStockDetail({
                loading: false,
                error: "Error al obtener stock",
                selectedSkuId: row.skuId,
                from: buildStockSummary(skuData, null),
                to: form.toWarehouseId ? buildStockSummary(skuData, null) : null,
            });
        }
    };

    useEffect(() => {
        const delay = query.trim() ? 350 : 0;
        const id = setTimeout(() => {
            void searchSkus();
        }, delay);

        return () => clearTimeout(id);
    }, [query, searchSkus]);

    useEffect(() => {
        resetForm();
        void loadWarehouses();
        void searchSkus();
    }, [loadWarehouses, searchSkus]);

    const summaryBase = stockDetail.from ?? stockDetail.to;
    const selectedRowId = stockDetail.selectedSkuId;

    const viewportHeightClasses = inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]";

    const content = (
        <>
            <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
                {!inModal ? (
                    <div className="pt-2">
                        <Headed
                            title="Transferencia entre almacenes"
                            subtitle="El almacén de origen debe tener un stock mayor a (0)."
                            size="lg"
                        />
                    </div>
                ) : null}

                <div className={`py-4 grid grid-cols-1 gap-3 lg:grid-cols-[6fr_2.5fr] ${viewportHeightClasses}`}>
                    <section className="overflow-hidden flex flex-col gap-3">
                        <div className="p-3">
                            <SectionHeaderForm icon={Boxes} title="Productos" />
                            
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <FloatingSelect
                                    label="Producto"
                                    name="transfer-sku"
                                    value={pendingItem.skuId}
                                    options={(searchResults?.items ?? []).map((item) => ({
                                        value: item.sku.id,
                                        label: buildSkuLabelWithAttributes(item),
                                    }))}
                                    onChange={(value) => {
                                        setPendingItem((prev) => ({ ...prev, skuId: value }));
                                        setOpenItemModal(Boolean(value));
                                    }}
                                    searchable
                                    searchPlaceholder="Buscar producto..."
                                    emptyMessage="Sin productos"
                                    onSearchChange={(text) => setQuery(text)}
                                    className="h-12"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-3 py-0">
                            <DataTable
                                tableId="transfer-products-items"
                                data={itemRows}
                                columns={columns}
                                rowKey="skuId"
                                emptyMessage="Aún no agregas items."
                                animated={false}
                                tableClassName="text-[11px]"
                                onRowClick={handleRowClick}
                                rowClassName={(row) => (row.skuId === selectedRowId ? "bg-primary/5" : undefined)}
                            />
                        </div>

                        <div className="px-3 sm:px-4 py-3">
                            <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-black/70">
                                    <span>Total costo items</span>
                                    <span className="font-semibold text-black tabular-nums">{money(totalCost, CURRENCY)}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className="overflow-hidden flex flex-col border-0 border-black/10 lg:border-l">
                        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <FloatingSelect
                                    label="Almacén de origen"
                                    name="transfer-warehouse-from"
                                    value={form.fromWarehouseId ?? ""}
                                    options={warehouseOptions}
                                    onChange={(value) => {
                                        setForm((prev) => ({ ...prev, fromWarehouseId: value, serieId: "" }));
                                        setStockDetail(emptyStockDetail);
                                        void loadSeries(value);
                                    }}
                                    className="h-11 text-xs"
                                    searchable
                                />

                                <FloatingSelect
                                    label="Almacén de destino"
                                    name="transfer-warehouse-to"
                                    value={form.toWarehouseId ?? ""}
                                    options={warehouseOptions}
                                    onChange={(value) => {
                                        setForm((prev) => ({ ...prev, toWarehouseId: value }));
                                        setStockDetail(emptyStockDetail);
                                    }}
                                    className="h-11 text-xs"
                                    searchable
                                />

                                <FloatingInput label="Serie" name="transfer-serie" value={serie.label} disabled className="h-11 text-xs text-black/90" />

                                <FloatingInput
                                    label="Nota"
                                    name="transfer-note"
                                    value={form.note ?? ""}
                                    onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                                    className="h-11 text-xs"
                                />
                            </div>

                            <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3 mt-2">
                                <p className="text-[11px] font-semibold text-black">Resumen</p>

                                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Nombre</span>
                                        <span className="font-semibold text-right">{summaryBase?.name ?? "-"}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>SKU backend</span>
                                        <span className="font-semibold tabular-nums text-right">{summaryBase?.backendSku ?? "-"}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>SKU interno</span>
                                        <span className="font-semibold tabular-nums text-right">{summaryBase?.customSku ?? "-"}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Unidad</span>
                                        <span className="font-semibold text-right">{summaryBase?.unit ?? "-"}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Origen físico</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockDetail.loading ? "Cargando..." : stockDetail.error ? "-" : (stockDetail.from?.onHand ?? "-")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Origen reservado</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockDetail.loading ? "Cargando..." : stockDetail.error ? "-" : (stockDetail.from?.reserved ?? "-")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Origen disponible</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {stockDetail.loading ? "Cargando..." : stockDetail.error ? "-" : (stockDetail.from?.available ?? "-")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Destino físico</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {!form.toWarehouseId ? "-" : stockDetail.loading ? "Cargando..." : stockDetail.error ? "-" : (stockDetail.to?.onHand ?? "-")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Destino reservado</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {!form.toWarehouseId ? "-" : stockDetail.loading ? "Cargando..." : stockDetail.error ? "-" : (stockDetail.to?.reserved ?? "-")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span>Destino disponible</span>
                                        <span className="font-semibold tabular-nums text-right">
                                            {!form.toWarehouseId ? "-" : stockDetail.loading ? "Cargando..." : stockDetail.error ? "-" : (stockDetail.to?.available ?? "-")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-3">
                            <div className="flex gap-2">
                                <SystemButton
                                    className="flex-1"
                                    disabled={loading || !form.fromWarehouseId || !form.toWarehouseId || !form.serieId || !(form.items ?? []).length}
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
                onChange={(patch: Partial<TransferItem>) => setPendingItem((prev) => ({ ...prev, ...patch }))}
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
                    if (!inModal) {
                        navigate(RoutesPaths.catalogTransfer);
                    }
                }}
                onGoToList={() => {
                    setOpenNavigateModal(false);
                    if (inModal) {
                        onClose?.();
                        return;
                    }
                    navigate(RoutesPaths.KardexFinished);
                }}
                transferId={lastSavedTransferId}
                title="Transferencia de inventario procesada"
                goToLabel={inModal ? "Volver al listado" : "Ir a kardex de productos terminados"}
            />
        </>
    );

    if (inModal) return content;

    return (
        <PageShell className="bg-white">
            <PageTitle title="Transferencia de productos" />
            {content}
        </PageShell>
    );
}
