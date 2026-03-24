import { Box, Package2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { ProductForm } from "@/pages/catalog/types/product";
import { ListUnitResponse } from "@/pages/catalog/types/unit";

export function ProductFormFields({
  form,
  setForm,
  units,
  primaBoolean = false,
}: {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  units?: ListUnitResponse;
  primaBoolean?: boolean;
}) {
  const unitOptions = (units ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <SectionHeaderForm icon={Package2} title="Datos generales" />

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <FloatingInput
            label="Nombre"
            name="name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <FloatingInput
            label="Sku personalizado"
            name="customSku"
            value={form.customSku}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, customSku: event.target.value }))
            }
          />

          <FloatingSelect
            label="Unidad base"
            name="baseUnitId"
            value={form.baseUnitId}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, baseUnitId: value }))
            }
            options={unitOptions}
            placeholder="Seleccionar unidad"
            searchable
            searchPlaceholder="Buscar unidad..."
            emptyMessage="Sin unidades"
          />
        </div>
      </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
          <SectionHeaderForm icon={Box} title="Atributos" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <FloatingInput
              label="Presentación"
              name="presentation"
              value={form.attribute?.presentation ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  attribute: {
                    ...prev.attribute,
                    presentation: event.target.value.toUpperCase(),
                  },
                }))
              }
            />

            <FloatingInput
              label="Variante"
              name="variant"
              value={form.attribute?.variant ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  attribute: {
                    ...prev.attribute,
                    variant: event.target.value.toUpperCase(),
                  },
                }))
              }
            />

            <FloatingInput
              label="Color"
              name="color"
              value={form.attribute?.color ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  attribute: {
                    ...prev.attribute,
                    color: event.target.value.toUpperCase(),
                  },
                }))
              }
            />
          </div>
        </div>
      {!primaBoolean && (
        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
          <SectionHeaderForm icon={Box} title="Costos" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <FloatingInput
                label="Precio (S/)"
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, price: event.target.value }))
                }
              />
  
              <FloatingInput
                label="Costo (S/)"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.cost}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cost: event.target.value }))
                }
              />
          </div>
        </div>
      )}
    </div>
  );
}