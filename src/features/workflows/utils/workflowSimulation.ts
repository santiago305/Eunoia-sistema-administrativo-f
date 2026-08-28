import { ACTIONS, CONDITIONS, type WorkflowDraft, type WorkflowDraftTransition } from "@/features/workflows/types/workflow";

export type WorkflowSimulationInput = {
  total: number;
  totalPaid: number;
  deliveryDate: string;
  simulatedDate: string;
  hasStock: boolean;
  requiredFields: Record<string, boolean>;
};

export type WorkflowSimulationStep = {
  id: string;
  transitionName: string;
  fromStateName: string;
  toStateName: string;
  actions: string[];
  message: string;
};

export type WorkflowSimulationConditionResult = {
  type: string;
  label: string;
  passed: boolean;
};

export type WorkflowSimulationRouteResult = {
  transitionId: string;
  transitionName: string;
  priority: number;
  passed: boolean;
  conditions: WorkflowSimulationConditionResult[];
};

export type WorkflowSimulation = {
  currentStateId: string | null;
  history: WorkflowSimulationStep[];
  stockReserved: boolean;
  stockConsumed: boolean;
  stockReleased: boolean;
  lastMessage: string;
  routes: WorkflowSimulationRouteResult[];
};

export type WorkflowSimulationStart = {
  stateId?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  stockReserved?: boolean;
};

const actionLabels: Record<string, string> = {
  [ACTIONS.RESERVE_STOCK]: "Reservar stock",
  [ACTIONS.CONSUME_STOCK]: "Consumir stock",
  [ACTIONS.REVERT_STOCK]: "Liberar reserva",
  [ACTIONS.RESTORE_STOCK]: "Reponer stock",
};

const formatAction = (type: string) => actionLabels[type] ?? type;

const conditionLabels: Record<string, string> = {
  [CONDITIONS.IS_PAID]: "Pedido pagado completamente",
  [CONDITIONS.IS_NOT_PAID]: "Pedido con pago pendiente",
  [CONDITIONS.HAS_STOCK]: "Stock disponible",
  [CONDITIONS.NOT_CANCELLED]: "Pedido no cancelado",
  [CONDITIONS.SALE_ORDER_FIELD_REQUIRED]: "Datos requeridos completos",
  [CONDITIONS.SCHEDULE_DELIVERY_WINDOW]: "Fecha de entrega dentro del rango",
  [CONDITIONS.DATE_AFTER]: "Fecha posterior a la configurada",
  [CONDITIONS.DATE_BEFORE]: "Fecha anterior a la configurada",
};

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
      return true;
    case CONDITIONS.SALE_ORDER_FIELD_REQUIRED:
      return input.requiredFields[String(config.field ?? "")] ?? true;
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

export function createWorkflowSimulation(
  draft: WorkflowDraft,
  start: WorkflowSimulationStart = {},
): WorkflowSimulation {
  const normalizedCode = start.stateCode?.trim().toLowerCase();
  const normalizedName = start.stateName?.trim().toLowerCase();
  const initialState =
    draft.states.find(
      (state) =>
        Boolean(start.stateId) &&
        (state.id === start.stateId ||
          state.clientId === start.stateId ||
          state.saleOrderStateId === start.stateId),
    ) ??
    draft.states.find(
      (state) =>
        Boolean(normalizedCode) && state.code.trim().toLowerCase() === normalizedCode,
    ) ??
    draft.states.find(
      (state) =>
        Boolean(normalizedName) && state.name.trim().toLowerCase() === normalizedName,
    ) ??
    draft.states.find((state) => state.isInitial);
  return {
    currentStateId: initialState?.clientId ?? null,
    history: [],
    stockReserved: start.stockReserved ?? false,
    stockConsumed: false,
    stockReleased: false,
    lastMessage: initialState
      ? `La simulación inicia en ${initialState.name}.`
      : "El flujo no tiene un estado inicial definido.",
    routes: [],
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

  const routes: WorkflowSimulationRouteResult[] = candidates.map((candidate) => {
    const conditions = candidate.conditions.map((condition) => ({
      type: condition.type,
      label: conditionLabels[condition.type] ?? condition.type,
      passed: conditionPasses(condition.type, condition.config, input),
    }));
    return {
      transitionId: candidate.clientId,
      transitionName: candidate.name,
      priority: candidate.priority,
      passed: conditions.length > 0 && conditions.every((condition) => condition.passed),
      conditions,
    };
  });
  const selectedRoute = routes.find((route) => route.passed);
  const transition = candidates.find(
    (candidate) => candidate.clientId === selectedRoute?.transitionId,
  );

  if (!transition) {
    return {
      ...simulation,
      routes,
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
    routes,
    lastMessage: actionSummary.length
      ? `${step.message}. Acciones: ${actionSummary.join(" + ")}.`
      : `${step.message}.`,
  };
}
