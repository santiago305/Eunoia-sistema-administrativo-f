import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleDot, Flag, Pencil, Plus, Save } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  ActionCatalogItem,
  ConditionCatalogItem,
  SaleOrderState,
  Workflow,
  WorkflowDraft,
  WorkflowDraftState,
  WorkflowDraftTransition,
} from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";
import {
  associateCancelSaleOrderState,
  buildFullWorkflowRequest,
  createGlobalRunActionTransition,
  createDraftState,
  createDraftTransition,
  createEmptyWorkflowDraft,
  mapFullWorkflowResponseToDraft,
  mapSaveResponseToDraft,
  removeWorkflowElement,
  validateWorkflowDraft,
} from "@/features/workflows/utils/workflowDraft";
import {
  applyTransitionCardConnection,
  clearTransitionElseBranch,
  getTransitionIdFromCard,
} from "@/features/workflows/utils/workflowTransitionCard";
import { getDestinationStateName } from "@/features/workflows/utils/workflowConnections";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowGlobalTransitions } from "./WorkflowGlobalTransitions";
import { WorkflowPropertiesPanel } from "./WorkflowPropertiesPanel";
import { SaleOrderStateFormModal } from "./SaleOrderStateFormModal";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { listWorkflows, listWorkflowConditions, listWorkflowActions, listSaleOrderStates, getWorkflow, updateFullWorkflow, createFullWorkflow } from "@/shared/services/workflowService";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CANCEL_STATE_NAME = "Cancelado";
const CANCEL_STATE_COLOR = "#ef4444";
const CANCEL_TRANSITION_NAME = "Cancelar";

const createClientId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isSystemCancelState = (state: WorkflowDraftState) =>
  state.isSystem === true &&
  state.name.trim().toLowerCase() === CANCEL_STATE_NAME.toLowerCase();

const findCancelSaleOrderState = (states: SaleOrderState[]) =>
  states.find(
    (state) =>
      state.code?.trim().toUpperCase() === "CANCELLED" ||
      state.name.trim().toLowerCase() === CANCEL_STATE_NAME.toLowerCase(),
  );

const ensureDefaultCancelTransition = (draft: WorkflowDraft): WorkflowDraft => {
  const existingCancelState = draft.states.find(isSystemCancelState);

  const cancelState: WorkflowDraftState =
    existingCancelState ??
    ({
      ...createDraftState(
        draft.states.length,
        CANCEL_STATE_NAME,
        CANCEL_STATE_COLOR,
      ),
      name: CANCEL_STATE_NAME,
      color: CANCEL_STATE_COLOR,
      code: "CANCELADO",
      isFinal: false,
      isActive: true,
      isSystem: true,
      positionX: -9999,
      positionY: -9999,
    } as WorkflowDraftState);

  const states = existingCancelState
    ? draft.states.map((state) =>
        state.clientId === existingCancelState.clientId
          ? {
              ...state,
              name: CANCEL_STATE_NAME,
              color: CANCEL_STATE_COLOR,
              code: state.code || "CANCELADO",
              isFinal: false,
              isActive: true,
              isSystem: true,
            }
          : state,
      )
    : [...draft.states, cancelState];

  const cancelStateId = cancelState.clientId;

  const existingCancelTransition = draft.transitions.find(
    (transition) =>
      transition.isGlobal &&
      transition.purpose === TRANSITION_PURPOSES.CANCEL,
  );

  const normalizedExistingTransitions = draft.transitions.map((transition) => {
    if (transition.clientId === existingCancelTransition?.clientId) {
      return {
        ...transition,
        name: transition.name || CANCEL_TRANSITION_NAME,
        code: transition.code || "CANCEL",
        isGlobal: true,
        isActive: true,
        isSystem: true,
        effect: TRANSITION_EFFECTS.MOVE_STATE,
        purpose: TRANSITION_PURPOSES.CANCEL,
        fromStateClientId: null,
        toStateClientId: cancelStateId,
        sourceHandle: null,
        targetHandle: null,
        excludedStateClientIds: Array.from(
          new Set([...(transition.excludedStateClientIds ?? []), cancelStateId]),
        ),
        positionX: transition.positionX ?? -320,
        positionY: transition.positionY ?? 0,
      };
    }

    if (transition.isGlobal) {
      return {
        ...transition,
        purpose: TRANSITION_PURPOSES.STANDARD,
      };
    }

    return transition;
  });

  if (existingCancelTransition) {
    return {
      ...draft,
      states,
      transitions: normalizedExistingTransitions,
    };
  }

  const defaultCancelTransition: WorkflowDraftTransition = {
    clientId: createClientId("transition"),
    name: CANCEL_TRANSITION_NAME,
    code: "CANCEL",
    isGlobal: true,
    isActive: true,
    isSystem: true,
    effect: TRANSITION_EFFECTS.MOVE_STATE,
    purpose: TRANSITION_PURPOSES.CANCEL,
    fromStateClientId: null,
    toStateClientId: cancelStateId,
    elseToStateClientId: null,
    sourceHandle: null,
    targetHandle: null,
    excludedStateClientIds: [cancelStateId],
    conditions: [],
    actions: [],
    elseActions: [],
    autoTrigger: false,
    priority: 0,
    elseEffect: null,
    positionX: -320,
    positionY: 0,
  };

  return {
    ...draft,
    states,
    transitions: [...normalizedExistingTransitions, defaultCancelTransition],
  };
};

export function WorkflowEditorModal({ open, onClose }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
  const [actions, setActions] = useState<ActionCatalogItem[]>([]);
  const [saleOrderStates, setSaleOrderStates] = useState<SaleOrderState[]>([]);
  const saleOrderStatesRef = useRef<SaleOrderState[]>([]);
  const [draft, setDraft] = useState<WorkflowDraft>(() =>
    ensureDefaultCancelTransition(createEmptyWorkflowDraft()),
  );
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [viewportCenter, setViewportCenter] = useState({
    positionX: 0,
    positionY: 0,
  });
  const [saleOrderStateId, setSaleOrderStateId] = useState("");
  const [stateModalMode, setStateModalMode] = useState<"create" | "edit" | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [panelWidth, setPanelWidth] = useState(320);
  const [isPanelResizing, setIsPanelResizing] = useState(false);

  const panelResizeRef = useRef({
    active: false,
    startX: 0,
    startWidth: 320,
  });
  const baseCatalogsLoadedRef = useRef(false);
  const baseCatalogsLoadingRef = useRef(false);
  const transitionCatalogsLoadedRef = useRef(false);
  const transitionCatalogsLoadingRef = useRef(false);

  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    type: "state" | "transition";
  } | null>(null);

  const validation = useMemo(() => validateWorkflowDraft(draft), [draft]);

  const workflowOptions = useMemo(
    () =>
      workflows.map((workflow) => ({
        value: workflow.id,
        label: workflow.name,
      })),
    [workflows],
  );

  const saleOrderStateOptions = useMemo(
    () =>
      saleOrderStates
        .filter((state) => state.id)
        .map((state) => ({
          value: state.id ?? "",
          label: state.name,
        })),
    [saleOrderStates],
  );

  const selectedSaleOrderState = useMemo(
    () => saleOrderStates.find((state) => state.id === saleOrderStateId),
    [saleOrderStateId, saleOrderStates],
  );

  const startPanelResize = (
  event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (!showPanel) return;

      event.preventDefault();

      panelResizeRef.current = {
        active: true,
        startX: event.clientX,
        startWidth: panelWidth,
      };

      setIsPanelResizing(true);

      event.currentTarget.setPointerCapture(event.pointerId);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };

    const resizePanel = (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (!panelResizeRef.current.active) return;

      /*
      * Como el panel está a la derecha:
      * mover el mouse hacia la izquierda aumenta el ancho.
      */
      const movement =
        panelResizeRef.current.startX - event.clientX;

      const newWidth =
        panelResizeRef.current.startWidth + movement;

      setPanelWidth(
        Math.max(
          260,
          Math.min(520, newWidth),
        ),
      );
    };

    const stopPanelResize = (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (!panelResizeRef.current.active) return;

      panelResizeRef.current.active = false;
      setIsPanelResizing(false);

      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

  useEffect(() => {
    if (!saleOrderStates.length) return;

    const cancelSaleOrderState = findCancelSaleOrderState(saleOrderStates);
    if (!cancelSaleOrderState?.id) return;

    setDraft((current) => associateCancelSaleOrderState(current, cancelSaleOrderState));
  }, [saleOrderStates]);

  const loadCatalogs = useCallback(async () => {
    if (baseCatalogsLoadedRef.current || baseCatalogsLoadingRef.current) return;

    baseCatalogsLoadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const [workflowItems, stateItems] =
        await Promise.all([
          listWorkflows(),
          listSaleOrderStates(),
        ]);

      setWorkflows(workflowItems);
      saleOrderStatesRef.current = stateItems;
      setSaleOrderStates(stateItems);
      const cancelSaleOrderState = findCancelSaleOrderState(stateItems);
      if (cancelSaleOrderState) {
        setDraft((current) => associateCancelSaleOrderState(current, cancelSaleOrderState));
      }
      baseCatalogsLoadedRef.current = true;
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      baseCatalogsLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadTransitionCatalogs = useCallback(async () => {
    if (transitionCatalogsLoadedRef.current || transitionCatalogsLoadingRef.current) return;

    transitionCatalogsLoadingRef.current = true;
    setError("");

    try {
      const [conditionItems, actionItems] = await Promise.all([
        listWorkflowConditions(),
        listWorkflowActions(),
      ]);

      setConditions(conditionItems);
      setActions(actionItems);
      transitionCatalogsLoadedRef.current = true;
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      transitionCatalogsLoadingRef.current = false;
    }
  }, []);

  const refreshSaleOrderStates = useCallback(
    async (selectedStateId?: string | null) => {
      try {
        const stateItems = await listSaleOrderStates();
        saleOrderStatesRef.current = stateItems;
        setSaleOrderStates(stateItems);
        if (selectedStateId) setSaleOrderStateId(selectedStateId);
      } catch (err) {
        setError(parseApiError(err));
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    const emptyDraft = ensureDefaultCancelTransition(createEmptyWorkflowDraft());
    const cancelSaleOrderState = findCancelSaleOrderState(saleOrderStatesRef.current);
    setDraft(
      cancelSaleOrderState
        ? associateCancelSaleOrderState(emptyDraft, cancelSaleOrderState)
        : emptyDraft,
    );
    setCanvasRevision((current) => current + 1);
    setSelectedId(null);
    void loadCatalogs();
  }, [loadCatalogs, open]);

  useEffect(() => {
    if (!open || !showPanel || !selectedId) return;
    const selectedTransition = draft.transitions.some(
      (transition) => transition.clientId === selectedId,
    );
    if (!selectedTransition) return;

    void loadTransitionCatalogs();
  }, [draft.transitions, loadTransitionCatalogs, open, selectedId, showPanel]);

  const loadWorkflow = async (id: string) => {
    if (!id) {
      const emptyDraft = ensureDefaultCancelTransition(createEmptyWorkflowDraft());
      const cancelSaleOrderState = findCancelSaleOrderState(saleOrderStates);
      setDraft(
        cancelSaleOrderState
          ? associateCancelSaleOrderState(emptyDraft, cancelSaleOrderState)
          : emptyDraft,
      );
      setCanvasRevision((current) => current + 1);
      setSelectedId(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getWorkflow(id);
      setDraft(ensureDefaultCancelTransition(mapFullWorkflowResponseToDraft(response)));
      setCanvasRevision((current) => current + 1);
      setSelectedId(null);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!validation.valid) {
      setShowValidationAlert(true);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const request = buildFullWorkflowRequest(draft);

      const response = draft.id
        ? await updateFullWorkflow(draft.id, request)
        : await createFullWorkflow(request);

      const persisted = ensureDefaultCancelTransition(mapSaveResponseToDraft(response));

      setDraft(persisted);
      setSelectedId(null);
      setWorkflows((current) => {
        const savedWorkflow: Workflow = {
          id: response.workflow.id,
          name: response.workflow.name,
          description: response.workflow.description,
          isActive: response.workflow.isActive,
          createdAt: response.workflow.createdAt,
          updatedAt: response.workflow.updatedAt,
          states: response.states,
          transitions: [],
        };

        const exists = current.some((workflow) => workflow.id === savedWorkflow.id);
        if (exists) {
          return current.map((workflow) =>
            workflow.id === savedWorkflow.id ? { ...workflow, ...savedWorkflow } : workflow,
          );
        }

        return [...current, savedWorkflow];
      });
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
    setDraft((current) =>
      ensureDefaultCancelTransition({
        ...current,
        transitions: current.transitions.map((item) =>
          item.clientId === transition.clientId ? transition : item,
        ),
      }),
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Diseñador de flujos"
      closeOnOverlayClick={false}
      preventClose={saving}
      className="h-[calc(95vh-1rem)] w-[calc(100vw-1rem)] max-h-none max-w-none"
      bodyClassName="h-full p-0"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
        <header className="border-b border-black/10 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-[500px] flex-1 grid-cols-[260px_1fr] gap-2">
              <FloatingSelect
                label="Flujos"
                name="workflow"
                value={draft.id ?? ""}
                disabled={loading || saving}
                onChange={(value) => void loadWorkflow(value)}
                options={workflowOptions}
                searchable
                emptyMessage="Sin flujos"
                className="h-9 text-xs"
              />

              <FloatingInput
                label="Nombre del flujo"
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
            <SystemButton
              type="button"
              variant="outline"
              disabled={loading || saving}
              onClick={() => {
                const emptyDraft = ensureDefaultCancelTransition(createEmptyWorkflowDraft());
                const cancelSaleOrderState = findCancelSaleOrderState(saleOrderStates);
                setDraft(
                  cancelSaleOrderState
                    ? associateCancelSaleOrderState(emptyDraft, cancelSaleOrderState)
                    : emptyDraft,
                );
                setCanvasRevision((current) => current + 1);
                setSelectedId(null);
                setError("");
              }}
            >
              Limpiar
            </SystemButton>

            <SystemButton
              type="button"
              leftIcon={<Save className="h-4 w-4" />}
              disabled={saving || loading}
              loading={saving}
              onClick={() => void save()}
            >
              {draft.id ? "Actualizar" : "Crear"}
            </SystemButton>
          </div>
        </header>

        <div className="relative flex min-h-0 overflow-hidden">          
          <aside className="scroll-area w-[240px] shrink-0 overflow-auto border-r border-black/10 p-3">            
            <div className="grid grid-cols-[1fr_auto_auto] gap-1">
              <FloatingSelect
                label="Estado"
                name="workflow-sale-order-state"
                value={saleOrderStateId}
                disabled={loading || saving}
                onChange={setSaleOrderStateId}
                options={saleOrderStateOptions}
                searchable
                searchPlaceholder="Buscar estado..."
                emptyMessage="Sin estados"
                className="h-9 text-xs"
              />

              <SystemButton
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={loading || saving}
                onClick={() => setStateModalMode("create")}
                aria-label="Crear estado"
                title="Crear estado"
              >
                <Plus className="h-4 w-4" />
              </SystemButton>

              <SystemButton
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={loading || saving || !saleOrderStateId}
                onClick={() => setStateModalMode("edit")}
                aria-label="Editar estado"
                title="Editar estado"
              >
                <Pencil className="h-4 w-4" />
              </SystemButton>
            </div>

            <SystemButton
              type="button"
              className="mt-3 w-full"
              variant="outline"
              size="sm"
              disabled={loading || saving || !selectedSaleOrderState}
              onClick={() =>
              setDraft((current) => {
                const visibleStates = current.states.filter(
                  (state) => !isSystemCancelState(state),
                );
                const isFirstVisibleState = visibleStates.length === 0;
                const state = {
                  ...createDraftState(
                    current.states.length,
                    selectedSaleOrderState?.name,
                    selectedSaleOrderState?.color,
                    selectedSaleOrderState?.id ?? "",
                  ),
                  code: selectedSaleOrderState?.code ?? "",
                  isInitial: isFirstVisibleState,
                  isFinal: false,
                  isActive: true,
                  positionX: viewportCenter.positionX,
                  positionY: viewportCenter.positionY,
                };
                setSelectedId(state.clientId);
                return {
                  ...current,
                  states: [
                    ...current.states.map((item) =>
                      isFirstVisibleState ? { ...item, isInitial: false } : item,
                    ),
                    state,
                  ],
                };
              })
            }
            >
              Agregar estado
            </SystemButton>

          <div className="mt-4 space-y-1">
          {draft.states
            .filter((state) => !isSystemCancelState(state))
            .map((state) => (
              <button
                key={state.clientId}
                type="button"
                className={`block w-full rounded-md border px-2 py-2 text-left text-xs ${
                  selectedId === state.clientId
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:bg-black/[0.04]"
                }`}
                onClick={() => setSelectedId(state.clientId)}
              >
                <div className="flex items-center gap-1.5">
                  <CircleDot
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: state.color ?? "#64748b" }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {state.name || "Estado sin nombre"}
                    </div>
                  </div>
                </div>

                {(state.isInitial || state.isFinal || !state.isActive) ? (
                  <div className="mt-1 flex flex-wrap gap-1 pl-5">
                    {state.isInitial ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium text-sky-700">
                        <Flag className="h-3 w-3" />
                        Inicial
                      </span>
                    ) : null}

                    {state.isFinal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                        Final
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            ))}

          {!draft.states.filter((state) => !isSystemCancelState(state)).length ? (
            <div className="rounded-md bg-black/[0.025] px-2 py-3 text-[10px] text-black/45">
              Sin estados agregados.
            </div>
          ) : null}
        </div>
            <WorkflowGlobalTransitions
              draft={draft}
              selectedId={selectedId}
              disabled={loading || saving}
              onSelect={setSelectedId}
              onAddRunAction={() => {
              setDraft((current) => {
                const transition = {
                  ...createGlobalRunActionTransition(),
                  isGlobal: true,
                  effect: TRANSITION_EFFECTS.RUN_ACTIONS,
                  purpose: TRANSITION_PURPOSES.STANDARD,
                  positionX: viewportCenter.positionX,
                  positionY: viewportCenter.positionY,
                };
                setSelectedId(transition.clientId);
                return ensureDefaultCancelTransition({
                  ...current,
                  transitions: [...current.transitions, transition],
                });
              });
            }}
            />

            {error ? (
              <div className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 flex-1 bg-slate-50">            
            <WorkflowCanvas
              key={canvasRevision}
              draft={draft}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onViewportCenterChange={setViewportCenter}
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
              onMoveGlobalTransition={(id, x, y) =>
                setDraft((current) => ({
                  ...current,
                  transitions: current.transitions.map((transition) =>
                    transition.clientId === id
                      ? { ...transition, positionX: x, positionY: y }
                      : transition,
                  ),
                }))
              }
              onMoveTransitionCard={(id, x, y) =>
                setDraft((current) => ({
                  ...current,
                  transitions: current.transitions.map((transition) =>
                    transition.clientId === id
                      ? { ...transition, positionX: x, positionY: y }
                      : transition,
                  ),
                }))
              }
              onConnect={(from, to, sourceHandle, targetHandle) => {
                setDraft((current) => {
                  const cardTransitionId = getTransitionIdFromCard(from);
                  if (cardTransitionId) {
                    const transition = current.transitions.find(
                      (item) => item.clientId === cardTransitionId,
                    );
                    if (!transition) return current;
                    const updated = applyTransitionCardConnection(transition, {
                      source: from,
                      sourceHandle,
                      target: to,
                    });
                    if (!updated) return current;
                    setSelectedId(updated.clientId);
                    return {
                      ...current,
                      transitions: current.transitions.map((item) =>
                        item.clientId === updated.clientId ? updated : item,
                      ),
                    };
                  }
                  const transition = {
                    ...createDraftTransition(
                      from,
                      to,
                      false,
                      TRANSITION_PURPOSES.STANDARD,
                      getDestinationStateName(current.states, to),
                    ),
                    isGlobal: false,
                    effect: TRANSITION_EFFECTS.MOVE_STATE,
                    purpose: TRANSITION_PURPOSES.STANDARD,
                    sourceHandle,
                    targetHandle,
                  };

                  setSelectedId(transition.clientId);

                  return {
                    ...current,
                    transitions: [...current.transitions, transition],
                  };
                });
              }}
              onDeleteElseBranch={(transitionId) =>
                setDraft((current) => ({
                  ...current,
                  transitions: current.transitions.map((transition) =>
                    transition.clientId === transitionId
                      ? clearTransitionElseBranch(transition)
                      : transition,
                  ),
                }))
              }
              onDeleteElement={(id, type) => setPendingRemoval({ id, type })}
            />
          </main>

          <aside
            style={{
              width: showPanel
                ? `min(${panelWidth}px, calc(100vw - 1rem))`
                : 44,
            }}
            className={`relative shrink-0 overflow-hidden border-l border-black/10 bg-white ${
              isPanelResizing
                ? ""
                : "transition-[width] duration-200"
            } max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-xl`}
          >
            {showPanel ? (
              <div
                role="separator"
                aria-label="Redimensionar panel de propiedades"
                aria-orientation="vertical"
                onPointerDown={startPanelResize}
                onPointerMove={resizePanel}
                onPointerUp={stopPanelResize}
                onPointerCancel={stopPanelResize}
                className="absolute inset-y-0 left-0 z-20 w-1.5 cursor-col-resize touch-none hover:bg-primary/20"
              />
            ) : null}

            <div className="flex h-full min-w-0 flex-col">
              <div
                className={`flex h-10 shrink-0 items-center border-b border-black/10 ${
                  showPanel
                    ? "justify-between px-2"
                    : "justify-center"
                }`}
              >

                <button
                  type="button"
                  aria-label={
                    showPanel
                      ? "Ocultar panel"
                      : "Mostrar panel"
                  }
                  aria-expanded={showPanel}
                  title={
                    showPanel
                      ? "Ocultar panel"
                      : "Mostrar panel"
                  }
                  onClick={() =>
                    setShowPanel((current) => !current)
                  }
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-black/60 hover:bg-black/[0.05] hover:text-black"
                  >
                  {showPanel ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
              </div>

              {showPanel ? (
                <div className="scroll-area min-h-0 flex-1 overflow-auto">
                  <WorkflowPropertiesPanel
                    draft={draft}
                    selectedId={selectedId}
                    conditionCatalog={conditions}
                    actionCatalog={actions}
                    onStateChange={replaceState}
                    onTransitionChange={replaceTransition}
                    onRemoveState={(id) =>
                      setPendingRemoval({
                        id,
                        type: "state",
                      })
                    }
                    onRemoveTransition={(id) =>
                      setPendingRemoval({
                        id,
                        type: "transition",
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <SaleOrderStateFormModal
        open={stateModalMode !== null}
        mode={stateModalMode ?? "create"}
        stateId={stateModalMode === "edit" ? saleOrderStateId : null}
        onClose={() => setStateModalMode(null)}
        onSaved={(state) => void refreshSaleOrderStates(state.id)}
      />

      <AlertModal
        open={showValidationAlert}
        type="warning"
        title="Errores de validación"
        hideCancel
        confirmText="Aceptar"
        onClose={() => setShowValidationAlert(false)}
        onConfirm={() => setShowValidationAlert(false)}
        message={
          <div className="space-y-1">
            {validation.errors.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        }
      />

      <AlertModal
        open={pendingRemoval !== null}
        type="deleted"
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (!pendingRemoval) return;

          setDraft((current) =>
            ensureDefaultCancelTransition(
              removeWorkflowElement(current, pendingRemoval.id),
            ),
          );
          setSelectedId(null);
          setPendingRemoval(null);
        }}
        message={"¿Esta seguro que desea eliminar este elemento?"}
      />
    </Modal>
  );
}
