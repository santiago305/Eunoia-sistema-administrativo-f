import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  History,
  LoaderCircle,
  RotateCcw,
  UserRound,
  Zap,
} from "lucide-react";
import type {
  SaleOrderWorkflowHistoryItem,
  WorkflowState,
} from "@/features/workflows/types/workflow";
import {
  buildSaleOrderWorkflowHistoryTimeline,
  type SaleOrderWorkflowHistoryTimelineEvent,
} from "@/features/sale-orders/utils/saleOrderWorkflowHistoryTimeline";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { getSaleOrderWorkflowHistory } from "@/shared/services/saleOrderService";

type Props = {
  open: boolean;
  saleOrderId: string | null;
  saleOrderLabel?: string;
  onClose: () => void;
};

function formatExecutionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StateBadge({ state }: { state: WorkflowState }) {
  const color = state.color ?? "#64748b";

  return (
    <div
      className="min-w-0 rounded-lg border px-3 py-2"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}0D`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-xs font-semibold text-zinc-800">
          {state.name}
        </span>
      </div>
      {/* <div className="mt-1 truncate pl-[18px] text-[10px] text-zinc-500">
        {state.code}
      </div> */}
    </div>
  );
}

function HistoryCard({
  event,
}: {
  event: SaleOrderWorkflowHistoryTimelineEvent;
}) {
  const isAction = event.kind === "RUN_ACTIONS";
  const isCancellation = event.kind === "CANCEL";

  return (
    <article
      className={[
        "rounded-xl border p-4 shadow-sm",
        isAction
          ? "border-amber-200 bg-amber-50/60"
          : isCancellation
            ? "border-rose-200 bg-rose-50/60"
            : "border-zinc-200 bg-white",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isAction ? (
              <Zap className="h-4 w-4 shrink-0 text-amber-600" />
            ) : isCancellation ? (
              <Ban className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
            )}
            <span className="truncate text-sm font-semibold text-zinc-900">
              {event.transitionName}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {isAction
              ? "Accion global"
              : isCancellation
                ? "Cancelacion"
                : "Cambio de estado"}{" "} 
                {/* · {event.transitionCode} */}
          </div>
        </div>
        <time className="text-[11px] font-medium text-zinc-500">
          {formatExecutionDate(event.executedAt)}
        </time>
      </div>

      {isAction ? (
        <div className="mt-3">
          <div className="mb-2 text-[11px] font-medium text-amber-700">
            No cambia de estado
          </div>
          <StateBadge state={event.currentState} />
        </div>
      ) : (
        <div className="mt-3 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <StateBadge state={event.fromState} />
          <ArrowRight className="mx-auto h-4 w-4 rotate-90 text-zinc-400 sm:rotate-0" />
          <StateBadge state={event.toState} />
        </div>
      )}

      {event.executorEmail ? (
        <div className="mt-3 flex items-center gap-1.5 border-t border-black/5 pt-3 text-[11px] text-zinc-500">
          <UserRound className="h-3.5 w-3.5" />
          <span className="truncate">{event.executorEmail}</span>
        </div>
      ) : null}
    </article>
  );
}

function HistoryTimeline({
  history,
}: {
  history: SaleOrderWorkflowHistoryItem[];
}) {
  const events = useMemo(
    () => buildSaleOrderWorkflowHistoryTimeline(history),
    [history],
  );

  return (
    <div className="h-full px-4 py-5 sm:px-6">
      <ol className="relative ml-3 border-l border-zinc-200 pl-6">
        {events.map((event, index) => (
          <li
            key={event.id}
            className={index === events.length - 1 ? "" : "pb-5"}
          >
            <span
              className="absolute -left-[7px] mt-5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: event.markerColor }}
            />
            <HistoryCard event={event} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SaleOrderWorkflowHistoryModal({
  open,
  saleOrderId,
  saleOrderLabel,
  onClose,
}: Props) {
  const [history, setHistory] = useState<SaleOrderWorkflowHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!open || !saleOrderId) {
      setHistory([]);
      setError("");
      setLoading(false);
      return;
    }

    let active = true;
    setHistory([]);
    setError("");
    setLoading(true);

    void getSaleOrderWorkflowHistory(saleOrderId)
      .then((response) => {
        if (!active) return;
        setHistory(response);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          parseApiError(
            requestError,
            "No se pudo cargar el historial del workflow.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, requestVersion, saleOrderId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Historial del tipo${saleOrderLabel ? ` · ${saleOrderLabel}` : ""}`}
      className="max-w-[96vw]"
      bodyClassName="h-[80vh] w-[70vh] p-0"
    >
      {loading ? (
        <div className="grid h-full place-items-center text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Cargando historial...
          </div>
        </div>
      ) : error ? (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <div className="text-sm font-semibold text-rose-700">{error}</div>
            <SystemButton
              className="mt-4"
              type="button"
              variant="outline"
              onClick={retry}
            >
              <RotateCcw className="h-4 w-4" />
              Reintentar
            </SystemButton>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-zinc-500">
          <div className="p-2">
            <History className="mx-auto mb-3 h-7 w-7 text-zinc-400" />
            Este pedido aun no registra cambios de estado.
          </div>
        </div>
      ) : (
        <div className="p-2">
          <HistoryTimeline history={history} />
        </div>
      )}
    </Modal>
  );
}
