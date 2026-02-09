import { useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { getCatalogMock } from "@/data/catalogService";
import { Link, useParams } from "react-router-dom";

type FormState = {
  product_id: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  attribute: string;
  attributeValue: string;
  is_active: boolean;
};

export default function VariantForm() {
  const { variantId } = useParams();
  const catalog = getCatalogMock();
  const editing = Boolean(variantId);
  const variant = catalog.variants.find((v) => v.variant_id === variantId);

  const initialState = useMemo<FormState>(
    () => ({
      product_id: variant?.product_id ?? catalog.products[0]?.product_id ?? "",
      sku: variant?.sku ?? "",
      barcode: variant?.barcode ?? "",
      price: variant?.price ? String(variant.price) : "",
      cost: variant?.cost ? String(variant.cost) : "",
      attribute: variant?.attributes?.variante ? "variante" : variant?.attributes?.color ? "color" : "presentacion",
      attributeValue:
        (variant?.attributes?.variante as string | undefined) ??
        (variant?.attributes?.color as string | undefined) ??
        (variant?.attributes?.presentacion as string | undefined) ??
        "",
      is_active: variant?.is_active ?? true,
    }),
    [catalog.products, variant]
  );

  const [form, setForm] = useState<FormState>(initialState);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title={editing ? "Editar variante" : "Nueva variante"} />
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{editing ? "Editar variante" : "Nueva variante"}</h1>
            <p className="text-sm text-black/60">Formulario visual (mock).</p>
          </div>
          <Link
            to="/catalogo/variantes"
            className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs"
          >
            Volver
          </Link>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              Producto
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.product_id}
                onChange={(event) => setForm({ ...form, product_id: event.target.value })}
              >
                {catalog.products.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              SKU
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                placeholder="SKU"
              />
            </label>
            <label className="text-sm">
              Código de barras
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.barcode}
                onChange={(event) => setForm({ ...form, barcode: event.target.value })}
                placeholder="Barcode"
              />
            </label>
            <label className="text-sm">
              Precio
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                placeholder="0.00"
              />
            </label>
            <label className="text-sm">
              Costo
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.cost}
                onChange={(event) => setForm({ ...form, cost: event.target.value })}
                placeholder="0.00"
              />
            </label>
            <label className="text-sm">
              Atributo
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.attribute}
                onChange={(event) => setForm({ ...form, attribute: event.target.value })}
              >
                <option value="presentacion">Presentación</option>
                <option value="variante">Variante</option>
                <option value="color">Color</option>
              </select>
            </label>
            <label className="text-sm">
              Valor
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.attributeValue}
                onChange={(event) => setForm({ ...form, attributeValue: event.target.value })}
                placeholder="Ej: curcuma / azufre / verde"
              />
            </label>
            <label className="text-sm">
              Estado
              <select
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) => setForm({ ...form, is_active: event.target.value === "active" })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-md border border-black/10 px-3 py-2 text-sm">
              Guardar (mock)
            </button>
            <button type="button" className="rounded-md border border-black/10 px-3 py-2 text-sm">
              Guardar y volver
            </button>
          </div>
          <p className="mt-3 text-xs text-black/50">
            Esta vista no persiste datos. Simula la forma y validaciones.
          </p>
        </section>
      </div>
    </div>
  );
}
