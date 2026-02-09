import { useMemo, useState } from "react";
import { PageTitle } from "@/components/PageTitle";
import { getCatalogMock } from "@/data/catalogService";
import { Link, useParams } from "react-router-dom";

type FormState = {
  name: string;
  description: string;
  is_active: boolean;
};

export default function ProductForm() {
  const { productId } = useParams();
  const catalog = getCatalogMock();
  const editing = Boolean(productId);
  const product = catalog.products.find((p) => p.product_id === productId);

  const initialState = useMemo<FormState>(
    () => ({
      name: product?.name ?? "",
      description: product?.description ?? "",
      is_active: product?.is_active ?? true,
    }),
    [product]
  );

  const [form, setForm] = useState<FormState>(initialState);

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <PageTitle title={editing ? "Editar producto" : "Nuevo producto"} />
      <div className="px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{editing ? "Editar producto" : "Nuevo producto"}</h1>
            <p className="text-sm text-black/60">Formulario visual (mock).</p>
          </div>
          <Link
            to="/catalogo/productos"
            className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs"
          >
            Volver
          </Link>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              Nombre
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Nombre del producto"
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
            <label className="text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-2 min-h-[110px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Descripción del producto"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-md border border-black/10 px-3 py-2 text-sm">
              Guardar (mock)
            </button>
            <button type="button" className="rounded-md border border-black/10 px-3 py-2 text-sm">
              Guardar y crear variante
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
