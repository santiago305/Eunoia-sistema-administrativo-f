import { useCallback, useMemo, useRef, useState } from "react";
import { History, Workflow } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type { AvailableTransition } from "@/features/workflows/types/workflow";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
  changeSaleOrderState,
  getAvailableSaleOrderTransitions,
} from "@/shared/services/saleOrderService";
import { showTransitionWarnings } from "@/features/sale-orders/utils/showTransitionWarnings";
import { SaleOrderWorkflowHistoryModal } from "./SaleOrderWorkflowHistoryModal";

type Props = {
  order: SaleOrder;
  onOrderChanged: (orderId: string) => void | Promise<void>;
};

function parseTransitionError(error: unknown) {
  if (typeof error !== "object" || error === null) return parseApiError(error);
  const response = (
    error as {
      response?: {
        status?: number;
        data?: {
          message?: string;
          failures?: Array<{ reason?: string; type?: string } | string>;
        };
      };
    }
  ).response;
  if (response?.status !== 422 || !Array.isArray(response.data?.failures)) {
    return parseApiError(error);
  }
  const reasons = response.data.failures
    .map((failure) =>
      typeof failure === "string" ? failure : failure.reason ?? failure.type,
    )
    .filter(Boolean);
  return reasons.length
    ? reasons.join(". ")
    : response.data.message ?? parseApiError(error);
}

export function SaleOrderStatusPopover({ order, onOrderChanged }: Props) {
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [loadingTransitionId, setLoadingTransitionId] = useState<string | null>(
    null,
  );
  const [transitionError, setTransitionError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const loadingTransitionsRef = useRef(false);

  const stateName = order.currentState?.name ?? "Sin estado";
  const stateColor = order.currentState?.color ?? "#64748b";

  const loadTransitions = useCallback(async () => {
    if (loadingTransitionsRef.current) return false;
    loadingTransitionsRef.current = true;
    try {
      setTransitions(await getAvailableSaleOrderTransitions(order.id));
      setTransitionError("");
      return true;
    } catch (error) {
      setTransitions([]);
      setTransitionError(
        parseApiError(error, "No se pudieron cargar las transiciones."),
      );
      return false;
    } finally {
      loadingTransitionsRef.current = false;
    }
  }, [order.id]);

  const executeTransition = useCallback(
    async (transition: AvailableTransition) => {
      if (!transition.available) return;
      setLoadingTransitionId(transition.id);
      setTransitionError("");
      try {
        const result = await changeSaleOrderState(order.id, transition.id, {
          source: "sale-order-status-actions",
        });
        await onOrderChanged(order.id);
        await loadTransitions();
        showTransitionWarnings(result.warnings);
      } catch (error) {
        setTransitionError(parseTransitionError(error));
      } finally {
        setLoadingTransitionId(null);
      }
    },
    [loadTransitions, onOrderChanged, order.id],
  );

  const transitionByActionId = useMemo(
    () =>
      new Map(
        transitions.map((transition) => [
          `transition:${transition.id}`,
          transition,
        ]),
      ),
    [transitions],
  );

  const actions = useMemo<ActionItem[]>(
    () => [
      {
        id: "workflow-history",
        label: "Historial del tipo",
        icon: <History className="h-4 w-4" />,
        onClick: () => setHistoryOpen(true),
      },
      ...transitions.map(
        (transition): ActionItem => ({
          id: `transition:${transition.id}`,
          label: transition.name,
          icon: <Workflow className="h-4 w-4" />,
          disabled: !transition.available || loadingTransitionId !== null,
          danger: transition.code?.toUpperCase() === "CANCEL",
          onClick: () => void executeTransition(transition),
        }),
      ),
    ],
    [executeTransition, loadingTransitionId, transitions],
  );

  return (
    <>
      <ActionsPopover
        actions={actions}
        onOpenChange={(open) => {
          if (open) void loadTransitions();
        }}
        columns={1}
        compact
        showLabels
        triggerIcon={
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stateColor }}
          />
        }
        triggerText={stateName}
        triggerVariant="outline"
        triggerLabel={stateName}
        triggerClassName="h-auto max-w-[140px] gap-1.5 px-1.5 py-1 text-[9px] font-semibold text-zinc-800"
        popoverClassName="min-w-[260px]"
        popoverBodyClassName="p-2"
        renderAction={(action, helpers) => {
          const transition = transitionByActionId.get(action.id);
          const failureText =
            transition?.failures
              .map((failure) => failure.reason ?? failure.type)
              .filter(Boolean)
              .join(". ") ?? "";
          return (
            <button
              type="button"
              disabled={action.disabled}
              title={failureText || undefined}
              onClick={(event) => {
                event.stopPropagation();
                helpers.onAction(action);
              }}
              className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 ${
                action.danger ? "text-rose-700 hover:bg-rose-50" : "text-zinc-700"
              }`}
            >
              {transition ? (
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: transition.fromState?.color ?? "#64748b",
                  }}
                />
              ) : (
                <span className="text-zinc-500">{action.icon}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {transition?.name ?? action.label}
                </span>
                {transition ? (
                  <>
                    <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                      {transition.fromState?.name ?? "Sin estado"}{" "}
                      {transition.toState
                        ? `-> ${transition.toState.name}`
                        : "-> Accion global"}
                    </span>
                    {!transition.available && failureText ? (
                      <span className="mt-1 block text-[10px] text-rose-600">
                        {failureText}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </span>
            </button>
          );
        }}
      />
      {transitionError ? (
        <span className="sr-only" role="alert">
          {transitionError}
        </span>
      ) : null}
      <SaleOrderWorkflowHistoryModal
        open={historyOpen}
        saleOrderId={order.id}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
