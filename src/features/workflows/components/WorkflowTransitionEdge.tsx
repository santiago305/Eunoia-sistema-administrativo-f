import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import {
  Ban,
  CheckCircle2,
  Filter,
  Globe2,
  GitBranch,
  Zap,
} from "lucide-react";
import type { WorkflowDraftTransition } from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";
import { ACTION_LABELS } from "./WorkflowActionEditor";
import { CONDITION_LABELS } from "./WorkflowConditionEditor";

type TransitionEdgeData = {
  transition: WorkflowDraftTransition;
  onSelect?: (clientId: string) => void;
  branch?: "THEN" | "ELSE";
};

export function WorkflowTransitionEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    selected,
    style,
    data,
  } = props;

  const transitionData = data as TransitionEdgeData | undefined;
  const transition = transitionData?.transition;
  const branch = transitionData?.branch ?? "THEN";

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (!transition) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
    );
  }

  const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
  const isGlobal = transition.isGlobal;
  const isCancel = transition.purpose === TRANSITION_PURPOSES.CANCEL;
  const isRunActions = effect === TRANSITION_EFFECTS.RUN_ACTIONS;

  const firstCondition = transition.conditions[0];
  const branchActions =
    branch === "ELSE" ? transition.elseActions : transition.actions;
  const firstAction = branchActions[0];

  const conditionLabel = firstCondition
    ? CONDITION_LABELS[firstCondition.type] ?? firstCondition.type
    : null;

  const actionLabel = firstAction
    ? ACTION_LABELS[firstAction.type] ?? firstAction.type
    : null;

  const stroke =
    branch === "ELSE"
      ? "#d97706"
      : isCancel
        ? "#e11d48"
        : isGlobal
          ? "#7c3aed"
          : isRunActions
            ? "#f59e0b"
            : "#334155";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray:
            branch === "ELSE"
              ? "5 5"
              : isGlobal || isRunActions
                ? "7 5"
                : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <button
          type="button"
          className={[
            "nodrag nopan pointer-events-auto absolute max-w-[260px]",
            "rounded-xl px-2.5 py-2 text-left shadow-sm",
            selected ? "border-primary ring-2 ring-primary/20" : "border-black/10",
          ].join(" ")}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onClick={(event) => {
            event.stopPropagation();
            transitionData?.onSelect?.(transition.clientId);
          }}
        >
          <div className="flex items-center gap-1.5">
            {isGlobal ? (
              <Globe2 className="h-3.5 w-3.5 text-violet-600" />
            ) : isCancel ? (
              <Ban className="h-3.5 w-3.5 text-rose-600" />
            ) : isRunActions ? (
              <Zap className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <GitBranch className="h-3.5 w-3.5 text-slate-600" />
            )}

            <span className="truncate text-[11px] font-semibold text-black/80">
              {transition.name || "Transición sin nombre"}
            </span>
          </div>

          <div className="mt-1 grid grid-cols-1 gap-1">
            {!isGlobal ? (
              <span
                className={[
                  "inline-flex w-fit rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                  branch === "ELSE"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
                ].join(" ")}
              >
                {branch === "ELSE" ? "SI NO" : "SI"}
              </span>
            ) : null}
            {transition.autoTrigger ? (
              <span className="inline-flex w-fit rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium text-sky-700">
                Automatico
              </span>
            ) : null}
            {isGlobal ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">
                <Globe2 className="h-3 w-3" />
                Global
              </span>
            ) : null}

            {isCancel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium text-rose-700">
                <Ban className="h-3 w-3" />
                Cancelar
              </span>
            ) : null}

            {transition.conditions.length ? (
              <span
                className="inline-flex max-w-[110px] items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium text-sky-700"
                title={transition.conditions
                  .map((item) => CONDITION_LABELS[item.type] ?? item.type)
                  .join(", ")}
              >
                <Filter className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {transition.conditions.length > 1
                    ? `${transition.conditions.length} condiciones`
                    : conditionLabel}
                </span>
              </span>
            ) : null}
            {branchActions.length ? (
              <span
                className="inline-flex max-w-[110px] items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700"
                title={branchActions
                  .map((item) => ACTION_LABELS[item.type] ?? item.type)
                  .join(", ")}
              >
                <Zap className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {branchActions.length > 1
                    ? `${branchActions.length} acciones`
                    : actionLabel}
                </span>
              </span>
            ) : null}

            {!transition.conditions.length && !branchActions.length ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Sin reglas
              </span>
            ) : null}
          </div>
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
