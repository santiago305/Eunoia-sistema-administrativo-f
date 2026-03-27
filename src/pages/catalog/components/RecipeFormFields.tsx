import { useCallback, useMemo, useState } from "react";
import { createProductRecipe, deleteProductRecipe } from "@/services/productRecipeService";
import { ProductRecipe } from "@/pages/catalog/types/productRecipe";
import { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { PrimaVariant } from "@/pages/catalog/types/variant";
import { Power, Plus } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

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
        label: `${v.productName ?? "Producto"} ${v.attributes?.presentation ?? ""} ${v.attributes?.variant ?? ""} ${v.attributes?.color ?? ""}
        ${v.sku ? ` - ${v.sku}`: ""} (${v.customSku ?? "-"})`,      })); 

    const selectedPrimaVariant = (activePrimaVariants ?? []).find((v) => v.id === primaVariantId);
    const baseUnitLabel =
        selectedPrimaVariant?.unitName && selectedPrimaVariant?.unitCode
            ? `${selectedPrimaVariant.unitName} (${selectedPrimaVariant.unitCode})`
            : ((units ?? []).find((u) => u.id === selectedPrimaVariant?.baseUnitId)?.name ?? (selectedPrimaVariant?.baseUnitId ? selectedPrimaVariant.baseUnitId : "Sin unidad base"));

    type RecipeRow = {
        id: string;
        primaLabel: string;
        consumption: string;
    };

    const deleteRecipe = useCallback(async (id: string) => {
        try {
            await deleteProductRecipe(id);
            await onCreated();
        } catch {
            console.log("algo salio mal");
        }
    }, [onCreated]);

    const recipeRows = useMemo<RecipeRow[]>(
        () =>
            (recipes ?? []).map((recipe) => {
                const prima = (primaVariants ?? []).find((v) => v.id === recipe.primaVariantId);
                const unitLabel =
                    prima?.unitName && prima?.unitCode
                        ? `${prima.unitName} (${prima.unitCode})`
                        : ((units ?? []).find((u) => u.id === prima?.baseUnitId)?.name ?? (prima?.baseUnitId ? prima.baseUnitId : recipe.primaVariantId));
                const primaLabel = prima ? `${prima.productName ?? "Producto"} (${prima.sku ?? "-"})` : recipe.primaVariantId;

                return {
                    id: recipe.id,
                    primaLabel,
                    consumption: `${recipe.quantity} - ${unitLabel}`,
                };
            }),
        [recipes, primaVariants, units],
    );

    const columns = useMemo<DataTableColumn<RecipeRow>[]>(
        () => [
            {
                id: "prima",
                header: "Materia prima",
                accessorKey: "primaLabel",
                className: "text-black/70",
                hideable: false,
                sortable: false,
            },
            {
                id: "consumption",
                header: "Consumo",
                accessorKey: "consumption",
                className: "text-black/70",
                hideable: false,
                sortable: false,
            },
            {
                id: "actions",
                header: "",
                cell: (row) => (
                    <div className="flex justify-end">
                        <SystemButton
                            variant="danger"
                            size="custom"
                            className="h-8 w-9 rounded-lg"
                            onClick={() => {
                                void deleteRecipe(row.id);
                            }}
                        >
                            <Power className="h-4 w-4" />
                        </SystemButton>
                    </div>
                ),
                headerClassName: "text-right w-[40px]",
                className: "text-right",
                hideable: false,
                sortable: false,
            },
        ],
        [deleteRecipe],
    );

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
                    className="text-black/90"
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
                <DataTable
                    tableId={`recipe-list-${finishedVariantId}`}
                    data={recipeRows}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    emptyMessage="No hay recetas registradas."
                    hoverable={false}
                    animated={false}
                    className="text-xs"
                    tableClassName="text-xs"
                />
            </div>
        </div>
    );
}
