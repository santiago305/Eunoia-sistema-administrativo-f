import { useCallback, useMemo, useRef } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Ban,
  CheckCircle2,
  Filter,
  Globe2,
  GitBranch,
  Zap,
} from "lucide-react";
import type {
  WorkflowDraft,
  WorkflowDraftState,
  WorkflowDraftTransition,
} from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";
import { normalizeWorkflowHandleId } from "@/features/workflows/utils/workflowConnections";
import { WorkflowStateNode } from "./WorkflowStateNode";
import { WorkflowTransitionEdge } from "./WorkflowTransitionEdge";
import { WorkflowTransitionCardNode } from "./WorkflowTransitionCardNode";
import {
  TRANSITION_ELSE_HANDLE,
  getTransitionCardId,
  getTransitionCardPosition,
  isTransitionCard,
} from "../utils/workflowTransitionCard";
import { CONDITION_LABELS } from "./WorkflowConditionEditor";
import { ACTION_LABELS } from "./WorkflowActionEditor";

type Props = {
  draft: WorkflowDraft;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveState: (clientId: string, positionX: number, positionY: number) => void;
  onMoveGlobalTransition: (
    clientId: string,
    positionX: number,
    positionY: number,
  ) => void;
  onMoveTransitionCard: (
    clientId: string,
    positionX: number,
    positionY: number,
  ) => void;
  onViewportCenterChange?: (position: { positionX: number; positionY: number }) => void;
  onConnect: (
    from: string,
    to: string,
    sourceHandle?: string | null,
    targetHandle?: string | null,
  ) => void;
};

type GlobalTransitionNodeData = {
  transition: WorkflowDraftTransition;
  targetStateName?: string;
  onSelect: (id: string | null) => void;
};

const GLOBAL_NODE_PREFIX = "global-transition-node";
const CANCEL_STATE_NAME = "Cancelado";

const getGlobalTransitionNodeId = (transitionId: string) =>
  `${GLOBAL_NODE_PREFIX}-${transitionId}`;

const isSystemCancelState = (state: WorkflowDraftState) =>
  state.isSystem === true &&
  state.name.trim().toLowerCase() === CANCEL_STATE_NAME.toLowerCase();

const getTransitionLabel = (transition: WorkflowDraftTransition) => {
  const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
  const isGlobal = transition.isGlobal;
  const isRunActions = effect === TRANSITION_EFFECTS.RUN_ACTIONS;
  const isCancel = transition.purpose === TRANSITION_PURPOSES.CANCEL;

  const Icon = isGlobal ? Globe2 : isRunActions ? Zap : isCancel ? Ban : GitBranch;

  return (
    <div className="flex max-w-[280px] flex-col items-stretch gap-1 text-[10px]">
      <div
        className={[
          "flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 font-semibold shadow-sm",
          isGlobal
            ? "border-violet-200 text-violet-800"
            : isRunActions
              ? "border-amber-200 text-amber-800"
              : isCancel
                ? "border-rose-200 text-rose-800"
                : "border-black/10 text-black",
        ].join(" ")}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {transition.name || "Transición sin nombre"}
        </span>
      </div>

      {transition.conditions.length ? (
        <div
          className="flex items-start gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-800 shadow-sm"
          title={transition.conditions
            .map((condition) => CONDITION_LABELS[condition.type] ?? condition.type)
            .join(" | ")}
        >
          <Filter className="mt-0.5 h-3 w-3 shrink-0" />
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-wide text-sky-600">
              Condición
            </div>
            <div className="truncate">
              {transition.conditions.length === 1
                ? CONDITION_LABELS[transition.conditions[0].type] ??
                  transition.conditions[0].type
                : `${transition.conditions.length} condiciones`}
            </div>
          </div>
        </div>
      ) : null}

      {transition.actions.length ? (
        <div
          className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-800 shadow-sm"
          title={transition.actions
            .map((action) => ACTION_LABELS[action.type] ?? action.type)
            .join(" | ")}
        >
          <Zap className="mt-0.5 h-3 w-3 shrink-0" />
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-wide text-amber-600">
              Acción
            </div>
            <div className="truncate">
              {transition.actions.length === 1
                ? ACTION_LABELS[transition.actions[0].type] ??
                  transition.actions[0].type
                : `${transition.actions.length} acciones`}
            </div>
          </div>
        </div>
      ) : null}

      {!transition.conditions.length && !transition.actions.length ? (
        <div className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-3 w-3" />
          Sin condición ni acción
        </div>
      ) : null}
    </div>
  );
};

function WorkflowGlobalTransitionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as GlobalTransitionNodeData;
  const transition = nodeData.transition;

  const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;
  const isRunActions = effect === TRANSITION_EFFECTS.RUN_ACTIONS;
  const isCancel = transition.purpose === TRANSITION_PURPOSES.CANCEL;

  return (
    <button
      type="button"
      className={[
        "relative flex min-h-[72px] w-[180px] cursor-grab active:cursor-grabbing items-center gap-3 border-2 bg-white px-4 py-3 text-left shadow-sm transition",
        selected ? "ring-2 ring-primary/40" : "",
        isRunActions
          ? "border-amber-300 bg-amber-50"
          : isCancel
            ? "border-rose-300 bg-rose-50"
            : "border-violet-300 bg-violet-50",
      ].join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        nodeData.onSelect(transition.clientId);
      }}
    >
      
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wide text-black/45">
          {isRunActions
            ? "Acción global"
            : isCancel
              ? "Cancelación global"
              : "Transición global"}
        </div>

        <div className="truncate text-xs font-semibold text-black/80">
          {transition.name || "Sin nombre"}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {transition.conditions.length ? (
            <span className="inline-flex items-center gap-1 border bg-white/85 px-1.5 py-0.5 text-[9px] font-medium text-sky-700">
              <Filter className="h-3 w-3" />
              {transition.conditions.length} cond.
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

const nodeTypes = {
  workflowState: WorkflowStateNode,
  workflowGlobalTransition: WorkflowGlobalTransitionNode,
  workflowTransitionCard: WorkflowTransitionCardNode,
};

const edgeTypes = {
  workflowTransition: WorkflowTransitionEdge,
};

export function WorkflowCanvas({
  draft,
  selectedId,
  onSelect,
  onMoveState,
  onMoveGlobalTransition,
  onMoveTransitionCard,
  onViewportCenterChange,
  onConnect,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const emitViewportCenter = useCallback(
    (viewport: Viewport) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const positionX = (rect.width / 2 - viewport.x) / viewport.zoom;
      const positionY = (rect.height / 2 - viewport.y) / viewport.zoom;
      onViewportCenterChange?.({ positionX, positionY });
    },
    [onViewportCenterChange],
  );

  const visibleStates = useMemo(
    () => draft.states.filter((state) => !isSystemCancelState(state)),
    [draft.states],
  );

  const visibleStateIds = useMemo(
    () => new Set(visibleStates.map((state) => state.clientId)),
    [visibleStates],
  );

  const globalDestinationIds = useMemo(
    () =>
      new Set(
        draft.transitions
          .filter(
            (transition) =>
              transition.isGlobal &&
              (transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE) ===
                TRANSITION_EFFECTS.MOVE_STATE &&
              transition.toStateClientId &&
              visibleStateIds.has(transition.toStateClientId),
          )
          .map((transition) => transition.toStateClientId!),
      ),
    [draft.transitions, visibleStateIds],
  );

  const stateNameById = useMemo(
    () => new Map(draft.states.map((state) => [state.clientId, state.name])),
    [draft.states],
  );

  const statePositionById = useMemo(
    () =>
      new Map(
        visibleStates.map((state) => [
          state.clientId,
          {
            x: state.positionX ?? 0,
            y: state.positionY ?? 0,
          },
        ]),
      ),
    [visibleStates],
  );

  const stateNodes = useMemo<Node[]>(
    () =>
      visibleStates.map((state) => ({
        id: state.clientId,
        type: "workflowState",
        position: {
          x: state.positionX ?? 0,
          y: state.positionY ?? 0,
        },
        data: {
          state,
          isGlobalDestination: globalDestinationIds.has(state.clientId),
        },
        selected: selectedId === state.clientId,
        draggable: true,
      })),
    [visibleStates, globalDestinationIds, selectedId],
  );

  const globalTransitionNodes = useMemo<Node[]>(
    () =>
      draft.transitions
        .filter((transition) => transition.isGlobal)
        .map((transition, index) => {
          const effect = transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE;

          const targetPosition = transition.toStateClientId
            ? statePositionById.get(transition.toStateClientId)
            : undefined;

          return {
            id: getGlobalTransitionNodeId(transition.clientId),
            type: "workflowGlobalTransition",
            position: {
              x:
                transition.positionX ??
                (targetPosition ? targetPosition.x - 320 : -320),
              y:
                transition.positionY ??
                (targetPosition ? targetPosition.y : index * 130),
            },
            data: {
              transition,
              targetStateName: transition.toStateClientId
                ? stateNameById.get(transition.toStateClientId)
                : undefined,
              onSelect,
            },
            selected: selectedId === transition.clientId,
            draggable: true,
            selectable: true,
            className:
              effect === TRANSITION_EFFECTS.RUN_ACTIONS
                ? "workflow-global-action-node"
                : "workflow-global-transition-node",
          };
        }),
    [draft.transitions, onSelect, selectedId, stateNameById, statePositionById],
  );
  const transitionCardNodes = useMemo<Node[]>(
    () => {
      const positions = Object.fromEntries(statePositionById);
      return draft.transitions.filter(isTransitionCard).map((transition) => ({
        id: getTransitionCardId(transition.clientId),
        type: "workflowTransitionCard",
        position: (() => {
          const position = getTransitionCardPosition(transition, positions);
          return { x: position.x + 88, y: position.y + 24 };
        })(),
        data: { transition, onSelect },
        selected: selectedId === transition.clientId,
        draggable: false,
      }));
    },
    [draft.transitions, onSelect, selectedId, statePositionById],
  );

  const nodes = useMemo<Node[]>(
    () => [...stateNodes, ...globalTransitionNodes, ...transitionCardNodes],
    [stateNodes, globalTransitionNodes, transitionCardNodes],
  );

  const normalEdges = useMemo<Edge[]>(
    () =>
      draft.transitions
        .filter(
          (transition) =>
            !transition.isGlobal &&
            (transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE) ===
              TRANSITION_EFFECTS.MOVE_STATE &&
            transition.fromStateClientId &&
            transition.toStateClientId &&
            visibleStateIds.has(transition.fromStateClientId) &&
            visibleStateIds.has(transition.toStateClientId),
        )
        .flatMap((transition) => {
          const isCancel = transition.purpose === TRANSITION_PURPOSES.CANCEL;

          const thenEdge: Edge = {
            id: `${transition.clientId}:then`,
            type: "workflowTransition",
            source: transition.fromStateClientId!,
            target: transition.toStateClientId!,
            sourceHandle: normalizeWorkflowHandleId(
              transition.sourceHandle,
            ) ?? undefined,
            targetHandle: normalizeWorkflowHandleId(
              transition.targetHandle,
            ) ?? undefined,
            label: getTransitionLabel(transition),
            data: { transition, onSelect, branch: "THEN" },
            selected: selectedId === transition.clientId,
            animated: transition.isActive,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isCancel ? "#e11d48" : "#334155",
            },
            style: {
              stroke: isCancel ? "#e11d48" : "#334155",
              strokeWidth: selectedId === transition.clientId ? 3 : 2,
            },
          };
          const elseEdge: Edge | null =
            transition.elseEffect === TRANSITION_EFFECTS.MOVE_STATE &&
            transition.elseToStateClientId &&
            visibleStateIds.has(transition.elseToStateClientId)
              ? {
                  id: `${transition.clientId}:else`,
                  type: "workflowTransition",
                  source: transition.fromStateClientId!,
                  target: transition.elseToStateClientId,
                  label: getTransitionLabel(transition),
                  data: { transition, onSelect, branch: "ELSE" },
                  selected: selectedId === transition.clientId,
                  animated: transition.isActive,
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#d97706",
                  },
                  style: {
                    stroke: "#d97706",
                    strokeWidth: selectedId === transition.clientId ? 3 : 2,
                    strokeDasharray: "5 5",
                  },
                }
              : null;

          return elseEdge ? [thenEdge, elseEdge] : [thenEdge];
        }),
    [draft.transitions, onSelect, selectedId, visibleStateIds],
  );
  const transitionCardEdges = useMemo<Edge[]>(
    () =>
      draft.transitions.filter(isTransitionCard).flatMap((transition) => {
        const cardId = getTransitionCardId(transition.clientId);
        const common = {
          data: { transition, onSelect },
          selected: selectedId === transition.clientId,
          animated: transition.isActive,
        };
        const edges: Edge[] = [];
        if (transition.elseToStateClientId && visibleStateIds.has(transition.elseToStateClientId)) {
          edges.push({
            ...common,
            id: `${transition.clientId}:else`,
            source: cardId,
            sourceHandle: TRANSITION_ELSE_HANDLE,
            target: transition.elseToStateClientId,
            label: "SI NO",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
            style: { stroke: "#d97706", strokeWidth: 2, strokeDasharray: "5 5" },
          });
        }
        return edges;
      }),
    [draft.transitions, onSelect, selectedId, visibleStateIds],
  );

  const globalEdges = useMemo<Edge[]>(
    () =>
      draft.transitions
        .filter(
          (transition) =>
            transition.isGlobal &&
            (transition.effect ?? TRANSITION_EFFECTS.MOVE_STATE) ===
              TRANSITION_EFFECTS.MOVE_STATE &&
            transition.toStateClientId &&
            visibleStateIds.has(transition.toStateClientId),
        )
        .map((transition) => {
          const isCancel = transition.purpose === TRANSITION_PURPOSES.CANCEL;
          const color = isCancel ? "#e11d48" : "#7c3aed";

          return {
            id: transition.clientId,
            type: "workflowTransition",
            source: getGlobalTransitionNodeId(transition.clientId),
            target: transition.toStateClientId!,
            sourceHandle: "global-source",
            label: getTransitionLabel(transition),
            data: { transition, onSelect },
            selected: selectedId === transition.clientId,
            animated: transition.isActive,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color,
            },
            style: {
              stroke: color,
              strokeWidth: selectedId === transition.clientId ? 3 : 2,
              strokeDasharray: "7 5",
            },
          };
        }),
    [draft.transitions, onSelect, selectedId, visibleStateIds],
  );

  const edges = useMemo<Edge[]>(
    () => [...normalEdges, ...transitionCardEdges, ...globalEdges],
    [normalEdges, transitionCardEdges, globalEdges],
  );

  return (
  <div ref={canvasRef} className="h-full w-full">
    <ReactFlow
      className="h-full w-full"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionMode={ConnectionMode.Loose}
      fitView
      fitViewOptions={{ padding: 0.35, maxZoom: 0.8 }}
      onInit={(instance) => emitViewportCenter(instance.getViewport())}
      onMoveEnd={(_, viewport) => emitViewportCenter(viewport)}
      onPaneClick={() => onSelect(null)}
      onNodeClick={(_, node) => {
        if (node.type === "workflowGlobalTransition") {
          const data = node.data as unknown as GlobalTransitionNodeData;
          onSelect(data.transition.clientId);
          return;
        }
        if (node.type === "workflowTransitionCard") {
          const data = node.data as unknown as GlobalTransitionNodeData;
          onSelect(data.transition.clientId);
          return;
        }

        onSelect(node.id);
      }}
      onEdgeClick={(_, edge) => {
        const data = edge.data as
          | { transition?: WorkflowDraftTransition }
          | undefined;
        onSelect(data?.transition?.clientId ?? edge.id);
      }}
      onNodeDragStop={(_, node) => {
        if (node.type === "workflowState") {
          onMoveState(node.id, node.position.x, node.position.y);
          return;
        }

        if (node.type === "workflowGlobalTransition") {
          const data = node.data as unknown as GlobalTransitionNodeData;

          onMoveGlobalTransition(
            data.transition.clientId,
            node.position.x,
            node.position.y,
          );
          return;
        }
        if (node.type === "workflowTransitionCard") {
          const data = node.data as unknown as GlobalTransitionNodeData;
          onMoveTransitionCard(
            data.transition.clientId,
            node.position.x,
            node.position.y,
          );
        }
      }}
      onConnect={(connection: Connection) => {
        if (!connection.source || !connection.target) return;

        if (connection.source.startsWith(GLOBAL_NODE_PREFIX)) return;
        if (connection.target.startsWith(GLOBAL_NODE_PREFIX)) return;
        const isTransitionCardSource = connection.source.startsWith(
          "transition-card-",
        );

        onConnect(
          connection.source,
          connection.target,
          isTransitionCardSource
            ? connection.sourceHandle
            : normalizeWorkflowHandleId(connection.sourceHandle),
          normalizeWorkflowHandleId(connection.targetHandle),
        );
      }}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  </div>
);
}
