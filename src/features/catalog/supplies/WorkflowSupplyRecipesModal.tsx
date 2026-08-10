import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/shared/components/modales/Modal';
import { SystemButton } from '@/shared/components/components/SystemButton';
import { RecipeFormFields } from '@/features/catalog/components/RecipeFormFields';
import { createEmptyRecipeDraft, type RecipeDraft } from '@/features/catalog/components/recipeFormFields.helpers';
import { useFeedbackToast } from '@/shared/hooks/useFeedbackToast';
import { errorResponse, successResponse } from '@/shared/common/utils/response';
import { listWorkflows } from '@/shared/services/workflowService';
import { listSkus } from '@/shared/services/skuService';
import { listUnits } from '@/shared/services/unitService';
import { getWorkflowSupplyRecipe, saveWorkflowSupplyRecipe } from '@/shared/services/workflowSupplyRecipeService';
import { ProductTypes } from '@/features/catalog/types/ProductTypes';
import type { Workflow } from '@/features/workflows/types/workflow';
import type { ProductSkuWithAttributes } from '@/features/catalog/types/product';
import type { ListUnitResponse } from '@/features/catalog/types/unit';
import type { PrimaVariant } from '@/features/catalog/types/variant';

type Props = { open: boolean; canManage: boolean; onClose: () => void };

export function WorkflowSupplyRecipesModal({ open, canManage, onClose }: Props) {
  const { showFeedback } = useFeedbackToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [supplies, setSupplies] = useState<ProductSkuWithAttributes[]>([]);
  const [units, setUnits] = useState<ListUnitResponse>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, RecipeDraft>>({});
  const [dirtyWorkflowIds, setDirtyWorkflowIds] = useState<string[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDrafts({}); setDirtyWorkflowIds([]);
    setSelectedWorkflowId(''); setLoadingCatalogs(true);
    let active = true;
    void Promise.all([
      listWorkflows(),
      listSkus({ productType: ProductTypes.SUPPLY, isActive: true, page: 1, limit: 100 }),
      listUnits(),
    ]).then(([workflowRows, supplyRows, unitRows]) => {
      if (!active) return;
      const activeWorkflows = workflowRows.filter((workflow) => workflow.isActive);
      setWorkflows(activeWorkflows); setSupplies(supplyRows.items ?? []); setUnits(unitRows ?? []);
      setSelectedWorkflowId(activeWorkflows[0]?.id ?? '');
    }).catch(() => active && showFeedback(errorResponse('No se pudieron cargar los flujos o insumos')))
      .finally(() => active && setLoadingCatalogs(false));
    return () => { active = false; };
  }, [open, showFeedback]);

  useEffect(() => {
    if (!open || !selectedWorkflowId || drafts[selectedWorkflowId]) return;
    let active = true; setLoadingRecipe(true);
    void getWorkflowSupplyRecipe(selectedWorkflowId).then((recipe) => {
      if (!active) return;
      setDrafts((current) => ({ ...current, [selectedWorkflowId]: recipe ? {
        yieldQuantity: '1', notes: recipe.notes ?? '', items: recipe.items.map((item) => ({
          id: item.id, materialSkuId: item.supplySkuId, quantity: String(item.quantity), unitId: item.unitId,
        })),
      } : createEmptyRecipeDraft() }));
    }).catch(() => active && showFeedback(errorResponse('No se pudo cargar la receta del flujo')))
      .finally(() => active && setLoadingRecipe(false));
    return () => { active = false; };
  }, [drafts, open, selectedWorkflowId, showFeedback]);

  const workflowOptions = useMemo(() => workflows.map((flow) => ({ value: flow.id, label: flow.name })), [workflows]);
  const supplyVariants = useMemo<PrimaVariant[]>(() => supplies.map((item) => ({
    id: item.sku.id, sku: item.sku.backendSku, customSku: item.sku.customSku ?? undefined,
    productName: item.sku.name, productDescription: '', baseUnitId: item.unit?.id ?? '',
    unitName: item.unit?.name ?? '', unitCode: item.unit?.code ?? '', unit: item.unit ?? undefined,
    isActive: item.sku.isActive !== false, type: ProductTypes.SUPPLY,
    attributes: Object.fromEntries((item.attributes ?? []).map((attribute) => [attribute.code, attribute.value])),
  })), [supplies]);
  const selectedDraft = drafts[selectedWorkflowId] ?? createEmptyRecipeDraft();

  const updateSelectedDraft = (next: RecipeDraft) => {
    if (!selectedWorkflowId) return;
    setDrafts((current) => ({ ...current, [selectedWorkflowId]: next }));
    setDirtyWorkflowIds((current) => current.includes(selectedWorkflowId) ? current : [...current, selectedWorkflowId]);
  };

  const saveAll = async () => {
    if (!dirtyWorkflowIds.length) return;
    const invalidId = dirtyWorkflowIds.find((id) => {
      const draft = drafts[id];
      return !draft?.items.length || draft.items.some((item) => !item.materialSkuId || !item.unitId || Number(item.quantity) <= 0)
        || new Set(draft.items.map((item) => item.materialSkuId)).size !== draft.items.length;
    });
    if (invalidId) {
      showFeedback(errorResponse(`Revisa la receta de ${workflows.find((flow) => flow.id === invalidId)?.name ?? 'uno de los flujos'}`));
      setSelectedWorkflowId(invalidId); return;
    }

    setSaving(true);
    const failed: string[] = []; const savedDrafts: Record<string, RecipeDraft> = {};
    for (const workflowId of dirtyWorkflowIds) {
      const draft = drafts[workflowId];
      try {
        const saved = await saveWorkflowSupplyRecipe(workflowId, {
          notes: draft.notes.trim() || null,
          items: draft.items.map((item) => ({ supplySkuId: item.materialSkuId, quantity: Number(item.quantity), unitId: item.unitId })),
        });
        savedDrafts[workflowId] = { yieldQuantity: '1', notes: saved.notes ?? '', items: saved.items.map((item) => ({
          id: item.id, materialSkuId: item.supplySkuId, quantity: String(item.quantity), unitId: item.unitId,
        })) };
      } catch { failed.push(workflowId); }
    }
    setDrafts((current) => ({ ...current, ...savedDrafts })); setDirtyWorkflowIds(failed); setSaving(false);
    if (failed.length) showFeedback(errorResponse(`Se guardaron ${dirtyWorkflowIds.length - failed.length} recetas; ${failed.length} requieren reintento`));
    else showFeedback(successResponse(`${dirtyWorkflowIds.length} receta(s) guardada(s)`));
  };

  const close = () => {
    if (saving) return;
    setDrafts({});
    setDirtyWorkflowIds([]);
    setSelectedWorkflowId('');
    onClose();
  };
  return <Modal open={open} onClose={close} preventClose={saving} title="Recetas de insumos por flujo"
    description="Prepara varias recetas y guárdalas juntas. Al cerrar se descartarán los cambios no guardados."
    className="w-[min(56rem,calc(100vw-2rem))]" footer={<div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{dirtyWorkflowIds.length ? `${dirtyWorkflowIds.length} flujo(s) con cambios pendientes` : 'Sin cambios pendientes'}</span>
      <div className="flex items-center gap-2"><SystemButton variant="outline" size="sm" onClick={close} disabled={saving}>
        {dirtyWorkflowIds.length ? 'Cerrar y descartar' : 'Cerrar'}
      </SystemButton>
        <SystemButton variant="primary" size="sm" leftIcon={<Save className="h-4 w-4" />} loading={saving} onClick={saveAll}
          disabled={!canManage || loadingCatalogs || loadingRecipe || !dirtyWorkflowIds.length}>Guardar recetas</SystemButton></div>
    </div>}>
    <RecipeFormFields units={units} primaVariants={supplyVariants} onMaterialSearchChange={() => undefined}
      hasMoreMaterialResults={false} onLoadMoreMaterials={() => undefined} recipe={selectedDraft}
      onChange={updateSelectedDraft} loading={loadingCatalogs || loadingRecipe} saving={saving || !canManage}
      tableId="workflow-supply-recipes-table" recipeSkuOptions={workflowOptions} onSelectSku={setSelectedWorkflowId}
      selectedSkuId={selectedWorkflowId} ingredientLabel="Insumo" recipeSearchPlaceholder="Buscar flujo..."
      ingredientSearchPlaceholder="Buscar insumo..." recipeEmptyMessage="Sin flujos activos"
      ingredientEmptyMessage="Sin insumos" emptyTableMessage="No hay insumos agregados a esta receta."
      loadMoreLabel="Cargar más insumos" showYield={false} />
  </Modal>;
}
