import { useCallback, useMemo, useRef, useState } from "react";
import { Banknote, Eye, FileText, History, Menu, Pencil, Workflow } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type { AvailableTransition } from "@/features/workflows/types/workflow";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { changeSaleOrderState, getAvailableSaleOrderTransitions } from "@/shared/services/saleOrderService";
import { SaleOrderWorkflowHistoryModal } from "./SaleOrderWorkflowHistoryModal";

type Props = {
  order: SaleOrder;
  onOpenDetail: (order: SaleOrder) => void;
  onEdit: (order: SaleOrder) => void;
  onOpenPdf: (order: SaleOrder) => void;
  onOpenPayments: (order: SaleOrder) => void;
  onOrderChanged: (orderId: string) => void | Promise<void>;
};

function parseTransitionError(error: unknown) {
  if (typeof error !== "object" || error === null) return parseApiError(error);
  const response = (error as { response?: { status?: number; data?: { message?: string; failures?: Array<{ reason?: string; type?: string } | string> } } }).response;
  if (response?.status !== 422 || !Array.isArray(response.data?.failures)) return parseApiError(error);
  const reasons = response.data.failures.map((failure) => typeof failure === "string" ? failure : failure.reason ?? failure.type).filter(Boolean);
  return reasons.length ? reasons.join(". ") : response.data.message ?? parseApiError(error);
}

export function SaleOrderActionsPopover({ order, onOpenDetail, onEdit, onOpenPdf, onOpenPayments, onOrderChanged }: Props) {
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [loadingTransitionId, setLoadingTransitionId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const loadedContextRef = useRef<string | null>(null);
  const loadingContextRef = useRef<string | null>(null);
  const workflowId = order.workflow?.id ?? order.workflowId ?? null;
  const transitionContext = `${order.id}:${order.currentStateId ?? order.currentState?.id ?? ""}:${order.deliveryDate ?? ""}`;

  const loadTransitions = useCallback(async () => {
    if (!workflowId) {
      setTransitions([]);
      return true;
    }
    try {
      setTransitions(await getAvailableSaleOrderTransitions(order.id));
      setTransitionError("");
      return true;
    } catch (error) {
      setTransitions([]);
      setTransitionError(parseApiError(error, "No se pudieron cargar las transiciones."));
      return false;
    }
  }, [order.id, order.currentStateId, order.deliveryDate, workflowId]);

  const loadTransitionsWhenNeeded = useCallback(async () => {
    if (loadedContextRef.current === transitionContext || loadingContextRef.current === transitionContext) return;
    loadingContextRef.current = transitionContext;
    const loaded = await loadTransitions();
    if (loaded) loadedContextRef.current = transitionContext;
    loadingContextRef.current = null;
  }, [loadTransitions, transitionContext]);

  const executeTransition = useCallback(async (transition: AvailableTransition) => {
    if (!transition.available) return;
    setLoadingTransitionId(transition.id);
    setTransitionError("");
    try {
      await changeSaleOrderState(order.id, transition.id, { source: "sale-order-card-actions" });
      await onOrderChanged(order.id);
      await loadTransitions();
      loadedContextRef.current = transitionContext;
    } catch (error) {
      setTransitionError(parseTransitionError(error));
    } finally {
      setLoadingTransitionId(null);
    }
  }, [loadTransitions, onOrderChanged, order.id, transitionContext]);

  const transitionByActionId = useMemo(() => new Map(transitions.map((transition) => [`transition:${transition.id}`, transition])), [transitions]);
  const actions = useMemo<ActionItem[]>(() => {
    const hideEdit = Boolean(order.currentState?.isFinal) || order.currentState?.code?.toUpperCase() === "CANCELLED";
    return [
      { id: "detail", label: "Detalle", icon: <Eye className="h-4 w-4" />, onClick: () => onOpenDetail(order) },
      { id: "edit", label: "Editar", icon: <Pencil className="h-4 w-4" />, hidden: hideEdit, onClick: () => onEdit(order) },
      { id: "pdf", label: "PDF", icon: <FileText className="h-4 w-4" />, onClick: () => onOpenPdf(order) },
      { id: "payments", label: "Pagos", icon: <Banknote className="h-4 w-4" />, onClick: () => onOpenPayments(order) },
      { id: "workflow-history", label: "Historial del flujo", icon: <History className="h-4 w-4" />, onClick: () => setHistoryOpen(true) },
      ...transitions.map((transition): ActionItem => ({ id: `transition:${transition.id}`, label: transition.name, icon: <Workflow className="h-4 w-4" />, disabled: !transition.available || loadingTransitionId !== null, danger: transition.code?.toUpperCase() === "CANCEL", onClick: () => void executeTransition(transition) })),
    ];
  }, [executeTransition, loadingTransitionId, onEdit, onOpenDetail, onOpenPayments, onOpenPdf, order, transitions]);

  return <>
    <ActionsPopover actions={actions} onOpenChange={(open) => { if (open) void loadTransitionsWhenNeeded(); }} columns={1} compact showLabels triggerIcon={<Menu className="h-5 w-5 text-black text-bold" />} triggerVariant="ghost" triggerLabel="Acciones del pedido" popoverClassName="min-w-[260px]" popoverBodyClassName="p-2" renderAction={(action, helpers) => {
      const transition = transitionByActionId.get(action.id);
      const failureText = transition?.failures.map((failure) => failure.reason ?? failure.type).filter(Boolean).join(". ") ?? "";
      return <button type="button" disabled={action.disabled} title={failureText || undefined} onClick={(event) => { event.stopPropagation(); helpers.onAction(action); }} className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50">
        {transition ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: transition.fromState?.color ?? "#64748b" }} /> : <span className="text-zinc-500">{action.icon}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{transition?.name ?? action.label}</span>{transition ? <><span className="mt-0.5 block truncate text-[10px] text-zinc-500">{transition.fromState?.name ?? "Sin estado"} {transition.toState ? `→ ${transition.toState.name}` : "→ Acción global"}</span>{!transition.available && failureText ? <span className="mt-1 block text-[10px] text-rose-600">{failureText}</span> : null}</> : null}</span>
      </button>;
    }} />
    {transitionError ? <span className="sr-only" role="alert">{transitionError}</span> : null}
    <SaleOrderWorkflowHistoryModal open={historyOpen} saleOrderId={order.id} onClose={() => setHistoryOpen(false)} />
  </>;
}
