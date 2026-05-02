import { Boxes, PackageCheck } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { ProductCreateForm } from "@/features/catalog/types/product";
import type { EquivalenceDraft } from "@/features/catalog/types/equivalence";
import type { ListUnitResponse } from "@/features/catalog/types/unit";
import type { PrimaVariant } from "@/features/catalog/types/variant";
import { EquivalenceFormFields } from "./EquivalenceFormField";
import { ProductSkuTable, type ProductSkuDraft } from "./ProductSkuTable";
import { SelectOption, EquivalenceLike, PendingNotice } from "./ComponentSetion";
import { RecipeDraft } from "./recipeFormFields.helpers";
import { RecipeFormFields } from "./RecipeFormFields";



export function ProductDetailsSection({
  form,
  unitOptions,
  createFlowLocked,
  isEditMode,
  productId,
  skuRows,
  pendingSkuRows,
  onChangeFormField,
  onAddSkuRow,
  onRemoveSkuRow,
  onChangeSkuRow,
}: {
  form: ProductCreateForm;
  unitOptions: SelectOption[];
  createFlowLocked: boolean;
  isEditMode: boolean;
  productId?: string | null;
  skuRows: ProductSkuDraft[];
  pendingSkuRows: ProductSkuDraft[];
  onChangeFormField: (field: keyof ProductCreateForm, value: string | boolean) => void;
  onAddSkuRow: () => void;
  onRemoveSkuRow: (id: string) => void;
  onChangeSkuRow: (id: string, field: keyof ProductSkuDraft, value: string | boolean) => void;
}) {
  const visibleRows = isEditMode ? skuRows : createFlowLocked ? pendingSkuRows : skuRows;

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl bg-white/80 px-1 py-1">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-black/70">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-black">Datos principales</h3>
            <p className="text-sm text-black/60">Configura la informacion base del producto antes de trabajar sus SKUs.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_1fr_180px]">
          <FloatingInput
            label="Nombre"
            name="product-name"
            value={form.name}
            disabled={createFlowLocked}
            onChange={(event) => onChangeFormField("name", event.target.value)}
          />
          <FloatingInput
            label="Descripcion"
            name="product-description"
            value={form.description}
            disabled={createFlowLocked}
            onChange={(event) => onChangeFormField("description", event.target.value)}
          />
          <FloatingInput
            label="Marca"
            name="product-brand"
            value={form.brand}
            disabled={createFlowLocked}
            onChange={(event) => onChangeFormField("brand", event.target.value)}
          />
          <FloatingSelect
            label="Unidad base"
            name="product-baseUnit"
            value={form.baseUnitId}
            onChange={(value) => onChangeFormField("baseUnitId", value)}
            options={unitOptions}
            searchable
            searchPlaceholder="Buscar unidad..."
            emptyMessage="Sin unidades"
            disabled={createFlowLocked}
          />
          <label className="flex min-h-10 items-center gap-2 rounded-xl bg-black/[0.03] px-3 text-sm text-black/70">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={createFlowLocked}
              onChange={(event) => onChangeFormField("isActive", event.target.checked)}
            />
            Activo
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white/80 px-1 py-1">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-black">SKUs</h3>
            <p className="text-sm text-black/60">
              {isEditMode
                ? "Edita los SKUs ya creados para este producto."
                : "Define uno o varios SKUs operativos para este producto."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-black/70">
            <span className="font-medium text-black">Variantes</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="wantsVariants"
                checked={form.wantsVariants === "no"}
                disabled={createFlowLocked}
                onChange={() => onChangeFormField("wantsVariants", "no")}
              />
              No
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="wantsVariants"
                checked={form.wantsVariants === "yes"}
                disabled={createFlowLocked}
                onChange={() => onChangeFormField("wantsVariants", "yes")}
              />
              Si
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {createFlowLocked ? (
            <PendingNotice>
              El producto ya fue creado. Si quedaron drafts sin SKU persistido, puedes corregirlos y reintentar desde aqui.
            </PendingNotice>
          ) : null}

          <ProductSkuTable
            rows={visibleRows}
            canAddRows={!createFlowLocked && form.wantsVariants === "yes"}
            onAddRow={onAddSkuRow}
            onRemoveRow={onRemoveSkuRow}
            onChangeRow={onChangeSkuRow}
            readOnly={false}
            mode={isEditMode ? "edit" : "create"}
            allowRemoveRows={!createFlowLocked}            
            tableId={isEditMode ? `product-sku-edit-${productId ?? "draft"}` : "product-sku-create"}
          />
        </div>
      </section>
    </div>
  );
}

export function ProductEquivalencesSection({
  activeProductId,
  equivalenceFailures,
  saving,
  onRetryPending,
  baseUnitId,
  units,
  equivalences,
  loading,
  onCreateEquivalence,
  onDeleteEquivalence,
  primaryColor,
}: {
  activeProductId: string | null;
  equivalenceFailures: EquivalenceDraft[];
  saving: boolean;
  onRetryPending: () => void;
  baseUnitId: string;
  units?: ListUnitResponse;
  equivalences: EquivalenceLike[];
  loading?: boolean;
  onCreateEquivalence: (payload: {
    fromUnitId: string;
    toUnitId: string;
    factor: number;
  }) => Promise<void> | void;
  onDeleteEquivalence: (id: string) => Promise<void> | void;
  primaryColor: string;
}) {
  return (
    <div className="space-y-4">
      {activeProductId && equivalenceFailures.length > 0 ? (
        <PendingNotice
          actionLabel="Reintentar pendientes"
          onAction={onRetryPending}
          disabled={saving}
        >
          Hay {equivalenceFailures.length} equivalencia(s) pendiente(s) de guardar.
        </PendingNotice>
      ) : null}

      <EquivalenceFormFields
        productId={activeProductId ?? undefined}
        baseUnitId={baseUnitId}
        units={units}
        equivalences={equivalences}
        loading={loading}
        onCreateEquivalence={onCreateEquivalence}
        onDeleteEquivalence={onDeleteEquivalence}
        tableId={
          activeProductId
            ? `product-equivalences-${activeProductId}`
            : "product-equivalences-draft"
        }
        PRIMARY={primaryColor}
      />
    </div>
  );
}

export function ProductRecipesSection({
  isEditMode,
  selectedSkuIsDraft,
  isCreateLocked,
  recipeFailures,
  nonPersistedDrafts,
  saving,
  onRetryPending,
  draftLabelForId,
  selectedSkuId,
  onSelectSku,
  recipeSkuOptions,
  units,
  primaVariants,
  recipe,
  onChangeRecipe,
  loading,
  savingRecipe,
  primaryColor,
  tableId,
  onDeleteRecipeItem,
}: {
  isEditMode?: boolean;
  selectedSkuIsDraft?: boolean;
  isCreateLocked: boolean;
  recipeFailures: string[];
  nonPersistedDrafts: string[];
  saving: boolean;
  onRetryPending: () => void;
  draftLabelForId: (draftId: string) => string;
  selectedSkuId: string;
  onSelectSku: (skuId: string) => void;
  recipeSkuOptions: SelectOption[];
  units?: ListUnitResponse;
  primaVariants: PrimaVariant[];
  recipe: RecipeDraft;
  onChangeRecipe: (next: RecipeDraft) => void;
  loading?: boolean;
  savingRecipe?: boolean;
  primaryColor: string;
  tableId: string;
  onDeleteRecipeItem?: (itemId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl bg-white/80 px-1 py-1">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-black/70">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-black">Recetas</h3>
            <p className="text-sm text-black/60">Configura el rendimiento y los componentes necesarios por SKU.</p>
          </div>
        </div>

        <div className="space-y-4">
          {isEditMode && selectedSkuIsDraft ? (
            <PendingNotice>
              Este SKU es nuevo y a&uacute;n no est&aacute; creado. Se crear&aacute; (junto con su receta) cuando guardes el producto.
            </PendingNotice>
          ) : null}

          {isCreateLocked && (recipeFailures.length > 0 || nonPersistedDrafts.length > 0) ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="space-y-2">
                {recipeFailures.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>Hay {recipeFailures.length} receta(s) pendiente(s) de reintento.</span>
                    <SystemButton
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={onRetryPending}
                      disabled={saving}
                    >
                      Reintentar recetas
                    </SystemButton>
                  </div>
                ) : null}
                {nonPersistedDrafts.length > 0 ? (
                  <p>
                    Los siguientes drafts no tienen SKU persistido aun:{" "}
                    {nonPersistedDrafts.map((draftId) => draftLabelForId(draftId)).join(", ")}.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <RecipeFormFields
            units={units}
            primaVariants={primaVariants}
            recipe={recipe}
            onChange={onChangeRecipe}
            loading={loading}
            saving={savingRecipe}
            primaryColor={primaryColor}
            tableId={tableId}
            onDeleteItem={onDeleteRecipeItem}
            selectedSkuId={selectedSkuId}
            recipeSkuOptions={recipeSkuOptions}
            onSelectSku={onSelectSku}
          />
        </div>
      </section>
    </div>
  );
}
