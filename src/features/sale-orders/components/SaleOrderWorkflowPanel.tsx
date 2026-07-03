import { useCallback, useEffect, useState } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  changeSaleOrderState,
  getAvailableSaleOrderTransitions
} from "@/shared/services/saleOrderService";
import type {
  AvailableTransition,
} from "@/features/workflows/types/workflow";
import { TRANSITION_PURPOSES } from "@/features/workflows/types/workflow";
import { WorkflowAssignmentModal } from "@/features/workflows/components/WorkflowAssignmentModal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { showTransitionWarnings } from "@/features/sale-orders/utils/showTransitionWarnings";

function parseTransitionError(error: unknown) {
  if (typeof error !== "object" || error === null) return parseApiError(error);
  const response = (error as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        failures?: Array<{ reason?: string; type?: string } | string>;
      };
    };
  }).response;
  if (response?.status !== 422 || !Array.isArray(response.data?.failures)) {
    return parseApiError(error);
  }
  const reasons = response.data.failures
    .map((failure) =>
      typeof failure === "string" ? failure : failure.reason ?? failure.type,
    )
    .filter(Boolean);
  return reasons.length ? reasons.join(". ") : response.data.message ?? parseApiError(error);
}

type Props = {
  saleOrderId: string;
  workflowId: string | null;
  currentStateId?: string | null;
  refreshKey?: number;
  onOrderChanged: () => void | Promise<void>;
};

export function SaleOrderWorkflowPanel({ saleOrderId, workflowId, currentStateId, refreshKey, onOrderChanged }: Props) {
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!workflowId) {
      setTransitions([]);
      return;
    }
    try {
      const [nextTransitions] = await Promise.all([
        getAvailableSaleOrderTransitions(saleOrderId),
      ]);
      setTransitions(nextTransitions);
      setError("");
    } catch (err) {
      setError(parseApiError(err));
    }
  }, [currentStateId, saleOrderId, workflowId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (!workflowId) {
    return (
      <>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">Pedido sin workflow</div>
          <SystemButton className="mt-2" size="sm" onClick={() => setAssignmentOpen(true)}>
            Asignar workflow
          </SystemButton>
        </div>
        <WorkflowAssignmentModal
          open={assignmentOpen}
          saleOrderId={saleOrderId}
          onClose={() => setAssignmentOpen(false)}
          onAssigned={onOrderChanged}
        />
      </>
    );
  }

  const execute = async (transition: AvailableTransition) => {
    if (!transition.available) return;
    setLoadingId(transition.id);
    setError("");
    try {
      const result = await changeSaleOrderState(saleOrderId, transition.id, { source: "sale-order-details" });
      await onOrderChanged();
      await load();
      showTransitionWarnings(result.warnings);
    } catch (err) {
      setError(parseTransitionError(err));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-black/10 p-3">
        <div className="mb-2 text-xs font-semibold text-black/70">Transiciones disponibles</div>
        <div className="flex flex-wrap gap-2">
          {transitions.length ? transitions.map((transition) => (
            <SystemButton
              key={transition.id}
              size="sm"
              variant={
                transition.purpose === TRANSITION_PURPOSES.CANCEL
                  ? "outline"
                  : transition.available
                    ? "primary"
                    : "outline"
              }
              className={
                transition.purpose === TRANSITION_PURPOSES.CANCEL
                  ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                  : undefined
              }
              disabled={!transition.available || loadingId !== null}
              loading={loadingId === transition.id}
              title={transition.failures.map((failure) => failure.reason ?? failure.type).join("\n") || undefined}
              onClick={() => void execute(transition)}
            >
              {transition.name}
            </SystemButton>
          )) : <span className="text-xs text-black/45">No hay transiciones para el estado actual.</span>}
        </div>
        {error ? <div className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700">{error}</div> : null}
      </section>
    </div>
  );
}
