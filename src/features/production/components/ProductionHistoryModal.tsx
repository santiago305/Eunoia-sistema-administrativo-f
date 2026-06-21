import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { ProductionHistoryEvent, ProductionOrder } from "@/features/production/types/production";
import { getProductionTimeline } from "@/shared/services/productionService";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse } from "@/shared/common/utils/response";
import { getApiErrorMessage } from "@/shared/common/utils/apiError";

const EVENT_LABELS: Record<string, string> = {
  PRODUCTION_CREATED: "Creacion",
  PRODUCTION_UPDATED: "Actualizacion",
  PRODUCTION_STARTED: "Inicio",
  PRODUCTION_CLOSED: "Cierre",
  PRODUCTION_START_REQUESTED: "Solicitud inicio",
  PRODUCTION_START_APPROVED: "Inicio aprobado",
  PRODUCTION_START_REJECTED: "Inicio rechazado",
  PRODUCTION_CLOSE_REQUESTED: "Solicitud cierre",
  PRODUCTION_CLOSE_APPROVED: "Cierre aprobado",
  PRODUCTION_CLOSE_REJECTED: "Cierre rechazado",
  PRODUCTION_CANCELLED: "Cancelacion",
  PRODUCTION_EXTRA_TIME_ADDED: "Tiempo extra",
  PRODUCTION_IMAGE_UPLOADED: "Evidencia",
};

const EVENT_BADGE_CLASS: Record<string, string> = {
  PRODUCTION_CREATED: "border-cyan-200 bg-cyan-50 text-cyan-800",
  PRODUCTION_UPDATED: "border-slate-200 bg-slate-50 text-slate-800",
  PRODUCTION_STARTED: "border-amber-200 bg-amber-50 text-amber-800",
  PRODUCTION_CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PRODUCTION_START_REQUESTED: "border-amber-200 bg-amber-50 text-amber-800",
  PRODUCTION_START_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PRODUCTION_START_REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  PRODUCTION_CLOSE_REQUESTED: "border-amber-200 bg-amber-50 text-amber-800",
  PRODUCTION_CLOSE_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PRODUCTION_CLOSE_REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  PRODUCTION_CANCELLED: "border-rose-200 bg-rose-50 text-rose-800",
  PRODUCTION_EXTRA_TIME_ADDED: "border-violet-200 bg-violet-50 text-violet-800",
  PRODUCTION_IMAGE_UPLOADED: "border-blue-200 bg-blue-50 text-blue-800",
};

const EVENT_FILTERS = [
  { value: "", label: "Todos" },
  { value: "PRODUCTION_CREATED", label: "Creacion" },
  { value: "PRODUCTION_UPDATED", label: "Actualizacion" },
  { value: "PRODUCTION_STARTED", label: "Inicio" },
  { value: "PRODUCTION_CLOSED", label: "Cierre" },
  { value: "PRODUCTION_START_REQUESTED", label: "Solicitud inicio" },
  { value: "PRODUCTION_START_APPROVED", label: "Inicio aprobado" },
  { value: "PRODUCTION_START_REJECTED", label: "Inicio rechazado" },
  { value: "PRODUCTION_CLOSE_REQUESTED", label: "Solicitud cierre" },
  { value: "PRODUCTION_CLOSE_APPROVED", label: "Cierre aprobado" },
  { value: "PRODUCTION_CLOSE_REJECTED", label: "Cierre rechazado" },
  { value: "PRODUCTION_CANCELLED", label: "Cancelacion" },
  { value: "PRODUCTION_EXTRA_TIME_ADDED", label: "Tiempo extra" },
  { value: "PRODUCTION_IMAGE_UPLOADED", label: "Evidencia" },
];

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  fromWarehouseId: "Almacen origen",
  toWarehouseId: "Almacen destino",
  serieId: "Serie",
  reference: "Referencia",
  manufactureDate: "Fecha de termino",
  itemCount: "Items",
  imageCount: "Fotos",
  requiredPermission: "Permiso aplicado",
  days: "Dias",
  hours: "Horas",
  minutes: "Minutos",
  imagePath: "Archivo",
  approvalRequestId: "Solicitud",
  reason: "Motivo",
  comment: "Comentario",
};

type Props = {
  open: boolean;
  order: ProductionOrder | null;
  onClose: () => void;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatActor = (event: ProductionHistoryEvent) => {
  return event.performedByUserName ?? event.performedByUserId ?? "-";
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatDateTime(value);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const buildChangeRows = (event: ProductionHistoryEvent) => {
  const oldValues = event.oldValues ?? {};
  const newValues = event.newValues ?? {};
  const keys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]));
  return keys
    .map((key) => ({
      key,
      label: FIELD_LABELS[key] ?? key,
      before: formatValue(oldValues[key]),
      after: formatValue(newValues[key]),
    }))
    .filter((row) => row.before !== row.after);
};

const buildMetadataRows = (event: ProductionHistoryEvent) => {
  return Object.entries(event.metadata ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      label: FIELD_LABELS[key] ?? key,
      value: formatValue(value),
    }));
};

const buildOrderLabel = (order: ProductionOrder | null) => {
  if (!order) return "";
  const serie = order.serie?.code ? `${order.serie.code}-${order.correlative ?? ""}` : "";
  return serie || order.productionId || order.id || "";
};

export function ProductionHistoryModal({ open, order, onClose }: Props) {
  const { showFeedback } = useFeedbackToast();
  const [events, setEvents] = useState<ProductionHistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [performedByFilter, setPerformedByFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const productionId = order?.productionId ?? order?.id ?? "";
  const orderLabel = useMemo(() => buildOrderLabel(order), [order]);

  const loadTimeline = useCallback(async () => {
    if (!productionId) return;
    setLoading(true);
    try {
      const response = await getProductionTimeline(productionId, {
        eventType: eventTypeFilter || undefined,
        performedByUserId: performedByFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      setEvents(response.events ?? []);
    } catch (error) {
      setEvents([]);
      showFeedback(errorResponse(getApiErrorMessage(error, "No se pudo cargar el historial de produccion")));
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter, fromFilter, performedByFilter, productionId, showFeedback, toFilter]);

  useEffect(() => {
    if (!open) return;
    void loadTimeline();
  }, [loadTimeline, open]);

  return (
    <Modal
      open={open}
      onClose={() => {
        setEvents([]);
        onClose();
      }}
      title={`Historial de produccion${orderLabel ? ` ${orderLabel}` : ""}`}
      className="w-[920px]"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {EVENT_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${
                eventTypeFilter === filter.value
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
              onClick={() => setEventTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            value={performedByFilter}
            onChange={(event) => setPerformedByFilter(event.target.value)}
            placeholder="Usuario (UUID)"
            className="rounded border border-zinc-300 px-2 py-1 text-xs"
          />
          <input
            type="date"
            value={fromFilter}
            onChange={(event) => setFromFilter(event.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs"
          />
          <input
            type="date"
            value={toFilter}
            onChange={(event) => setToFilter(event.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs"
          />
          <SystemButton
            type="button"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => {
              void loadTimeline();
            }}
          >
            Actualizar
          </SystemButton>
        </div>

        {loading ? <p className="text-sm text-zinc-500">Cargando eventos...</p> : null}
        {!loading && events.length === 0 ? <p className="text-sm text-zinc-500">Sin eventos registrados.</p> : null}

        {!loading && events.length > 0 ? (
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {events.map((event, index) => {
              const eventType = event.eventType ?? "";
              const changeRows = buildChangeRows(event);
              const metadataRows = buildMetadataRows(event);
              return (
                <div key={event.id ?? `${eventType}-${index}`} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${EVENT_BADGE_CLASS[eventType] ?? "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>
                      {EVENT_LABELS[eventType] ?? (eventType || "-")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-900">{event.description ?? "-"}</p>
                  <p className="mt-1 text-xs text-zinc-600">Usuario: {formatActor(event)}</p>
                  {changeRows.length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded border border-zinc-200">
                      <div className="grid grid-cols-[1fr_1fr_1fr] bg-zinc-50 text-[11px] font-semibold text-zinc-600">
                        <span className="px-2 py-1">Campo</span>
                        <span className="px-2 py-1">Antes</span>
                        <span className="px-2 py-1">Despues</span>
                      </div>
                      {changeRows.map((row) => (
                        <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr] border-t border-zinc-100 text-xs text-zinc-700">
                          <span className="px-2 py-1 font-medium">{row.label}</span>
                          <span className="min-w-0 break-words px-2 py-1">{row.before}</span>
                          <span className="min-w-0 break-words px-2 py-1">{row.after}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {metadataRows.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {metadataRows.map((row) => (
                        <span key={row.key} className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
                          {row.label}: {row.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
