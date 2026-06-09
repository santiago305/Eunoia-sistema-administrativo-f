import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Ban,
  Filter,
  Globe2,
  ShieldOff,
  Zap,
} from "lucide-react";
import type { WorkflowDraftTransition } from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";

type GlobalTransitionNodeData = {
  transition: WorkflowDraftTransition;
  targetStateName?: string;
  onSelect?: (clientId: string) => void;
};

const sourceHandleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-violet-600 !opacity-90";

export function WorkflowGlobalTransitionNode({ data, selected }: NodeProps) {
  const nodeData = data as GlobalTransitionNodeData;
  const transition = nodeData.transition;

  const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
  const isRunActions = effect === TRANSITION_EFFECTS.RUN_ACTIONS;
  const isCancel = transition.purpose === TRANSITION_PURPOSES.CANCEL;

  const Icon = isRunActions ? Zap : isCancel ? Ban : Globe2;

  return (
    <button
      type="button"
      className={[
        "relative min-w-52 rounded-2xl border-2 bg-white p-3 text-left shadow-sm",
        selected ? "ring-2 ring-primary/30" : "",
        isRunActions
          ? "border-amber-300 bg-amber-50/70"
          : isCancel
            ? "border-rose-300 bg-rose-50/70"
            : "border-violet-300 bg-violet-50/70",
      ].join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        nodeData.onSelect?.(transition.clientId);
      }}
    >
      {!isRunActions ? (
        <Handle
          id="global-source"
          type="source"
          position={Position.Right}
          className={sourceHandleClass}
        />
      ) : null}

      <div className="flex items-start gap-2">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            isRunActions
              ? "bg-amber-100 text-amber-700"
              : isCancel
                ? "bg-rose-100 text-rose-700"
                : "bg-violet-100 text-violet-700",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-black/45">
            {isRunActions ? "Acción global" : isCancel ? "Cancelación global" : "Transición global"}
          </div>

          <div className="truncate text-xs font-semibold text-black/80">
            {transition.name || "Sin nombre"}
          </div>

          <div className="mt-1 truncate text-[10px] text-black/50">
            {isRunActions
              ? "No cambia de estado"
              : `Destino: ${nodeData.targetStateName ?? "Sin destino"}`}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {transition.conditions.length ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-sky-700">
            <Filter className="h-3 w-3" />
            {transition.conditions.length}
          </span>
        ) : null}

        {transition.actions.length ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
            <Zap className="h-3 w-3" />
            {transition.actions.length}
          </span>
        ) : null}

        {transition.excludedStateClientIds.length ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
            <ShieldOff className="h-3 w-3" />
            {transition.excludedStateClientIds.length} excl.
          </span>
        ) : null}
      </div>
    </button>
  );
}