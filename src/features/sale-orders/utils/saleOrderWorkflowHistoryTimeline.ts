import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
  type SaleOrderWorkflowHistoryItem,
  type WorkflowState,
} from "@/features/workflows/types/workflow";

export type SaleOrderWorkflowHistoryTimelineKind =
  | "MOVE_STATE"
  | "RUN_ACTIONS"
  | "CANCEL";

export type SaleOrderWorkflowHistoryTimelineEvent = {
  id: string;
  kind: SaleOrderWorkflowHistoryTimelineKind;
  transitionName: string;
  transitionCode: string;
  executedAt: string;
  executorEmail: string | null;
  markerColor: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  currentState: WorkflowState;
};

export function buildSaleOrderWorkflowHistoryTimeline(
  history: SaleOrderWorkflowHistoryItem[],
): SaleOrderWorkflowHistoryTimelineEvent[] {
  return [...history]
    .sort(
      (left, right) =>
        new Date(left.executedAt).getTime() - new Date(right.executedAt).getTime(),
    )
    .map((item) => {
      const kind: SaleOrderWorkflowHistoryTimelineKind =
        item.transition.purpose === TRANSITION_PURPOSES.CANCEL
          ? "CANCEL"
          : item.transition.effect === TRANSITION_EFFECTS.RUN_ACTIONS
            ? "RUN_ACTIONS"
            : "MOVE_STATE";
      const currentState =
        kind === "RUN_ACTIONS" ? item.fromState : item.toState;

      return {
        id: item.id,
        kind,
        transitionName: item.transition.name?.trim() || "Evento del workflow",
        transitionCode: item.transition.code,
        executedAt: item.executedAt,
        executorEmail: item.executedByUser?.email ?? null,
        markerColor: currentState.color ?? "#64748b",
        fromState: item.fromState,
        toState: item.toState,
        currentState,
      };
    });
}
