import { createProductRecipe, deleteProductRecipe } from "@/services/productRecipeService";
import { ProductRecipe } from "@/pages/catalog/types/productRecipe";
import { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { PrimaVariant } from "@/pages/catalog/types/variant";
import { Power, Plus } from "lucide-react";
import { useState } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";

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
    primaVariants: PrimaVariant[];
    recipes: ProductRecipe[];
    loading: boolean;
    onCreated: () => Promise<void>;
}) {
    
    const PRIMARY = "hsl(var(--primary))";
    const [primaVariantId, setPrimaVariantId] = useState("");
    const [quantity, setQuantity] = useState("1");
    const activePrimaVariants = (primaVariants ?? []).filter((v) => v.isActive !== false);

    const primaVariantOptions = (activePrimaVariants ?? []).map((v) => ({
        value: v.id ?? "",
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.8fr_1fr_0.5fr_45px] mt-2">
                <FloatingSelect
                    label="Materia prima"
                    name="materia-prima"
                    value={primaVariantId}
                    onChange={(value) => setPrimaVariantId(value)}
                    options={primaVariantOptions}
                    searchable
                    searchPlaceholder="Buscar producto..."
                    emptyMessage="Sin productos"
                />

                <FloatingInput
                    label="Unidad base"
                    name="unit-base"
                    value={baseUnitLabel}
                    disabled
                />

                <FloatingInput
                    label="Cantidad"
                    type="number"
                    name="cantidad"
                    value={quantity}
                    min="0"
                    step="1"
                    onChange={(e) => setQuantity(e.target.value)}
                />

                <SystemButton
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="h-10"
                    style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
                    onClick={() => void handleCreate()}
                    disabled={!finishedVariantId || !primaVariantId || !quantity}
                />
            </div>

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
                                <th className="py-2 px-5 text-left">Consumo</th>
                                <th className="py-2 px-5 text-left"></th>
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
                                        <td className="py-2 px-5 text-left">{prima ? `${prima.productName ?? "Producto"} (${prima.sku})` : r.primaVariantId}</td>
                                        <td className="py-2 px-5 text-left">
                                            {r.quantity} - {unitLabel}
                                        </td>
                                        <td>
                                            <SystemButton
                                                variant="danger"
                                                size="custom"
                                                className="h-8 w-9 rounded-lg"
                                                onClick={() => {
                                                    void deleteRecipe(r.id);
                                                }}
                                            >
                                                <Power className="h-4 w-4" />
                                            </SystemButton>
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


