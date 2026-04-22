import type {
  CreateBaseProductDto,
  CreateProductSkuDto,
  ProductCreateForm,
  ProductSkuWithAttributes,
} from "@/pages/catalog/types/product";
import type { CreateSkuRecipeDto } from "@/pages/catalog/types/productRecipe";
import type { ProductSkuDraft } from "../components/ProductSkuTable";
import type { RecipeDraft } from "../components/RecipeFormFields";

export const DEFAULT_PRIMARY = "hsl(var(--primary))";

export const createEmptyProductForm = (): ProductCreateForm => ({
  name: "",
  description: "",
  brand: "",
  baseUnitId: "",
  isActive: true,
  wantsVariants: "no",
});

export const buildRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sku-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createDefaultSkuRow = (): ProductSkuDraft => ({
  id: buildRowId(),
  name: "",
  customSku: "",
  barcode: "",
  price: "",
  cost: "",
  presentation: "",
  variant: "",
  color: "",
  isActive: true,
  autoFillName: true,
});

export const createEmptySkuRow = (): ProductSkuDraft => ({
  ...createDefaultSkuRow(),
  autoFillName: false,
});

export const buildSkuLabel = ({
  row,
  index,
  fallbackName,
}: {
  row: ProductSkuDraft;
  index: number;
  fallbackName: string;
}) => {
  const baseName = row.name || fallbackName.trim() || `SKU ${index + 1}`;
  const attributes = [row.presentation, row.variant, row.color]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const skuCode = row.customSku.trim()
    ? `(${row.customSku.trim()})`
    : row.barcode.trim()
      ? `- ${row.barcode.trim()}`
      : "";
  return `${baseName} ${attributes} ${skuCode}`.trim();
};

export const buildSkuLabelFromItem = ({
  skuItem,
  fallbackName
}: {
  skuItem: ProductSkuWithAttributes;
  fallbackName:string
}) => {
  const baseName = skuItem.sku.name.trim()?? fallbackName;
  const attrMap = new Map(skuItem.attributes.map((attr) => [attr.code, attr.value]));
  const attributes = [
    attrMap.get("presentation"),
    attrMap.get("variant"),
    attrMap.get("color"),
  ]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const skuCode = skuItem.sku.customSku
    ? `(${skuItem.sku.customSku})`
    : skuItem.sku.backendSku
      ? `- ${skuItem.sku.backendSku}`
      : "";
  return `${baseName} ${attributes} ${skuCode}`.trim();
};

export const buildDraftSkuLabel = ({
  skuRows,
  draftId,
  fallbackName,
}: {
  skuRows: ProductSkuDraft[];
  draftId: string;
  fallbackName: string;
}) => {
  const index = skuRows.findIndex((row) => row.id === draftId);
  if (index < 0) return draftId;
  return buildSkuLabel({
    row: skuRows[index],
    index,
    fallbackName,
  });
};

export const formatFailedSkuLabels = ({
  skuRows,
  skuIds,
  fallbackName,
}: {
  skuRows: ProductSkuDraft[];
  skuIds: string[];
  fallbackName: string;
}) =>
  skuIds
    .map((skuId) =>
      buildDraftSkuLabel({
        skuRows,
        draftId: skuId,
        fallbackName,
      }),
    )
    .join(", ");

export const buildCreateSkuPayloads = ({
  skuRows,
  isMaterial,
  fallbackName,
}: {
  skuRows: ProductSkuDraft[];
  isMaterial: boolean;
  fallbackName: string;
}) => {
  const defaultFlags = isMaterial
    ? {
        isSellable: false,
        isPurchasable: true,
        isManufacturable: false,
        isStockTracked: true,
      }
    : {
        isSellable: true,
        isPurchasable: false,
        isManufacturable: true,
        isStockTracked: true,
      };

  const rowsToPersist = skuRows.filter((row, index) => {
    if (index === 0) return true;
    return Boolean(
      row.name.trim() ||
        row.customSku.trim() ||
        row.barcode.trim() ||
        row.price.trim() ||
        row.cost.trim() ||
        row.presentation.trim() ||
        row.variant.trim() ||
        row.color.trim(),
    );
  });

  return rowsToPersist.map((row) => ({
    draftId: row.id,
    row,
    payload: {
      name: row.name.trim() || fallbackName.trim(),
      customSku: row.customSku.trim() || undefined,
      barcode: row.barcode.trim() || undefined,
      price: row.price.trim() ? Number(row.price) : undefined,
      cost: row.cost.trim() ? Number(row.cost) : undefined,
      isActive: row.isActive,
      ...defaultFlags,
      attributes: [
        row.presentation.trim()
          ? { code: "presentation", name: "Presentacion", value: row.presentation.trim() }
          : null,
        row.variant.trim()
          ? { code: "variant", name: "Variante", value: row.variant.trim() }
          : null,
        row.color.trim()
          ? { code: "color", name: "Color", value: row.color.trim() }
          : null,
      ].filter(Boolean) as CreateProductSkuDto["attributes"],
    },
  }));
};

export const buildRecipePayload = (draftRecipe: RecipeDraft): CreateSkuRecipeDto => ({
  yieldQuantity: Number(draftRecipe.yieldQuantity) || 1,
  notes: draftRecipe.notes.trim() || undefined,
  items: draftRecipe.items
    .map((item) => ({
      materialSkuId: item.materialSkuId,
      quantity: Number(item.quantity) || 0,
      unitId: item.unitId,
    }))
    .filter((item) => item.materialSkuId && item.unitId && item.quantity > 0),
});

export const buildCreateProductPayload = ({
  form,
  productType,
}: {
  form: ProductCreateForm;
  productType: CreateBaseProductDto["type"];
}): CreateBaseProductDto => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
  type: productType,
  brand: form.brand.trim() || null,
  baseUnitId: form.baseUnitId || undefined,
  isActive: form.isActive,
});
