import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlaskConical,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Modal } from '@/shared/components/modales/Modal';
import { SystemButton } from '@/shared/components/components/SystemButton';
import { FloatingInput } from '@/shared/components/components/FloatingInput';
import { parseApiError } from '@/shared/common/utils/handleApiError';
import { saleOrdersApi } from '@/api/saleOrdersApi';
import type { SaleOrder } from '@/features/sale-orders/types/saleOrder';
import type {
  AvailableTransition,
  WorkflowDraftTestSession,
} from '@/features/workflows/types/workflow';
import {
  listWorkflowDraftTests,
  revertWorkflowDraftTest,
  startWorkflowDraftTest,
} from '@/shared/services/workflowService';
import {
  changeSaleOrderState,
  getAvailableSaleOrderTransitions,
} from '@/shared/services/saleOrderService';

type Props = {
  open: boolean;
  draftWorkflowId: string | null;
  revision?: number;
  onClose: () => void;
};

const orderLabel = (order: Pick<SaleOrder, 'serie' | 'correlative'>) =>
  [order.serie, order.correlative].filter((value) => value !== null && value !== undefined).join('-') ||
  'Sin numero';

const sessionLabel = (session: WorkflowDraftTestSession) =>
  [session.serie, session.correlative]
    .filter((value) => value !== null && value !== undefined)
    .join('-') || session.saleOrderId;

export function WorkflowDraftTestModal({
  open,
  draftWorkflowId,
  revision,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SaleOrder[]>([]);
  const [sessions, setSessions] = useState<WorkflowDraftTestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'ACTIVE'),
    [sessions],
  );
  const selectedSession = activeSessions.find(
    (session) => session.id === selectedSessionId,
  );

  const refreshSessions = useCallback(async () => {
    if (!draftWorkflowId) return;
    const items = await listWorkflowDraftTests(draftWorkflowId);
    setSessions(items);
    setSelectedSessionId((current) =>
      items.some((item) => item.id === current && item.status === 'ACTIVE')
        ? current
        : items.find((item) => item.status === 'ACTIVE')?.id ?? null,
    );
  }, [draftWorkflowId]);

  useEffect(() => {
    if (!open || !draftWorkflowId) return;
    setError('');
    setResults([]);
    void refreshSessions().catch((err) => setError(parseApiError(err)));
  }, [draftWorkflowId, open, refreshSessions]);

  useEffect(() => {
    if (!open || !selectedSession?.saleOrderId) {
      setTransitions([]);
      return;
    }
    setLoading(true);
    void getAvailableSaleOrderTransitions(selectedSession.saleOrderId)
      .then(setTransitions)
      .catch((err) => setError(parseApiError(err)))
      .finally(() => setLoading(false));
  }, [open, selectedSession?.saleOrderId]);

  const searchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await saleOrdersApi.listSaleOrders({
        q: query.trim() || undefined,
        page: 1,
        limit: 8,
      });
      setResults(response.items);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const start = async (saleOrderId: string) => {
    if (!draftWorkflowId) return;
    setWorkingId(saleOrderId);
    setError('');
    try {
      await startWorkflowDraftTest(draftWorkflowId, saleOrderId);
      setResults([]);
      await refreshSessions();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setWorkingId(null);
    }
  };

  const execute = async (transition: AvailableTransition) => {
    if (!selectedSession || !transition.available) return;
    setWorkingId(transition.id);
    setError('');
    try {
      await changeSaleOrderState(selectedSession.saleOrderId, transition.id, {
        source: 'workflow-draft-test',
        testSessionId: selectedSession.id,
      });
      setTransitions(
        await getAvailableSaleOrderTransitions(selectedSession.saleOrderId),
      );
      await refreshSessions();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setWorkingId(null);
    }
  };

  const revert = async (session: WorkflowDraftTestSession) => {
    if (!draftWorkflowId) return;
    setWorkingId(session.id);
    setError('');
    try {
      await revertWorkflowDraftTest(draftWorkflowId, session.id);
      await refreshSessions();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Laboratorio del borrador${revision ? ` · revision ${revision}` : ''}`}
      description="Ejecuta el flujo sobre un pedido real y revierte todos los efectos controlados al terminar."
      closeOnOverlayClick={false}
      preventClose={Boolean(workingId) || activeSessions.length > 0}
      className="w-[min(960px,calc(100vw-1rem))]"
      bodyClassName="max-h-[75vh] overflow-y-auto p-4"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Prueba con movimientos reales</div>
              <p className="mt-1 leading-5">
                Reserva, consumo y reposicion afectan inventario mientras la prueba esta activa.
                Usa Revertir prueba antes de salir; al publicar también se revierten automáticamente.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <section aria-labelledby="workflow-test-active-title" className="space-y-3">
          <div>
            <h3 id="workflow-test-active-title" className="text-sm font-semibold text-slate-900">
              Pruebas activas
            </h3>
            <p className="text-xs text-slate-600">Selecciona una para ejecutar sus transiciones disponibles.</p>
          </div>

          {activeSessions.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 ${
                    selectedSessionId === session.id
                      ? 'border-sky-400 bg-sky-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    className="min-h-11 w-full text-left"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="font-medium text-slate-900">Pedido {sessionLabel(session)}</div>
                    <div className="mt-1 text-xs text-slate-600">Prueba activa</div>
                  </button>
                  <SystemButton
                    type="button"
                    variant="outline"
                    className="mt-2 min-h-11 w-full border-red-300 text-red-700 hover:bg-red-50"
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                    loading={workingId === session.id}
                    disabled={Boolean(workingId)}
                    onClick={() => void revert(session)}
                  >
                    Revertir prueba
                  </SystemButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No hay pedidos usando este borrador.
            </div>
          )}
        </section>

        {selectedSession ? (
          <section aria-labelledby="workflow-test-transitions-title" className="space-y-3">
            <h3 id="workflow-test-transitions-title" className="text-sm font-semibold text-slate-900">
              Transiciones del pedido {sessionLabel(selectedSession)}
            </h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando transiciones...
              </div>
            ) : transitions.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {transitions.map((transition) => (
                  <SystemButton
                    key={transition.id}
                    type="button"
                    variant={transition.available ? 'primary' : 'outline'}
                    className="min-h-11 justify-start"
                    leftIcon={<Play className="h-4 w-4" />}
                    disabled={!transition.available || Boolean(workingId)}
                    loading={workingId === transition.id}
                    title={
                      transition.available
                        ? `Ejecutar ${transition.name}`
                        : transition.failures.map((failure) => failure.reason).filter(Boolean).join(', ')
                    }
                    onClick={() => void execute(transition)}
                  >
                    {transition.name}
                  </SystemButton>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                El pedido no tiene más transiciones disponibles en este punto.
              </div>
            )}
          </section>
        ) : null}

        <section aria-labelledby="workflow-test-search-title" className="space-y-3 border-t border-slate-200 pt-5">
          <div>
            <h3 id="workflow-test-search-title" className="text-sm font-semibold text-slate-900">
              Agregar pedido a la prueba
            </h3>
            <p className="text-xs text-slate-600">Busca por serie, numero, cliente u otro dato disponible.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <FloatingInput
              label="Buscar pedido"
              name="workflow-test-order-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void searchOrders();
              }}
              className="min-h-11 flex-1"
            />
            <SystemButton
              type="button"
              className="min-h-11"
              variant="outline"
              leftIcon={<Search className="h-4 w-4" />}
              loading={loading}
              disabled={Boolean(workingId)}
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
                    <div className="text-xs text-slate-600">{order.client?.fullName ?? order.id}</div>
                  </div>
                  <SystemButton
                    type="button"
                    className="min-h-11"
                    leftIcon={<FlaskConical className="h-4 w-4" />}
                    loading={workingId === order.id}
                    disabled={Boolean(workingId)}
                    onClick={() => void start(order.id)}
                  >
                    Probar pedido
                  </SystemButton>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}
