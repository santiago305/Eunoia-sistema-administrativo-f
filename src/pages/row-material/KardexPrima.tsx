import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { PageTitle } from "@/components/PageTitle";
import { FloatingSelect } from "@/components/FloatingSelect";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { getDailyTotals, getInventoryLedgerBySku } from "@/services/kardexService";
import { listSkus } from "@/services/skuService";
import { buildMonthStartIso, parseDateInputValue, toLocalDateKey, toDateInputValue, todayIso, endOfDayIso } from "@/utils/functionPurchases";
import type { KardexDailyTotal, KardexRow, LedgerEntry } from "@/pages/catalog/types/kardex";
import { DocType, type Warehouse } from "@/pages/warehouse/types/warehouse";
import type { ProductSkuWithAttributes } from "@/pages/catalog/types/product";
import { getDocumentInventoryPdf, getProductionOrderPdf, getPurchaseOrderPdf } from "@/services/pdfServices";
import { FileText, LineChart } from "lucide-react";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { ProductTypes } from "../catalog/types/ProductTypes";

const PRIMARY = "hsl(var(--primary))";

const useEChart = (options: echarts.EChartsOption) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.EChartsType | null>(null);

    useEffect(() => {
        if (!ref.current) return;
        chartRef.current = echarts.init(ref.current);

        const handle = () => chartRef.current?.resize();
        window.addEventListener("resize", handle);
        const timer = setTimeout(() => chartRef.current?.resize(), 50);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handle);
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.setOption(options, { notMerge: true });
        chartRef.current.resize();
    }, [options]);

    return ref;
};

export default function KardexProduction() {
    const { showFlash, clearFlash } = useFlashMessage();

    const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
    const [toDate, setToDate] = useState(() => endOfDayIso());
    const [warehouseId, setWarehouseId] = useState("");
    const [productQuery, setProductQuery] = useState("");
    const [skus, setSkus] = useState<ProductSkuWithAttributes[]>([]);
    const [skuId, setSkuId] = useState("");
    const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
    const [rows, setRows] = useState<LedgerEntry[]>([]);
    const [dailyTotals, setDailyTotals] = useState<KardexDailyTotal[]>([]);
    const [selectedRow, setSelectedRow] = useState<LedgerEntry | null>(null);
    const totalsRequestRef = useRef(0);
    const [loading, setLoading] = useState(false);
    const [openPdfModal, setOpenPdfModal] = useState(false);
    const [pdfTitle, setPdfTitle] = useState("Documento");
    const [pdfLoader, setPdfLoader] = useState<(() => Promise<Blob>) | null>(null);

    const openPdfModalWith = (title: string, loader: () => Promise<Blob>) => {
        setPdfTitle(title);
        setPdfLoader(() => loader);
        setOpenPdfModal(true);
    };

    const searchSkus = async () => {
        if (!productQuery.trim()) {
            setSkus([]);
            return;
        }
        try {
            const result = await listSkus({
                q: productQuery.trim(),
                isActive: true,
                page: 1,
                limit: 100,
                productType: ProductTypes.MATERIAL,
            });

            setSkus(result.items ?? []);
        } catch {
            setSkus([]);
            showFlash(errorResponse("Error al cargar SKUs"));
        }
    };

    const loadWarehouses = async () => {
        try {
            const res = await listActive();
            const options =
                res?.map((s: Warehouse) => ({
                    value: s.warehouseId,
                    label: s.name,
                })) ?? [];
            setWarehouseOptions(options);
        } catch {
            setWarehouseOptions([]);
            showFlash(errorResponse("Error al cargar almacenes"));
            }
    };

    const loadLedger = async () => {
        if (loading) return;

        if (!skuId) {
            setRows([]);
            return;
        }
        clearFlash();
        setLoading(true);

        try {
            const res = await getInventoryLedgerBySku({
                skuId,
                warehouseId: warehouseId || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
            });
            const nextRows = res ?? [];
            setRows(nextRows);
        } catch {
            setRows([]);
            showFlash(errorResponse("Error al cargar kardex"));
        } finally {
            setLoading(false);
        }
    };

    const loadDailyTotals = async () => {
        if (!skuId) {
            setDailyTotals([]);
            return;
        }

        const requestId = ++totalsRequestRef.current;
        clearFlash();

        try {
            const res = await getDailyTotals({
                skuId,
                warehouseId: warehouseId || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
            });

            if (requestId !== totalsRequestRef.current) return;
            setDailyTotals(res ?? []);
        } catch {
            if (requestId !== totalsRequestRef.current) return;
            setDailyTotals([]);
            showFlash(errorResponse("Error al cargar tendencia"));
        }
    };

    useEffect(() => {
        void loadWarehouses();
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            if (productQuery.trim()) {
                void searchSkus();
            } else {
                setSkus([]);
            }
        }, 500);

        return () => clearTimeout(id);
    }, [productQuery]);

    useEffect(() => {
        if (!warehouseId || !skuId) {
            setRows([]);
            return;
        }
        void loadLedger();
    }, [warehouseId, fromDate, toDate, skuId]);

    useEffect(() => {
        if (!warehouseId || !skuId) {
            setDailyTotals([]);
            return;
        }
        void loadDailyTotals();
    }, [warehouseId, fromDate, toDate, skuId]);

    const selectedType = useMemo(() => {
        const reference = selectedRow?.reference;
        if (!reference) {
            return selectedRow?.serie?.name ?? null;
        }
        return reference.type ?? null;
    }, [selectedRow]);

    const selectedUser = useMemo(() => {
        const user = selectedRow?.createdBy ?? selectedRow?.postedBy;
        if(!user) return null;
        return user;
    }, [selectedRow]);

    const selectedDocumento = useMemo(() => {
        const reference = selectedRow?.reference;
        if (!reference) {
            if (selectedRow?.serie?.code && typeof selectedRow?.correlative === "number") {
            return `${selectedRow.serie.code}-${selectedRow.correlative}`;
            }
            return "-";
        }

        if (reference.type === DocType.PURCHASE) {
            const purchase = reference.purchase;
            if (purchase?.serie && typeof purchase.correlative === "number") {
                return `${purchase.serie}-${purchase.correlative}`;
            }
            return reference.id;
        }

        if (reference.type === DocType.PRODUCTION) {
            const production = reference.production;
            if (production?.serieId && typeof production.correlative === "number") {
                return `${production.serieId}-${production.correlative}`;
            }
            return reference.id;
        }

        return "-";
    }, [selectedRow]);

    const productOptions = useMemo(
        () =>
            (skus ?? []).map((item) => {
                const attrs = Object.fromEntries((item.attributes ?? []).map((attr) => [attr.code, attr.value])) as Record<string, string>;
                const presentation = attrs.presentation ?? "";
                const variantLabel = attrs.variant ?? "";
                const color = attrs.color ?? "";
                const skuLabel = item.sku.backendSku ? ` - ${item.sku.backendSku}` : "";
                const customSku = item.sku.customSku ?? "-";

                return {
                    value: item.sku.id,
                    label: `${item.sku.name ?? "Producto"} ${presentation} ${variantLabel} ${color}${skuLabel} (${customSku})`.trim(),
                };
            }),
        [skus],
    );

    const kardexRows = useMemo<KardexRow[]>(
        () =>
            rows.map((row) => {
                const date = row.createdAt ? new Date(row.createdAt) : null;
                const entryQty = row.direction === "IN" ? row.quantity : 0;
                const exitQty = row.direction === "OUT" ? row.quantity : 0;

                const tercero =
                    row.reference?.type === "PURCHASE" ? `${row.reference.purchase?.supplier?.name} (${row.reference.purchase?.supplier?.documentNumber})` : "-";

                let documento = "-";
                if (row.reference?.type === "PRODUCTION") {
                    const production = row.reference.production;
                    if (production?.serieId && typeof production.correlative === "number") {
                        documento = `${production.serieId}-${production.correlative}`;
                    } else {
                        documento = row.reference.id;
                    }
                } else if (row.reference?.type === "PURCHASE") {
                    const purchase = row.reference.purchase;
                    if (purchase?.serie && typeof purchase.correlative === "number") {
                        documento = `${purchase.serie}-${purchase.correlative}`;
                    } else {
                        documento = row.reference.id;
                    }
                } else if (row.serie){
                    documento = `${row.serie.code}-${row.correlative ?? ""}`;
                }

                return {
                    id: row.id ?? `${row.docId ?? "doc"}-${row.createdAt ?? ""}`,
                    fechaHora: date ? date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }) : "-",
                    tercero,
                    documento,
                    tipo: row.direction ?? "-",
                    entrada: entryQty,
                    salida: exitQty ? `-${exitQty}` : 0,
                    saldo: 0,
                    original: row,
                };
            }),
        [rows],
    );

    const columns: DataTableColumn<KardexRow>[] = [
        {
            id: "fechaHora",
            header: "Fecha y hora",
            accessorKey: "fechaHora",
            className: "w-40",
            headerClassName: "h-11",
            hideable: false,
            sortable: false,
        },
        {
            id: "tercero",
            header: "Proveedor / Cliente",
            className: "w-70",
            accessorKey: "tercero",
            sortable: false,
        },
        {
            id: "documento",
            header: "Documento",
            accessorKey: "documento",
            className: "w-30",
            sortable: false,
        },
        {
            id: "tipo",
            header: "Tipo",
            className: "w-10",
            cell: (row) => <span className={row.tipo === "IN" ? "text-emerald-600" : "text-red-600"}>{row.tipo}</span>,
            sortable: false,
        },
        {
            id: "entrada_salida",
            header: "Entradas / Salidas",
            className: "text-center tabular-nums",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="flex items-center justify-center">
                    <p>
                        {row.entrada ? `${row.entrada} ${row.original.baseUnit?.name}` : ""}
                        {row.salida ? `${row.salida} ${row.original.baseUnit?.name}` : ""}
                    </p>
                </div>
            ),
        },
    ];

    const movementsChart = useMemo<echarts.EChartsOption>(() => {
        const endValue = toDateInputValue(toDate) || toDateInputValue(todayIso());
        const endDate = endValue ? new Date(`${endValue}T23:59:59`) : new Date();
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const days: { key: string; label: string }[] = [];
        const cursor = new Date(startDate);
        while (cursor <= endDate) {
            const iso = toLocalDateKey(cursor);
            const label = cursor.toLocaleDateString("es-PE", { weekday: "short" });
            days.push({ key: iso, label });
            cursor.setDate(cursor.getDate() + 1);
        }

        const totalsEntrada = new Map<string, number>();
        const totalsSalida = new Map<string, number>();
        for (const day of days) {
            totalsEntrada.set(day.key, 0);
            totalsSalida.set(day.key, 0);
        }

        for (const total of dailyTotals) {
            if (!total?.day) continue;
            const key = String(total.day).slice(0, 10);
            if (!totalsEntrada.has(key)) continue;

            totalsEntrada.set(key, (totalsEntrada.get(key) ?? 0) + Number(total.entrada ?? 0));
            totalsSalida.set(key, (totalsSalida.get(key) ?? 0) + Number(total.salida ?? 0));
        }

        const labels = days.map((d) => d.key);
        const dataEntrada = days.map((d) => totalsEntrada.get(d.key) ?? 0);
        const dataSalida = days.map((d) => totalsSalida.get(d.key) ?? 0);

        return {
            grid: { left: 20, right: 16, top: 32, bottom: 20, containLabel: true },
            tooltip: { trigger: "axis" },
            legend: {
                data: ["Entradas", "Salidas"],
                left: "center",
                top: 0,
            },
            xAxis: {
                type: "category",
                data: labels,
                axisLabel: {
                    color: "#111",
                    interval: 0,
                    lineHeight: 16,
                    formatter: (value: string) => {
                        const date = new Date(`${value}T00:00:00`);
                        if (Number.isNaN(date.getTime())) return value;

                        const weekday = date
                            .toLocaleDateString("es-PE", { weekday: "short" })
                            .replace(/\.$/, "");
                        return weekday;
                    },
                },
            },
            yAxis: { type: "value", axisLabel: { color: "#111" } },
            series: [
                {
                    name: "Entradas",
                    type: "line",
                    data: dataEntrada,
                    smooth: true,
                    lineStyle: { color: "#0f766e" },
                    itemStyle: { color: "#0f766e" },
                    areaStyle: { color: "rgba(15, 118, 110, 0.12)" },
                },
                {
                    name: "Salidas",
                    type: "line",
                    data: dataSalida,
                    smooth: true,
                    lineStyle: { color: "#ef4444" },
                    itemStyle: { color: "#ef4444" },
                    areaStyle: { color: "rgba(239, 68, 68, 0.10)" },
                },
            ],
        };
    }, [dailyTotals, toDate]);

    const ref = useEChart(movementsChart);

    return (
        <PageShell>
            <PageTitle title="Movimientos de materiales" />
                <div className="grid grid-cols-2 ms:grid-cols-1 gap-3 pt-2 items-center">
                    <Headed title="Movimientos de materiales" subtitle="Auditoría interna del inventario." size="lg" />
                    <div className="flex justify-end">  
                        <SystemButton variant="success" type="button">
                            Exportar CSV
                        </SystemButton>
                    </div>
                </div>
            <div className="space-y-3">
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <DataTable
                            className="max-h-[80vh] overflow-hidden p-3"
                            tableId="kardex-production-table"
                            data={kardexRows}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            emptyMessage={!skuId ? "Seleccione un producto para ver el kardex." : "No hay movimientos para los filtros actuales."}
                            hoverable={false}
                            animated={false}
                            toolbarSearchContent={
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_0.8fr] sm:items-end">
                                    <FloatingSelect
                                        label="Materiales"
                                        name="skuId"
                                        value={skuId}
                                        onChange={(value) => {
                                            setSkuId(value);
                                        }}
                                        options={productOptions}
                                        searchable
                                        searchPlaceholder="Buscar material..."
                                        emptyMessage="Sin materiales"
                                        onSearchChange={(text) => setProductQuery(text)}
                                       className="h-11 rounded-sm border-border shadow-sm"
                                    />
                                    <FloatingSelect
                                        label="Almacén"
                                        name="warehouseId"
                                        value={warehouseId}
                                        onChange={(value) => {
                                            setWarehouseId(value);
                                        }}
                                        options={warehouseOptions}
                                        searchable
                                        searchPlaceholder="Buscar almacén..."
                                        emptyMessage="Sin almacenes"
                                        className="h-11 rounded-sm border-border shadow-sm"
                                    />
                                </div>
                            }
                            rangeDates={{
                                startDate: parseDateInputValue(fromDate),
                                endDate: parseDateInputValue(toDate),
                                label: "Rango de fechas",
                                name: "kardex-finished-date-range",
                                onChange: ({ startDate, endDate }) => {
                                    setFromDate(startDate ? toLocalDateKey(startDate) : "");
                                    setToDate(endDate ? toLocalDateKey(endDate) : "");
                                },
                            }}
                            onRowClick={(row) => setSelectedRow(row.original)}
                            rowClassName={(row) => (selectedRow?.id === row.original.id ? "bg-primary/10 border-l-4 border-l-primary" : "")}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-sm border border-black/10 bg-white p-5 shadow-sm space-y-4">
                            <SectionHeaderForm icon={FileText} title="Detalle del documento" />

                            <div className="text-xs space-y-2">
                                <p>
                                    <span className="font-semibold">Documento:</span>&nbsp;
                                    {selectedDocumento}
                                </p>
                                <p>
                                    <span className="font-semibold">Tipo de doc:</span>&nbsp;
                                    {
                                    selectedType === DocType.PRODUCTION ? "Orden de producción" : 
                                    selectedType === DocType.PURCHASE ? "Orden de compra" : 
                                    selectedType ? selectedType : "-" 
                                    }
                                </p>
                                <p>
                                    <span className="font-semibold">Responsable:</span>&nbsp;
                                    {selectedUser?.email ?? "-" }
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {
                                    selectedRow?.reference && (
                                        <SystemButton
                                            variant="link"
                                            type="button"
                                            onClick={() => {
                                                const reference = selectedRow?.reference;
                                                const productionId =
                                                    reference?.type === "PRODUCTION" ? (reference.production?.id ?? reference.id) : "";
                                                const purchaseId =
                                                    reference?.type === "PURCHASE" ? (reference.purchase?.id ?? reference.id) : "";

                                                if (productionId) {
                                                    openPdfModalWith("Orden de producción", () => getProductionOrderPdf(productionId));
                                                    return;
                                                }

                                                if (purchaseId) {
                                                    openPdfModalWith("Orden de compra", () => getPurchaseOrderPdf(purchaseId));
                                                    return;
                                                }

                                                showFlash(errorResponse("No hay documento para este movimiento"));
                                            }}
                                        >
                                            Ver pdf
                                        </SystemButton>
                                    )
                                }
                                {
                                    !selectedRow?.reference && (
                                        <SystemButton
                                            variant="link"
                                            type="button"
                                            onClick={() => {
                                                const docId = selectedRow?.docId ?? "";
                                                if (!docId) {
                                                    showFlash(errorResponse("No hay documento para este movimiento"));
                                                    return;
                                                }
                                                openPdfModalWith("Movimiento de inventario", () => getDocumentInventoryPdf(docId));
                                            }}
                                        >
                                            Ver ticket
                                        </SystemButton>
                                    )
                                }
                                <SystemButton
                                    variant="link"
                                    type="button"
                                    onClick={() => {
                                        
                                    }}
                                >
                                    Ver detalle
                                </SystemButton>
                            </div>
                        </div>

                        <div className="rounded-sm border border-black/10 bg-white p-5 shadow-sm">
                            <SectionHeaderForm icon={LineChart} title="Tendencia semanal" />
                            <div ref={ref} className="mt-4" style={{ height: 180 }} />
                        </div>
                    </div>
                </section>
            </div>

            {pdfLoader && (
                <PdfViewerModal
                    open={openPdfModal}
                    onClose={() => {
                        setOpenPdfModal(false);
                        setPdfLoader(null);
                    }}
                    title={pdfTitle}
                    getPdf={pdfLoader}
                    primaryColor={PRIMARY}
                />
            )}
        </PageShell>
    );
}
