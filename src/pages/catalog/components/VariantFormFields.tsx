import type { Dispatch, SetStateAction } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import type { ProductOption, VariantForm } from "@/pages/catalog/types/variant";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { Box, Package2 } from "lucide-react";

export function VariantFormFields({
  form,
  setForm,
  products,
  lockProduct = false,
}: {
  form: VariantForm;
  setForm: Dispatch<SetStateAction<VariantForm>>;
  products: ProductOption[];
  lockProduct?: boolean;
}) {
  const productOptions = (products ?? []).map((u) => ({
    value: u.productId,
    label:`${u.name} ${u.attributes?.presentation??""} 
    ${u.attributes?.variant??""}
    ${u.attributes?.color??""} ${u.sku ?`-${u.sku}`:""}
    ${u.customSku ? `(${u.customSku})`: ""}`,
  }));

  return (
    <div className="space-y-4">
      <div className=" rounded-2xl border border-black/10 bg-white p-4 sm:p-5
        space-y-4">
          <SectionHeaderForm icon={Package2} title="Datos generales" />
          <div className="grid grid-cols-1 gap-3">
            <FloatingSelect
              label="Producto"
              name="productId"
              value={form.productId}
              onChange={(v) => setForm((prev) => ({ ...prev, productId: v }))}
              options={productOptions}
              searchable
              searchPlaceholder="Buscar producto..."
              emptyMessage="Sin productos"
              disabled={lockProduct}
            />

            <FloatingInput
              label="Sku personalizado"
              name="customSku"
              value={form.customSku}
              onChange={(e) => setForm((prev) => ({ ...prev, customSku: e.target.value }))}
            />
          </div>
      </div>
      <div className=" rounded-2xl border border-black/10 bg-white p-4 sm:p-5
        space-y-4">
          <SectionHeaderForm icon={Box} title="Atributos" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FloatingInput
            label="Presentación"
            name="presentation"
            value={form.attributes?.presentation ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                attributes: {
                  ...prev.attributes,
                  presentation: event.target.value.toUpperCase(),
                },
              }))
            }
          />

          <FloatingInput
            label="Variante"
            name="variant"
            value={form.attributes?.variant ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                attributes: {
                  ...prev.attributes,
                  variant: event.target.value.toUpperCase(),
                },
              }))
            }
          />

          <FloatingInput
            label="Color"
            name="color"
            value={form.attributes?.color ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                attributes: {
                  ...prev.attributes,
                  color: event.target.value.toUpperCase(),
                },
              }))
            }
          />
        </div>
      </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
          <SectionHeaderForm icon={Box} title="Costos" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FloatingInput
              label="Precio (S/)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            />

            <FloatingInput
              label="Costo (S/)"
              name="cost"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
            />
          </div>
          

        </div>

    </div>
  );
}