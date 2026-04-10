import { useEffect, useMemo, useState } from "react";
import { FlaskConical, PackageCheck, Save, Scale } from "lucide-react";
import { Modal } from "@/components/modales/Modal";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listUnits } from "@/services/unitService";
import { createBaseProduct, createProductSku } from "@/services/productService";
import { ProductTypes, type ProductType } from "@/pages/catalog/types/ProductTypes";
import type { CreateBaseProductDto, CreateProductSkuDto } from "@/pages/catalog/types/product";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";
import { ProductSkuTable, type ProductSkuDraft } from "./ProductSkuTable";

type ProductCreateModalProps = {
  open: boolean;
  productType: ProductType;
  primaryColor?: string;
  entityLabel?: string;
  onClose: () => void;
  onSaved?: () => void;
};

type WorkspaceTab = "details" | "equivalences" | "recipes";

type ProductCreateForm = {
  name: string;
  description: string;
  brand: string;
  baseUnitId: string;
  isActive: boolean;
  wantsVariants: "no" | "yes";
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

const buildRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sku-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDefaultSkuRow = (): ProductSkuDraft => ({
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

const createEmptySkuRow = (): ProductSkuDraft => ({
  ...createDefaultSkuRow(),
  autoFillName: false,
});

export function ProductCreateModal({
  open,
  productType,
  primaryColor = DEFAULT_PRIMARY,
  entityLabel,
  onClose,
  onSaved,
}: ProductCreateModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("details");
  const [units, setUnits] = useState<ListUnitResponse>();
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductCreateForm>({
    name: "",
    description: "",
    brand: "",
    baseUnitId: "",
    isActive: true,
    wantsVariants: "no",
  });
  const [skuRows, setSkuRows] = useState<ProductSkuDraft[]>([createDefaultSkuRow()]);

  const label = entityLabel ?? (productType === ProductTypes.MATERIAL ? "materia prima" : "producto");
  const isMaterial = productType === ProductTypes.MATERIAL;

  useEffect(() => {
    if (!open) return;
    setWorkspaceTab("details");
    setForm({
      name: "",
      description: "",
      brand: "",
      baseUnitId: "",
      isActive: true,
      wantsVariants: "no",
    });
    setSkuRows([createDefaultSkuRow()]);
  }, [open]);

  useEffect(() => {
    if (!open || units || loadingUnits) return;
    setLoadingUnits(true);
    listUnits()
      .then((response) => setUnits(response))
      .catch(() => {
        showFlash(errorResponse("Error al cargar unidades"));
      })
      .finally(() => setLoadingUnits(false));
  }, [open, units, loadingUnits, showFlash]);

  useEffect(() => {
    setSkuRows((prev) =>
      prev.map((row, index) =>
        index === 0 && row.autoFillName
          ? {
              ...row,
              name: form.name,
            }
          : row,
      ),
    );
  }, [form.name]);

  useEffect(() => {
    if (form.wantsVariants === "yes") return;
    setSkuRows((prev) => {
      const firstRow = prev[0] ?? createDefaultSkuRow();
      return [
        {
          ...firstRow,
          name: firstRow.autoFillName ? form.name : firstRow.name,
        },
      ];
    });
  }, [form.wantsVariants, form.name]);

  const unitOptions = useMemo(
    () =>
      (units ?? []).map((unit) => ({
        value: unit.id,
        label: `${unit.name} (${unit.code})`,
      })),
    [units],
  );

  const canSave = form.name.trim().length > 0 && !loadingUnits;

  const tabs = [
    { id: "details" as WorkspaceTab, label: "Producto", icon: PackageCheck },
    { id: "equivalences" as WorkspaceTab, label: "Equivalencias", icon: Scale },
    { id: "recipes" as WorkspaceTab, label: "Recetas", icon: FlaskConical },
  ];

  const addSkuRow = () => {
    setSkuRows((prev) => [...prev, createEmptySkuRow()]);
  };

  const removeSkuRow = (id: string) => {
    setSkuRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const updateSkuRow = (id: string, field: keyof ProductSkuDraft, value: string | boolean) => {
    setSkuRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              autoFillName: field === "name" ? false : row.autoFillName,
            }
          : row,
      ),
    );
  };

  const normalizeSkuPayloads = (): CreateProductSkuDto[] => {
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
      name: row.name.trim() || form.name.trim(),
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
    }));
  };

  const saveProductAndSkus = async () => {
    if (!canSave || saving) return;
    clearFlash();
    setSaving(true);
    try {
      const productPayload: CreateBaseProductDto = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: productType,
        brand: form.brand.trim() || null,
        baseUnitId: form.baseUnitId || undefined,
        isActive: form.isActive,
      };

      const createdProduct = await createBaseProduct(productPayload);
      const skuPayloads = normalizeSkuPayloads();

      for (const skuPayload of skuPayloads) {
        await createProductSku(createdProduct.id, skuPayload);
      }

      showFlash(successResponse(`${label} y SKUs creados`));
      await onSaved?.();
      onClose();
    } catch {
      showFlash(errorResponse(`Error al crear ${label} y sus SKUs`));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      title={`Nuevo ${label}`}
      onClose={onClose}
      open={open}
      className="w-[1180px] max-w-[96vw] max-h-[90vh]"
    >
      <div className="space-y-4 scroll-area">
        <div className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = workspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWorkspaceTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    active ? "text-white" : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: primaryColor,
                          borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {workspaceTab === "details" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[220px] flex-1">
                  <FloatingInput
                    label="Nombre"
                    name="product-name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="min-w-[220px] flex-1">
                  <FloatingInput
                    label="Descripcion"
                    name="product-description"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div className="min-w-[220px] flex-1">
                  <FloatingInput
                    label="Marca"
                    name="product-brand"
                    value={form.brand}
                    onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
                  />
                </div>
                <div className="min-w-[220px] flex-1">
                  <FloatingSelect
                    label="Unidad base"
                    name="product-baseUnit"
                    value={form.baseUnitId}
                    onChange={(value) => setForm((prev) => ({ ...prev, baseUnitId: value }))}
                    options={unitOptions}
                    placeholder="Seleccionar unidad"
                    searchable
                    searchPlaceholder="Buscar unidad..."
                    emptyMessage="Sin unidades"
                  />
                </div>
                <div className="flex min-w-[180px] items-center rounded-lg border border-black/10 px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm text-black/70">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    Activo
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-black">¿Quieres crear variantes?</span>
                <label className="inline-flex items-center gap-2 text-sm text-black/70">
                  <input
                    type="radio"
                    name="wantsVariants"
                    checked={form.wantsVariants === "no"}
                    onChange={() => setForm((prev) => ({ ...prev, wantsVariants: "no" }))}
                  />
                  No
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-black/70">
                  <input
                    type="radio"
                    name="wantsVariants"
                    checked={form.wantsVariants === "yes"}
                    onChange={() => setForm((prev) => ({ ...prev, wantsVariants: "yes" }))}
                  />
                  Si
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
              <ProductSkuTable
                rows={skuRows}
                canAddRows={form.wantsVariants === "yes"}
                onAddRow={addSkuRow}
                onRemoveRow={removeSkuRow}
                onChangeRow={updateSkuRow}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white px-4 py-8 text-sm text-black/60">
            Esta seccion queda visible para revision. Por ahora no entra en el guardado del nuevo flujo.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <SystemButton variant="ghost" className="bg-gray-200" onClick={onClose}>
            Cancelar
          </SystemButton>
          <SystemButton
            leftIcon={<Save className="h-4 w-4" />}
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
            onClick={saveProductAndSkus}
            disabled={!canSave || saving}
          >
            {saving ? "Guardando..." : "Guardar producto y SKUs"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
