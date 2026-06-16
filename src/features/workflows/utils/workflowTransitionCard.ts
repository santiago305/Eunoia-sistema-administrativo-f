import type { WorkflowDraftTransition } from "../types/workflow";

export const TRANSITION_CARD_PREFIX = "transition-card-";
export const TRANSITION_INPUT_HANDLE = "transition-input";
export const TRANSITION_MAIN_HANDLE = "transition-main";
export const TRANSITION_ELSE_HANDLE = "transition-else";

export const getTransitionCardId = (clientId: string) =>
  `${TRANSITION_CARD_PREFIX}${clientId}`;

export const getTransitionIdFromCard = (nodeId: string) =>
  nodeId.startsWith(TRANSITION_CARD_PREFIX)
    ? nodeId.slice(TRANSITION_CARD_PREFIX.length)
    : null;

export const isTransitionCard = (transition: WorkflowDraftTransition) =>
  !transition.isGlobal &&
  transition.autoTrigger;

export function getTransitionCardPosition(
  transition: WorkflowDraftTransition,
  positions: Record<string, { x: number; y: number }>,
) {
  if (transition.positionX != null && transition.positionY != null) {
    return { x: transition.positionX, y: transition.positionY };
  }
  const from = transition.fromStateClientId
    ? positions[transition.fromStateClientId]
    : undefined;
  const to = transition.toStateClientId
    ? positions[transition.toStateClientId]
    : undefined;
  if (!from || !to) return { x: 200, y: 200 };
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

export function applyTransitionCardConnection(
  transition: WorkflowDraftTransition,
  connection: {
    source: string;
    sourceHandle?: string | null;
    target: string;
  },
) {
  if (
    connection.source === getTransitionCardId(transition.clientId) &&
    connection.sourceHandle === TRANSITION_ELSE_HANDLE
  ) {
    return {
      ...transition,
      elseEffect: transition.elseEffect ?? "MOVE_STATE",
      elseToStateClientId: connection.target,
    };
  }
  return null;
}
