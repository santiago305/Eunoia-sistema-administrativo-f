import type {
  SaveFullWorkflowRequest,
  SaveFullWorkflowResponse,
  Workflow,
  WorkflowAction,
  WorkflowCondition,
  WorkflowDraft,
  WorkflowDraftState,
  WorkflowDraftTransition,
  WorkflowDraftValidation,
  WorkflowTransitionEffect,
  WorkflowTransitionPurpose,
} from "@/features/workflows/types/workflow";
import { TRANSITION_EFFECTS, TRANSITION_PURPOSES } from "@/features/workflows/types/workflow";

const DEFAULT_COLOR = "#64748b";
const X_GAP = 240;
const Y_GAP = 130;

function clientId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyWorkflowDraft(): WorkflowDraft {
  return { name: "", description: "", isActive: true, states: [], transitions: [] };
}

export function createDraftState(
  index: number,
  name?: string,
  color = DEFAULT_COLOR,
  saleOrderStateId = "",
): WorkflowDraftState {
  return {
    clientId: clientId("state"),
    saleOrderStateId,
    name: name || `Estado ${index + 1}`,
    code: `STATE_${index + 1}`,
    color,
    position: index,
    positionX: 80,
    positionY: 160 + index * 100,
    isInitial: index === 0,
    isFinal: false,
    isActive: true,
  };
}
export function mapFullWorkflowResponseToDraft(response: SaveFullWorkflowResponse): WorkflowDraft {
  const conditionsByTransition = new Map<string, WorkflowCondition[]>();
  const actionsByTransition = new Map<string, WorkflowAction[]>();

  response.conditions.forEach((condition) => {
    const current = conditionsByTransition.get(condition.transitionId) ?? [];
    current.push(condition);
    conditionsByTransition.set(condition.transitionId, current);
  });
  response.actions.forEach((action) => {
    const current = actionsByTransition.get(action.transitionId) ?? [];
    current.push(action);
    actionsByTransition.set(action.transitionId, current);
  });

  return mapWorkflowToDraft({
    id: response.workflow.id,
    name: response.workflow.name,
    description: response.workflow.description,
    isActive: response.workflow.isActive,
    createdAt: response.workflow.createdAt,
    updatedAt: response.workflow.updatedAt,
    states: response.states,
    transitions: response.transitions.map((transition) => ({
      ...transition,
      conditions: (conditionsByTransition.get(transition.id) ?? []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      ),
      actions: (actionsByTransition.get(transition.id) ?? []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      ),
    })),
  });
}

export function createDraftTransition(
  fromStateClientId: string | null,
  toStateClientId: string | null,
  isGlobal = false,
  purpose: WorkflowTransitionPurpose = TRANSITION_PURPOSES.STANDARD,
  name?: string,
  effect: WorkflowTransitionEffect = TRANSITION_EFFECTS.MOVE_STATE,
): WorkflowDraftTransition {
  return {
    clientId: clientId("transition"),
    name: name || "Nueva transicion",
    code: `TRANSITION_${Date.now()}`,
    effect,
    fromStateClientId: isGlobal ? null : fromStateClientId,
    toStateClientId,
    isGlobal,
    excludedStateClientIds: [],
    purpose,
    isActive: true,
    conditions: [],
    actions: [],
  };
}

export function applyMissingStateLayout(states: WorkflowDraftState[]): WorkflowDraftState[] {
  return states.map((state, index) => ({
    ...state,
    positionX: state.positionX ?? 80 + (index % 4) * X_GAP,
    positionY: state.positionY ?? 100 + Math.floor(index / 4) * Y_GAP,
  }));
}

export function mapWorkflowToDraft(workflow: Workflow): WorkflowDraft {
  const cancelTransition = workflow.transitions.find(
    (transition) => transition.purpose === TRANSITION_PURPOSES.CANCEL,
  );
  const states = applyMissingStateLayout(
    workflow.states.map((state) => ({
      ...state,
      clientId: `state-${state.id}`,
      isSystem: state.id === cancelTransition?.toStateId,
    })),
  );
  const refs = new Map(states.map((state) => [state.id, state.clientId]));
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? "",
    isActive: workflow.isActive,
    states,
    transitions: workflow.transitions.map((transition) => ({
      id: transition.id,
      clientId: `transition-${transition.id}`,
      name: transition.name,
      code: transition.code,
      fromStateClientId: transition.fromStateId
        ? refs.get(transition.fromStateId) ?? transition.fromStateId
        : null,
      toStateClientId: transition.toStateId
        ? refs.get(transition.toStateId) ?? transition.toStateId
        : null,
      isGlobal: transition.isGlobal,
      excludedStateClientIds: (transition.excludedStateIds ?? []).map(
        (stateId) => refs.get(stateId) ?? stateId,
      ),
      purpose: transition.purpose ?? TRANSITION_PURPOSES.STANDARD,
      effect: transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE,
      isActive: transition.isActive,
      conditions: transition.conditions ?? [],
      actions: transition.actions ?? [],
      sourceHandle: transition.sourceHandle,
      targetHandle: transition.targetHandle,
      isSystem: transition.purpose === TRANSITION_PURPOSES.CANCEL,
    })),
  };
}

function normalizeCondition(condition: WorkflowCondition, index: number) {
  const config = { ...(condition.config ?? {}) };
  if (
    (condition.type === "DATE_AFTER" || condition.type === "DATE_BEFORE") &&
    typeof config.date === "string" &&
    config.date
  ) {
    const parsed = new Date(config.date);
    if (!Number.isNaN(parsed.getTime())) config.date = parsed.toISOString();
  }
  return { type: condition.type, config, position: condition.position ?? condition.sortOrder ?? index };
}

export function buildFullWorkflowRequest(draft: WorkflowDraft): SaveFullWorkflowRequest {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    isActive: draft.isActive,
    states: draft.states.map((state, index) => ({
      ...(state.id ? { id: state.id } : {}),
      clientId: state.clientId,
      saleOrderStateId: state.saleOrderStateId,
      position: state.position ?? index,
      positionX: state.positionX,
      positionY: state.positionY,
      isInitial: state.isInitial,
      isFinal: state.isFinal,
      isActive: state.isActive,
    })),
    transitions: draft.transitions.map((transition) => {
      const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
      return {
        id: transition.id,
        clientId: transition.clientId,
        code: transition.code.trim(),
        name: transition.name.trim(),
        effect,
        fromStateRef: transition.isGlobal ? null : transition.fromStateClientId,
        ...(effect === TRANSITION_EFFECTS.MOVE_STATE
          ? { toStateRef: transition.toStateClientId }
          : {}),
        isGlobal: transition.isGlobal,
        excludedStateRefs: transition.isGlobal ? transition.excludedStateClientIds : [],
        purpose: transition.purpose,
        sourceHandle: transition.isGlobal ? null : transition.sourceHandle,
        targetHandle: transition.isGlobal ? null : transition.targetHandle,
        isActive: transition.isActive,
        conditions: transition.conditions.map(normalizeCondition),
        actions: transition.actions.map((action, index) => ({
          type: action.type,
          config: action.config ?? {},
          position: action.position ?? index,
        })),
      };
    }),
  };
}

export function validateWorkflowDraft(draft: WorkflowDraft): WorkflowDraftValidation {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("El nombre del flujo es obligatorio.");
  if (!draft.states.length) errors.push("Agrega al menos un estado.");
  if (draft.states.filter((state) => state.isActive && state.isInitial).length !== 1) {
    errors.push("Debe existir exactamente un estado inicial activo.");
  }
  if (!draft.states.some((state) => state.isActive && state.isFinal)) {
    errors.push("Debe existir al menos un estado final activo.");
  }

  const duplicateValues = (values: string[]) =>
    values.filter((value, index) => value && values.indexOf(value) !== index);
  if (duplicateValues(draft.states.map((state) => state.clientId)).length) {
    errors.push("Hay clientId de estado duplicados.");
  }
  if (duplicateValues(draft.transitions.map((transition) => transition.clientId)).length) {
    errors.push("Hay clientId de transicion duplicados.");
  }
  if (
    draft.states
      .filter((state) => state.isActive)
      .some((state) => !state.saleOrderStateId?.trim())
  ) {
    errors.push("Todos los estados activos deben tener un estado global seleccionado.");
  }
  if (
    duplicateValues(
      draft.states
        .filter((state) => state.isActive)
        .map((state) => state.saleOrderStateId.trim()),
    ).length
  ) {
    errors.push("Hay estados globales duplicados.");
  }
  if (
    duplicateValues(
      draft.transitions.filter((transition) => transition.isActive).map((transition) => transition.code.trim()),
    ).length
  ) {
    errors.push("Hay codigos de transicion duplicados.");
  }

  const stateRefs = new Set(draft.states.map((state) => state.clientId));
  if (
    draft.transitions.some(
      (transition) => {
        const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
        return (
          (effect === TRANSITION_EFFECTS.MOVE_STATE &&
            (!transition.toStateClientId || !stateRefs.has(transition.toStateClientId))) ||
          (effect === TRANSITION_EFFECTS.RUN_ACTIONS && transition.toStateClientId !== null) ||
          (!transition.isGlobal &&
          (!transition.fromStateClientId || !stateRefs.has(transition.fromStateClientId))) ||
          (transition.isGlobal && transition.fromStateClientId !== null) ||
          transition.excludedStateClientIds.some((stateId) => !stateRefs.has(stateId))
        );
      },
    )
  ) {
    errors.push("Una transicion contiene una referencia de estado inexistente.");
  }
  if (
    draft.transitions.some(
      (transition) =>
        (transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE) ===
          TRANSITION_EFFECTS.RUN_ACTIONS && transition.actions.length === 0,
    )
  ) {
    errors.push("Las acciones sin cambio de estado requieren al menos una accion.");
  }
  const cancelTransitions = draft.transitions.filter(
    (transition) =>
      (transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE) ===
        TRANSITION_EFFECTS.MOVE_STATE &&
      transition.purpose === TRANSITION_PURPOSES.CANCEL,
  );
  if (cancelTransitions.length > 1) {
    errors.push("Solo puede existir una transicion de cancelacion por flujo.");
  }
  if (
    cancelTransitions.some(
      (transition) => !transition.isGlobal || transition.fromStateClientId !== null,
    )
  ) {
    errors.push("La transicion de cancelacion debe ser global y no tener origen.");
  }
  if (
    cancelTransitions.some((transition) => {
      const destination = draft.states.find(
        (state) => state.clientId === transition.toStateClientId,
      );
      return !destination || !destination.isActive || destination.isFinal;
    })
  ) {
    errors.push("El destino de cancelacion debe ser un estado activo no final.");
  }
  if (
    draft.transitions.some((transition) =>
      transition.conditions.some((condition) => {
        if (condition.type !== "DATE_AFTER" && condition.type !== "DATE_BEFORE") return false;
        const date = condition.config?.date;
        return typeof date !== "string" || Number.isNaN(new Date(date).getTime());
      }),
    )
  ) {
    errors.push("Las condiciones de fecha requieren una fecha valida.");
  }
  return { valid: errors.length === 0, errors };
}

export function createGlobalTransitionPair(
  draft: WorkflowDraft,
  purpose: WorkflowTransitionPurpose = TRANSITION_PURPOSES.CANCEL,
): WorkflowDraft {
  const state = createDraftState(draft.states.length);
  state.name =
    purpose === TRANSITION_PURPOSES.CANCEL ? "Cancelado" : `Estado global ${draft.states.length + 1}`;
  state.code =
    purpose === TRANSITION_PURPOSES.CANCEL
      ? `CANCELLED_${Date.now()}`
      : `GLOBAL_STATE_${Date.now()}`;
  state.isInitial = false;
  state.isFinal = false;
  state.positionX = 80 + (draft.states.length % 4) * X_GAP;
  state.positionY = 100 + Math.floor(draft.states.length / 4) * Y_GAP;

  const transition = createDraftTransition(null, state.clientId, true, purpose);
  transition.name =
    purpose === TRANSITION_PURPOSES.CANCEL ? "Cancelar" : "Nueva transicion global";
  transition.code =
    purpose === TRANSITION_PURPOSES.CANCEL
      ? `CANCEL_${Date.now()}`
      : `GLOBAL_TRANSITION_${Date.now()}`;

  return {
    ...draft,
    states: [...draft.states, state],
    transitions: [...draft.transitions, transition],
  };
}

export function createGlobalRunActionTransition(): WorkflowDraftTransition {
  return {
    ...createDraftTransition(
      null,
      null,
      true,
      TRANSITION_PURPOSES.STANDARD,
      "Nueva accion global",
      TRANSITION_EFFECTS.RUN_ACTIONS,
    ),
    code: `GLOBAL_ACTION_${Date.now()}`,
  };
}

export function removeWorkflowElement(
  draft: WorkflowDraft,
  clientIdToRemove: string,
): WorkflowDraft {
  const selectedTransition = draft.transitions.find(
    (transition) => transition.clientId === clientIdToRemove,
  );
  const selectedState = draft.states.find((state) => state.clientId === clientIdToRemove);
  const pairedGlobalTransition = selectedState
    ? draft.transitions.find(
        (transition) =>
          transition.isGlobal && transition.toStateClientId === selectedState.clientId,
      )
    : undefined;
  const pairedStateId =
    selectedTransition?.isGlobal && selectedTransition.toStateClientId
      ? selectedTransition.toStateClientId
      : undefined;
  const stateIdsToRemove = new Set(
    [selectedState?.clientId, pairedStateId].filter((value): value is string => Boolean(value)),
  );
  const transitionIdsToRemove = new Set(
    [selectedTransition?.clientId, pairedGlobalTransition?.clientId].filter(
      (value): value is string => Boolean(value),
    ),
  );

  return {
    ...draft,
    states: draft.states.filter((state) => !stateIdsToRemove.has(state.clientId)),
    transitions: draft.transitions
      .filter(
        (transition) =>
          !transitionIdsToRemove.has(transition.clientId) &&
          (!transition.toStateClientId ||
            !stateIdsToRemove.has(transition.toStateClientId)) &&
          (!transition.fromStateClientId ||
            !stateIdsToRemove.has(transition.fromStateClientId)),
      )
      .map((transition) => ({
        ...transition,
        excludedStateClientIds: transition.excludedStateClientIds.filter(
          (stateId) => !stateIdsToRemove.has(stateId),
        ),
      })),
  };
}

export function mapSaveResponseToDraft(response: SaveFullWorkflowResponse): WorkflowDraft {
  const conditionsByTransition = new Map<string, WorkflowCondition[]>();
  const actionsByTransition = new Map<string, WorkflowAction[]>();
  response.conditions.forEach((condition) => {
    const current = conditionsByTransition.get(condition.transitionId) ?? [];
    current.push(condition);
    conditionsByTransition.set(condition.transitionId, current);
  });
  response.actions.forEach((action) => {
    const current = actionsByTransition.get(action.transitionId) ?? [];
    current.push(action);
    actionsByTransition.set(action.transitionId, current);
  });
  return mapWorkflowToDraft({
    id: response.workflow.id,
    name: response.workflow.name,
    description: response.workflow.description,
    isActive: response.workflow.isActive,
    createdAt: response.workflow.createdAt,
    updatedAt: response.workflow.updatedAt,
    states: response.states,
    transitions: response.transitions.map((transition) => ({
      ...transition,
      conditions: (conditionsByTransition.get(transition.id) ?? []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      ),
      actions: (actionsByTransition.get(transition.id) ?? []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      ),
    })),
  });
}
