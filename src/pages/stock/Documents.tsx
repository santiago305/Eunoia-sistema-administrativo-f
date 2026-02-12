import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { PageTitle } from "@/components/PageTitle";
import { usePagination } from "@/hooks/usePagination";
import { getStockMock } from "@/data/stockService";

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

export default function Documents() {
  const stockMock = getStockMock();
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
  // PROVISIONAL: documents list derived from ledger while backend is under construction.
  const documents = useMemo(() => {
    const ids = Array.from(new Set(stockMock.ledger.map((l) => l.doc_id)));
    return ids.map((id, index) => ({
      id: `DOC-${String(index + 1).padStart(6, "0")}`,
      type: "Movimiento",
      status: index % 2 === 0 ? "Posted" : "Draft",
      warehouse: stockMock.warehouses[index % stockMock.warehouses.length]?.name ?? "-",
    }));
  }, []);
  const pageSize = 25;
  const { paginatedData, page, total, totalPages, setPage } = usePagination(documents, pageSize);
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const statusChart = useMemo<echarts.EChartsOption>(
    () => ({
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          label: { show: false },
          data: [
            { value: 12, name: "Borrador" },
            { value: 32, name: "Contabilizado" },
            { value: 3, name: "Anulado" },
          ],
        },
      ],
    }),
    []
  );

  const ref = useEChart(statusChart);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Documentos" />
      <div className="px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Documentos</h1>
          <p className="text-sm text-black/60">Workspace para crear, editar y postear documentos.</p>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Listado</p>
              <div className="flex gap-2">
                {["Draft", "Posted", "Cancelled"].map((tab, idx) => (
                  <button
                    key={tab}
                    className={[
                      "text-xs px-3 py-1 rounded-full border",
                      idx === 0 ? "border-black text-black" : "border-black/10 text-black/60",
                    ].join(" ")}
                  >
                    {statusLabel(tab)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 text-left" title="Numero del documento">
                      Documento
                    </th>
                    <th className="py-2 text-left" title="Tipo de documento">
                      Tipo
                    </th>
                    <th className="py-2 text-left" title="Estado actual del documento">
                      Estado
                    </th>
                    <th className="py-2 text-left" title="Almacen asociado">
                      Almacen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((doc) => (
                    <tr key={doc.id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{doc.id}</td>
                      <td className="py-3">{doc.type}</td>
                      <td className="py-3">{statusLabel(doc.status)}</td>
                      <td className="py-3">{doc.warehouse}</td>
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
              <p className="text-sm font-semibold">Crear documento rapido</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  "Ajuste",
                  "Transferencia",
                  "Ingreso",
                  "Salida",
                ].map((label) => (
                  <button key={label} className="text-xs px-3 py-2 rounded-md border border-black/10">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Estado documentos</p>
              <div ref={ref} className="mt-4" style={{ height: 180 }} />
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Editor</p>
              <div className="mt-3 space-y-2">
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Tipo documento" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Almacen origen" />
                <input className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" placeholder="Almacen destino" />
                <textarea className="min-h-[80px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm" placeholder="Notas" />
                <button className="w-full text-sm px-3 py-2 rounded-md bg-black text-white">Postear documento</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}





