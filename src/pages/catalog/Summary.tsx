import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { listProducts } from "@/services/productService";
import { useProducts } from "@/hooks/useProducts";
import { Layers, TrendingUp } from "lucide-react";

export default function CatalogSummary() {
  const [totals, setTotals] = useState({ total: 0, active: 0, inactive: 0 });
  const [totalsLoading, setTotalsLoading] = useState(false);

  const listParams = useMemo(() => ({ page: 1, limit: 10 }), []);
  const { items: products, loading } = useProducts(listParams);

  useEffect(() => {
    const loadTotals = async () => {
      setTotalsLoading(true);
      try {
        const [allRes, activeRes, inactiveRes] = await Promise.all([
          listProducts({ page: 1, limit: 1 }),
          listProducts({ page: 1, limit: 1, isActive: "true" }),
          listProducts({ page: 1, limit: 1, isActive: "false" }),
        ]);
        setTotals({
          total: allRes.total ?? 0,
          active: activeRes.total ?? 0,
          inactive: inactiveRes.total ?? 0,
        });
      } finally {
        setTotalsLoading(false);
      }
    };
    void loadTotals();
  }, []);

  const latestProducts = useMemo(() => {
    return [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products]);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catalogo · Resumen" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Catalogo (Resumen)</h1>
            <p className="text-sm text-black/60">Indicadores generales del catalogo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              <span className="text-black/60">Total</span>{" "}
              <span className="font-semibold text-black">{totals.total}</span>
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              <span className="text-black/60">Activos</span>{" "}
              <span className="font-semibold text-black">{totals.active}</span>
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
              <span className="text-black/60">Inactivos</span>{" "}
              <span className="font-semibold text-black">{totals.inactive}</span>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-black/50">Productos</p>
                <p className="mt-2 text-3xl font-semibold">{totals.total}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3">
                <Layers className="h-5 w-5 text-black/70" />
              </div>
            </div>
            <p className="mt-3 text-xs text-black/50">
              {totalsLoading ? "Cargando resumen..." : "Conteo total de productos registrados."}
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-black/50">Activos</p>
                <p className="mt-2 text-3xl font-semibold">{totals.active}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <TrendingUp className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
            <p className="mt-3 text-xs text-black/50">Productos disponibles para venta.</p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-black/50">Inactivos</p>
                <p className="mt-2 text-3xl font-semibold">{totals.inactive}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <TrendingUp className="h-5 w-5 text-rose-700 rotate-180" />
              </div>
            </div>
            <p className="mt-3 text-xs text-black/50">Productos deshabilitados o pausados.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Ultimos productos</p>
              <p className="text-xs text-black/60">Ordenados por fecha de creacion.</p>
            </div>
            <div className="text-xs text-black/50">
              {loading ? "Cargando..." : `Mostrando ${latestProducts.length}`}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-black/60">
                <tr className="border-b border-black/10">
                  <th className="py-2 text-left">Producto</th>
                  <th className="py-2 text-left">Descripcion</th>
                  <th className="py-2 text-left">Estado</th>
                  <th className="py-2 text-right">Creado</th>
                </tr>
              </thead>
              <tbody>
                {latestProducts.map((product) => (
                  <tr key={product.id} className="border-b border-black/5">
                    <td className="py-3 font-medium">{product.name}</td>
                    <td className="py-3 text-black/70">{product.description ?? "-"}</td>
                    <td className="py-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                          product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                        ].join(" ")}
                      >
                        {product.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-black/60">
                      {new Date(product.createdAt).toLocaleDateString("es-PE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && latestProducts.length === 0 && (
              <p className="mt-4 text-sm text-black/60">No hay productos para mostrar.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
