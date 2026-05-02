import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, PackageCheck, Save, Scale } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { getApiErrorMessage } from "@/shared/common/utils/apiError";
import { listUnits } from "@/shared/services/unitService";
import { createBaseProduct, createProductSku, getCatalogProductById, updateProduct, updateProductSku } from "@/shared/services/productService";
import { createProductEquivalence, deleteProductEquivalence, listProductEquivalences } from "@/shared/services/equivalenceService";
import { createSkuRecipe, deleteSkuRecipeItem, getSkuRecipe, updateSkuRecipe } from "@/shared/services/productRecipeService";
import { listSkus } from "@/shared/services/skuService";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import type { ProductCreateDraft, ProductCreateForm, ProductCreateModalProps, ProductSkuWithAttributes, WorkspaceTab } from "@/features/catalog/types/product";
import type { CreateProductEquivalenceDto, EquivalenceDraft, ProductEquivalence } from "@/features/catalog/types/equivalence";
import type { RecipeResponse, UpdateRecipePayload } from "@/features/catalog/types/productRecipe";
import type { ListUnitResponse } from "@/features/catalog/types/unit";
import type { PrimaVariant } from "@/features/catalog/types/variant";
import type { ProductSkuDraft } from "./ProductSkuTable";

import { ProductDetailsSection, ProductEquivalencesSection, ProductRecipesSection } from "./ProductCreateModalSections";
import {
    buildSkuUpdatePayload,
    classifyRecipeDraftPersistence,
    createEmptyPendingCreateState,
    createEmptyProductCreateDraft,
    hasSkuDraftChanges,
    mapCreatedSkuIdsByDraftId,
    mapSkuDraftRowsById,
    mapSkuResponseToDraftRow,
    retainRecipeDraftsByIds,
    shouldKeepCreateModalOpen,
} from "../types/productCreateFlow";
import {
    buildRowId,
    buildCreateProductPayload,
    buildCreateSkuPayloads,
    buildDraftSkuLabel,
    buildRecipePayload,
    buildSkuLabel,
    createDefaultSkuRow,
    createEmptyProductForm,
    createEmptySkuRow,
    DEFAULT_PRIMARY,
    formatFailedSkuLabels,
} from "../utils/productCreateModal.helpers";
import { ProductWorkspaceTabs } from "./ComponentSetion";
import { createEmptyRecipeDraft, RecipeDraft } from "./recipeFormFields.helpers";
const DEFAULT_DRAFT: ProductCreateDraft = createEmptyProductCreateDraft();

export function ProductCreateModal({ open, mode = "create", productId, productType, primaryColor = DEFAULT_PRIMARY, entityLabel, onClose, onSaved }: ProductCreateModalProps) {
    const { showFlash, clearFlash } = useFlashMessage();
    const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("details");
    const [units, setUnits] = useState<ListUnitResponse>();
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [saving, setSaving] = useState(false);
    const [primaVariants, setPrimaVariants] = useState<PrimaVariant[]>([]);
    const [loadingPrimaVariants, setLoadingPrimaVariants] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [loadingEquivalences, setLoadingEquivalences] = useState(false);
    const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
    const [skus, setSkus] = useState<ProductSkuWithAttributes[]>([]);
    const [persistedSkuRowsById, setPersistedSkuRowsById] = useState<Record<string, ProductSkuDraft>>({});
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const [savingRecipe, setSavingRecipe] = useState(false);
    const [persistedRecipesBySkuId, setPersistedRecipesBySkuId] = useState<Record<string, RecipeDraft>>({});
    const [editedRecipesBySkuId, setEditedRecipesBySkuId] = useState<Record<string, RecipeDraft>>({});
    const [form, setForm] = useState<ProductCreateForm>(createEmptyProductForm());
    const [skuRows, setSkuRows] = useState<ProductSkuDraft[]>([createDefaultSkuRow()]);
    const draftStorageKey = useMemo(() => `product-create-draft:${productType}`, [productType]);
    const [draft, setDraft] = useState<ProductCreateDraft>(DEFAULT_DRAFT);
    const [selectedSkuId, setSelectedSkuId] = useState("");
    const [createdProductId, setCreatedProductId] = useState<string | null>(null);
    const [createdSkuIdsByDraftId, setCreatedSkuIdsByDraftId] = useState<Record<string, string>>({});
    const [recipeFailures, setRecipeFailures] = useState<string[]>([]);
    const [nonPersistedDrafts, setNonPersistedDrafts] = useState<string[]>([]);
    const [equivalenceFailures, setEquivalenceFailures] = useState<EquivalenceDraft[]>([]);

    const label = entityLabel ?? (productType === ProductTypes.MATERIAL ? "materia prima" : "producto");
    const isMaterial = productType === ProductTypes.MATERIAL;
    const isEditMode = mode === "edit";
    const activeProductId = isEditMode ? (productId ?? null) : createdProductId;
    const createFlowLocked = !isEditMode && Boolean(createdProductId);

    const parseEditRecipeSelectionKey = useCallback((key: string) => {
        const [kind, id] = key.split(":");
        if (!id) return null;
        if (kind !== "sku" && kind !== "draft") return null;
        return { kind, id } as const;
    }, []);

    const clearDraftStorage = useCallback(() => {
        if (typeof window === "undefined") return;
        window.localStorage.removeItem(draftStorageKey);
    }, [draftStorageKey]);

    const resetCreateDraftState = useCallback(() => {
        const pendingState = createEmptyPendingCreateState();
        setDraft(createEmptyProductCreateDraft());
        setCreatedProductId(pendingState.createdProductId);
        setCreatedSkuIdsByDraftId(pendingState.createdSkuIdsByDraftId);
        setRecipeFailures(pendingState.recipeFailures);
        setNonPersistedDrafts(pendingState.nonPersistedDrafts);
        setEquivalenceFailures(pendingState.equivalenceFailures);
        clearDraftStorage();
    }, [clearDraftStorage]);

    const handleClose = useCallback(() => {
        if (!isEditMode) {
            resetCreateDraftState();
        }
        onClose();
    }, [isEditMode, onClose, resetCreateDraftState]);

    useEffect(() => {
        if (!open) return;
        setWorkspaceTab("details");
        setForm(createEmptyProductForm());
        setSelectedSkuId("");
        setEquivalences([]);
        setSkus([]);
        setPersistedSkuRowsById({});
        setPersistedRecipesBySkuId({});
        setEditedRecipesBySkuId({});

        if (isEditMode) {
            setDraft(createEmptyProductCreateDraft());
            setCreatedProductId(null);
            setCreatedSkuIdsByDraftId({});
            setRecipeFailures([]);
            setNonPersistedDrafts([]);
            setEquivalenceFailures([]);
            setSkuRows([]);
            return;
        }
        resetCreateDraftState();
        setSkuRows([createDefaultSkuRow()]);
    }, [open, isEditMode, resetCreateDraftState]);

    useEffect(() => {
        if (!open) return;
        if (isEditMode) {
            const persistedSkuIds = new Set(skus.map((skuItem) => skuItem.sku.id));
            const availableKeys = skuRows.map((row) => (persistedSkuIds.has(row.id) ? `sku:${row.id}` : `draft:${row.id}`));
            setSelectedSkuId((prev) => {
                if (prev && availableKeys.includes(prev)) return prev;
                return availableKeys[0] ?? "";
            });
            return;
        }

        const recipeDraftIds = Object.keys(draft.recipesBySku);
        const availableDraftIds = createFlowLocked && recipeDraftIds.length > 0 ? recipeDraftIds : skuRows.map((row) => row.id);

        setSelectedSkuId((prev) => {
            if (prev && availableDraftIds.includes(prev)) return prev;
            return availableDraftIds[0] ?? "";
        });
    }, [open, isEditMode, skuRows, skus, draft.recipesBySku, createFlowLocked]);

    useEffect(() => {
        if (!open) return;
        if (isEditMode) return;
        const validIds = new Set(skuRows.map((row) => row.id));
        setDraft((prev) => {
            let changed = false;
            const nextRecipes: Record<string, RecipeDraft> = {};
            Object.entries(prev.recipesBySku).forEach(([id, recipe]) => {
                if (validIds.has(id)) {
                    nextRecipes[id] = recipe;
                } else {
                    changed = true;
                }
            });
            return changed ? { ...prev, recipesBySku: nextRecipes } : prev;
        });
    }, [open, isEditMode, skuRows, setDraft]);

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

    const loadEquivalences = useCallback(async (id: string) => {
        setLoadingEquivalences(true);
        try {
            const response = await listProductEquivalences(id);
            setEquivalences(response ?? []);
        } catch {
            setEquivalences([]);
            showFlash(errorResponse("Error al cargar equivalencias"));
        } finally {
            setLoadingEquivalences(false);
        }
    }, [showFlash]);

    const mapRecipeResponseToDraft = useCallback((response?: RecipeResponse | null): RecipeDraft => {
        if (!response?.recipe) return createEmptyRecipeDraft();

        return {
            yieldQuantity: String(response.recipe.yieldQuantity ?? 1),
            notes: response.recipe.notes ?? "",
            items: (response.items ?? []).map((item) => ({
                id: item.id,
                materialSkuId: item.materialSkuId,
                quantity: String(item.quantity ?? ""),
                unitId: item.unitId,
            })),
        };
    }, []);

    const applyRecipeResponseToState = (skuId: string, response?: RecipeResponse | null) => {
        const nextDraft = mapRecipeResponseToDraft(response);
        setPersistedRecipesBySkuId((prev) => ({ ...prev, [skuId]: nextDraft }));
        setEditedRecipesBySkuId((prev) => ({ ...prev, [skuId]: nextDraft }));
    };

    const loadRecipe = useCallback(async (skuId: string) => {
        setLoadingRecipe(true);
        try {
            const response = await getSkuRecipe(skuId);
            const nextDraft = mapRecipeResponseToDraft(response);
            setPersistedRecipesBySkuId((prev) => ({ ...prev, [skuId]: nextDraft }));
            setEditedRecipesBySkuId((prev) => (prev[skuId] ? prev : { ...prev, [skuId]: nextDraft }));
        } catch (error) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
                const empty = createEmptyRecipeDraft();
                setPersistedRecipesBySkuId((prev) => ({ ...prev, [skuId]: empty }));
                setEditedRecipesBySkuId((prev) => (prev[skuId] ? prev : { ...prev, [skuId]: empty }));
            } else {
                showFlash(errorResponse(getApiErrorMessage(error, "Error al cargar recetas")));
            }
        } finally {
            setLoadingRecipe(false);
        }
    }, [mapRecipeResponseToDraft, showFlash]);

    useEffect(() => {
        if (!open || !isEditMode) return;
        if (!productId) return;

        clearFlash();
        setLoadingProduct(true);

        getCatalogProductById(productId)
            .then(async (response) => {
                const { product, baseUnit, skus: responseSkus } = response;
                const sortedSkus = [...(responseSkus ?? [])].sort((left, right) => {
                    const leftSku = String(left.sku.backendSku ?? "");
                    const rightSku = String(right.sku.backendSku ?? "");

                    if (!leftSku && !rightSku) return 0;
                    if (!leftSku) return 1;
                    if (!rightSku) return -1;

                    return leftSku.localeCompare(rightSku, "es", {
                        numeric: true,
                        sensitivity: "base",
                    });
                });

                const nextSkuRows = sortedSkus.map(mapSkuResponseToDraftRow);
                setForm({
                    name: product.name ?? "",
                    description: product.description ?? "",
                    brand: product.brand ?? "",
                    baseUnitId: product.baseUnitId ?? baseUnit?.id ?? "",
                    isActive: product.isActive ?? true,
                    wantsVariants: (responseSkus?.length ?? 0) > 1 ? "yes" : "no",
                });

                setSkus(sortedSkus);
                setSkuRows(nextSkuRows);
                setPersistedSkuRowsById(mapSkuDraftRowsById(nextSkuRows));
                await loadEquivalences(product.id);
            })
            .catch(() => {
                showFlash(errorResponse(`No se pudo cargar ${label}`));
            })
            .finally(() => {
                setLoadingProduct(false);
            });
    }, [open, isEditMode, productId, label, clearFlash, loadEquivalences, showFlash]);

    const loadMaterials = useCallback(async () => {
        setLoadingPrimaVariants(true);
        try {
            const response = await listSkus({
                productType: ProductTypes.MATERIAL,
                isActive: true,
                page: 1,
                limit: 200,
            });
            const normalized = (response.items ?? []).map((item) => ({
                id: item.sku.id,
                sku: item.sku.backendSku ?? undefined,
                productName: item.sku.name ?? "",
                productDescription: "",
                unitName: item.unit?.name ?? "",
                unitCode: item.unit?.code ?? "",
                baseUnitId: item.unit?.id ?? "",
                unit: item.unit ?? undefined,
                isActive: item.sku.isActive ?? true,
                attributes: Object.fromEntries(item.attributes.map((attr) => [attr.code, attr.value])),
                customSku: item.sku.customSku ?? undefined,
            }));
            setPrimaVariants(normalized);
        } catch {
            showFlash(errorResponse("Error al cargar materias primas"));
        } finally {
            setLoadingPrimaVariants(false);
        }
    }, [showFlash]);

    useEffect(() => {
        if (!open || isMaterial || loadingPrimaVariants || primaVariants.length > 0) return;
        void loadMaterials();
    }, [open, isMaterial, loadingPrimaVariants, primaVariants.length, loadMaterials]);

    useEffect(() => {
        if (!open || !isEditMode) return;
        const parsed = selectedSkuId ? parseEditRecipeSelectionKey(selectedSkuId) : null;
        if (!parsed) return;
        if (parsed.kind !== "sku") return;
        if (persistedRecipesBySkuId[parsed.id] || editedRecipesBySkuId[parsed.id]) return;
        void loadRecipe(parsed.id);
    }, [open, isEditMode, selectedSkuId, persistedRecipesBySkuId, editedRecipesBySkuId, loadRecipe, parseEditRecipeSelectionKey]);

    useEffect(() => {
        if (isEditMode) return;
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
    }, [form.name, isEditMode]);

    useEffect(() => {
        if (isEditMode) return;
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
    }, [form.wantsVariants, form.name, isEditMode]);

    const unitOptions = useMemo(
        () =>
            (units ?? []).map((unit) => ({
                value: unit.id,
                label: `${unit.name} (${unit.code})`,
            })),
        [units],
    );

    const canSave = form.name.trim().length > 0 && !loadingUnits && !createFlowLocked && (!isEditMode || !loadingProduct);
    const isBusy = isEditMode && (loadingUnits || loadingProduct);

    const tabs = [
        { id: "details" as WorkspaceTab, label: "Producto", icon: PackageCheck },
        { id: "equivalences" as WorkspaceTab, label: "Equivalencias", icon: Scale },
        ...(!isMaterial ? [{ id: "recipes" as WorkspaceTab, label: "Recetas", icon: FlaskConical }] : []),
    ];

    const addSkuRow = () => {
        setSkuRows((prev) => [...prev, createEmptySkuRow()]);
    };

    const removeSkuRow = (id: string) => {
        setSkuRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
        setDraft((prev) => {
            if (!prev.recipesBySku[id]) return prev;
            const nextRecipes = { ...prev.recipesBySku };
            delete nextRecipes[id];
            return { ...prev, recipesBySku: nextRecipes };
        });
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

    const updateFormField = (field: keyof ProductCreateForm, value: string | boolean) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateDraftEquivalence = async (payload: CreateProductEquivalenceDto) => {
        setDraft((prev) => ({
            ...prev,
            equivalences: [
                ...prev.equivalences,
                {
                    id: buildRowId(),
                    ...payload,
                },
            ],
        }));
    };

    const handleDeleteDraftEquivalence = async (id: string) => {
        setDraft((prev) => ({
            ...prev,
            equivalences: prev.equivalences.filter((eq) => eq.id !== id),
        }));
    };

    const handleCreateEquivalence = async (payload: CreateProductEquivalenceDto) => {
        if (!activeProductId) return;
        try {
            await createProductEquivalence(activeProductId, payload);
            setEquivalenceFailures((prev) => prev.filter((eq) => !(eq.fromUnitId === payload.fromUnitId && eq.toUnitId === payload.toUnitId && Number(eq.factor) === Number(payload.factor))));
            await loadEquivalences(activeProductId);
        } catch {
            showFlash(errorResponse("Error al crear equivalencia"));
        }
    };

    const handleDeleteEquivalence = async (id: string) => {
        if (!activeProductId) return;
        try {
            await deleteProductEquivalence(id);
            await loadEquivalences(activeProductId);
        } catch {
            showFlash(errorResponse("Error al eliminar equivalencia"));
        }
    };

    const applyPersistedSkuResponses = (responses: ProductSkuWithAttributes[]) => {
        if (responses.length === 0) return;

        const persistedRows = responses.map(mapSkuResponseToDraftRow);
        const persistedRowsById = mapSkuDraftRowsById(persistedRows);

        setSkuRows((prev) => prev.map((row) => persistedRowsById[row.id] ?? row));
        setPersistedSkuRowsById((prev) => ({
            ...prev,
            ...persistedRowsById,
        }));
        setSkus((prev) =>
            prev.map((skuItem) => {
                const persisted = responses.find((response) => response.sku.id === skuItem.sku.id);
                return persisted ? { ...skuItem, ...persisted } : skuItem;
            }),
        );
    };

    const pendingSkuRows = useMemo(() => skuRows.filter((row) => nonPersistedDrafts.includes(row.id)), [skuRows, nonPersistedDrafts]);

    const recipeSkuOptions = useMemo(
        () =>
            isEditMode
                ? (() => {
                      const persistedSkuIds = new Set(skus.map((skuItem) => skuItem.sku.id));
                      return skuRows.map((row, index) => ({
                          value: persistedSkuIds.has(row.id) ? `sku:${row.id}` : `draft:${row.id}`,
                          label: buildSkuLabel({
                              row,
                              index,
                              fallbackName: form.name,
                          }),
                      }));
                  })()
                : (createFlowLocked ? skuRows.filter((row) => Object.prototype.hasOwnProperty.call(draft.recipesBySku, row.id)) : skuRows).map((row, index) => ({
                      value: row.id,
                      label: buildSkuLabel({
                          row,
                          index,
                          fallbackName: form.name,
                      }),
                  })),
        [isEditMode, skus, skuRows, form.name, createFlowLocked, draft.recipesBySku],
    );

    const selectedRecipeDraft = useMemo(() => {
        if (!selectedSkuId) return createEmptyRecipeDraft();
        if (isEditMode) {
            const parsed = parseEditRecipeSelectionKey(selectedSkuId);
            if (!parsed) return createEmptyRecipeDraft();
            if (parsed.kind === "draft") return draft.recipesBySku[parsed.id] ?? createEmptyRecipeDraft();
            return editedRecipesBySkuId[parsed.id] ?? createEmptyRecipeDraft();
        }
        return draft.recipesBySku[selectedSkuId] ?? createEmptyRecipeDraft();
    }, [draft.recipesBySku, selectedSkuId, isEditMode, editedRecipesBySkuId, parseEditRecipeSelectionKey]);

    const selectedSkuIsDraft = useMemo(() => {
        if (!isEditMode) return false;
        const parsed = selectedSkuId ? parseEditRecipeSelectionKey(selectedSkuId) : null;
        return parsed?.kind === "draft";
    }, [isEditMode, selectedSkuId, parseEditRecipeSelectionKey]);

    const draftLabelForId = (draftId: string) =>
        buildDraftSkuLabel({
            skuRows,
            draftId,
            fallbackName: form.name,
        });

    const updateSelectedRecipeDraft = (next: RecipeDraft) => {
        if (!selectedSkuId) return;
        if (isEditMode) {
            const parsed = parseEditRecipeSelectionKey(selectedSkuId);
            if (!parsed) return;
            if (parsed.kind === "draft") {
                setDraft((prev) => ({
                    ...prev,
                    recipesBySku: {
                        ...prev.recipesBySku,
                        [parsed.id]: next,
                    },
                }));
                return;
            }
            setEditedRecipesBySkuId((prev) => ({
                ...prev,
                [parsed.id]: next,
            }));
            return;
        }
        setDraft((prev) => ({
            ...prev,
            recipesBySku: {
                ...prev.recipesBySku,
                [selectedSkuId]: next,
            },
        }));
    };

    useEffect(() => {
        if (isEditMode) return;
        setRecipeFailures((prev) =>
            prev.filter((draftId) => {
                const recipe = draft.recipesBySku[draftId];
                return Boolean(recipe && buildRecipePayload(recipe).items.length > 0);
            }),
        );
        setNonPersistedDrafts((prev) =>
            prev.filter((draftId) => {
                const rowStillExists = skuRows.some((row) => row.id === draftId);
                const recipe = draft.recipesBySku[draftId];
                if (!rowStillExists) return false;
                if (!recipe) return true;
                return buildRecipePayload(recipe).items.length > 0;
            }),
        );
    }, [draft.recipesBySku, isEditMode, skuRows]);

    const persistEquivalenceDrafts = async (targetProductId: string, pendingEquivalences: EquivalenceDraft[]) => {
        const failedEquivalences: EquivalenceDraft[] = [];

        for (const eq of pendingEquivalences) {
            try {
                await createProductEquivalence(targetProductId, {
                    fromUnitId: eq.fromUnitId,
                    toUnitId: eq.toUnitId,
                    factor: Number(eq.factor),
                });
            } catch {
                failedEquivalences.push(eq);
            }
        }

        return failedEquivalences;
    };

    const persistRecipeDrafts = async ({
        recipesBySku,
        persistedDraftIds,
        skuIdsByDraftId,
    }: {
        recipesBySku: ProductCreateDraft["recipesBySku"];
        persistedDraftIds: Iterable<string>;
        skuIdsByDraftId: Record<string, string>;
    }) => {
        const { retryableRecipes, nonPersistedDrafts: nextNonPersistedDrafts } = classifyRecipeDraftPersistence({
            recipesBySku,
            persistedDraftIds,
            createdSkuIdsByDraftId: skuIdsByDraftId,
            hasPersistableItems: (recipeDraft) => buildRecipePayload(recipeDraft).items.length > 0,
        });
        const failedRecipeIds: string[] = [];
        for (const candidate of retryableRecipes) {
            try {
                await createSkuRecipe(candidate.skuId, buildRecipePayload(candidate.recipeDraft));
            } catch {
                failedRecipeIds.push(candidate.draftId);
            }
        }
        return {
            failedRecipeIds,
            nonPersistedDrafts: nextNonPersistedDrafts,
        };
    };

    const persistSkuDrafts = async ({ targetProductId, existingSkuIdsByDraftId }: { targetProductId: string; existingSkuIdsByDraftId: Record<string, string> }) => {
        const skuPayloads = buildCreateSkuPayloads({
            skuRows,
            isMaterial,
            fallbackName: form.name,
        });
        const createdSkus: Array<{
            draftId: string;
            response: Awaited<ReturnType<typeof createProductSku>>;
        }> = [];
        const failedSkuDraftIds: string[] = [];
        for (const skuPayload of skuPayloads) {
            if (existingSkuIdsByDraftId[skuPayload.draftId]) continue;

            try {
                const response = await createProductSku(targetProductId, skuPayload.payload);
                createdSkus.push({ draftId: skuPayload.draftId, response });
            } catch {
                failedSkuDraftIds.push(skuPayload.draftId);
            }
        }
        return {
            skuPayloads,
            failedSkuDraftIds,
            createdSkuIdsByDraftId: {
                ...existingSkuIdsByDraftId,
                ...mapCreatedSkuIdsByDraftId(createdSkus),
            },
        };
    };

    const persistEditedSkus = async () => {
        const changedSkuRows = skuRows.filter((row) => persistedSkuRowsById[row.id] && hasSkuDraftChanges(row, persistedSkuRowsById[row.id]));
        const failedSkuIds: string[] = [];
        const updatedSkuResponses: ProductSkuWithAttributes[] = [];
        for (const row of changedSkuRows) {
            try {
                const response = await updateProductSku(row.id, buildSkuUpdatePayload(row));
                updatedSkuResponses.push(response);
            } catch {
                failedSkuIds.push(row.id);
            }
        }
        applyPersistedSkuResponses(updatedSkuResponses);
        return {
            changedSkuRows,
            failedSkuIds,
        };
    };

    const persistEditModeDraftSkusAndRecipes = async () => {
        if (!productId) {
            return {
                failedSkuDraftIds: [] as string[],
                failedRecipeDraftIds: [] as string[],
            };
        }
        const rowHasData = (row: ProductSkuDraft) =>
            Boolean(
                row.name.trim() ||
                    row.customSku.trim() ||
                    row.barcode.trim() ||
                    row.image.trim() ||
                    row.price.trim() ||
                    row.cost.trim() ||
                    row.presentation.trim() ||
                    row.variant.trim() ||
                    row.color.trim(),
            );

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

        const buildCreateSkuPayloadForRow = (row: ProductSkuDraft): Parameters<typeof createProductSku>[1] => ({
            name: row.name.trim() || form.name.trim(),
            customSku: row.customSku.trim() || undefined,
            barcode: row.barcode.trim() || undefined,
            image: row.image.trim() || undefined,
            price: row.price.trim() ? Number(row.price) : undefined,
            cost: row.cost.trim() ? Number(row.cost) : undefined,
            isActive: row.isActive,
            ...defaultFlags,
            attributes: [
                row.presentation.trim() ? { code: "presentation", name: "Presentacion", value: row.presentation.trim() } : null,
                row.variant.trim() ? { code: "variant", name: "Variante", value: row.variant.trim() } : null,
                row.color.trim() ? { code: "color", name: "Color", value: row.color.trim() } : null,
            ].filter(Boolean) as Parameters<typeof createProductSku>[1]["attributes"],
        });

        const persistedSkuIds = new Set(Object.keys(persistedSkuRowsById));
        const draftRows = skuRows.filter((row) => !persistedSkuIds.has(row.id));

        const nextSkuIdsByDraftId = { ...createdSkuIdsByDraftId };
        const failedSkuDraftIds: string[] = [];
        const failedRecipeDraftIds: string[] = [];
        const recipesToRemove: string[] = [];

        for (const row of draftRows) {
            const draftId = row.id;
            const recipeDraftForRow = draft.recipesBySku[draftId];
            const recipePayload = recipeDraftForRow ? buildRecipePayload(recipeDraftForRow) : null;
            const shouldPersistRow = rowHasData(row) || Boolean(recipePayload && recipePayload.items.length > 0);
            if (!shouldPersistRow) continue;

            let skuId = nextSkuIdsByDraftId[draftId];

            if (!skuId) {
                try {
                    const response = await createProductSku(productId, buildCreateSkuPayloadForRow(row));
                    skuId = response.sku.id;
                    nextSkuIdsByDraftId[draftId] = skuId;
                } catch {
                    failedSkuDraftIds.push(draftId);
                    continue;
                }
            } else {
                try {
                    await updateProductSku(skuId, buildSkuUpdatePayload(row));
                } catch {
                    failedSkuDraftIds.push(draftId);
                    continue;
                }
            }
            if (recipePayload && recipePayload.items.length > 0) {
                try {
                    await createSkuRecipe(skuId, recipePayload);
                    recipesToRemove.push(draftId);
                } catch {
                    failedRecipeDraftIds.push(draftId);
                }
            }
        }

        setCreatedSkuIdsByDraftId(nextSkuIdsByDraftId);
        if (recipesToRemove.length > 0) {
            setDraft((prev) => {
                const nextRecipes = { ...prev.recipesBySku };
                recipesToRemove.forEach((draftId) => {
                    delete nextRecipes[draftId];
                });
                return { ...prev, recipesBySku: nextRecipes };
            });
        }

        return {
            failedSkuDraftIds,
            failedRecipeDraftIds,
        };
    };

    const buildUpdateRecipePayloadFromDraft = (recipeDraft: RecipeDraft): UpdateRecipePayload => {
        const items = (recipeDraft.items ?? [])
            .map((item) => ({
                materialSkuId: item.materialSkuId,
                quantity: Number(item.quantity) || 0,
                unitId: item.unitId,
            }))
            .filter((item) => item.materialSkuId && item.unitId && item.quantity > 0);
        return {
            yieldQuantity: Number(recipeDraft.yieldQuantity) || 1,
            notes: recipeDraft.notes.trim() ? recipeDraft.notes.trim() : null,
            ...(items.length > 0 ? { items } : {}),
        };
    };

    const hasRecipeDraftChanges = (currentRecipe: RecipeDraft, baselineRecipe?: RecipeDraft) => {
        if (!baselineRecipe) return false;
        return (
            JSON.stringify(buildUpdateRecipePayloadFromDraft(currentRecipe)) !==
            JSON.stringify(buildUpdateRecipePayloadFromDraft(baselineRecipe))
        );
    };

    const persistEditedRecipes = async () => {
        if (isMaterial) {
            return { updatedSkuIds: [] as string[], failedSkuIds: [] as string[], notFoundSkuIds: [] as string[] };
        }

        const dirtySkuIds = Object.keys(editedRecipesBySkuId).filter((skuId) =>
            hasRecipeDraftChanges(editedRecipesBySkuId[skuId], persistedRecipesBySkuId[skuId]),
        );

        const updatedSkuIds: string[] = [];
        const failedSkuIds: string[] = [];
        const notFoundSkuIds: string[] = [];

        for (const skuId of dirtySkuIds) {
            const payload = buildUpdateRecipePayloadFromDraft(editedRecipesBySkuId[skuId]);
            try {
                try {
                    const response = await updateSkuRecipe(skuId, payload);
                    applyRecipeResponseToState(skuId, response);
                } catch (error) {
                    const status = (error as { response?: { status?: number } })?.response?.status;
                    const payloadItems = payload.items ?? [];
                    if (status === 404 && payloadItems.length > 0) {
                        const response = await createSkuRecipe(skuId, {
                            yieldQuantity: payload.yieldQuantity ?? 1,
                            notes: payload.notes ?? undefined,
                            items: payloadItems,
                        });
                        applyRecipeResponseToState(skuId, response);
                    } else {
                        throw error;
                    }
                }
                updatedSkuIds.push(skuId);
            } catch (error) {
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status === 404) notFoundSkuIds.push(skuId);
                failedSkuIds.push(skuId);
            }
        }

        return { updatedSkuIds, failedSkuIds, notFoundSkuIds };
    };

    const applyPendingCreateState = async ({
        targetProductId,
        nextSkuIdsByDraftId,
        failedEquivalences,
        failedRecipeIds,
        nextNonPersistedDrafts,
        successMessage,
        partialFailureMessage,
        closeOnSuccess,
    }: {
        targetProductId: string;
        nextSkuIdsByDraftId: Record<string, string>;
        failedEquivalences: EquivalenceDraft[];
        failedRecipeIds: string[];
        nextNonPersistedDrafts: string[];
        successMessage: string;
        partialFailureMessage: string;
        closeOnSuccess: boolean;
    }) => {
        const keepOpen = shouldKeepCreateModalOpen({
            equivalenceFailures: failedEquivalences,
            recipeFailures: failedRecipeIds,
            nonPersistedDrafts: nextNonPersistedDrafts,
        });

        setCreatedProductId(targetProductId);
        setCreatedSkuIdsByDraftId(nextSkuIdsByDraftId);
        setEquivalenceFailures(failedEquivalences);
        setRecipeFailures(failedRecipeIds);
        setNonPersistedDrafts(nextNonPersistedDrafts);

        const retainedDraftIds = [...failedRecipeIds, ...nextNonPersistedDrafts];
        setDraft((prev) => ({
            equivalences: failedEquivalences,
            recipesBySku: retainRecipeDraftsByIds(prev.recipesBySku, retainedDraftIds),
        }));

        await loadEquivalences(targetProductId);

        if (keepOpen) {
            const nextFailedDraftId = failedRecipeIds[0] ?? nextNonPersistedDrafts[0] ?? "";
            if (nextFailedDraftId) {
                setSelectedSkuId(nextFailedDraftId);
            }
            if (!isMaterial && failedRecipeIds.length > 0) {
                setWorkspaceTab("recipes");
            } else if (nextNonPersistedDrafts.length > 0) {
                setWorkspaceTab("details");
            } else {
                setWorkspaceTab("equivalences");
            }
            showFlash(errorResponse(partialFailureMessage));
            return;
        }

        resetCreateDraftState();
        showFlash(successResponse(successMessage));
        if (closeOnSuccess) {
            handleClose();
        }
    };

    const retryPendingCreateArtifacts = async () => {
        if (!createdProductId || saving) return;

        clearFlash();
        setSaving(true);
        try {
            const { createdSkuIdsByDraftId: nextSkuIdsByDraftId, failedSkuDraftIds } = await persistSkuDrafts({
                targetProductId: createdProductId,
                existingSkuIdsByDraftId: createdSkuIdsByDraftId,
            });

            const pendingEquivalences = equivalenceFailures;
            const failedEquivalences = await persistEquivalenceDrafts(createdProductId, pendingEquivalences);
            const { failedRecipeIds, nonPersistedDrafts: nextRecipeNonPersistedDrafts } = await persistRecipeDrafts({
                recipesBySku: draft.recipesBySku,
                persistedDraftIds: Object.keys(nextSkuIdsByDraftId),
                skuIdsByDraftId: nextSkuIdsByDraftId,
            });

            const nextNonPersistedDrafts = Array.from(new Set([...failedSkuDraftIds, ...nextRecipeNonPersistedDrafts]));

            await applyPendingCreateState({
                targetProductId: createdProductId,
                nextSkuIdsByDraftId: nextSkuIdsByDraftId,
                failedEquivalences,
                failedRecipeIds,
                nextNonPersistedDrafts,
                successMessage: `${label} completado`,
                partialFailureMessage: "Se creó el producto, pero todavía hay SKUs, equivalencias o recetas pendientes.",
                closeOnSuccess: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const saveProductUpdates = async () => {
        if (!productId || saving) return;
        clearFlash();
        setSaving(true);
        try {
            await updateProduct(productId, {
                name: form.name.trim() || undefined,
                description: form.description.trim() || null,
                brand: form.brand.trim() || null,
                baseUnitId: form.baseUnitId || undefined,
                isActive: form.isActive,
            });

            const { changedSkuRows, failedSkuIds } = await persistEditedSkus();
            if (failedSkuIds.length > 0) {
                const failedLabels = formatFailedSkuLabels({
                    skuRows,
                    skuIds: failedSkuIds,
                    fallbackName: form.name,
                });
                showFlash(
                    errorResponse(
                        failedLabels ? `Se actualiz\u00f3 ${label}, pero no se pudieron guardar estos SKUs: ${failedLabels}.` : `Se actualiz\u00f3 ${label}, pero quedaron SKUs pendientes de guardar.`,
                    ),
                );
                return;
            }

            const { failedSkuDraftIds, failedRecipeDraftIds } = await persistEditModeDraftSkusAndRecipes();
            if (failedSkuDraftIds.length > 0 || failedRecipeDraftIds.length > 0) {
                if (failedSkuDraftIds.length > 0) {
                    const failedLabels = formatFailedSkuLabels({
                        skuRows,
                        skuIds: failedSkuDraftIds,
                        fallbackName: form.name,
                    });
                    showFlash(
                        errorResponse(
                            failedLabels
                                ? `Se actualiz\u00f3 ${label}, pero no se pudieron crear/actualizar estos SKUs nuevos: ${failedLabels}.`
                                : `Se actualiz\u00f3 ${label}, pero quedaron SKUs nuevos pendientes de guardar.`,
                        ),
                    );
                    setWorkspaceTab("details");
                    return;
                }

                const failedLabels = formatFailedSkuLabels({
                    skuRows,
                    skuIds: failedRecipeDraftIds,
                    fallbackName: form.name,
                });
                showFlash(
                    errorResponse(
                        failedLabels
                            ? `Se actualiz\u00f3 ${label}, pero no se pudieron guardar las recetas de: ${failedLabels}.`
                            : `Se actualiz\u00f3 ${label}, pero quedaron recetas pendientes de guardar.`,
                    ),
                );
                setWorkspaceTab("recipes");
                return;
            }

            const { failedSkuIds: failedRecipeSkuIds, notFoundSkuIds: recipeNotFoundSkuIds } = await persistEditedRecipes();
            if (failedRecipeSkuIds.length > 0) {
                const failedLabels = formatFailedSkuLabels({
                    skuRows,
                    skuIds: failedRecipeSkuIds,
                    fallbackName: form.name,
                });
                showFlash(
                    errorResponse(
                        recipeNotFoundSkuIds.length > 0 && recipeNotFoundSkuIds.length === failedRecipeSkuIds.length
                            ? "Recipe not found"
                            : failedLabels
                              ? `Se actualiz\u00f3 ${label}, pero no se pudieron guardar las recetas de: ${failedLabels}.`
                              : `Se actualiz\u00f3 ${label}, pero quedaron recetas pendientes de guardar.`,
                    ),
                );
                const focusSkuId = failedRecipeSkuIds[0];
                if (focusSkuId) setSelectedSkuId(`sku:${focusSkuId}`);
                setWorkspaceTab("recipes");
                return;
            }

            showFlash(successResponse(changedSkuRows.length > 0 ? `${label} actualizado` : `${label} actualizado`));
            await onSaved?.();
            handleClose();
        } catch {
            showFlash(errorResponse(`Error al actualizar ${label}`));
        } finally {
            setSaving(false);
        }
    };

    const saveProductAndSkus = async () => {
        if ((!canSave && !createdProductId) || saving) return;
        clearFlash();
        setSaving(true);
        try {
            let targetProductId = createdProductId;

            if (!targetProductId) {
                const productPayload = buildCreateProductPayload({
                    form,
                    productType,
                });

                const createdProduct = await createBaseProduct(productPayload);
                targetProductId = createdProduct.id;
                setCreatedProductId(createdProduct.id);
                await onSaved?.();
            }

            if (!targetProductId) return;

            const { createdSkuIdsByDraftId: nextSkuIdsByDraftId, failedSkuDraftIds } = await persistSkuDrafts({
                targetProductId,
                existingSkuIdsByDraftId: createdSkuIdsByDraftId,
            });

            const pendingEquivalences = equivalenceFailures.length > 0 ? equivalenceFailures : draft.equivalences;
            const failedEquivalences = await persistEquivalenceDrafts(targetProductId, pendingEquivalences);

            const { failedRecipeIds, nonPersistedDrafts: nextRecipeNonPersistedDrafts } = await persistRecipeDrafts({
                recipesBySku: draft.recipesBySku,
                persistedDraftIds: Object.keys(nextSkuIdsByDraftId),
                skuIdsByDraftId: nextSkuIdsByDraftId,
            });

            const nextNonPersistedDrafts = Array.from(new Set([...failedSkuDraftIds, ...nextRecipeNonPersistedDrafts]));

            await applyPendingCreateState({
                targetProductId,
                nextSkuIdsByDraftId,
                failedEquivalences,
                failedRecipeIds,
                nextNonPersistedDrafts,
                successMessage: `${label} y SKUs creados`,
                partialFailureMessage: `${label} creado, pero quedaron SKUs, equivalencias o recetas pendientes por resolver.`,
                closeOnSuccess: true,
            });
        } catch {
            showFlash(errorResponse(`Error al crear ${label} y sus SKUs`));
        } finally {
            setSaving(false);
        }
    };

    const deleteSelectedRecipeItem = async (itemId: string) => {
        if (!selectedSkuId || savingRecipe) return;
        const parsed = parseEditRecipeSelectionKey(selectedSkuId);
        if (!parsed || parsed.kind !== "sku") return;

        setSavingRecipe(true);
        try {
            const response = await deleteSkuRecipeItem(parsed.id, itemId);
            applyRecipeResponseToState(parsed.id, response.data ?? null);
            showFlash(successResponse(response.message ?? "Item eliminado"));
        } catch (error) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
                showFlash(errorResponse("Recipe item not found"));
            } else {
                showFlash(errorResponse(getApiErrorMessage(error, "Error al eliminar item de receta")));
            }
        } finally {
            setSavingRecipe(false);
        }
    };

    const canRetryCreateIssues = Boolean(createdProductId && (equivalenceFailures.length > 0 || recipeFailures.length > 0 || nonPersistedDrafts.length > 0));
    const primaryAction = isEditMode ? saveProductUpdates : createFlowLocked ? (canRetryCreateIssues ? retryPendingCreateArtifacts : handleClose) : saveProductAndSkus;
    const primaryDisabled = isEditMode ? !canSave || saving : createFlowLocked ? saving : !canSave || saving;
    const primaryLabel = saving ? "Guardando..." : isEditMode ? "Guardar cambios" : createFlowLocked ? (canRetryCreateIssues ? "Reintentar pendientes" : "Finalizar") : "Guardar producto y SKUs";

    if (!open) return null;

    return (
        <Modal title={isEditMode ? `Editar ${label}` : `Nuevo ${label}`} onClose={handleClose} open={open}>
            <div className="space-y-4">
                <ProductWorkspaceTabs tabs={tabs} activeTab={workspaceTab} primaryColor={primaryColor} onChange={setWorkspaceTab} />

                {isBusy ? (
                    <div className="rounded-2xl bg-white px-4 py-8 text-sm text-black/60">Cargando...</div>
                ) : (
                    <>
                        {workspaceTab === "details" && (
                            <ProductDetailsSection
                                form={form}
                                unitOptions={unitOptions}
                                createFlowLocked={createFlowLocked}
                                isEditMode={isEditMode}
                                productId={productId}
                                skuRows={skuRows}
                                pendingSkuRows={pendingSkuRows}
                                onChangeFormField={updateFormField}
                                onAddSkuRow={addSkuRow}
                                onRemoveSkuRow={removeSkuRow}
                                onChangeSkuRow={updateSkuRow}
                            />
                        )}

                        {workspaceTab === "equivalences" && (
                            <ProductEquivalencesSection
                                activeProductId={activeProductId}
                                equivalenceFailures={equivalenceFailures}
                                saving={saving}
                                onRetryPending={retryPendingCreateArtifacts}
                                baseUnitId={form.baseUnitId}
                                units={units}
                                equivalences={activeProductId ? equivalences : draft.equivalences}
                                loading={activeProductId ? loadingEquivalences : false}
                                onCreateEquivalence={activeProductId ? handleCreateEquivalence : handleCreateDraftEquivalence}
                                onDeleteEquivalence={activeProductId ? handleDeleteEquivalence : handleDeleteDraftEquivalence}
                                primaryColor={primaryColor}
                            />
                        )}

                        {workspaceTab === "recipes" && !isMaterial && (
                            <ProductRecipesSection
                                isEditMode={isEditMode}
                                selectedSkuIsDraft={selectedSkuIsDraft}
                                isCreateLocked={Boolean(createdProductId)}
                                recipeFailures={recipeFailures}
                                nonPersistedDrafts={nonPersistedDrafts}
                                saving={saving}
                                onRetryPending={retryPendingCreateArtifacts}
                                draftLabelForId={draftLabelForId}
                                selectedSkuId={selectedSkuId}
                                onSelectSku={setSelectedSkuId}
                                recipeSkuOptions={recipeSkuOptions}
                                units={units}
                                primaVariants={primaVariants}
                                recipe={selectedRecipeDraft}
                                onChangeRecipe={updateSelectedRecipeDraft}
                                loading={loadingPrimaVariants || (isEditMode ? loadingRecipe : false)}
                                savingRecipe={isEditMode ? savingRecipe : undefined}
                                primaryColor={primaryColor}
                                tableId={isEditMode ? `recipe-edit-${selectedSkuId}` : `recipe-draft-${selectedSkuId}`}
                                onDeleteRecipeItem={isEditMode && !selectedSkuIsDraft ? deleteSelectedRecipeItem : undefined}
                            />
                        )}
                    </>
                )}

                <div className="flex items-center justify-end gap-2">
                    <SystemButton variant="ghost" className="bg-gray-200" onClick={handleClose}>
                        Cancelar
                    </SystemButton>
                    <SystemButton
                        leftIcon={<Save className="h-4 w-4" />}
                        style={{
                            backgroundColor: primaryColor,
                            borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                        }}
                        onClick={primaryAction}
                        disabled={primaryDisabled}
                    >
                        {primaryLabel}
                    </SystemButton>
                </div>
            </div>
        </Modal>
    );
}
