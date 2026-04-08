import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, PackageCheck, Scale, FlaskConical, Save, Plus, Pencil, Power } from "lucide-react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { createProduct, getById, updateProduct, updateProductActive } from "@/services/productService";
import { listUnits } from "@/services/unitService";
import { listProductEquivalences } from "@/services/equivalenceService";
import { listProductRecipes } from "@/services/productRecipeService";
import {
  createVariant,
  getVariantById,
  getVariantByIdp,
  listRowMaterials,
  updateVariant,
  updateVariantActive,
} from "@/services/catalogService";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { ProductForm } from "@/pages/catalog/types/product";
import type { ProductEquivalence } from "@/pages/catalog/types/equivalence";
import type { ProductRecipe } from "@/pages/catalog/types/productRecipe";
import type { PrimaVariant, ProductOption, Variant, VariantForm, VariantRow } from "@/pages/catalog/types/variant";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { FloatingSelect } from "@/components/FloatingSelect";
import { EquivalenceFormFields } from "./EquivalenceFormField";
import { RecipeFormFields } from "./RecipeFormFields";
import { ProductFormFields } from "./ProductFormField";
import { VariantFormFields } from "./VariantFormFields";
import { money, parseDecimalInput } from "@/utils/functionPurchases";
import { Modal } from "@/components/modales/Modal";

type ProductFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  productId?: string | null;
  initialWorkspaceTab?: WorkspaceTab;
  initialVariantId?: string | null;
  productType: ProductType;
  units?: ListUnitResponse;
  primaryColor?: string;
  entityLabel?: string;
  onClose: () => void;
  onSaved?: () => void;

};

type WorkspaceTab = "details" | "equivalences" | "recipes" | "variantCreated";

const DEFAULT_FORM: ProductForm = {
  name: "",
  description: "",
  isActive: true,
  barcode: "",
  customSku: "",
  price: "",
  cost: "",
  attribute: {},
  baseUnitId: "",
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function ProductFormModal({
  open,
  mode,
  productId,
  initialWorkspaceTab,
  initialVariantId,
  productType,
  units,
  primaryColor = DEFAULT_PRIMARY,
  entityLabel,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localUnits, setLocalUnits] = useState<ListUnitResponse>();
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("details");
  const [workingProductId, setWorkingProductId] = useState<string | null>(null);
  const [workingProductName, setWorkingProductName] = useState("");
  const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
  const [loadingEquivalences, setLoadingEquivalences] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [primaVariants, setPrimaVariants] = useState<PrimaVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalMode, setVariantModalMode] = useState<"create" | "edit">("create");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [togglingVariantId, setTogglingVariantId] = useState<string | null>(null);
  const [nextVariantActiveState, setNextVariantActiveState] = useState(false);
  const [variantToggleSaving, setVariantToggleSaving] = useState(false);
  const [variantSaving, setVariantSaving] = useState(false);
  const [pendingVariantEditId, setPendingVariantEditId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>({
    productId: "",
    barcode: "",
    price: "",
    cost: "",
    attributes: {},
    isActive: true,
    customSku: "",
  });

  const label = entityLabel ?? (productType === ProductTypes.PRIMA ? "materia prima" : "producto");
  const isMateriaPrima = productType === ProductTypes.PRIMA || label === "materia prima";

  const effectiveUnits = units ?? localUnits;
  const canManageExtras = Boolean(workingProductId);
  const canSave = form.name.trim().length > 0;

  const formatAmount = (value?: number) => (Number.isFinite(value) ? Number(value).toFixed(2) : "0.00");

 
  const variantRows = useMemo<VariantRow[]>(
    () =>
      (variants ?? []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        presentation: variant.attributes?.presentation ?? "-",
        variant: variant.attributes?.variant ?? "-",
        color: variant.attributes?.color ?? "-",
        unit:
          variant.unitName && variant.unitCode
            ? `${variant.unitName} (${variant.unitCode})`
            : variant.baseUnitId || "-",
        price: formatAmount(variant.price),
        cost: formatAmount(variant.cost),
        status: variant.isActive ? "Activo" : "Inactivo",
        isActive: variant.isActive,
        customSku:variant.customSku,
      })),
    [variants],
  );

  const variantOptions = useMemo(
    () =>
      (variants ?? []).map((variant) => ({
        value: variant.id,
        label: `${form.name ?? ""} ${variant.attributes?.presentation ?? ""} ${variant.attributes?.variant ?? ""} 
        ${variant.attributes?.color ?? ""}${variant.sku ? ` - ${variant.sku}`:""} ${variant.customSku ? 
          `(${variant.customSku})`: ""}`,
      })),
    [variants],
  );

  const recipeTargetOptions = useMemo(() => {
    if (!workingProductId) return variantOptions;
    const name = (workingProductName || form.name || "Producto").trim();
    return [{ value: workingProductId, label: `${name} ${form.attribute.presentation??""}
      ${form.attribute.variant??""} ${form.attribute.color??""}  
      ${form.sku ? ` - ${form.sku}`:""} ${form.customSku ? 
      `(${form.customSku})`: ""}` }, ...variantOptions];
  }, [workingProductId, workingProductName, form.name, variantOptions]);

  const variantProductOptions = useMemo<ProductOption[]>(() => {
    if (!workingProductId) return [];
    const name = `${form.name} ${form.attribute?.presentation??""} 
    ${form.attribute?.variant??""}
    ${form.attribute?.color??""} ${form.sku ?`-${form.sku}`:""}
    ${form.customSku ? `(${form.customSku})`: ""}`;
    return [{ productId: workingProductId, name }];
  }, [workingProductId, workingProductName, form.name]);

  const loadUnitsData = async () => {
    if (units || localUnits || loadingUnits) return;

    setLoadingUnits(true);
    try {
      const res = await listUnits();
      setLocalUnits(res);
    } catch {
      showFlash(errorResponse("Error al cargar unidades"));
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadEquivalences = async (nextProductId: string) => {
    setLoadingEquivalences(true);
    try {
      const res = await listProductEquivalences({ productId: nextProductId });
      setEquivalences(res ?? []);
    } catch {
      setEquivalences([]);
      showFlash(errorResponse("Error al cargar equivalencias"));
    } finally {
      setLoadingEquivalences(false);
    }
  };

  const loadVariants = async (nextProductId: string) => {
    try {
      const res = await getVariantByIdp(nextProductId);
      const nextVariants = res ?? [];
      setVariants(nextVariants);

      const nextIds = nextVariants.map((variant) => variant.id);
      setSelectedVariantId((prev) =>
        prev && (prev === nextProductId || nextIds.includes(prev))
          ? prev
          : nextIds[0] ?? nextProductId ?? "",
      );
    } catch {
      setVariants([]);
      setSelectedVariantId("");
    }
  };

  const loadPrimaVariants = async () => {
    try {
      const result = await listRowMaterials();
      const normalized = (result ?? [])
        .map((row) => ({
          ...row,
          id: row.id ?? row.primaId ?? row.itemId,
          isActive: row.isActive ?? true,
        }))
        .filter((row) => row.id);

      setPrimaVariants(normalized);
    } catch {
      setPrimaVariants([]);
      showFlash(errorResponse("Error al cargar variantes PRIMA"));
    }
  };

  const loadRecipes = async (variantId: string) => {
    if (!variantId) {
      setRecipes([]);
      return;
    }

    setLoadingRecipes(true);
    try {
      const finishedType = variantId === workingProductId ? "PRODUCT" : "VARIANT";
      const res = await listProductRecipes({ finishedType, finishedItemId: variantId });
      setRecipes(res ?? []);
    } catch {
      setRecipes([]);
      showFlash(errorResponse("Error al cargar recetas"));
    } finally {
      setLoadingRecipes(false);
    }
  };

  const resetVariantForm = () => {
    setVariantForm({
      productId: workingProductId ?? "",
      barcode: "",
      price: "",
      cost: "",
      attributes: {},
      isActive: true,
      customSku: "",
    });
  };

  const openVariantModal = () => {
    setVariantModalMode("create");
    setEditingVariantId(null);
    resetVariantForm();
    setVariantModalOpen(true);
  };

  const closeVariantModal = () => {
    setVariantModalOpen(false);
    setVariantModalMode("create");
    setEditingVariantId(null);
  };

  const openEditVariant = useCallback(async (variantId: string) => {
    clearFlash();
    try {
      const variant = await getVariantById(variantId);
      setVariantForm({
        productId: variant.productId ?? workingProductId ?? "",
        barcode: variant.barcode ?? "",
        price: String(variant.price ?? ""),
        cost: String(variant.cost ?? ""),
        attributes: {
          presentation: variant.attributes?.presentation,
          variant: variant.attributes?.variant,
          color: variant.attributes?.color,
        },
        isActive: variant.isActive ?? true,
        customSku: variant.customSku,
      });
      setEditingVariantId(variantId);
      setVariantModalMode("edit");
      setVariantModalOpen(true);
    } catch {
      showFlash(errorResponse("No se pudo cargar la variante"));
    }
  }, [clearFlash, showFlash, workingProductId]);

  const variantColumns = useMemo<DataTableColumn<VariantRow>[]>(
    () => [
      { id: "sku", 
        header: "SKU PERSONALIZADO", 
        cell: (row) => <span className="line-clamp-2 text-black/70">{row.customSku || "-"}</span>,
        className: "text-black/70", 
        hideable: false, 
        sortable: false, 
      },
      {
        id: "presentation",
        header: "Presentación",
        cell: (row) => <span className="line-clamp-2 text-black/70">{row.presentation || "-"}</span>,
        className: "text-black/70",
        hideable: false,
        sortable: false,
      },
      { id: "variant", header: "Variante",
        cell: (row) => <span className="line-clamp-2 text-black/70">{row.variant || "-"}</span>,
        className: "text-black/70", hideable: false, sortable: false, },
      { id: "color", header: "Color",
        cell: (row) => <span className="line-clamp-2 text-black/70">{row.color || "-"}</span>,
        className: "text-black/70", hideable: false, sortable: false, },
      { id: "price", header: "Precio",
        cell: (row) => <span className="line-clamp-2 text-black/70">{money(Number(row.price), "PEN" ) || "-"}</span>,
        className: "text-black/70", hideable: false, sortable: false, },
      { id: "cost", header: "Costo",
        cell: (row) => <span className="line-clamp-2 text-black/70">{money(Number(row.cost), "PEN" )|| "-"}</span>,
        className: "text-black/70", hideable: false, sortable: false, },
      { id: "status", header: "Estado",
        cell: (row) => <span className="line-clamp-2 text-black/70">{row.status || "-"}</span>,
        className: "text-black/70", hideable: false, sortable: false, },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <SystemButton
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(event) => {
                event.stopPropagation();
                void openEditVariant(row.id);
              }}
              title="Editar variante"
            >
              <Pencil className="h-4 w-4" />
            </SystemButton>
            <SystemButton
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${row.isActive ? "text-rose-600 hover:bg-rose-50" : "text-teal-600 hover:bg-teal-50"}`}
              onClick={(event) => {
                event.stopPropagation();
                setTogglingVariantId(row.id);
                setNextVariantActiveState(!row.isActive);
              }}
              title={row.isActive ? "Eliminar variante" : "Restaurar variante"}
            >
              <Power className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        headerClassName: "text-right w-[64px]",
        className: "text-right",
        hideable: false,
        sortable: false,
      },
    ],
    [openEditVariant],
  );

  const saveVariant = async () => {
    if (!variantForm.productId || variantSaving) return;

    clearFlash();
    setVariantSaving(true);
    try {
      if (variantModalMode === "edit" && editingVariantId) {
        await updateVariant(editingVariantId, {
          barcode: variantForm.barcode.trim() || null,
          attributes: variantForm.attributes,
          price: parseDecimalInput(variantForm.price) || 0,
          cost: parseDecimalInput(variantForm.cost) || 0,
          customSku: variantForm.customSku
        });
        closeVariantModal();
        await loadVariants(variantForm.productId);
        showFlash(successResponse("Variante actualizada"));
      } else {
        await createVariant({
          productId: variantForm.productId,
          barcode: variantForm.barcode.trim() || undefined,
          attributes: variantForm.attributes,
          price: parseDecimalInput(variantForm.price) || 0,
          cost: parseDecimalInput(variantForm.cost) || 0,
          isActive: variantForm.isActive,
          customSku: variantForm.customSku
        });
        closeVariantModal();
        await loadVariants(variantForm.productId);
        showFlash(successResponse("Variante creada"));
      }
    } catch {
      showFlash(
        errorResponse(
          variantModalMode === "edit" ? "Error al actualizar variante" : "Error al crear variante",
        ),
      );
    } finally {
      setVariantSaving(false);
    }
  };

  const confirmToggleVariant = async () => {
    if (!togglingVariantId) return;
    clearFlash();
    setVariantToggleSaving(true);
    try {
      await updateVariantActive(togglingVariantId, { isActive: nextVariantActiveState });
      setTogglingVariantId(null);
      if (workingProductId) {
        await loadVariants(workingProductId);
      }
      showFlash(
        successResponse(nextVariantActiveState ? "Variante restaurada" : "Variante eliminada"),
      );
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    } finally {
      setVariantToggleSaving(false);
    }
  };

  const resetWorkspace = () => {
    setWorkspaceTab(initialWorkspaceTab ?? "details");
    setWorkingProductId(null);
    setWorkingProductName("");
    setEquivalences([]);
    setVariants([]);
    setSelectedVariantId("");
    setRecipes([]);
    setPendingVariantEditId(initialVariantId ?? null);
  };

  useEffect(() => {
    if (!open) return;

    void loadUnitsData();
    resetWorkspace();

    if (mode === "create") {
      setForm(DEFAULT_FORM);
      return;
    }

    if (!productId) {
      setForm(DEFAULT_FORM);
      return;
    }

    clearFlash();
    setLoading(true);

    getById(productId)
      .then(async (product) => {
        setWorkingProductId(product.id);
        setWorkingProductName(product.name ?? "");

        setForm({
          name: product.name ?? "",
          description: product.description ?? "",
          isActive: product.isActive ?? true,
          barcode: product.barcode ?? "",
          customSku: product.customSku ?? "",
          sku: product.sku ?? "",
          price: product.price ? String(product.price) : "",
          cost: product.cost ? String(product.cost) : "",
          attribute: {
            presentation: product.attributes?.presentation,
            color: product.attributes?.color,
            variant: product.attributes?.variant,
          },
          baseUnitId: product.baseUnitId ?? "",
        });

        const tasks = [loadEquivalences(product.id), loadVariants(product.id)];

        if (!isMateriaPrima) tasks.push(loadPrimaVariants());
        await Promise.all(tasks);
      })
      .catch(() => {
        showFlash(errorResponse(`No se pudo cargar ${label}`));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, mode, productId, label, initialWorkspaceTab, initialVariantId]);

  useEffect(() => {
    if (!open || !pendingVariantEditId || !workingProductId) return;
    if (!variants.some((variant) => variant.id === pendingVariantEditId)) return;

    setWorkspaceTab("variantCreated");
    void openEditVariant(pendingVariantEditId);
    setPendingVariantEditId(null);
  }, [open, pendingVariantEditId, workingProductId, variants, openEditVariant]);

  useEffect(() => {
    if (!open) return;
    if (!selectedVariantId) {
      setRecipes([]);
      return;
    }
    void loadRecipes(selectedVariantId);
  }, [selectedVariantId, open]);

  const onUpdate = async () => {
    if (!workingProductId) return;

    await updateProduct(workingProductId, {
      name: form.name.trim() || undefined,
      description: form.description.trim() || null,
      barcode: form.barcode.trim() || null,
      customSku: form.customSku?.trim() || null,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      baseUnitId: form.baseUnitId,
      attributes: form.attribute,
    });

    await updateProductActive(workingProductId, { isActive: form.isActive });
    showFlash(successResponse(`${label} actualizado`));
    await onSaved?.();
    onClose();
  };

  const onSave = async () => {
    const created = await createProduct({
      type: productType,
      name: form.name.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
      barcode: form.barcode.trim() || null,
      customSku: form.customSku?.trim() || null,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      baseUnitId: form.baseUnitId,
      attributes: form.attribute,
    });

    const createdId = created?.id ?? null;
    const createdName = created?.name ?? form.name.trim();
    
    
    showFlash(successResponse(`${label} creado`));
    await onSaved?.();
    
    if (createdId) {
      setWorkingProductId(createdId);
      setWorkingProductName(createdName);
      setWorkspaceTab("equivalences");
      const tasks = [loadEquivalences(createdId), loadVariants(createdId)];

      if (!isMateriaPrima) tasks.push(loadPrimaVariants());
      await Promise.all(tasks);
    } else {
      onClose();
    }
  };

  const saveProduct = async () => {
    if (!canSave || saving) return;

    clearFlash();
    setSaving(true);
    try {
      if (workingProductId) {
        await onUpdate();
      } else {
        await onSave();
      }
    } catch {
      showFlash(
        errorResponse(
          mode === "edit" ? `Error al actualizar ${label}` : `Error al crear ${label}`,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const tabs = [
    { id: "details" as WorkspaceTab, label: "Producto", icon: PackageCheck, disabled: false },
    { id: "equivalences" as WorkspaceTab, label: "Equivalencias", icon: Scale, disabled: !canManageExtras },
    { id: "variantCreated" as WorkspaceTab, label: "Variantes", icon: Plus, disabled: !canManageExtras  },
    ...(!isMateriaPrima
      ? [{ id: "recipes" as WorkspaceTab, label: "Recetas", icon: FlaskConical, disabled: !canManageExtras }]
      : []),
  ];

  return (
    <Modal
      title={mode === "edit" ? `Editar ${label}` : `Nuevo ${label}`}
      onClose={onClose}
      open={open}
      className="w-[800px] max-h-[600px]"
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
                  disabled={tab.disabled}
                  onClick={() => {
                    setWorkspaceTab(tab.id)
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    active
                      ? "text-white"
                      : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]"
                  } disabled:cursor-not-allowed disabled:opacity-45`}
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

          {!canManageExtras && workspaceTab !== "details" && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Primero guarda el producto para habilitar equivalencias y recetas.
            </div>
          )}
        </div>

        {loading || loadingUnits ? (
          <div className="rounded-2xl border border-black/10 bg-white px-4 py-8 text-sm text-black/60">
            Cargando...
          </div>
        ) : (
          <>
            {workspaceTab === "details" && (
              <ProductFormFields
                form={form}
                setForm={setForm}
                units={effectiveUnits}
                primaBoolean={productType === ProductTypes.PRIMA}
              />
            )}

            {workspaceTab === "equivalences" && canManageExtras && workingProductId && (
              <EquivalenceFormFields
                productId={workingProductId}
                baseUnitId={form.baseUnitId}
                units={effectiveUnits}
                equivalences={equivalences}
                loading={loadingEquivalences}
                onCreated={async () => {
                  await loadEquivalences(workingProductId);
                }}
                PRIMARY={primaryColor}
              />
            )}

            {workspaceTab === "recipes" && !isMateriaPrima && canManageExtras && workingProductId && (
              <div className="space-y-4 ">
                <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5
                  space-y-4">
                  <SectionHeaderForm icon={Boxes} title="Seleccione Producto o sus variantes" />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <FloatingSelect
                      label="Producto o variante"
                      name="selectedVariant"
                      value={selectedVariantId}
                      onChange={(value) => setSelectedVariantId(value)}
                      options={recipeTargetOptions}
                      searchable
                      searchPlaceholder="Buscar producto o variante..."
                      emptyMessage="Sin productos o variantes"
                    />
                    <SystemButton
                      variant="outline"
                      className="h-10 whitespace-nowrap"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={openVariantModal}
                    >
                      Nueva variante
                    </SystemButton>
                  </div>

                  <hr className="my-6" />

                  {!selectedVariantId ? (
                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-8 text-sm text-black/60">
                    Primero crea o selecciona un producto o variante para gestionar recetas.
                  </div>
                   ) : (
                    (() => {
                      const selectedRecipeType =
                        selectedVariantId === workingProductId ? "PRODUCT" : "VARIANT";

                      return (

                      <RecipeFormFields
                        finishedType={selectedRecipeType}
                        finishedItemId={selectedVariantId}
                        units={effectiveUnits}
                        primaVariants={primaVariants}
                        recipes={recipes}
                        loading={loadingRecipes}
                        onCreated={async () => {
                          await loadRecipes(selectedVariantId);
                        }}
                      />
                      );
                    })()
                  )}
                </div>
              </div>
            )}

          </>
        )}
        {workspaceTab === "variantCreated" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <SectionHeaderForm
                icon={Boxes}
                title={`Variantes del producto: ${form.name}
                ${form.attribute.presentation ?? ""}
                ${form.attribute.variant ?? ""}
                ${form.attribute.color??""}${form.sku ?`- ${form.sku}` : ""} 
                ${form.customSku ? `(${form.customSku})` : ""}`}
              />
              <SystemButton
                variant="outline"
                className="h-10 whitespace-nowrap"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openVariantModal}
              >
                Nueva variante
              </SystemButton>
            </div>

            <div className="rounded-2xl border border-black/10 overflow-hidden">
              <DataTable
                tableId={`variants-list-${workingProductId ?? "temp"}`}
                data={variantRows}
                columns={variantColumns}
                rowKey="id"
                loading={false}
                emptyMessage="No hay variantes registradas."
                hoverable={false}
                animated={false}
                className="max-h-56 overflow-y-auto 
                text-xs [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none"
                tableClassName="text-xs"
              />
            </div>
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
            onClick={saveProduct}
            disabled={!canSave || saving || loading}
          >
            {saving
              ? "Guardando..."
              : mode === "edit"
                ? "Guardar cambios"
                : canManageExtras
                  ? "Actualizar producto"
                  : "Guardar producto"}
          </SystemButton>
        </div>
      </div>
      <Modal
        open={variantModalOpen}
        title={variantModalMode === "edit" ? "Editar variante" : "Nueva variante"}
        onClose={closeVariantModal}
        className="max-w-lg"
      >
        <VariantFormFields form={variantForm} setForm={setVariantForm} 
        products={variantProductOptions} lockProduct />
        <div className="mt-4 flex justify-end gap-2">
          <SystemButton variant="outline" onClick={closeVariantModal}>
            Cancelar
          </SystemButton>
          <SystemButton
            leftIcon={<Save className="h-4 w-4" />}
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
            onClick={() => void saveVariant()}
            disabled={!variantForm.productId || variantSaving}
            loading={variantSaving}
          >
            {variantModalMode === "edit" ? "Guardar cambios" : "Guardar"}
          </SystemButton>
        </div>
      </Modal>
      <Modal
        open={togglingVariantId ? true : false}
        title={nextVariantActiveState ? "Restaurar variante" : "Eliminar variante"}
        onClose={() => setTogglingVariantId(null)}
        className="max-w-md"
        >
          <div className="space-y-4">
            <div
              className={`rounded-lg border px-3 py-2 ${
                nextVariantActiveState ? "border-teal-200 bg-teal-50" : "border-rose-200 bg-rose-50"
              }`}
            >
              <p
                className={`text-sm ${
                  nextVariantActiveState ? "text-teal-800" : "text-rose-800"
                }`}
              >
                {nextVariantActiveState
                  ? "Se activará la variante nuevamente."
                  : "Se eliminará la variante seleccionada."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <SystemButton variant="outline" onClick={() => setTogglingVariantId(null)}>
                Cancelar
              </SystemButton>
              <SystemButton
                variant={nextVariantActiveState ? "primary" : "danger"}
                onClick={() => void confirmToggleVariant()}
                loading={variantToggleSaving}
              >
                Confirmar
              </SystemButton>
            </div>
          </div>
        </Modal>
    </Modal>
  );
}









