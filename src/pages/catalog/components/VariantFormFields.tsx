import { FilterableSelect } from "@/components/SelectFilterable";
import { VariantForm, ProductOption } from "@/types/variant";
import { Dispatch, SetStateAction } from "react";

export function VariantFormFields({ form, setForm, products }: { form: VariantForm; setForm: Dispatch<SetStateAction<VariantForm>>; products: ProductOption[] }) {
    const productOptions = (products ?? []).map((u) => ({
        value: u.productId,
        label: `${u.name}`,
    }));
    return (
        <div className="space-y-3">
            <div className="mb-3">
                <label className="text-sm">
                    <div className="mb-2">Producto</div>
                    <FilterableSelect
                        value={form.productId}
                        onChange={(v) => setForm((prev) => ({ ...prev, productId: v }))}
                        options={productOptions}
                        placement="bottom"
                        placeholder="Seleccionar producto"
                        searchPlaceholder="Buscar producto..."
                    />
                </label>
            </div>
            <div className="mb-3">
                <label className="text-sm mt-3">
                    Codigo de barras
                    <input
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/50 cursor-not-allowed"
                        value={form.barcode}
                        onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
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
                            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
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
                            onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
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
                        onChange={(e) => setForm((prev) => ({ ...prev, attribute: e.target.value as VariantForm["attribute"] }))}
                    >
                        <option value="">Seleccionar atributo</option>
                        <option value="presentation">Presentacion</option>
                        <option value="variant">Variante</option>
                        <option value="color">Color</option>
                    </select>
                </label>
                <label className="text-sm">
                    Valor
                    <input
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                        value={form.attributeValue}
                        onChange={(e) => setForm((prev) => ({ ...prev, attributeValue: e.target.value }))}
                    />
                </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm">
                    Estado
                    <select
                        className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm bg-white"
                        value={form.isActive ? "active" : "inactive"}
                        onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
                    >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                    </select>
                </label>
            </div>
        </div>
    );
}
