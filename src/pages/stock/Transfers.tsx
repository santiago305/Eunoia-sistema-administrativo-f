import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as echarts from "echarts";
import { PageTitle } from "@/components/PageTitle";
import { usePagination } from "@/hooks/usePagination";
import { applyTransfer, getStockMock } from "@/data/stockService";

const useEChart = (options: echarts.EChartsOption) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(options);

    const handle = () => chart.resize();
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("resize", handle);
      chart.dispose();
    };
  }, [options]);

  return ref;
};

export default function Transfers() {
  const [, setStockVersion] = useState(0);
  const stockMock = getStockMock();
  const [searchParams, setSearchParams] = useSearchParams();
  const skuParam = searchParams.get("sku") ?? "";
  const [skuFilter, setSkuFilter] = useState(skuParam);
  const [transferSku, setTransferSku] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [itemsCount, setItemsCount] = useState("");

  const statusLabel = (value: string) => {
    switch (value) {
      case "Posted":
        return "Contabilizado";
      case "Draft":
        return "Borrador";
      case "Cancelled":
        return "Anulado";
      default:
        return value;
    }
  };

  // PROVISIONAL: transfers list mocked from ledger while backend is under construction.
  const baseTransfers = useMemo(() => {
    return stockMock.ledger.map((entry, index) => {
      const from = stockMock.warehouses[index % stockMock.warehouses.length]?.name ?? "Central";
      const to = stockMock.warehouses[(index + 1) % stockMock.warehouses.length]?.name ?? "Norte";
      return {
        id: `TRA-${String(index + 321).padStart(6, "0")}`,
        status: index % 2 === 0 ? "Draft" : "Posted",
        from,
        to,
        items: entry.quantity,
      };
    });
  }, [stockMock]);

  const [transfers, setTransfers] = useState(baseTransfers);

  useEffect(() => {
    setTransfers(baseTransfers);
  }, [baseTransfers]);

  const filteredTransfers = useMemo(() => {
    const value = skuFilter.trim().toLowerCase();
    if (!value) return transfers;
    return transfers.filter((row) => row.id.toLowerCase().includes(value));
  }, [transfers, skuFilter]);

  const pageSize = 25;
  const { paginatedData, page, total, totalPages, setPage } = usePagination(filteredTransfers, pageSize);
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const clearSkuFilter = () => {
    setSkuFilter("");
    searchParams.delete("sku");
    setSearchParams(searchParams, { replace: true });
  };

  const createTransfer = () => {
    if (!fromWarehouse || !toWarehouse || !transferSku) return;
    const qty = Number(itemsCount) || 1;
    const ok = applyTransfer({
      sku: transferSku,
      fromWarehouse,
      toWarehouse,
      quantity: qty,
    });
    if (!ok) return;
    const nextId = `TRA-${String(transfers.length + 1000).padStart(6, "0")}`;
    const fromName = stockMock.warehouses.find((w) => w.warehouse_id === fromWarehouse)?.name ?? fromWarehouse;
    const toName = stockMock.warehouses.find((w) => w.warehouse_id === toWarehouse)?.name ?? toWarehouse;
    const newRow = {
      id: nextId,
      status: "Posted",
      from: fromName,
      to: toName,
      items: qty,
    };
    setTransfers([newRow, ...transfers]);
    setTransferSku("");
    setFromWarehouse("");
    setToWarehouse("");
    setItemsCount("");
    setStockVersion((prev) => prev + 1);
  };

  const flowChart = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { left: 20, right: 16, top: 10, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: ["Central", "Norte", "Sur", "Ecommerce"],
        axisLabel: { color: "#111" },
      },
      yAxis: { type: "value", axisLabel: { color: "#111" } },
      series: [
        {
          type: "bar",
          data: [22, 18, 14, 10],
          itemStyle: { color: "#111" },
          barWidth: 16,
        },
      ],
    }),
    []
  );

  const ref = useEChart(flowChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Transferencias" />
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Transferencias</h1>
          <p className="text-sm text-black/60">Operacion principal de movimiento entre almacenes.</p>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="h-10 rounded-lg border border-black/10 px-3 text-sm"
              placeholder="SKU (preseleccionado)"
              value={skuFilter}
              onChange={(event) => setSkuFilter(event.target.value)}
            />
            <input
              className="h-10 rounded-lg border border-black/10 px-3 text-sm"
              placeholder="Almacen origen"
            />
            <input
              className="h-10 rounded-lg border border-black/10 px-3 text-sm"
              placeholder="Almacen destino"
            />
          </div>
          {skuParam && (
            <div className="mt-3 flex items-center gap-2 text-xs text-black/70">
              <span className="rounded-full border border-black/10 px-3 py-1">SKU seleccionado: {skuParam}</span>
              <button className="text-xs underline" type="button" onClick={clearSkuFilter}>
                Quitar SKU
              </button>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tablero de transferencias</p>
              <button className="text-xs px-3 py-1 rounded-md border border-black/10">Nueva transferencia</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left" title="Numero de la transferencia">
                      Documento
                    </th>
                    <th className="py-2 text-left" title="Estado de la transferencia">
                      Estado
                    </th>
                    <th className="py-2 text-left" title="Almacen de origen">
                      Origen
                    </th>
                    <th className="py-2 text-left" title="Almacen de destino">
                      Destino
                    </th>
                    <th className="py-2 text-right" title="Cantidad de items transferidos">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{row.id}</td>
                      <td className="py-3">{statusLabel(row.status)}</td>
                      <td className="py-3">{row.from}</td>
                      <td className="py-3">{row.to}</td>
                      <td className="py-3 text-right">{row.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-black/60">
              <span>Mostrando {startIndex}-{endIndex} de {total}</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border border-black/10 px-2 py-1 text-xs disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  Anterior
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  className="rounded-md border border-black/10 px-2 py-1 text-xs disabled:opacity-40"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Creador rapido</p>
              <div className="mt-3 space-y-2">
                <select
                  className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                  value={transferSku}
                  onChange={(event) => setTransferSku(event.target.value)}
                >
                  <option value="">Seleccionar SKU</option>
                  {stockMock.variants.map((variant) => (
                    <option key={variant.variant_id} value={variant.sku}>
                      {variant.sku}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                  value={fromWarehouse}
                  onChange={(event) => setFromWarehouse(event.target.value)}
                >
                  <option value="">Desde almacén</option>
                  {stockMock.warehouses.map((wh) => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                  value={toWarehouse}
                  onChange={(event) => setToWarehouse(event.target.value)}
                >
                  <option value="">Hacia almacén</option>
                  {stockMock.warehouses.map((wh) => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                  placeholder="Cantidad"
                  value={itemsCount}
                  onChange={(event) => setItemsCount(event.target.value)}
                />
                <button
                  className="w-full text-sm px-3 py-2 rounded-md bg-black text-white"
                  onClick={createTransfer}
                  type="button"
                >
                  Iniciar transferencia
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Flujo por almacen</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
