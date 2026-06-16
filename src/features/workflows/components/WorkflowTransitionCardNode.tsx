import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowDraftTransition } from "../types/workflow";
import {
  TRANSITION_ELSE_HANDLE,
} from "../utils/workflowTransitionCard";

type Data = {
  transition: WorkflowDraftTransition;
  onSelect: (id: string) => void;
};

export function WorkflowTransitionCardNode({ data }: NodeProps) {
  const { transition } = data as unknown as Data;
  return (
    <div className="pointer-events-none relative h-px w-px">
      <Handle
        id={TRANSITION_ELSE_HANDLE}
        type="source"
        position={Position.Right}
        aria-label={`Conectar SI NO de ${transition.name}`}
        className="pointer-events-auto !h-5 !w-5 !border-2 !border-white !bg-amber-600 !opacity-100"
      />
    </div>
  );
}
