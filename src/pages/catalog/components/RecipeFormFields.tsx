import { FilterableSelect } from "@/components/SelectFilterable";
import { createProductRecipe, deleteProductRecipe } from "@/services/productRecipeService";
import { ProductRecipe } from "@/types/productRecipe";
import { ListUnitResponse } from "@/types/unit";
import type { Variant } from "@/types/variant";
import { Power } from "lucide-react";
import { useState } from "react";

export function RecipeFormFields({
    finishedVariantId,
    units,
    primaVariants,
    recipes,
    loading,
    onCreated,
}: {
    finishedVariantId: string;
    units?: ListUnitResponse;
    primaVariants: Variant[];
    recipes: ProductRecipe[];
    loading: boolean;
    onCreated: () => Promise<void>;
}) {
    
    const PRIMARY = "#21b8a6";
    const [primaVariantId, setPrimaVariantId] = useState("");
    const [quantity, setQuantity] = useState("1");
    const activePrimaVariants = (primaVariants ?? []).filter((v) => v.isActive);

    const primaVariantOptions = (activePrimaVariants ?? []).map((v) => ({
        value: v.id,
        label: `${v.productName ?? "Producto"} (${v.sku})`,
    }));

    const selectedPrimaVariant = (activePrimaVariants ?? []).find((v) => v.id === primaVariantId);
    const baseUnitLabel =
        selectedPrimaVariant?.unitName && selectedPrimaVariant?.unitCode
            ? `${selectedPrimaVariant.unitName} (${selectedPrimaVariant.unitCode})`
            : ((units ?? []).find((u) => u.id === selectedPrimaVariant?.baseUnitId)?.name ?? (selectedPrimaVariant?.baseUnitId ? selectedPrimaVariant.baseUnitId : "Sin unidad base"));

    const handleCreate = async () => {
        if (!finishedVariantId || !primaVariantId || !quantity) return;
        await createProductRecipe({
            finishedVariantId,
            primaVariantId,
            quantity: Number(quantity),
        });
        setPrimaVariantId("");
        setQuantity("1");
        await onCreated();
    };

    const deleteRecipe = async (id: string) => {
        try {
            await deleteProductRecipe(id);
            await onCreated();
        } catch {
            console.log("algo salio mal");
        }
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_150px_100px_45px]">
                <label className="text-sm">
                    <div className="mb-2">Materia prima y materiales</div>
                    <FilterableSelect
                        value={primaVariantId}
                        onChange={setPrimaVariantId}
                        options={primaVariantOptions}
                        placement="bottom"
                        placeholder="Seleccionar producto"
                        searchPlaceholder="Buscar producto..."
                    />
                </label>

                <label className="text-sm">
                    <div className="mb-2">Unidad base</div>
                    <input className="h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/60" value={baseUnitLabel} disabled />
                </label>
                <label className="text-sm">
                    <div className="mb-2">Cantidad</div>
                    <input type="number" min="0" step="0.0001" className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </label>
                <button
                    type="button"
                    className="rounded-xl border h-10 text-xl text-white mt-7"
                    style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                    onClick={() => void handleCreate()}
                    disabled={!finishedVariantId || !primaVariantId || !quantity}
                >
                    +
                </button>
            </div>

            <div className="flex justify-end"></div>

            <div className="rounded-2xl border border-black/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 text-xs text-black/60">
                    <span>Listado de recetas</span>
                    <span>{loading ? "Cargando..." : `${recipes.length} registros`}</span>
                </div>
                <div className="max-h-56 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-black/10 text-xs text-black/60">
                                <th className="py-2 px-5 text-left">Materia prima</th>
                                <th className="py-2 px-5 text-center">Cantidad</th>
                                <th className="py-2 px-5 text-right">Unidad base</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipes.map((r) => {
                                const prima = (primaVariants ?? []).find((v) => v.id === r.primaVariantId);
                                const unitLabel =
                                    prima?.unitName && prima?.unitCode
                                        ? `${prima.unitName} (${prima.unitCode})`
                                        : ((units ?? []).find((u) => u.id === prima?.baseUnitId)?.name ?? (prima?.baseUnitId ? prima.baseUnitId : r.primaVariantId));
                                return (
                                    <tr key={r.id} className="border-b border-black/5">
                                        <td className="py-2 px-5">{prima ? `${prima.productName ?? "Producto"} (${prima.sku})` : r.primaVariantId}</td>
                                        <td className="py-2 px-5 text-center">{r.quantity}</td>
                                        <td className="py-2 px-5 text-right">{unitLabel}</td>
                                        <td>
                                            <button
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-red-500 text-lime-50 font-semibold hover:bg-red-400"
                                                onClick={() => {
                                                    void deleteRecipe(r.id);
                                                }}
                                            >
                                                <Power className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!loading && recipes.length === 0 && <div className="px-4 py-4 text-sm text-black/60">No hay recetas registradas.</div>}
                </div>
            </div>
        </div>
    );
}
