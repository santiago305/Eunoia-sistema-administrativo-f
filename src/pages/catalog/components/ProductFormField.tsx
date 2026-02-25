import { FilterableSelect } from "@/components/SelectFilterable";
import { ProductForm } from "@/types/product";
import { ListUnitResponse } from "@/types/unit";
import { Dispatch, SetStateAction } from "react";


 export function ProductFormFields({ form, setForm, units, PRIMARY }: { form: ProductForm; setForm: Dispatch<SetStateAction<ProductForm>>; units?: ListUnitResponse
    ,PRIMARY : string
  }) {
    const unitOptions = (units ?? []).map((u) => ({
        value: u.id,
        label: `${u.name} (${u.code})`,
    }));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm">
                    Nombre
                    <input
                        className="mt-2 h-11 w-full rounded-2xl border border-black/10 px-3 text-sm outline-none focus:ring-2"
                        style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                </label>
                <label className="text-sm">
                    <div className="mb-2">Unidad base</div>
                    <FilterableSelect
                        value={form.baseUnitId}
                        onChange={(value) => setForm((prev) => ({ ...prev, baseUnitId: value }))}
                        options={unitOptions}
                        placement="bottom"
                        placeholder="Seleccionar unidad"
                        searchPlaceholder="Buscar unidad..."
                    />
                </label>
            </div>
            <label className="text-sm">
                Descripción
                <textarea
                    className="mt-2 min-h-[90px] w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ "--tw-ring-color": `${PRIMARY}33` } as React.CSSProperties}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
            </label>
            <div className="mt-3">
                <label className="text-sm ">
                    Código de barras
                    <input
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/50 cursor-not-allowed"
                        value={form.barcode}
                        onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                        disabled
                        placeholder=""
                    />
                </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm">
                    Precio (S/)
                    <div className="mt-2 relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/50">S/</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="h-10 w-full rounded-lg border border-black/10 pl-10 pr-3 text-sm"
                            value={form.price}
                            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                        />
                    </div>
                </label>
                <label className="text-sm">
                    Costo (S/)
                    <div className="mt-2 relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/50">S/</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="h-10 w-full rounded-lg border border-black/10 pl-10 pr-3 text-sm"
                            value={form.cost}
                            onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
                        />
                    </div>
                </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm">
                    Atributo
                    <select
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                        value={form.attribute}
                        onChange={(event) => setForm((prev) => ({ ...prev, attribute: event.target.value as ProductForm["attribute"] }))}
                    >
                        <option value="">Seleccionar</option>
                        <option value="presentation">Presentación</option>
                        <option value="variant">Variante</option>
                        <option value="color">Color</option>
                    </select>
                </label>
                <label className="text-sm">
                    Valor
                    <input
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                        value={form.attributeValue}
                        onChange={(event) => setForm((prev) => ({ ...prev, attributeValue: event.target.value }))}
                    />
                </label>
            </div>
        </div>
    );
}
