import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Power } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { ListUnitResponse } from "@/features/catalog/types/unit";
import type { PrimaVariant } from "@/features/catalog/types/variant";
import {
  buildRecipeRowId,
  getPrimaUnitId,
  getPrimaUnitName,
  type RecipeDraft,
  type RecipeDraftItem,
} from "./recipeFormFields.helpers";

type RecipeRow = {
  id: string;
  materialSkuId: string;
  quantity: string;
  unitId: string;
};

type RecipeSkuOption = {
  value: string;
  label: string;
};

type RecipeFormFieldsProps = {
  units?: ListUnitResponse;
  primaVariants: PrimaVariant[];
  onMaterialSearchChange: (query: string) => void;
  hasMoreMaterialResults: boolean;
  onLoadMoreMaterials: () => void;
  recipe: RecipeDraft;
  onChange: (next: RecipeDraft) => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
  loading?: boolean;
  saving?: boolean;
  primaryColor?: string;
  tableId: string;
  recipeSkuOptions: RecipeSkuOption[];
  onSelectSku: (skuId: string) => void;
  selectedSkuId: string;
  ingredientLabel?: string;
  recipeSearchPlaceholder?: string;
  ingredientSearchPlaceholder?: string;
  recipeEmptyMessage?: string;
  ingredientEmptyMessage?: string;
  emptyTableMessage?: string;
  loadMoreLabel?: string;
  showYield?: boolean;
};

export function RecipeFormFields({
  units,
  primaVariants,
  onMaterialSearchChange,
  hasMoreMaterialResults,
  onLoadMoreMaterials,
  recipe,
  onChange,
  onDeleteItem,
  loading,
  saving,
  primaryColor = "hsl(var(--primary))",
  tableId,
  recipeSkuOptions,
  onSelectSku,
  selectedSkuId,
  ingredientLabel = "Materia prima",
  recipeSearchPlaceholder = "Buscar producto...",
  ingredientSearchPlaceholder = "Buscar producto...",
  recipeEmptyMessage = "Sin productos",
  ingredientEmptyMessage = "Sin productos",
  emptyTableMessage = "No hay recetas registradas.",
  loadMoreLabel = "Cargar más materias primas",
  showYield = true,
}: RecipeFormFieldsProps) {
  const [materialSkuId, setMaterialSkuId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitId, setUnitId] = useState("");

  const activePrimaVariants = useMemo(
    () => (primaVariants ?? []).filter((variant) => variant.isActive !== false),
    [primaVariants],
  );

  useEffect(() => {
    const selected = activePrimaVariants.find((variant) => variant.id === materialSkuId);
    setUnitId(getPrimaUnitId(selected));
  }, [materialSkuId, activePrimaVariants]);

  const mapPrimaVariantOption = useCallback(
    (variant: PrimaVariant, showInactive = false) => ({
        value: variant.id ?? "",
        label: `${variant.productName ?? "Producto"} ${variant.attributes?.presentation ?? ""} ${
          variant.attributes?.variant ?? ""
        } ${variant.attributes?.color ?? ""} ${variant.sku ? ` - ${variant.sku}` : ""} ${
          variant.customSku ? `(${variant.customSku})` : ""
        }${showInactive && variant.isActive === false ? " (Inactivo)" : ""}`.trim(),
      }),
    [],
  );

  const primaVariantOptions = useMemo(
    () => activePrimaVariants.map((variant) => mapPrimaVariantOption(variant)),
    [activePrimaVariants, mapPrimaVariantOption],
  );

  const recipePrimaVariantOptions = useMemo(
    () => (primaVariants ?? []).map((variant) => mapPrimaVariantOption(variant, true)),
    [primaVariants, mapPrimaVariantOption],
  );

  const selectedPrimaVariant = useMemo(
    () => activePrimaVariants.find((variant) => variant.id === materialSkuId),
    [activePrimaVariants, materialSkuId],
  );

  const baseUnitLabel = getPrimaUnitName(selectedPrimaVariant);

  const recipeRows = useMemo<RecipeRow[]>(
    () =>
      (recipe.items ?? []).map((item) => ({
        id: item.id,
        materialSkuId: item.materialSkuId,
        quantity: item.quantity,
        unitId: item.unitId,
      })),
    [recipe.items],
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (onDeleteItem) {
        await onDeleteItem(id);
        return;
      }

      onChange({
        ...recipe,
        items: recipe.items.filter((item) => item.id !== id),
      });
    },
    [onDeleteItem, onChange, recipe],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<Pick<RecipeDraftItem, "materialSkuId" | "quantity" | "unitId">>) => {
      onChange({
        ...recipe,
        items: recipe.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      });
    },
    [onChange, recipe],
  );

  const unitOptions = useMemo(
    () =>
      (units ?? []).map((unit) => ({
        value: unit.id,
        label: `${unit.name} (${unit.code})`,
      })),
    [units],
  );

  const columns = useMemo<DataTableColumn<RecipeRow>[]>(
    () => [
      {
        id: "prima",
        header: ingredientLabel,
        cell: (row) => (
          <FloatingSelect
            label={ingredientLabel}
            name={`recipe-material-${row.id}`}
            value={row.materialSkuId}
            onChange={(value) => updateItem(row.id, { materialSkuId: value })}
            options={recipePrimaVariantOptions}
            searchable
            searchPlaceholder={ingredientSearchPlaceholder}
            emptyMessage={ingredientEmptyMessage}
          />
        ),
        hideable: false,
        sortable: false,
      },
      {
        id: "quantity",
        header: "Cantidad",
        cell: (row) => (
          <FloatingInput
            label="Cantidad"
            type="number"
            name={`recipe-qty-${row.id}`}
            min="0"
            step="0.01"
            value={row.quantity}
            onChange={(event) => updateItem(row.id, { quantity: event.target.value })}
            className="text-black/90"
          />
        ),
        hideable: false,
        sortable: false,
      },
      {
        id: "unit",
        header: "Unidad",
        cell: (row) => (
          <FloatingSelect
            label="Unidad"
            name={`recipe-unit-${row.id}`}
            value={row.unitId}
            onChange={(value) => updateItem(row.id, { unitId: value })}
            options={unitOptions}
            searchable
            searchPlaceholder="Buscar unidad..."
            emptyMessage="Sin unidades"
          />
        ),
        hideable: false,
        sortable: false,
      },
      {
        id: "actions",
        header: "",
        pinned: "right",
        lockPosition: true,
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="danger"
              size="custom"
              className="h-8 w-9 rounded-lg"
              onClick={() => void removeItem(row.id)}
              disabled={Boolean(saving)}
            >
              <Power className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        headerClassName: "text-right w-[50px]",
        className: "text-right",
        hideable: false,
        sortable: false,
      },
    ],
    [ingredientEmptyMessage, ingredientLabel, ingredientSearchPlaceholder, recipePrimaVariantOptions, unitOptions, removeItem, saving, updateItem],
  );

  const canAddItem = Boolean(materialSkuId && unitId && Number(quantity) > 0);

  const handleAddItem = useCallback(async () => {
    if (!canAddItem) return;

    const nextItem: RecipeDraftItem = {
      id: buildRecipeRowId(),
      materialSkuId,
      quantity,
      unitId,
    };

    onChange({
      ...recipe,
      items: [...recipe.items, nextItem],
    });

    setMaterialSkuId("");
    setQuantity("1");
    setUnitId("");
  }, [canAddItem, materialSkuId, quantity, unitId, onChange, recipe]);

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 gap-3 pt-3 ${showYield ? "md:grid-cols-[1.8fr_1fr_0.65fr]" : "md:grid-cols-[1.8fr_1fr]"}`}>
        <FloatingSelect
          label=""
          name="selectedSku"
          value={selectedSkuId}
          onChange={onSelectSku}
          options={recipeSkuOptions}
          searchable
          searchPlaceholder={recipeSearchPlaceholder}
          emptyMessage={recipeEmptyMessage}
        />

        <FloatingInput
          label="Nota"
          name="notes"
          value={recipe.notes}
          onChange={(event) =>
            onChange({
              ...recipe,
              notes: event.target.value,
            })
          }
        />

        {showYield ? <FloatingInput
          label="Rendimiento"
          type="number"
          name="yield"
          min={0}
          value={recipe.yieldQuantity}
          onChange={(event) =>
            onChange({
              ...recipe,
              yieldQuantity: event.target.value,
            })
          }
        /> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.8fr_1fr_0.5fr_45px]">
        <FloatingSelect
          label={ingredientLabel}
          name="materia-prima"
          value={materialSkuId}
          onChange={(value) => setMaterialSkuId(value)}
          options={primaVariantOptions}
          searchable
          searchPlaceholder={ingredientSearchPlaceholder}
          emptyMessage={ingredientEmptyMessage}
          onSearchChange={onMaterialSearchChange}
        />

        <FloatingInput label="Unidad base" name="unit-base" value={baseUnitLabel} disabled />

        <FloatingInput
          label="Cantidad"
          type="number"
          name="cantidad"
          className="text-black/90"
          value={quantity}
          min="0"
          step="1"
          onChange={(event) => setQuantity(event.target.value)}
        />

        <SystemButton
          leftIcon={<Plus className="h-4 w-4" />}
          className="h-10"
          style={{
            backgroundColor: primaryColor,
            borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
          }}
          onClick={handleAddItem}
          disabled={!canAddItem || Boolean(saving)}
        />
      </div>

      {hasMoreMaterialResults ? (
        <div className="flex justify-end">
          <SystemButton variant="outline" size="sm" onClick={onLoadMoreMaterials} disabled={Boolean(loading)}>
            {loadMoreLabel}
          </SystemButton>
        </div>
      ) : null}

      <DataTable
        tableId={tableId}
        data={recipeRows}
        columns={columns}
        rowKey="id"
        loading={loading}
        emptyMessage={emptyTableMessage}
        hoverable={false}
        animated={false}
        className="text-xs"
        tableClassName="text-xs [&_tbody_td]:p-1"
        maxHeight="300px"
      />
    </div>
  );
}
