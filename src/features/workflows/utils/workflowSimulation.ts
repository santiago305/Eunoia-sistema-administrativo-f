import { ACTIONS, CONDITIONS, type WorkflowDraft, type WorkflowDraftTransition } from "@/features/workflows/types/workflow";

export type WorkflowSimulationInput = {
  total: number;
  totalPaid: number;
  deliveryDate: string;
  simulatedDate: string;
  hasStock: boolean;
};

export type WorkflowSimulationStep = {
  id: string;
  transitionName: string;
  fromStateName: string;
  toStateName: string;
  actions: string[];
  message: string;
};

export type WorkflowSimulation = {
  currentStateId: string | null;
  history: WorkflowSimulationStep[];
  stockReserved: boolean;
  stockConsumed: boolean;
  stockReleased: boolean;
  lastMessage: string;
};

const actionLabels: Record<string, string> = {
  [ACTIONS.RESERVE_STOCK]: "Reservar stock",
  [ACTIONS.CONSUME_STOCK]: "Consumir stock",
  [ACTIONS.REVERT_STOCK]: "Liberar reserva",
  [ACTIONS.RESTORE_STOCK]: "Reponer stock",
};

const formatAction = (type: string) => actionLabels[type] ?? type;

const dateToUtcDay = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
};

const daysBetween = (from: string, to: string) => {
  const fromDay = dateToUtcDay(from);
  const toDay = dateToUtcDay(to);
  if (fromDay === null || toDay === null) return null;
  return Math.round((toDay - fromDay) / 86_400_000);
};

const scheduleConditionPasses = (
  config: Record<string, unknown>,
  input: WorkflowSimulationInput,
) => {
  const daysUntilDelivery = daysBetween(input.simulatedDate, input.deliveryDate);
  if (daysUntilDelivery === null) return false;

  if (config.mode === "AFTER") {
    const daysAfterDelivery = -daysUntilDelivery;
    return daysAfterDelivery >= Number(config.days ?? 0);
  }

  if (config.mode === "BEFORE") {
    const daysBeforeDelivery = daysUntilDelivery;
    return daysBeforeDelivery >= Number(config.days ?? 0);
  }

  const minDaysBefore = Number(config.minDaysBefore ?? 0);
  const maxDaysBefore = Number(config.maxDaysBefore ?? minDaysBefore);
  return daysUntilDelivery >= minDaysBefore && daysUntilDelivery <= maxDaysBefore;
};

const conditionPasses = (
  type: string,
  config: Record<string, unknown>,
  input: WorkflowSimulationInput,
) => {
  switch (type) {
    case CONDITIONS.IS_PAID:
      return input.totalPaid >= input.total;
    case CONDITIONS.IS_NOT_PAID:
      return input.totalPaid < input.total;
    case CONDITIONS.HAS_STOCK:
      return input.hasStock;
    case CONDITIONS.NOT_CANCELLED:
    case CONDITIONS.SALE_ORDER_FIELD_REQUIRED:
      return true;
    case CONDITIONS.SCHEDULE_DELIVERY_WINDOW:
      return scheduleConditionPasses(config, input);
    case CONDITIONS.DATE_AFTER:
      return input.simulatedDate > String(config.date ?? "");
    case CONDITIONS.DATE_BEFORE:
      return input.simulatedDate < String(config.date ?? "");
    default:
      return false;
  }
};

const sortedActions = (transition: WorkflowDraftTransition) =>
  [...transition.actions].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0),
  );

export function createWorkflowSimulation(draft: WorkflowDraft): WorkflowSimulation {
  const initialState = draft.states.find((state) => state.isInitial);
  return {
    currentStateId: initialState?.clientId ?? null,
    history: [],
    stockReserved: false,
    stockConsumed: false,
    stockReleased: false,
    lastMessage: initialState
      ? `El pedido inicia en ${initialState.name}.`
      : "El flujo no tiene un estado inicial definido.",
  };
}

export function advanceWorkflowSimulation(
  draft: WorkflowDraft,
  simulation: WorkflowSimulation,
  input: WorkflowSimulationInput,
): WorkflowSimulation {
  const currentState = draft.states.find(
    (state) => state.clientId === simulation.currentStateId,
  );
  if (!currentState) {
    return { ...simulation, lastMessage: "No hay un estado actual para continuar." };
  }

  const candidates = draft.transitions
    .filter(
      (transition) =>
        transition.isActive &&
        transition.autoTrigger &&
        !transition.isGlobal &&
        transition.fromStateClientId === currentState.clientId &&
        transition.toStateClientId,
    )
    .sort((left, right) => left.priority - right.priority);

  const transition = candidates.find((candidate) =>
    candidate.conditions.length > 0 &&
    candidate.conditions.every((condition) =>
      conditionPasses(condition.type, condition.config, input),
    ),
  );

  if (!transition) {
    return {
      ...simulation,
      lastMessage: `No hay una transición automática cumplida desde ${currentState.name} con estos datos.`,
    };
  }

  const nextState = draft.states.find(
    (state) => state.clientId === transition.toStateClientId,
  );
  if (!nextState) return simulation;

  let stockReserved = simulation.stockReserved;
  let stockConsumed = simulation.stockConsumed;
  let stockReleased = simulation.stockReleased;
  const actions = sortedActions(transition);

  for (const action of actions) {
    if (action.type === ACTIONS.RESERVE_STOCK) stockReserved = true;
    if (action.type === ACTIONS.CONSUME_STOCK) stockConsumed = true;
    if (action.type === ACTIONS.REVERT_STOCK) {
      stockReserved = false;
      stockReleased = true;
    }
    if (action.type === ACTIONS.RESTORE_STOCK) stockReleased = false;
  }

  const actionSummary = actions.map((action) => formatAction(action.type));
  const step: WorkflowSimulationStep = {
    id: `${transition.clientId}-${simulation.history.length}`,
    transitionName: transition.name,
    fromStateName: currentState.name,
    toStateName: nextState.name,
    actions: actionSummary,
    message: `${currentState.name} → ${nextState.name}`,
  };

  return {
    currentStateId: nextState.clientId,
    history: [...simulation.history, step],
    stockReserved,
    stockConsumed,
    stockReleased,
    lastMessage: actionSummary.length
      ? `${step.message}. Acciones: ${actionSummary.join(" + ")}.`
      : `${step.message}.`,
  };
}
