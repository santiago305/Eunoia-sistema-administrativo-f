import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { listKardex } from "@/services/kardexService";
import { buildMonthStartIso, toDateInputValue, todayIso, tryShowPicker } from "@/utils/functionPurchases";
import type { LedgerEntry } from "@/pages/catalog/types/kardex";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import type { PrimaVariant } from "@/pages/catalog/types/variant";

const DEFAULT_LIMIT = 25;

const toLocalDateKey = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

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
    const [toDate, setToDate] = useState(() => todayIso());
    const [warehouseId, setWarehouseId] = useState("");
    const [productQuery, setProductQuery] = useState("");
    const [products, setProducts] = useState<PrimaVariant[]>([]);
    const [stockItemId, setStockItemId] = useState("");

    const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
    const [rows, setRows] = useState<LedgerEntry[]>([]);
    const [selectedRow, setSelectedRow] = useState<LedgerEntry | null>(null);

    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: DEFAULT_LIMIT,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
    });
    const [loading, setLoading] = useState(false);

    const searchPrimaVariants = async () => {
        if (!productQuery.trim()) {
            setProducts([]);
            return;
        }
        const raw = true;
        try {
            const result = await searchProductAndVariant({
                q: productQuery,
                raw,
            });
            const normalized =
                (result ?? [])
                    .map((row) => ({
                        ...row,
                        itemId: row.itemId ?? row.id ?? row.primaId ?? "",
                        isActive: row.isActive ?? true,
                    }))
                    .filter((row) => row.itemId) ?? [];
            setProducts(normalized);
        } catch {
            setProducts([]);
            showFlash(errorResponse("Error al cargar variantes PRIMA"));
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
            setWarehouseOptions([...options]);
        } catch {
            setWarehouseOptions([{ value: "", label: "" }]);
            showFlash(errorResponse("Error al cargar almacenes"));
        }
    };

    const loadLedger = async () => {
        if (loading) return;
        if (!stockItemId) {
            setRows([]);
            setPagination((prev) => ({
                ...prev,
                total: 0,
                totalPages: 1,
                hasPrev: false,
                hasNext: false,
            }));
            return;
        }
        clearFlash();
        setLoading(true);
        try {
            const res = await listKardex({
                page: pagination.page,
                limit: pagination.limit,
                stockItemId,
                warehouseId: warehouseId || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
            });
            setRows(res.items ?? []);
            const nextTotal = res.total ?? 0;
            const nextPage = res.page ?? pagination.page;
            const nextLimit = res.limit ?? pagination.limit;
            const nextTotalPages = Math.max(1, Math.ceil(nextTotal / (nextLimit || pagination.limit)));
            setPagination({
                total: nextTotal,
                page: nextPage,
                limit: nextLimit,
                totalPages: nextTotalPages,
                hasPrev: nextPage > 1,
                hasNext: nextPage < nextTotalPages,
            });
        } catch {
            setRows([]);
            setPagination((prev) => ({
                ...prev,
                total: 0,
                totalPages: 1,
                hasPrev: false,
                hasNext: false,
            }));
            showFlash(errorResponse("Error al cargar kardex"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadWarehouses();
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            if (productQuery.trim()) {
                void searchPrimaVariants();
            } else {
                setProducts([]);
            }
        }, 500);

        return () => clearTimeout(id);
    }, [productQuery]);

    useEffect(() => {
        void loadLedger();
    }, [pagination.page, pagination.limit, warehouseId, fromDate, toDate, stockItemId]);

    useEffect(() => {
        setSelectedRow(rows[0] ?? null);
    }, [rows]);

    const startIndex = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

    const productOptions = useMemo(
        () =>
            (products ?? []).map((p) => ({
                value: p.itemId ?? p.id ?? p.primaId ?? "",
                label: `${p.productName ?? "Producto"} (${p.sku ?? "-"})`,
            })),
        [products],
    );

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

        const totals = new Map<string, number>();
        for (const day of days) totals.set(day.key, 0);

        for (const row of rows) {
            if (!row.createdAt) continue;
            const d = new Date(row.createdAt);
            if (d < startDate || d > endDate) continue;
            const key = toLocalDateKey(d);
            const qty = Number(row.quantity) || 0;
            const signed = row.direction === "OUT" ? -qty : qty;
            totals.set(key, (totals.get(key) ?? 0) + signed);
        }

        const labels = days.map((d) => d.label);
        const data = days.map((d) => totals.get(d.key) ?? 0);

        return {
            grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
            xAxis: {
                type: "category",
                data: labels,
                axisLabel: { color: "#111" },
            },
            yAxis: { type: "value", axisLabel: { color: "#111" } },
            tooltip: { trigger: "axis" },
            series: [
                {
                    type: "line",
                    data,
                    smooth: true,
                    lineStyle: { color: "#0f766e" },
                    itemStyle: { color: "#0f766e" },
                    areaStyle: { color: "rgba(15, 118, 110, 0.12)" },
                },
            ],
        };
    }, [rows, toDate]);

    const ref = useEChart(movementsChart);

    return (
        <div className="w-full min-h-screen bg-white text-black">
            <PageTitle title="Kardex Producción" />
            <div className="px-6 py-6 space-y-3">
                <div>
                    <h1 className="text-xl font-semibold">Kardex Producción</h1>
                    <p className="text-sm text-black/60">Auditoría viva de movimientos.</p>
                </div>

                <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                className="h-9 rounded-lg border border-black/10 px-3 text-sm"
                                value={toDateInputValue(fromDate)}
                                onClick={(e) => tryShowPicker(e.currentTarget)}
                                onChange={(e) => {
                                    setFromDate(e.target.value);
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                }}
                            />
                            <input
                                type="date"
                                className="h-9 rounded-lg border border-black/10 px-3 text-sm"
                                value={toDateInputValue(toDate)}
                                onClick={(e) => tryShowPicker(e.currentTarget)}
                                onChange={(e) => {
                                    setToDate(e.target.value);
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                }}
                            />
                        </div>
                        <FilterableSelect
                            value={warehouseId}
                            onChange={(value) => {
                                setWarehouseId(value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            options={warehouseOptions}
                            placement="bottom"
                            placeholder="Almacen"
                            searchPlaceholder="Buscar almacen..."
                            className="h-9"
                            textSize="text-sm"
                        />
                        <FilterableSelect
                            value={stockItemId}
                            onChange={(value) => {
                                setStockItemId(value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                                const selected = products.find((p) => (p.itemId ?? p.id ?? p.primaId ?? "") === value);
                            }}
                            options={productOptions}
                            placement="bottom"
                            placeholder="Seleccionar producto"
                            searchPlaceholder="Buscar producto..."
                            onSearchChange={(text) => setProductQuery(text)}
                            className="h-9"
                            textSize="text-sm"
                        />
                    </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Registros</p>
                            <button className="text-xs px-3 py-1 rounded-md border border-black/10">Exportar CSV</button>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-black/60">
                                    <tr className="border-b border-black/10">
                                        <th className="py-2 text-left" title="Fecha y hora del movimiento">
                                            Fecha y hora
                                        </th>
                                        <th className="py-2 text-left" title="Tipo de transacción">
                                            Provedor/Cliente
                                        </th>
                                        <th className="py-2 text-left" title="Tipo de transacción">
                                            Documento
                                        </th>
                                        <th className="py-2 text-left" title="Tipo de transacción">
                                            Tipo
                                        </th>
                                        <th className="py-2 text-right" title="Entrada">
                                            Entrada
                                        </th>
                                        <th className="py-2 text-right" title="Salida">
                                            Salida
                                        </th>
                                        <th className="py-2 text-right" title="Saldo">
                                            Saldo
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const date = row.createdAt ? new Date(row.createdAt) : null;
                                        const balance = row.balance ?? 0;
                                        const entryQty = row.direction === "IN" ? row.quantity : 0;
                                        const exitQty = row.direction === "OUT" ? row.quantity : 0;
                                        return (
                                            <tr
                                                key={row.id}
                                                className={`border-b border-black/5 cursor-pointer text-xs
                                                    ${selectedRow?.id === row.id ? "bg-black/[0.03]" : ""}`}
                                                onClick={() => setSelectedRow(row)}
                                            >
                                                <td className="py-3">{date ? date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }) : "-"}</td>
                                                 <td>
                                                    {row.referenceDoc?.production && (
                                                        <span>  - </span>
                                                    )}
                                                    {row.referenceDoc?.purchase && (
                                                        <span>
                                                            {
                                                            row.referenceDoc.supplier?.name ?? 
                                                            row.referenceDoc.supplier?.tradeName 
                                                            } 
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    {row.referenceDoc?.production && (
                                                        <span>
                                                            {row.referenceDoc.production.serie}-{row.referenceDoc.production.correlative} 
                                                        </span>
                                                    )}
                                                    {row.referenceDoc?.purchase && (
                                                        <span>
                                                            {row.referenceDoc.purchase.serie}-{row.referenceDoc.purchase.correlative} 
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 text-left tabular-nums">
                                                    <span className={row.direction === "IN" ? "text-emerald-600" : "text-red-600"}>{row.direction}</span>
                                                </td>
                                                <td className="py-3 text-right tabular-nums">{entryQty}</td>
                                                <td className="py-3 text-right tabular-nums">
                                                {
                                                    exitQty ? `-${exitQty}` : exitQty
                                                }
                                                </td>
                                                <td className="py-3 text-right tabular-nums">{balance}</td>
                                            </tr>
                                        );
                                    })}
                                    {!loading && !stockItemId && (
                                        <tr>
                                            <td className="py-6 text-center text-sm text-black/50" colSpan={9}>
                                                Seleccione un producto para ver el kardex.
                                            </td>
                                        </tr>
                                    )}
                                    {!loading && stockItemId && rows.length === 0 && (
                                        <tr>
                                            <td className="py-6 text-center text-sm text-black/50" colSpan={9}>
                                                No hay movimientos para los filtros actuales.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-black/60">
                            <span>
                                Mostrando {startIndex}-{endIndex} de {pagination.total}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    className="rounded-md border border-black/10 px-2 py-1 text-xs disabled:opacity-40"
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                    type="button"
                                >
                                    Anterior
                                </button>
                                <span>
                                    Página {pagination.page} de {pagination.totalPages}
                                </span>
                                <button
                                    className="rounded-md border border-black/10 px-2 py-1 text-xs disabled:opacity-40"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                                    type="button"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                            <p className="text-sm font-semibold underline underline-offset-4">Detalle movimiento</p>
                            <div className="mt-2 text-xs space-y-1">
                                <p>
                                    <span className="font-semibold">Documento:
                                    </span> &nbsp; 
                                    {
                                    selectedRow?.document?.serie?.code ? 
                                    `${selectedRow?.document?.serie?.code}-${selectedRow.document.correlative}`
                                    :''}
                                </p>
                                <p>
                                    <span className="font-semibold">Unidad base:</span>  &nbsp;
                                    {selectedRow?.stockItem?.product && 
                                    `${selectedRow?.stockItem?.product?.unidad} x 1`} 
                                    {selectedRow?.stockItem?.variant && 
                                    `${selectedRow?.stockItem?.variant?.unidad} x 1`} 
                                </p>
                                <p>
                                    <span className="font-semibold">Responsable:</span> &nbsp;
                                    {selectedRow?.referenceDoc?.production && 
                                    selectedRow.referenceDoc.createdBy?.name}
                                    {selectedRow?.referenceDoc?.purchase && 
                                    selectedRow.referenceDoc.createdBy?.name}
                                </p>
                            </div>
                            <button className="mt-4 text-xs px-3 py-1 rounded-md border mr-3
                            border-black/10">Ver documento</button>
                            <button className="mt-4 text-xs px-3 py-1 rounded-md border 
                            border-black/10">Ver movimiento</button>
                        </div>
                        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                            <p className="text-sm font-semibold">Tendencia semanal</p>
                            <div ref={ref} className="mt-4" style={{ height: 180 }} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
