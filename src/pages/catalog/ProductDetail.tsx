import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PageTitle } from "@/components/PageTitle";
import { getCatalogMock } from "@/data/catalogService";
import { getStockMock } from "@/data/stockService";

export default function ProductDetail() {
  const { productId } = useParams();
  const catalog = getCatalogMock();
  const stock = getStockMock();

  const product = catalog.products.find((p) => p.product_id === productId);
  const variants = catalog.variants.filter((v) => v.product_id === productId);

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stock.inventory) {
      const available = item.on_hand - item.reserved;
      map.set(item.variant_id, (map.get(item.variant_id) ?? 0) + available);
    }
    return map;
  }, [stock.inventory]);

  const totalAvailable = variants.reduce((acc, variant) => acc + (stockByVariant.get(variant.variant_id) ?? 0), 0);

  if (!product) {
    return (
      <div className="w-full min-h-screen bg-white text-black">
        <PageTitle title="Producto no encontrado" />
        <div className="px-6 py-6">
          <p className="text-sm text-black/60">Producto no encontrado.</p>
          <Link className="text-sm text-black underline" to="/catalogo/productos">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title={`Producto · ${product.name}`} />
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="text-sm text-black/60">{product.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/catalogo/productos"
              className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs"
            >
              Volver a productos
            </Link>
            <Link
              to={`/catalogo/productos/${product.product_id}/editar`}
              className="rounded-full border border-black/10 bg-black text-white px-3 py-1 text-xs"
            >
              Editar producto
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            { label: "Variantes", value: variants.length },
            { label: "Disponible total", value: totalAvailable },
            { label: "Estado", value: product.is_active ? "Activo" : "Inactivo" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-black/50">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Variantes</p>
            <Link className="text-xs text-black underline" to="/catalogo/variantes/nueva">
              Crear variante
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-black/60">
                <tr className="border-b border-black/10">
                  <th className="py-2 text-left">SKU</th>
                  <th className="py-2 text-left">Presentación</th>
                  <th className="py-2 text-right">Precio</th>
                  <th className="py-2 text-right">Costo</th>
                  <th className="py-2 text-right">Disponible</th>
                  <th className="py-2 text-left">Stock</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => {
                  const available = stockByVariant.get(variant.variant_id) ?? 0;
                  const label =
                    (variant.attributes?.presentacion as string | undefined) ??
                    (variant.attributes?.variante as string | undefined) ??
                    (variant.attributes?.color as string | undefined) ??
                    variant.sku;
                  return (
                    <tr key={variant.variant_id} className="border-b border-black/5">
                      <td className="py-3 font-medium">{variant.sku}</td>
                      <td className="py-3 text-black/70">{label}</td>
                      <td className="py-3 text-right">{variant.price.toFixed(2)}</td>
                      <td className="py-3 text-right">{variant.cost ? variant.cost.toFixed(2) : "-"}</td>
                      <td className="py-3 text-right font-semibold">{available}</td>
                      <td className="py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                            available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {available > 0 ? "En stock" : "Sin stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
