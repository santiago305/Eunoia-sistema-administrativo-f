import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { listWorkflows } from "@/features/workflows/services/workflowService";
import { assignSaleOrderWorkflow } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";

type Props = {
  open: boolean;
  saleOrderId: string;
  onClose: () => void;
  onAssigned: () => void | Promise<void>;
};

export function WorkflowAssignmentModal({ open, saleOrderId, onClose, onAssigned }: Props) {
  const [workflowId, setWorkflowId] = useState("");
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setWorkflowId("");
    setError("");
    void listWorkflows()
      .then((items) =>
        setOptions(items.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.name }))),
      )
      .catch((err) => setError(parseApiError(err)));
  }, [open]);

  const assign = async () => {
    if (!workflowId) return;
    setLoading(true);
    setError("");
    try {
      await assignSaleOrderWorkflow(saleOrderId, workflowId);
      await onAssigned();
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} preventClose={loading} title="Asignar workflow" className="w-[420px]">
      <div className="space-y-3">
        <FloatingSelect
          label="Workflow"
          name="workflow-assignment"
          value={workflowId}
          onChange={setWorkflowId}
          options={options}
          searchable
        />
        {error ? <div className="rounded bg-rose-50 p-2 text-xs text-rose-700">{error}</div> : null}
        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose} disabled={loading}>Cerrar</SystemButton>
          <SystemButton onClick={() => void assign()} disabled={!workflowId || loading} loading={loading}>Asignar</SystemButton>
        </div>
      </div>
    </Modal>
  );
}import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowDraft } from "@/features/workflows/types/workflow";
import { WorkflowStateNode } from "./WorkflowStateNode";

type Props = {
  draft: WorkflowDraft;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveState: (clientId: string, positionX: number, positionY: number) => void;
  onConnect: (from: string, to: string) => void;
};

const nodeTypes = { workflowState: WorkflowStateNode };

export function WorkflowCanvas({ draft, selectedId, onSelect, onMoveState, onConnect }: Props) {
  const nodes = useMemo<Node[]>(
    () =>
      draft.states.map((state) => ({
        id: state.clientId,
        type: "workflowState",
        position: { x: state.positionX ?? 0, y: state.positionY ?? 0 },
        data: { state },
        selected: selectedId === state.clientId,
      })),
    [draft.states, selectedId],
  );
  const edges = useMemo<Edge[]>(
    () =>
      draft.transitions.map((transition) => ({
        id: transition.clientId,
        source: transition.fromStateClientId,
        target: transition.toStateClientId,
        label: [
          transition.name,
          ...transition.conditions.map((condition) => condition.type),
        ].filter(Boolean).join(" | "),
        selected: selectedId === transition.clientId,
        animated: transition.isActive,
      })),
    [draft.transitions, selectedId],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      onPaneClick={() => onSelect(null)}
      onNodeClick={(_, node) => onSelect(node.id)}
      onEdgeClick={(_, edge) => onSelect(edge.id)}
      onNodeDragStop={(_, node) => onMoveState(node.id, node.position.x, node.position.y)}
      onConnect={(connection: Connection) => {
        if (connection.source && connection.target) onConnect(connection.source, connection.target);
      }}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

import type {
  ConditionCatalogItem,
  WorkflowCondition,
} from "@/features/workflows/types/workflow";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  catalog: ConditionCatalogItem[];
  value: WorkflowCondition[];
  onChange: (conditions: WorkflowCondition[]) => void;
};

export function WorkflowConditionEditor({ catalog, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-black/65">Condiciones</div>
      {value.map((condition, index) => {
        const definition = catalog.find((item) => item.type === condition.type);
        const requiresDate =
          condition.type === "DATE_AFTER" ||
          condition.type === "DATE_BEFORE" ||
          JSON.stringify(definition?.configSchema ?? {}).includes("date");
        return (
          <div key={`${condition.type}-${index}`} className="rounded-lg border border-black/10 p-2">
            <select
              className="h-9 w-full rounded-md border border-black/10 px-2 text-xs"
              value={condition.type}
              onChange={(event) => {
                const next = [...value];
                next[index] = { type: event.target.value as WorkflowCondition["type"], config: {} };
                onChange(next);
              }}
            >
              {catalog.map((item) => (
                <option key={item.type} value={item.type}>{item.label}</option>
              ))}
            </select>
            {definition?.description ? <p className="mt-1 text-[10px] text-black/45">{definition.description}</p> : null}
            {requiresDate ? (
              <input
                type="datetime-local"
                className="mt-2 h-9 w-full rounded-md border border-black/10 px-2 text-xs"
                value={typeof condition.config.date === "string" ? condition.config.date.slice(0, 16) : ""}
                onChange={(event) => {
                  const next = [...value];
                  next[index] = { ...condition, config: { ...condition.config, date: event.target.value } };
                  onChange(next);
                }}
              />
            ) : null}
            <SystemButton
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            >
              Quitar
            </SystemButton>
          </div>
        );
      })}
      <SystemButton
        type="button"
        size="sm"
        variant="outline"
        disabled={!catalog.length}
        onClick={() => {
          const first = catalog[0];
          if (first) onChange([...value, { type: first.type, config: {} }]);
        }}
      >
        Agregar condicion
      </SystemButton>
    </div>
  );
}import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
  createFullWorkflow,
  getWorkflow,
  listWorkflowConditions,
  listWorkflows,
  updateFullWorkflow,
} from "@/features/workflows/services/workflowService";
import type {
  ConditionCatalogItem,
  Workflow,
  WorkflowDraft,
  WorkflowDraftState,
  WorkflowDraftTransition,
} from "@/features/workflows/types/workflow";
import {
  buildFullWorkflowRequest,
  createDraftState,
  createDraftTransition,
  createEmptyWorkflowDraft,
  mapSaveResponseToDraft,
  mapWorkflowToDraft,
  validateWorkflowDraft,
} from "@/features/workflows/utils/workflowDraft";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowPropertiesPanel } from "./WorkflowPropertiesPanel";
import { Checkbox } from "@/shared/components/ui/checkbox";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WorkflowEditorModal({ open, onClose }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
  const [draft, setDraft] = useState<WorkflowDraft>(createEmptyWorkflowDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validation = useMemo(() => validateWorkflowDraft(draft), [draft]);

  const workflowOptions = useMemo(
    () =>
      workflows.map((workflow) => ({
        value: workflow.id,
        label: workflow.name,
      })),
    [workflows],
  );

  const loadCatalogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [workflowItems, conditionItems] = await Promise.all([
        listWorkflows(),
        listWorkflowConditions(),
      ]);

      setWorkflows(workflowItems);
      setConditions(conditionItems);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setDraft(createEmptyWorkflowDraft());
    setSelectedId(null);
    void loadCatalogs();
  }, [loadCatalogs, open]);

  const loadWorkflow = async (id: string) => {
    if (!id) {
      setDraft(createEmptyWorkflowDraft());
      setSelectedId(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const workflow = await getWorkflow(id);
      setDraft(mapWorkflowToDraft(workflow));
      setSelectedId(null);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!validation.valid) return;

    setSaving(true);
    setError("");

    try {
      const request = buildFullWorkflowRequest(draft);

      const response = draft.id
        ? await updateFullWorkflow(draft.id, request)
        : await createFullWorkflow(request);

      const persisted = mapSaveResponseToDraft(response);

      setDraft(persisted);
      setSelectedId(null);
      await loadCatalogs();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const replaceState = (state: WorkflowDraftState) =>
    setDraft((current) => ({
      ...current,
      states: current.states.map((item) =>
        item.clientId === state.clientId ? state : item,
      ),
    }));

  const replaceTransition = (transition: WorkflowDraftTransition) =>
    setDraft((current) => ({
      ...current,
      transitions: current.transitions.map((item) =>
        item.clientId === transition.clientId ? transition : item,
      ),
    }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Diseñador de workflows"
      closeOnOverlayClick={false}
      preventClose={saving}
      className="h-[calc(95vh-1rem)] w-[calc(100vw-1rem)] max-h-none max-w-none"
      bodyClassName="h-full p-0"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
        <header className="border-b border-black/10 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid flex-1 min-w-[500px] grid-cols-[260px_1fr] gap-2">
              <FloatingSelect
                label="Workflow"
                name="workflow"
                value={draft.id ?? ""}
                disabled={loading || saving}
                onChange={(value) => void loadWorkflow(value)}
                options={[{ value: "", label: "Nuevo workflow" }, ...workflowOptions]}
                searchable
                searchPlaceholder="Buscar workflow..."
                emptyMessage="Sin workflows"
                className="h-9 text-xs"
              />

              <FloatingInput
                label="Nombre del workflow"
                name="workflow-name"
                value={draft.name}
                disabled={loading || saving}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>

            <label className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-medium">
              <Checkbox
                checked={draft.isActive}
                disabled={loading || saving}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: checked === true,
                  }))
                }
              />
              <span>Activo</span>
            </label>
            <SystemButton
              type="button"
              variant="outline"
              disabled={loading || saving}
              onClick={() => {
                setDraft(createEmptyWorkflowDraft());
                setSelectedId(null);
                setError("");
              }}
            >
              Limpiar
            </SystemButton>
            <SystemButton
              type="button"
              leftIcon={<Save className="h-4 w-4" />}
              disabled={!validation.valid || saving || loading}
              loading={saving}
              onClick={() => void save()}
            >
              {draft.id ? "Actualizar" : "Crear"}
            </SystemButton>
          </div>
        </header>
        <div className="grid min-h-0 grid-cols-[240px_1fr_300px]">
          <aside className="scroll-area overflow-auto border-r border-black/10 p-3">
            <FloatingInput
              label="Descripcion"
              name="workflow-description"
              value={draft.description}
              disabled={loading || saving}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="h-9 text-xs"
            />
            <SystemButton
              type="button"
              className="mt-3 w-full"
              variant="outline"
              disabled={loading || saving}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  states: [
                    ...current.states,
                    createDraftState(current.states.length),
                  ],
                }))
              }
            >
              Agregar estado
            </SystemButton>

            <div className="mt-4 space-y-1">
              {draft.states.map((state) => (
                <button
                  key={state.clientId}
                  type="button"
                  className="block w-full truncate rounded-md px-2 py-2 text-left text-xs hover:bg-black/[0.04]"
                  onClick={() => setSelectedId(state.clientId)}
                >
                  {state.name}
                </button>
              ))}
            </div>

            {!validation.valid ? (
              <div className="mt-4 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">
                {validation.errors.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
          </aside>

          <main className="min-h-0 bg-slate-50">
            <WorkflowCanvas
              draft={draft}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveState={(id, x, y) =>
                setDraft((current) => ({
                  ...current,
                  states: current.states.map((state) =>
                    state.clientId === id
                      ? { ...state, positionX: x, positionY: y }
                      : state,
                  ),
                }))
              }
              onConnect={(from, to) => {
                const transition = createDraftTransition(from, to);

                setDraft((current) => ({
                  ...current,
                  transitions: [...current.transitions, transition],
                }));

                setSelectedId(transition.clientId);
              }}
            />
          </main>

          <aside className="scroll-area overflow-auto border-l border-black/10">
            <WorkflowPropertiesPanel
              draft={draft}
              selectedId={selectedId}
              conditionCatalog={conditions}
              onStateChange={replaceState}
              onTransitionChange={replaceTransition}
              onRemoveState={(id) => {
                if (
                  !window.confirm(
                    "¿Eliminar este estado y sus transiciones del workflow?",
                  )
                ) {
                  return;
                }
                setDraft((current) => ({
                  ...current,
                  states: current.states.filter(
                    (state) => state.clientId !== id,
                  ),
                  transitions: current.transitions.filter(
                    (transition) =>
                      transition.fromStateClientId !== id &&
                      transition.toStateClientId !== id,
                  ),
                }));
                setSelectedId(null);
              }}
              onRemoveTransition={(id) => {
                setDraft((current) => ({
                  ...current,
                  transitions: current.transitions.filter(
                    (transition) => transition.clientId !== id,
                  ),
                }));

                setSelectedId(null);
              }}
            />
          </aside>
        </div>
      </div>
    </Modal>
  );
}import type {
  ConditionCatalogItem,
  WorkflowDraft,
  WorkflowDraftState,
  WorkflowDraftTransition,
} from "@/features/workflows/types/workflow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";

type Props = {
  draft: WorkflowDraft;
  selectedId: string | null;
  conditionCatalog: ConditionCatalogItem[];
  onStateChange: (state: WorkflowDraftState) => void;
  onTransitionChange: (transition: WorkflowDraftTransition) => void;
  onRemoveState: (clientId: string) => void;
  onRemoveTransition: (clientId: string) => void;
};

const inputClass = "h-9 w-full rounded-md border border-black/10 px-2 text-xs";

export function WorkflowPropertiesPanel(props: Props) {
  const state = props.draft.states.find((item) => item.clientId === props.selectedId);
  const transition = props.draft.transitions.find((item) => item.clientId === props.selectedId);

  if (!state && !transition) {
    return <div className="p-4 text-xs text-black/50">Selecciona un estado o una transicion para editarlo.</div>;
  }
  if (state) {
    const patch = (next: Partial<WorkflowDraftState>) => props.onStateChange({ ...state, ...next });
    return (
      <div className="space-y-3 p-4">
        <div className="text-sm font-semibold">Propiedades del estado</div>
        <input className={inputClass} value={state.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Nombre" />
        <input className={inputClass} value={state.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} placeholder="Codigo" />
        <input className="h-9 w-full" type="color" value={state.color ?? "#64748b"} onChange={(e) => patch({ color: e.target.value })} />
        {(["isInitial", "isFinal", "isActive"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={state[key]} onChange={(e) => patch({ [key]: e.target.checked })} />
            {key === "isInitial" ? "Estado inicial" : key === "isFinal" ? "Estado final" : "Activo"}
          </label>
        ))}
        <SystemButton type="button" variant="outline" onClick={() => patch({ isActive: false })}>Desactivar</SystemButton>
        <SystemButton type="button" variant="outline" onClick={() => props.onRemoveState(state.clientId)}>Eliminar del workflow</SystemButton>
      </div>
    );
  }
  const patch = (next: Partial<WorkflowDraftTransition>) =>
    props.onTransitionChange({ ...transition!, ...next });
  return (
    <div className="space-y-3 p-4">
      <div className="text-sm font-semibold">Propiedades de la transicion</div>
      <input className={inputClass} value={transition!.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Nombre" />
      <input className={inputClass} value={transition!.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} placeholder="Codigo" />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={transition!.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
        Activa
      </label>
      <WorkflowConditionEditor
        catalog={props.conditionCatalog}
        value={transition!.conditions}
        onChange={(conditions) => patch({ conditions })}
      />
      <SystemButton type="button" variant="outline" onClick={() => patch({ isActive: false })}>Desactivar</SystemButton>
      <SystemButton type="button" variant="outline" onClick={() => props.onRemoveTransition(transition!.clientId)}>Eliminar del workflow</SystemButton>
    </div>
  );
}
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowDraftState } from "@/features/workflows/types/workflow";

export function WorkflowStateNode({ data, selected }: NodeProps) {
  const state = data.state as WorkflowDraftState;
  return (
    <div
      className={`min-w-44 rounded-xl border bg-white p-3 shadow-sm ${selected ? "ring-2 ring-primary/40" : ""} ${
        state.isActive ? "" : "opacity-55"
      }`}
      style={{ borderColor: state.color ?? "#cbd5e1" }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: state.color ?? "#64748b" }} />
        <span className="truncate text-xs font-semibold text-black/80">{state.name || "Sin nombre"}</span>
      </div>
      <div className="mt-1 text-[10px] text-black/45">{state.code || "SIN_CODIGO"}</div>
      <div className="mt-2 flex gap-1">
        {state.isInitial ? <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] text-sky-700">Inicial</span> : null}
        {state.isFinal ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">Final</span> : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

