import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { getDailyTotals, listKardex } from "@/services/kardexService";
import {
  buildMonthStartIso,
  toDateInputValue,
  todayIso,
  tryShowPicker,
} from "@/utils/functionPurchases";
import type { KardexDailyTotal, LedgerEntry } from "@/pages/catalog/types/kardex";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import type { PrimaVariant } from "@/pages/catalog/types/variant";
import {
  getDocumentInventoryPdf,
  getProductionOrderPdf,
  getPurchaseOrderPdf,
} from "@/services/pdfServices";
import { Boxes, FileText, Filter, LineChart } from "lucide-react";
import { PdfViewerModal } from "@/components/ModalOpenPdf";

const PRIMARY = "hsl(var(--primary))";
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

type KardexRow = {
  id: string;
  fechaHora: string;
  tercero: string;
  documento: string;
  tipo: string;
  entrada: number;
  salida: string | number;
  saldo: number;
  original: LedgerEntry;
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
  const [dailyTotals, setDailyTotals] = useState<KardexDailyTotal[]>([]);
  const [selectedRow, setSelectedRow] = useState<LedgerEntry | null>(null);
  const totalsRequestRef = useRef(0);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);

  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("Documento");
  const [pdfLoader, setPdfLoader] = useState<(() => Promise<Blob>) | null>(null);

  const openPdfModalWith = (title: string, loader: () => Promise<Blob>) => {
    setPdfTitle(title);
    setPdfLoader(() => loader);
    setOpenPdfModal(true);
  };

  const searchFinished = async () => {
    if (!productQuery.trim()) {
      setProducts([]);
      return;
    }

    try {
      const result = await searchProductAndVariant({
        q: productQuery,
        raw: false,
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
      setWarehouseOptions(options);
    } catch {
      setWarehouseOptions([]);
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

  const loadDailyTotals = async () => {
    if (!stockItemId) {
      setDailyTotals([]);
      return;
    }

    const requestId = ++totalsRequestRef.current;
    clearFlash();

    try {
      const res = await getDailyTotals({
        stockItemId,
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
        void searchFinished();
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
    void loadDailyTotals();
  }, [warehouseId, fromDate, toDate, stockItemId]);

  useEffect(() => {
    setSelectedRow(rows[0] ?? null);
  }, [rows]);

  const productOptions = useMemo(
    () =>
      (products ?? []).map((p) => ({
        value: p.itemId ?? p.id ?? p.primaId ?? "",
        label: `${p.productName ?? "Producto"} ${p.attributes?.presentation ?? ""} ${p.attributes?.variant ?? ""} ${p.attributes?.color ?? ""}
        ${p.sku ? ` - ${p.sku}`: ""} (${p.customSku ?? "-"})`,      })),
    [products],
  );

  const kardexRows = useMemo<KardexRow[]>(
    () =>
      rows.map((row) => {
        const date = row.createdAt ? new Date(row.createdAt) : null;
        const balance = row.balance ?? 0;
        const entryQty = row.direction === "IN" ? row.quantity : 0;
        const exitQty = row.direction === "OUT" ? row.quantity : 0;

        const tercero = row.referenceDoc?.purchase
          ? row.referenceDoc.supplier?.name ?? row.referenceDoc.supplier?.tradeName ?? "-"
          : "-";

        const documento = row.referenceDoc?.production
          ? `${row.referenceDoc.production.serie}-${row.referenceDoc.production.correlative}`
          : row.referenceDoc?.purchase
            ? `${row.referenceDoc.purchase.serie}-${row.referenceDoc.purchase.correlative}`
            : "-";

        return {
          id: row.id ?? `${row.docId ?? "doc"}-${row.createdAt ?? ""}`,
          fechaHora: date
            ? date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
            : "-",
          tercero,
          documento,
          tipo: row.direction ?? "-",
          entrada: entryQty,
          salida: exitQty ? `-${exitQty}` : 0,
          saldo: balance,
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
      className: "w-80",
      hideable: false,
      sortable: false,
    },
    {
      id: "tercero",
      header: "Proveedor / Cliente",
      className: "w-120",
      accessorKey: "tercero",
      sortable: false,
    },
    {
      id: "documento",
      header: "Documento",
      accessorKey: "documento",
      className: "w-40",
      sortable: false,
    },
    {
      id: "tipo",
      header: "Tipo",
      className: "w-10",
      cell: (row) => (
        <span className={row.tipo === "IN" ? "text-emerald-600" : "text-red-600"}>
          {row.tipo}
        </span>
      ),
      sortable: false,
    },
    {
      id: "entrada",
      header: "Entrada",
      accessorKey: "entrada",
      className: "text-right tabular-nums",
      headerClassName: "text-right",
      sortable: false,
    },
    {
      id: "salida",
      header: "Salida",
      accessorKey: "salida",
      className: "text-right tabular-nums",
      headerClassName: "text-right",
      sortable: false,
    },
    {
      id: "saldo",
      header: "Saldo",
      accessorKey: "saldo",
      className: "text-right tabular-nums",
      headerClassName: "text-right",
      sortable: false,
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

    const totals = new Map<string, number>();
    for (const day of days) totals.set(day.key, 0);

    for (const total of dailyTotals) {
      if (!total?.day) continue;
      const key = String(total.day).slice(0, 10);
      if (!totals.has(key)) continue;
      totals.set(key, Number(total.balance ?? 0));
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
  }, [dailyTotals, toDate]);

  const ref = useEChart(movementsChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Kardex de productos terminados" />

      <div className="px-6 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Kardex de productos terminados</h1>
          <p className="text-sm text-black/60">Auditoría viva de movimientos.</p>
        </div>

        <section className="rounded-2xl border border-black/10 bg-gray-50 p-5 shadow-sm space-y-4">
          <SectionHeaderForm icon={Filter} title="Filtros" />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.5fr_0.5fr_1fr]">
            <div className="grid grid-cols-2 gap-2">
              <FloatingInput
                label="Fecha inicio"
                name="fromDate"
                type="date"
                value={toDateInputValue(fromDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
              <FloatingInput
                label="Fecha fin"
                name="toDate"
                type="date"
                value={toDateInputValue(toDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>

            <FloatingSelect
              label="Almacén"
              name="warehouseId"
              value={warehouseId}
              onChange={(value) => {
                setWarehouseId(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={warehouseOptions}
              searchable
              searchPlaceholder="Buscar almacén..."
              emptyMessage="Sin almacenes"
            />

            <FloatingSelect
              label="Producto"
              name="stockItemId"
              value={stockItemId}
              onChange={(value) => {
                setStockItemId(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={productOptions}
              searchable
              searchPlaceholder="Buscar producto..."
              emptyMessage="Sin productos"
              onSearchChange={(text) => setProductQuery(text)}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-black/10 flex items-center justify-between">
              <SectionHeaderForm icon={Boxes} title="Registros" />
              <SystemButton variant="success" type="button">
                Exportar CSV
              </SystemButton>
            </div>

            <div className="p-5">
              <DataTable
                tableId="kardex-production-table"
                data={kardexRows}
                columns={columns}
                rowKey="id"
                loading={loading}
                emptyMessage={
                  !stockItemId
                    ? "Seleccione un producto para ver el kardex."
                    : "No hay movimientos para los filtros actuales."
                }
                hoverable={false}
                animated={false}
                pagination={{
                  page: pagination.page,
                  limit: pagination.limit,
                  total: pagination.total,
                }}
                onPageChange={(nextPage) =>
                  setPagination((prev) => ({ ...prev, page: nextPage }))
                }
                onRowClick={(row) => setSelectedRow(row.original)}
                rowClassName={(row) =>
                  selectedRow?.id === row.original.id
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : ""
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
              <SectionHeaderForm icon={FileText} title="Detalle movimiento" />

              <div className="text-xs space-y-2">
                <p>
                  <span className="font-semibold">Documento:</span>&nbsp;
                  {selectedRow?.document?.serie?.code
                    ? `${selectedRow.document.serie.code}-${selectedRow.document.correlative}`
                    : "-"}
                </p>

                <p>
                  <span className="font-semibold">Unidad base:</span>&nbsp;
                  {selectedRow?.stockItem?.product && `${selectedRow.stockItem.product.unidad} x 1`}
                  {selectedRow?.stockItem?.variant && `${selectedRow.stockItem.variant.unidad} x 1`}
                  {!selectedRow?.stockItem?.product && !selectedRow?.stockItem?.variant && "-"}
                </p>

                <p>
                  <span className="font-semibold">Responsable:</span>&nbsp;
                    {selectedRow?.referenceDoc?.createdBy?.name ??
                    selectedRow?.document?.createdBy?.name ??
                    "-"}                
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <SystemButton
                  variant="link"
                  type="button"
                  onClick={() => {
                    const productionId = selectedRow?.referenceDoc?.production?.id ?? "";
                    const purchaseId = selectedRow?.referenceDoc?.purchase?.id ?? "";

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
                  Ver documento
                </SystemButton>

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
                  Ver movimiento
                </SystemButton>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
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
    </div>
  );
}