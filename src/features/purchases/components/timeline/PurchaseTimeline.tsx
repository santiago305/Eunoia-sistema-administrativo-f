import { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  PackageCheck,
  PencilLine,
  Receipt,
  UserCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { PurchaseEventDiff } from "./PurchaseEventDiff";
import {
  getPurchaseEventDiffRows,
  getPurchaseEventLabel,
} from "@/features/purchases/utils/purchase-event-labels";

export type PurchaseTimelineEvent = {
  id?: string;
  eventType?: string;
  description?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  performedByUserId?: string | null;
  performedByUserName?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  createdAt?: string | Date;
};

type Props = {
  events: PurchaseTimelineEvent[];
  loading?: boolean;
  emptyMessage?: string;
};

function formatEventDate(value?: string | Date) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatEventDay(value?: string | Date) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatEventTime(value?: string | Date) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getEventLink(metadata?: Record<string, unknown> | null) {
  const documentId = metadata?.documentId ?? metadata?.attachmentId;
  const paymentId = metadata?.paymentId;
  const payableId = metadata?.payableId ?? metadata?.accountPayableId;

  if (documentId) return { label: "Documento", value: String(documentId), icon: FileText };
  if (paymentId) return { label: "Pago", value: String(paymentId), icon: Receipt };
  if (payableId) return { label: "Cuenta por pagar", value: String(payableId), icon: Receipt };
  return null;
}

function lowerFirst(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function getFriendlyEventDescription(event: PurchaseTimelineEvent, actor: string) {
  const eventType = event.eventType ?? "";

  switch (eventType) {
    case "CREATED":
    case "PURCHASE_CREATED":
      return `${actor} creó la compra.`;
    case "PURCHASE_CREATED_WITH_PAYMENT_PENDING_APPROVAL":
      return `${actor} creó la compra con pago pendiente de aprobación.`;
    case "PURCHASE_DRAFT_CREATED":
      return `${actor} creó el borrador de la compra.`;
    case "PURCHASE_UPDATED":
    case "UPDATED":
      return `${actor} actualizó la compra.`;
    case "PURCHASE_SUBMITTED":
      return `${actor} envió la compra.`;
    case "PROCESSING_REQUESTED":
      return `${actor} envió la compra a procesamiento.`;
    case "PURCHASE_APPROVED":
    case "PURCHASE_CREATION_APPROVED":
    case "PROCESSING_APPROVED":
      return `${actor} aprobó la compra.`;
    case "PURCHASE_REJECTED":
    case "PURCHASE_CREATION_REJECTED":
    case "PROCESSING_REJECTED":
      return `${actor} rechazó la compra.`;
    case "PURCHASE_CANCELLED":
      return `${actor} canceló la compra.`;
    case "PURCHASE_ITEM_ADDED":
      return `${actor} agregó un item.`;
    case "PURCHASE_ITEM_UPDATED":
      return `${actor} actualizó un item.`;
    case "PURCHASE_ITEM_REMOVED":
      return `${actor} eliminó un item.`;
    case "PURCHASE_DOCUMENT_ATTACHED":
    case "PURCHASE_ATTACHMENT_UPLOADED":
      return `${actor} subió un documento.`;
    case "PURCHASE_DOCUMENT_DELETED":
    case "PURCHASE_ATTACHMENT_DELETED":
      return `${actor} eliminó un documento.`;
    case "PURCHASE_RECEPTION_CREATED":
      return `${actor} registró una recepción.`;
    case "PURCHASE_PARTIALLY_RECEIVED":
      return `${actor} recibió parcialmente la compra.`;
    case "PURCHASE_FULLY_RECEIVED":
      return `${actor} recibió completamente la compra.`;
    case "PURCHASE_STOCK_ENTRY_CREATED":
      return `${actor} registró el ingreso de stock.`;
    case "PURCHASE_SERVICE_CONFIRMED":
      return `${actor} confirmó el servicio.`;
    case "PURCHASE_EXTRA_TIME_ADDED":
      return `${actor} agregó tiempo extra.`;
    case "PURCHASE_QUOTA_CREATED":
      return `${actor} creó una cuota.`;
    case "PURCHASE_QUOTA_DELETED":
      return `${actor} eliminó una cuota.`;
    case "PAYABLE_CREATED":
      return `${actor} creó una cuenta por pagar.`;
    case "PAYABLE_UPDATED":
      return `${actor} actualizó una cuenta por pagar.`;
    case "PAYABLE_OVERDUE":
      return `${actor} marcó una cuenta por pagar como vencida.`;
    case "PAYMENT_REQUESTED":
      return `${actor} solicitó un pago.`;
    case "PAYMENT_SCHEDULED":
      return `${actor} programó un pago.`;
    case "PAYMENT_REGISTERED":
      return `${actor} registró un pago.`;
    case "PAYMENT_APPROVED":
      return `${actor} aprobó un pago.`;
    case "PAYMENT_REJECTED":
      return `${actor} rechazó un pago.`;
    case "PAYMENT_EVIDENCE_ATTACHED":
      return `${actor} adjuntó evidencia de pago.`;
    case "PAYMENT_DELETED":
      return `${actor} eliminó un pago.`;
    default:
      return `${actor} registró ${lowerFirst(getPurchaseEventLabel(event.eventType))}.`;
  }
}

function getEventTone(eventType?: string): {
  icon: LucideIcon;
  iconClassName: string;
  dotClassName: string;
  labelClassName: string;
} {
  const normalized = eventType ?? "";

  if (normalized.includes("PAYMENT") || normalized.includes("PAYABLE")) {
    return {
      icon: CircleDollarSign,
      iconClassName: "text-emerald-700",
      dotClassName: "border-emerald-200 bg-emerald-50",
      labelClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalized.includes("APPROVED")) {
    return {
      icon: CheckCircle2,
      iconClassName: "text-sky-700",
      dotClassName: "border-sky-200 bg-sky-50",
      labelClassName: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (normalized.includes("REJECTED") || normalized.includes("CANCELLED") || normalized.includes("DELETED")) {
    return {
      icon: XCircle,
      iconClassName: "text-rose-700",
      dotClassName: "border-rose-200 bg-rose-50",
      labelClassName: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (normalized.includes("RECEIVED") || normalized.includes("RECEPTION")) {
    return {
      icon: PackageCheck,
      iconClassName: "text-teal-700",
      dotClassName: "border-teal-200 bg-teal-50",
      labelClassName: "border-teal-200 bg-teal-50 text-teal-700",
    };
  }

  if (normalized.includes("SUBMITTED") || normalized.includes("PROCESSING")) {
    return {
      icon: ClipboardCheck,
      iconClassName: "text-violet-700",
      dotClassName: "border-violet-200 bg-violet-50",
      labelClassName: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  return {
    icon: PencilLine,
    iconClassName: "text-slate-700",
    dotClassName: "border-slate-200 bg-slate-50",
    labelClassName: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

export function PurchaseTimeline({
  events,
  loading = false,
  emptyMessage = "Sin eventos registrados.",
}: Props) {
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set());

  function toggleEventDetails(eventKey: string) {
    setExpandedEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventKey)) next.delete(eventKey);
      else next.add(eventKey);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Cargando eventos">
        {[0, 1, 2].map((item) => (
          <div key={item} className="grid animate-pulse gap-3 sm:grid-cols-[8rem_minmax(20rem,42rem)]">
            <div className="h-12 rounded-sm bg-black/[0.04]" />
            <div className="h-24 rounded-sm border border-black/10 bg-white" />
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-sm border border-black/10 bg-white p-6 text-sm text-black/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="min-w-[min(42rem,calc(100vw-3.5rem))] space-y-0">
      {events.map((event, index) => {
        const eventKey = event.id ?? `${event.eventType}-${event.createdAt ?? index}`;
        const link = getEventLink(event.metadata);
        const LinkIcon = link?.icon;
        const actor = event.performedByUserName ?? event.performedByUserId ?? "Sistema";
        const target = event.targetUserName ?? event.targetUserId;
        const diffRows = getPurchaseEventDiffRows(event.oldValues, event.newValues);
        const hasDetails = Boolean(target || link || diffRows.length);
        const isExpanded = expandedEventIds.has(eventKey);
        const eventLabel = getPurchaseEventLabel(event.eventType);
        const tone = getEventTone(event.eventType);
        const EventIcon = tone.icon;
        const isLast = index === events.length - 1;

        return (
          <article
            key={eventKey}
            className="grid gap-3 sm:grid-cols-[8rem_minmax(20rem,42rem)]"
          >
            <time
              className="pt-1 text-xs leading-5 text-black/55 sm:text-right"
              dateTime={event.createdAt ? new Date(event.createdAt).toISOString() : undefined}
            >
              <span className="block font-semibold text-black/70">{formatEventDay(event.createdAt)}</span>
              <span>{formatEventTime(event.createdAt)}</span>
            </time>

            <div className="relative pb-4 pl-10">
              {!isLast ? (
                <span className="absolute left-[17px] top-10 h-[calc(100%-2rem)] w-px bg-black/10" aria-hidden="true" />
              ) : null}
              <span
                className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border ${tone.dotClassName}`}
                aria-hidden="true"
              >
                <EventIcon className={`h-4 w-4 ${tone.iconClassName}`} />
              </span>

              <div className="rounded-sm border border-black/10 bg-white p-4 shadow-sm transition-colors hover:border-black/20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${tone.labelClassName}`}>
                    {eventLabel}
                    </span>
                    <p className="mt-2 text-sm font-medium leading-5 text-black">
                      {getFriendlyEventDescription(event, actor)}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-black/45">{formatEventDate(event.createdAt)}</time>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-black/[0.03] px-2">
                    <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase text-black/40">Fecha</span>
                      <span className="block truncate text-black/70">{formatEventDate(event.createdAt)}</span>
                    </span>
                  </span>
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-black/[0.03] px-2">
                    <UserCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase text-black/40">Realizado por</span>
                      <span className="block truncate text-black/70">{actor}</span>
                    </span>
                  </span>
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-black/[0.03] px-2">
                    <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase text-black/40">Estado</span>
                      <span className="block truncate text-black/70">{eventLabel}</span>
                    </span>
                  </span>
                </div>

                {hasDetails ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-black/55">
                    <button
                      type="button"
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-black/10 px-2 font-medium text-black/60 transition-colors hover:border-black/20 hover:bg-black/[0.03] hover:text-black"
                      aria-expanded={isExpanded}
                      onClick={() => toggleEventDetails(eventKey)}
                    >
                      {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                ) : null}

                {hasDetails && isExpanded ? (
                  <div className="mt-3 rounded-sm border border-black/10 bg-black/[0.015] p-3">
                    <div className="flex flex-wrap gap-2 text-xs text-black/55">
                  {target ? (
                    <span className="inline-flex min-h-8 items-center rounded-sm bg-white px-2">
                      Afecta a {target}
                    </span>
                  ) : null}
                  {link && LinkIcon ? (
                    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-black/10 bg-white px-2 text-black/65">
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      {link.label} {link.value}
                    </span>
                  ) : null}
                    </div>
                    <PurchaseEventDiff oldValues={event.oldValues} newValues={event.newValues} />
                </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
