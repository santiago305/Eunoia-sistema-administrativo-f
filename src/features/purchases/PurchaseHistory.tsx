import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { listPurchaseHistory, getPurchaseTimeline } from "@/shared/services/purchaseService";
import type { PurchaseOrder } from "@/features/purchases/types/purchase";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse } from "@/shared/common/utils/response";
import { Modal } from "@/shared/components/modales/Modal";

type HistoryPurchase = PurchaseOrder & {
  history?: {
    eventsCount: number;
    lastEventAt: string | null;
  };
};

export default function PurchaseHistory() {
  const { showFlash } = useFlashMessage();
  const [items, setItems] = useState<HistoryPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<HistoryPurchase | null>(null);
  const [timeline, setTimeline] = useState<Array<Record<string, unknown>>>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [performedByFilter, setPerformedByFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const EVENT_LABELS: Record<string, string> = {
    PROCESSING_REQUESTED: "Procesamiento solicitado",
    PROCESSING_APPROVED: "Procesamiento aprobado",
    PROCESSING_REJECTED: "Procesamiento rechazado",
    PURCHASE_CREATED_WITH_PAYMENT_PENDING_APPROVAL: "Compra enviada con pago",
    PURCHASE_CREATION_APPROVED: "Aprobación de compra con pago",
    PURCHASE_CREATION_REJECTED: "Rechazo de compra con pago",
  };

  const EVENT_BADGE_CLASS: Record<string, string> = {
    PROCESSING_REQUESTED: "bg-amber-100 text-amber-800 border-amber-200",
    PROCESSING_APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PROCESSING_REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
    PURCHASE_CREATED_WITH_PAYMENT_PENDING_APPROVAL: "bg-cyan-100 text-cyan-800 border-cyan-200",
    PURCHASE_CREATION_APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PURCHASE_CREATION_REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPurchaseHistory({
        page: 1,
        limit: 30,
        eventType: eventTypeFilter || undefined,
        eventFrom: fromFilter || undefined,
        eventTo: toFilter || undefined,
        performedByUserId: performedByFilter || undefined,
      });
      setItems((res.items ?? []) as HistoryPurchase[]);
    } catch {
      setItems([]);
      showFlash(errorResponse("No se pudo cargar el historial de compras."));
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter, fromFilter, performedByFilter, showFlash, toFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<DataTableColumn<HistoryPurchase>[]>(() => [
    {
      id: "numero",
      header: "Compra",
      cell: (row) => <span>{[row.serie, row.correlative].filter(Boolean).join("-") || row.poId}</span>,
    },
    {
      id: "proveedor",
      header: "Proveedor",
      cell: (row) => <span>{row.supplierName ?? "-"}</span>,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (row) => <span>{row.status}</span>,
    },
    {
      id: "eventos",
      header: "Eventos",
      cell: (row) => <span>{row.history?.eventsCount ?? 0}</span>,
    },
    {
      id: "ultimo",
      header: "Último evento",
      cell: (row) => <span>{row.history?.lastEventAt ? new Date(row.history.lastEventAt).toLocaleString() : "-"}</span>,
    },
  ], []);

  const openTimeline = useCallback(async (row: HistoryPurchase) => {
    setSelected(row);
    setTimelineLoading(true);
    try {
      const res = await getPurchaseTimeline(row.poId ?? "", {
        eventType: eventTypeFilter || undefined,
        performedByUserId: performedByFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      setTimeline(res.events ?? []);
    } catch {
      setTimeline([]);
      showFlash(errorResponse("No se pudo cargar la línea de tiempo de la compra."));
    } finally {
      setTimelineLoading(false);
    }
  }, [eventTypeFilter, fromFilter, performedByFilter, showFlash, toFilter]);

  return (
    <PageShell className="bg-white">
      <PageTitle title="Historial de Compras" />
      <DataTable
        tableId="purchase-history"
        data={items}
        columns={columns}
        rowKey="poId"
        loading={loading}
        emptyMessage="No hay compras en historial."
        onRowClick={(row) => {
          void openTimeline(row);
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-zinc-900 px-3 py-1 text-xs text-white"
          onClick={() => {
            void load();
          }}
        >
          Actualizar historial
        </button>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setTimeline([]);
        }}
        title="Línea de tiempo de compra"
        className="w-[900px]"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${eventTypeFilter === "" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-300"}`}
              onClick={() => setEventTypeFilter("")}
            >
              Todos
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${eventTypeFilter === "PROCESSING_REQUESTED" ? "bg-amber-600 text-white border-amber-700" : "bg-white text-zinc-700 border-zinc-300"}`}
              onClick={() => setEventTypeFilter("PROCESSING_REQUESTED")}
            >
              Procesamiento solicitado
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${eventTypeFilter === "PROCESSING_APPROVED" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-zinc-700 border-zinc-300"}`}
              onClick={() => setEventTypeFilter("PROCESSING_APPROVED")}
            >
              Procesamiento aprobado
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${eventTypeFilter === "PROCESSING_REJECTED" ? "bg-rose-600 text-white border-rose-700" : "bg-white text-zinc-700 border-zinc-300"}`}
              onClick={() => setEventTypeFilter("PROCESSING_REJECTED")}
            >
              Procesamiento rechazado
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <input
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              placeholder="Tipo evento"
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            />
            <input
              value={performedByFilter}
              onChange={(e) => setPerformedByFilter(e.target.value)}
              placeholder="Usuario (UUID)"
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            />
            <input
              type="date"
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            />
            <input
              type="date"
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <button
              type="button"
              className="rounded bg-zinc-900 px-3 py-1 text-xs text-white"
              onClick={() => {
                if (selected) {
                  void openTimeline(selected);
                }
              }}
            >
              Aplicar filtros
            </button>
          </div>
          {timelineLoading ? <p className="text-sm text-zinc-500">Cargando eventos...</p> : null}
          {!timelineLoading && timeline.length === 0 ? <p className="text-sm text-zinc-500">Sin eventos registrados.</p> : null}
          {!timelineLoading && timeline.length > 0 ? (
            <div className="space-y-2">
              {timeline.map((event, index) => (
                <div key={`${String(event.id ?? index)}`} className="rounded-lg border border-zinc-200 p-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${EVENT_BADGE_CLASS[String(event.eventType ?? "")] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"}`}>
                    {EVENT_LABELS[String(event.eventType ?? "")] ?? String(event.eventType ?? "-")}
                  </span>
                  <p className="text-sm text-zinc-900">{String(event.description ?? "-")}</p>
                  <p className="text-xs text-zinc-600">
                    Solicitado por: {String(event.performedByUserName ?? event.performedByUserId ?? "-")}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Afecta a: {String(event.targetUserName ?? event.targetUserId ?? "-")}
                  </p>
                  <p className="text-xs text-zinc-500">{event.createdAt ? new Date(String(event.createdAt)).toLocaleString() : "-"}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Modal>
    </PageShell>
  );
}
