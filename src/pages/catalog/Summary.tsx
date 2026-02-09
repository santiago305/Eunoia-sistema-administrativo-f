import { useMemo } from "react";
import { PageTitle } from "@/components/PageTitle";
import { getCatalogMock } from "@/data/catalogService";
import { getStockMock } from "@/data/stockService";

export default function CatalogSummary() {
  const catalog = getCatalogMock();
  const stock = getStockMock();

  const metrics = useMemo(() => {
    const totalProducts = catalog.products.length;
    const totalVariants = catalog.variants.length;
    const activeProducts = catalog.products.filter((p) => p.is_active).length;
    const activeVariants = catalog.variants.filter((v) => v.is_active).length;

    const inventoryByVariant = new Map<string, number>();
    for (const item of stock.inventory) {
      inventoryByVariant.set(
        item.variant_id,
        (inventoryByVariant.get(item.variant_id) ?? 0) + item.on_hand - item.reserved
      );
    }

    return {
      totalProducts,
      totalVariants,
      activeProducts,
      activeVariants,
      inventoryByVariant,
    };
  }, [catalog, stock]);

  const productRows = useMemo(() => {
    return catalog.products.map((product) => {
      const variants = catalog.variants.filter((v) => v.product_id === product.product_id);
      const totalAvailable = variants.reduce((acc, variant) => {
        return acc + (metrics.inventoryByVariant.get(variant.variant_id) ?? 0);
      }, 0);
      return {
        product,
        variants,
        totalAvailable,
      };
    });
  }, [catalog.products, catalog.variants, metrics.inventoryByVariant]);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title="Catálogo · Resumen" />
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Catálogo (Resumen)</h1>
            <p className="text-sm text-black/60">Unión visual de productos y variantes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">
              Productos: {metrics.totalProducts}
            </span>
            <span className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs">
              Variantes: {metrics.totalVariants}
            </span>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[
            { label: "Productos activos", value: metrics.activeProducts },
            { label: "Productos inactivos", value: metrics.totalProducts - metrics.activeProducts },
            { label: "Variantes activas", value: metrics.activeVariants },
            { label: "Variantes inactivas", value: metrics.totalVariants - metrics.activeVariants },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-black/50">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Productos y variantes</p>
            <p className="text-xs text-black/60">Vista consolidada</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-black/60">
                <tr className="border-b border-black/10">
                  <th className="py-2 text-left">Producto</th>
                  <th className="py-2 text-left">Variantes</th>
                  <th className="py-2 text-right">Disponible</th>
                  <th className="py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={row.product.product_id} className="border-b border-black/5">
                    <td className="py-3 font-medium">{row.product.name}</td>
                    <td className="py-3 text-black/70">
                      {row.variants.length > 0
                        ? row.variants
                            .map((variant) => {
                              const label =
                                (variant.attributes?.variante as string | undefined) ??
                                (variant.attributes?.color as string | undefined) ??
                                (variant.attributes?.presentacion as string | undefined) ??
                                variant.sku;
                              return label.toLowerCase() === "ampolla"
                                ? row.product.name
                                : `${row.product.name} de ${label}`;
                            })
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="py-3 text-right font-semibold">{row.totalAvailable}</td>
                    <td className="py-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                          row.product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                        ].join(" ")}
                      >
                        {row.product.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
