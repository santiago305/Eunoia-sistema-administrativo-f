import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FlaskConical,
  Play,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { saleOrdersApi } from "@/api/saleOrdersApi";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type {
  WorkflowDraft,
  WorkflowDraftTestSession,
} from "@/features/workflows/types/workflow";
import {
  advanceWorkflowSimulation,
  createWorkflowSimulation,
  type WorkflowSimulation,
  type WorkflowSimulationInput,
} from "@/features/workflows/utils/workflowSimulation";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { fetchSaleOrderById } from "@/shared/services/saleOrderService";
import {
  listWorkflowDraftTests,
  revertWorkflowDraftTest,
} from "@/shared/services/workflowService";

type Props = {
  open: boolean;
  draft: WorkflowDraft;
  draftWorkflowId: string | null;
  revision?: number;
  onClose: () => void;
};

const orderLabel = (order: Pick<SaleOrder, "serie" | "correlative">) =>
  [order.serie, order.correlative]
    .filter((value) => value !== null && value !== undefined)
    .join("-") || "Sin número";

const inputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateOnly = (value?: string | null) => value?.slice(0, 10) || inputDate(new Date());

const simulationInputFromOrder = (order: SaleOrder): WorkflowSimulationInput => ({
  total: Number(order.total ?? 0),
  totalPaid: Number(order.totalPaid ?? 0),
  deliveryDate: dateOnly(order.deliveryDate),
  simulatedDate: inputDate(new Date()),
  hasStock: true,
  requiredFields: {
    "client.docNumber": Boolean(order.client?.docNumber),
    "client.departmentId": Boolean(order.client?.departmentId),
    "client.provinceId": Boolean(order.client?.provinceId),
    "client.districtId": Boolean(order.client?.districtId),
    deliveryDate: Boolean(order.deliveryDate),
    agencyDetail: Boolean(order.agencyDetail),
    warehouseId: Boolean(order.warehouse?.id),
    sourceId: Boolean(order.source?.id),
  },
});

const simulationFromOrder = (draft: WorkflowDraft, order: SaleOrder) =>
  createWorkflowSimulation(draft, {
    stateId: order.currentStateId,
    stateCode: order.currentState?.code,
    stateName: order.currentState?.name,
    stockReserved: Boolean(order.reserveBool),
  });

export function WorkflowOrderSimulationModal({
  open,
  draft,
  draftWorkflowId,
  revision,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SaleOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
  const [simulationInput, setSimulationInput] = useState<WorkflowSimulationInput | null>(null);
  const [simulation, setSimulation] = useState<WorkflowSimulation | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [legacySessions, setLegacySessions] = useState<WorkflowDraftTestSession[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const simulationState = draft.states.find(
    (state) => state.clientId === simulation?.currentStateId,
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelectedOrder(null);
    setSimulationInput(null);
    setSimulation(null);
    setError("");
    if (draftWorkflowId) {
      void listWorkflowDraftTests(draftWorkflowId)
        .then((sessions) =>
          setLegacySessions(sessions.filter((session) => session.status === "ACTIVE")),
        )
        .catch((cause) => setError(parseApiError(cause)));
    } else {
      setLegacySessions([]);
    }
  }, [draftWorkflowId, open, revision]);

  const restoreLegacySession = async (session: WorkflowDraftTestSession) => {
    if (!draftWorkflowId) return;
    setRestoringId(session.id);
    setError("");
    try {
      await revertWorkflowDraftTest(draftWorkflowId, session.id);
      setLegacySessions((current) => current.filter((item) => item.id !== session.id));
    } catch (cause) {
      setError(parseApiError(cause));
    } finally {
      setRestoringId(null);
    }
  };

  const searchOrders = async () => {
    setSearching(true);
    setError("");
    try {
      const response = await saleOrdersApi.listSaleOrders({
        q: query.trim() || undefined,
        page: 1,
        limit: 8,
      });
      setResults(response.items);
    } catch (cause) {
      setError(parseApiError(cause));
    } finally {
      setSearching(false);
    }
  };

  const selectOrder = async (candidate: SaleOrder) => {
    setSelectingId(candidate.id);
    setError("");
    try {
      const order = await fetchSaleOrderById(candidate.id);
      setSelectedOrder(order);
      setSimulationInput(simulationInputFromOrder(order));
      setSimulation(simulationFromOrder(draft, order));
      setResults([]);
    } catch (cause) {
      setError(parseApiError(cause));
    } finally {
      setSelectingId(null);
    }
  };

  const resetSimulation = () => {
    if (!selectedOrder) return;
    setSimulationInput(simulationInputFromOrder(selectedOrder));
    setSimulation(simulationFromOrder(draft, selectedOrder));
  };

  const updateInput = <K extends keyof WorkflowSimulationInput>(
    key: K,
    value: WorkflowSimulationInput[K],
  ) => setSimulationInput((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Probar borrador${revision ? ` · revisión ${revision}` : ""}`}
      description="Selecciona un pedido real y recorre una copia temporal del flujo paso a paso."
      closeOnOverlayClick={false}
      className="w-[min(1040px,calc(100vw-1rem))]"
      bodyClassName="max-h-[78vh] overflow-y-auto p-4"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold">Pedido real, ejecución simulada</div>
              <p className="mt-1 leading-5">
                Se leen los datos reales del pedido, pero los cambios de estado, pago y stock existen solo dentro de esta prueba.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {legacySessions.length ? (
          <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4" aria-labelledby="legacy-tests-title">
            <div>
              <h3 id="legacy-tests-title" className="text-sm font-semibold text-amber-950">
                Restaura las pruebas reales anteriores
              </h3>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                Estas sesiones pertenecen al laboratorio anterior y deben restaurarse antes de iniciar la simulación aislada.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {legacySessions.map((session) => (
                <SystemButton
                  key={session.id}
                  type="button"
                  variant="outline"
                  className="min-h-11 border-amber-400 bg-white text-amber-950"
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  loading={restoringId === session.id}
                  disabled={Boolean(restoringId)}
                  onClick={() => void restoreLegacySession(session)}
                >
                  Restaurar pedido {session.serie && session.correlative ? `${session.serie}-${session.correlative}` : session.saleOrderId}
                </SystemButton>
              ))}
            </div>
          </section>
        ) : null}

        {!legacySessions.length && !selectedOrder ? (
          <section aria-labelledby="simulation-order-search-title" className="space-y-3">
            <div>
              <h3 id="simulation-order-search-title" className="text-sm font-semibold text-slate-900">
                1. Selecciona el pedido real
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Busca por serie, número o cliente. Se cargará el detalle actualizado del pedido.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FloatingInput
                label="Buscar pedido"
                name="workflow-simulation-order-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchOrders();
                }}
                className="min-h-11 flex-1"
              />
              <SystemButton
                type="button"
                variant="outline"
                className="min-h-11"
                leftIcon={<Search className="h-4 w-4" />}
                loading={searching}
                disabled={Boolean(selectingId)}
                onClick={() => void searchOrders()}
              >
                Buscar
              </SystemButton>
            </div>

            {results.length ? (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {results.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div>
                      <div className="font-medium text-slate-900">Pedido {orderLabel(order)}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {order.client?.fullName ?? "Sin cliente"} · {order.currentState?.name ?? "Sin estado"}
                      </div>
                    </div>
                    <SystemButton
                      type="button"
                      className="min-h-11"
                      leftIcon={<FlaskConical className="h-4 w-4" />}
                      loading={selectingId === order.id}
                      disabled={Boolean(selectingId)}
                      onClick={() => void selectOrder(order)}
                    >
                      Usar en simulación
                    </SystemButton>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : selectedOrder && simulation && simulationInput ? (
          <>
            <section className="space-y-3" aria-labelledby="selected-order-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="selected-order-title" className="text-sm font-semibold text-slate-900">
                    1. Pedido {orderLabel(selectedOrder)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {selectedOrder.client?.fullName ?? "Sin cliente"} · Estado real: {selectedOrder.currentState?.name ?? "Sin estado"}
                  </p>
                </div>
                <SystemButton
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    setSelectedOrder(null);
                    setSimulationInput(null);
                    setSimulation(null);
                  }}
                >
                  Cambiar pedido
                </SystemButton>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Almacén</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{selectedOrder.warehouse?.name ?? "Sin almacén"}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Reserva real</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{selectedOrder.reserveBool ? "Reservado" : "Sin reserva"}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Monto real</div>
                  <div className="mt-1 text-sm font-medium tabular-nums text-slate-900">S/ {Number(selectedOrder.total).toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Pagado real</div>
                  <div className="mt-1 text-sm font-medium tabular-nums text-slate-900">S/ {Number(selectedOrder.totalPaid).toFixed(2)}</div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4" aria-labelledby="simulation-controls-title">
              <div>
                <h3 id="simulation-controls-title" className="text-sm font-semibold text-slate-900">
                  2. Ajusta solo los datos de la prueba
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Los valores reales aparecen cargados; cualquier cambio se descarta al cerrar.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FloatingInput label="Monto del pedido" name="simulation-total" type="number" min={0} step="0.01" value={String(simulationInput.total)} onChange={(event) => updateInput("total", Math.max(0, Number(event.target.value)))} />
                <FloatingInput label="Monto pagado" name="simulation-paid" type="number" min={0} step="0.01" value={String(simulationInput.totalPaid)} onChange={(event) => updateInput("totalPaid", Math.max(0, Number(event.target.value)))} />
                <FloatingInput label="Fecha de entrega" name="simulation-delivery" type="date" value={simulationInput.deliveryDate} onChange={(event) => updateInput("deliveryDate", event.target.value)} />
                <FloatingInput label="Fecha simulada" name="simulation-date" type="date" value={simulationInput.simulatedDate} onChange={(event) => updateInput("simulatedDate", event.target.value)} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={simulationInput.hasStock} onChange={(event) => updateInput("hasStock", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                Hay stock disponible en este escenario
              </label>
            </section>

            <section className="space-y-4" aria-labelledby="simulation-step-title">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="rounded-lg border border-sky-200 bg-white p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado simulado</div>
                  <div id="simulation-step-title" className="mt-1 text-lg font-semibold text-sky-900">
                    {simulationState?.name ?? "Sin estado equivalente en el borrador"}
                  </div>
                  <div className="mt-2 text-sm text-slate-600" role="status">{simulation.lastMessage}</div>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <SystemButton type="button" className="min-h-11" leftIcon={<Play className="h-4 w-4" />} disabled={!simulationState} onClick={() => setSimulation((current) => current ? advanceWorkflowSimulation(draft, current, simulationInput) : current)}>
                    Avanzar un paso
                  </SystemButton>
                  <SystemButton type="button" variant="outline" className="min-h-11" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={resetSimulation}>
                    Reiniciar
                  </SystemButton>
                </div>
              </div>

              {simulation.routes.length ? (
                <div className="space-y-2" aria-label="Evaluación de rutas automáticas">
                  <h4 className="text-sm font-semibold text-slate-900">Condiciones evaluadas</h4>
                  {simulation.routes.map((route) => (
                    <div key={route.transitionId} className={`rounded-lg border p-3 ${route.passed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        {route.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                        {route.transitionName} · prioridad {route.priority}
                      </div>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {route.conditions.map((condition) => (
                          <div key={`${route.transitionId}-${condition.type}`} className="flex items-center gap-2 text-xs text-slate-700">
                            {condition.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-red-600" />}
                            {condition.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {simulation.history.length ? (
                <ol className="space-y-2" aria-label="Recorrido de la simulación">
                  {simulation.history.map((step, index) => (
                    <li key={step.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs text-sky-800">{index + 1}</span>
                        {step.message}
                      </div>
                      <div className="mt-1 pl-8 text-xs text-slate-600">
                        {step.transitionName}{step.actions.length ? ` · ${step.actions.join(" + ")}` : " · Sin acciones"}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
