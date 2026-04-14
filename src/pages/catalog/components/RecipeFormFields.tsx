
import { useEffect, useMemo, useState } from "react";
import { Plus, Power } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { PrimaVariant } from "@/pages/catalog/types/variant";

export type RecipeDraftItem = {
  id: string;
  materialSkuId: string;
  quantity: string;
  unitId: string;
};

export type RecipeDraft = {
  yieldQuantity: string;
  notes: string;
  items: RecipeDraftItem[];
};

export const createEmptyRecipeDraft = (): RecipeDraft => ({
  yieldQuantity: "1",
  notes: "",
  items: [],
});

type RecipeRow = {
  id: string;
  materialSkuId: string;
  quantity: string;
  unitId: string;
};

type RecipeFormFieldsProps = {
  units?: ListUnitResponse;
  primaVariants: PrimaVariant[];
  recipe: RecipeDraft;
  onChange: (next: RecipeDraft) => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
  loading?: boolean;
  saving?: boolean;
  primaryColor?: string;
  tableId: string;
  recipeSkuOptions: any;
  onSelectSku: (skuId:string)=> void;
  selectedSkuId:string;
};

const buildRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getPrimaUnitId = (prima?: PrimaVariant) => prima?.unit?.id ?? prima?.baseUnitId ?? "";

const getPrimaUnitName = (prima?: PrimaVariant) => prima?.unit?.name ?? prima?.unitName ?? "SIN UNIDAD DE MEDIDA";

export function RecipeFormFields({
  units,
  primaVariants,
  recipe,
  onChange,
  onDeleteItem,
  loading,
  saving,
  primaryColor = "hsl(var(--primary))",
  tableId,
  recipeSkuOptions,
  onSelectSku,
  selectedSkuId
}: RecipeFormFieldsProps) {
  const [materialSkuId, setMaterialSkuId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitId, setUnitId] = useState("");

  const activePrimaVariants = useMemo(
    () => (primaVariants ?? []).filter((v) => v.isActive !== false),
    [primaVariants],
  );

  useEffect(() => {
    const selected = activePrimaVariants.find((v) => v.id === materialSkuId);
    const nextUnitId = getPrimaUnitId(selected);
    setUnitId(nextUnitId);
  }, [materialSkuId, activePrimaVariants]);

  const primaVariantOptions = useMemo(
    () =>
      (activePrimaVariants ?? []).map((v) => ({
        value: v.id ?? "",
        label: `${v.productName ?? "Producto"} ${v.attributes?.presentation ?? ""} ${
          v.attributes?.variant ?? ""
        } ${v.attributes?.color ?? ""} ${v.sku ? ` - ${v.sku}` : ""} ${
          v.customSku ? `(${v.customSku})` : ""
        }`.trim(),
      })),
    [activePrimaVariants],
  );

  const selectedPrimaVariant = useMemo(
    () => activePrimaVariants.find((v) => v.id === materialSkuId),
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

  const removeItem = async (id: string) => {
    if (onDeleteItem) {
      await onDeleteItem(id);
      return;
    }

    onChange({
      ...recipe,
      items: recipe.items.filter((item) => item.id !== id),
    });
  };

  const updateItem = (
    id: string,
    patch: Partial<Pick<RecipeDraftItem, "materialSkuId" | "quantity" | "unitId">>,
  ) => {
    onChange({
      ...recipe,
      items: recipe.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

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
        header: "Materia prima",
        cell: (row) => (
          <FloatingSelect
            label="Materia prima"
            name={`recipe-material-${row.id}`}
            value={row.materialSkuId}
            onChange={(value) => updateItem(row.id, { materialSkuId: value })}
            options={primaVariantOptions}
            searchable
            searchPlaceholder="Buscar producto..."
            emptyMessage="Sin productos"
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
        headerClassName: "text-right w-[40px]",
        className: "text-right",
        hideable: false,
        sortable: false,
      },
    ],
    [primaVariantOptions, unitOptions, removeItem, saving, updateItem],
  );

  const canAddItem = Boolean(materialSkuId && unitId && Number(quantity) > 0);

  const handleAddItem = async () => {
    if (!canAddItem) return;

    const nextItem: RecipeDraftItem = {
      id: buildRowId(),
      materialSkuId,
      quantity,
      unitId,
    };

    const nextRecipe: RecipeDraft = {
      ...recipe,
      items: [...recipe.items, nextItem],
    };

    onChange(nextRecipe);

    setMaterialSkuId("");
    setQuantity("1");
    setUnitId("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.8fr_1fr_0.65fr] pt-3">
          <FloatingSelect
            label="Seleccionar SKU"
            name="selectedSku"
            value={selectedSkuId}
            onChange={onSelectSku}
            options={recipeSkuOptions}
            searchable
            searchPlaceholder="Buscar producto..."
            emptyMessage="Sin productos"
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
          <FloatingInput
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
          />
        </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.8fr_1fr_0.5fr_45px]">
        <FloatingSelect
          label="Materia prima"
          name="materia-prima"
          value={materialSkuId}
          onChange={(value) => setMaterialSkuId(value)}
          options={primaVariantOptions}
          searchable
          searchPlaceholder="Buscar producto..."
          emptyMessage="Sin productos"
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
          onChange={(e) => setQuantity(e.target.value)}
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
      <DataTable
        tableId={tableId}
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
  );
}
