import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowDraftState } from "@/features/workflows/types/workflow";

const handleClass =
  "!h-5 !w-5 !border-2 !border-white !bg-primary !opacity-80 hover:!opacity-100";

export function WorkflowStateNode({ data, selected }: NodeProps) {
  const state = data.state as WorkflowDraftState;
  const isGlobalDestination = data.isGlobalDestination === true;

  return (
    <div
      className={`relative min-w-44 rounded-xl border bg-white p-3 shadow-sm ${
        selected ? "ring-2 ring-primary/40" : ""
      } ${state.isActive ? "" : "opacity-55"}`}
      style={{ borderColor: state.color ?? "#cbd5e1" }}
    >
      {!isGlobalDestination ? (
        <>
          <Handle id="left" type="target" position={Position.Left} className={handleClass} />
          <Handle id="top" type="target" position={Position.Top} className={handleClass} />
        </>
      ) : null}

      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: state.color ?? "#64748b" }}
        />
        <span className="truncate text-xs font-semibold text-black/80">
          {state.name || "Sin nombre"}
        </span>
      </div>

      <div className="mt-1 text-[10px] text-black/45">
        {state.code || "SIN_CODIGO"}
      </div>

      <div className="mt-2 flex gap-1">
        {state.isInitial ? (
          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] text-sky-700">
            Inicial
          </span>
        ) : null}

        {state.isFinal ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">
            Final
          </span>
        ) : null}
        {isGlobalDestination ? (
          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] text-violet-700">
            Global
          </span>
        ) : null}
      </div>

      {!isGlobalDestination ? (
        <>
          <Handle id="right" type="source" position={Position.Right} className={handleClass} />
          <Handle id="bottom" type="source" position={Position.Bottom} className={handleClass} />
        </>
      ) : null}
    </div>
  );
}
