import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/components/modales/Modal';
import { SystemButton } from '@/shared/components/components/SystemButton';
import { useFeedbackToast } from '@/shared/hooks/useFeedbackToast';
import { errorResponse, successResponse } from '@/shared/common/utils/response';
import { listWorkflows } from '@/shared/services/workflowService';
import { listSkus } from '@/shared/services/skuService';
import { listUnits } from '@/shared/services/unitService';
import {
  getWorkflowSupplyRecipe,
  saveWorkflowSupplyRecipe,
} from '@/shared/services/workflowSupplyRecipeService';
import { ProductTypes } from '@/features/catalog/types/ProductTypes';
import type { Workflow } from '@/features/workflows/types/workflow';
import type { ProductSkuWithAttributes } from '@/features/catalog/types/product';
import type { Unit } from '@/features/catalog/types/unit';

type DraftItem = {
  key: string;
  supplySkuId: string;
  quantity: string;
  unitId: string;
};

type Props = {
  open: boolean;
  canManage: boolean;
  onClose: () => void;
};

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `supply-recipe-${Date.now()}-${Math.random()}`;

export function WorkflowSupplyRecipesModal({ open, canManage, onClose }: Props) {
  const { showFeedback } = useFeedbackToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [supplies, setSupplies] = useState<ProductSkuWithAttributes[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingCatalogs(true);
    setSelectedWorkflowId('');
    setNotes('');
    setItems([]);

    void Promise.all([
      listWorkflows(),
      listSkus({ productType: ProductTypes.SUPPLY, isActive: true, page: 1, limit: 100 }),
      listUnits(),
    ])
      .then(([workflowRows, supplyRows, unitRows]) => {
        if (!active) return;
        const activeWorkflows = workflowRows.filter((workflow) => workflow.isActive);
        setWorkflows(activeWorkflows);
        setSupplies(supplyRows.items ?? []);
        setUnits(unitRows ?? []);
        setSelectedWorkflowId(activeWorkflows[0]?.id ?? '');
      })
      .catch(() => {
        if (active) showFeedback(errorResponse('No se pudieron cargar los flujos o insumos'));
      })
      .finally(() => active && setLoadingCatalogs(false));

    return () => {
      active = false;
    };
  }, [open, showFeedback]);

  useEffect(() => {
    if (!open || !selectedWorkflowId) return;
    let active = true;
    setLoadingRecipe(true);
    setNotes('');
    setItems([]);

    void getWorkflowSupplyRecipe(selectedWorkflowId)
      .then((recipe) => {
        if (!active || !recipe) return;
        setNotes(recipe.notes ?? '');
        setItems(
          recipe.items.map((item) => ({
            key: item.id,
            supplySkuId: item.supplySkuId,
            quantity: String(item.quantity),
            unitId: item.unitId,
          })),
        );
      })
      .catch(() => {
        if (active) showFeedback(errorResponse('No se pudo cargar la receta del flujo'));
      })
      .finally(() => active && setLoadingRecipe(false));

    return () => {
      active = false;
    };
  }, [open, selectedWorkflowId, showFeedback]);

  const supplyOptions = useMemo(
    () =>
      supplies.map((item) => ({
        id: item.sku.id,
        label: `${item.sku.name}${item.sku.backendSku ? ` · ${item.sku.backendSku}` : ''}`,
        unitId: item.unit?.id ?? '',
      })),
    [supplies],
  );

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const addItem = () => {
    const firstAvailable = supplyOptions.find(
      (option) => !items.some((item) => item.supplySkuId === option.id),
    );
    setItems((current) => [
      ...current,
      {
        key: newKey(),
        supplySkuId: firstAvailable?.id ?? '',
        quantity: '1',
        unitId: firstAvailable?.unitId ?? units[0]?.id ?? '',
      },
    ]);
  };

  const save = async () => {
    if (!selectedWorkflowId) return;
    if (!items.length) {
      showFeedback(errorResponse('Agrega al menos un insumo a la receta'));
      return;
    }
    if (items.some((item) => !item.supplySkuId || !item.unitId || Number(item.quantity) <= 0)) {
      showFeedback(errorResponse('Completa todos los insumos con una cantidad mayor a cero'));
      return;
    }
    if (new Set(items.map((item) => item.supplySkuId)).size !== items.length) {
      showFeedback(errorResponse('No puedes repetir un insumo en la misma receta'));
      return;
    }

    setSaving(true);
    try {
      const saved = await saveWorkflowSupplyRecipe(selectedWorkflowId, {
        notes: notes.trim() || null,
        items: items.map((item) => ({
          supplySkuId: item.supplySkuId,
          quantity: Number(item.quantity),
          unitId: item.unitId,
        })),
      });
      setItems(
        saved.items.map((item) => ({
          key: item.id,
          supplySkuId: item.supplySkuId,
          quantity: String(item.quantity),
          unitId: item.unitId,
        })),
      );
      showFeedback(successResponse('Receta de insumos guardada'));
    } catch {
      showFeedback(errorResponse('No se pudo guardar la receta de insumos'));
    } finally {
      setSaving(false);
    }
  };

  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId);
  const busy = loadingCatalogs || loadingRecipe;

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      preventClose={saving}
      title="Recetas de insumos por flujo"
      description="Configura los insumos requeridos una vez por cada pedido del flujo. El consumo se activará en una etapa posterior."
      className="w-[min(64rem,calc(100vw-2rem))]"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-end gap-2">
          <SystemButton variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cerrar
          </SystemButton>
          <SystemButton
            variant="primary"
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={save}
            disabled={!canManage || busy || !selectedWorkflowId}
          >
            Guardar receta
          </SystemButton>
        </div>
      }
    >
      <div className="grid min-h-[30rem] md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/25 p-3 md:border-b-0 md:border-r">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Flujos activos
          </p>
          <div className="space-y-1">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => setSelectedWorkflowId(workflow.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  workflow.id === selectedWorkflowId
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="block truncate">{workflow.name}</span>
              </button>
            ))}
            {!loadingCatalogs && !workflows.length ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No hay flujos activos.</p>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 space-y-4 p-4">
          {busy ? (
            <div className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando receta...
            </div>
          ) : selectedWorkflow ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{selectedWorkflow.name}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Una aplicación de esta receta corresponde a un pedido.</p>
                </div>
                <SystemButton
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={addItem}
                  disabled={!canManage || items.length >= supplyOptions.length}
                >
                  Agregar insumo
                </SystemButton>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Notas</span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={!canManage}
                  placeholder="Indicaciones opcionales para esta receta"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.key} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1.6fr)_8rem_minmax(8rem,0.8fr)_2.5rem]">
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Insumo</span>
                      <select
                        value={item.supplySkuId}
                        onChange={(event) => {
                          const option = supplyOptions.find((row) => row.id === event.target.value);
                          updateItem(item.key, { supplySkuId: event.target.value, unitId: option?.unitId || item.unitId });
                        }}
                        disabled={!canManage}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Selecciona un insumo</option>
                        {supplyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Cantidad</span>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                        disabled={!canManage}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Unidad</span>
                      <select
                        value={item.unitId}
                        onChange={(event) => updateItem(item.key, { unitId: event.target.value })}
                        disabled={!canManage}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Selecciona</option>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                      disabled={!canManage}
                      aria-label="Quitar insumo"
                      className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {!items.length ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
                    <FlaskConical className="mx-auto h-7 w-7 text-muted-foreground/60" />
                    <p className="mt-3 text-sm font-medium">Este flujo todavía no tiene receta</p>
                    <p className="mt-1 text-xs text-muted-foreground">Agrega los insumos que utilizará una vez por pedido.</p>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}
