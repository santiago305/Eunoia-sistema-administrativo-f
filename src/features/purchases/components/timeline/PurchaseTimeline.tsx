import { FileText, Receipt, UserCircle } from "lucide-react";
import { PurchaseEventDiff } from "./PurchaseEventDiff";
import { getPurchaseEventLabel } from "@/features/purchases/utils/purchase-event-labels";

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

function getEventLink(metadata?: Record<string, unknown> | null) {
  const documentId = metadata?.documentId ?? metadata?.attachmentId;
  const paymentId = metadata?.paymentId;
  const payableId = metadata?.payableId ?? metadata?.accountPayableId;

  if (documentId) return { label: "Ver documento", value: String(documentId), icon: FileText };
  if (paymentId) return { label: "Ver pago", value: String(paymentId), icon: Receipt };
  if (payableId) return { label: "Ver cuenta por pagar", value: String(payableId), icon: Receipt };
  return null;
}

export function PurchaseTimeline({
  events,
  loading = false,
  emptyMessage = "Sin eventos registrados.",
}: Props) {
  if (loading) {
    return (
      <div className="rounded-sm border border-black/10 bg-white p-4 text-sm text-black/50">
        Cargando eventos...
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
    <div className="space-y-0">
      {events.map((event, index) => {
        const link = getEventLink(event.metadata);
        const LinkIcon = link?.icon;
        const actor = event.performedByUserName ?? event.performedByUserId ?? "Sistema";
        const target = event.targetUserName ?? event.targetUserId;

        return (
          <article key={event.id ?? `${event.eventType}-${index}`} className="relative pl-8">
            <span className="absolute left-[7px] top-0 h-full w-px bg-black/10" aria-hidden="true" />
            <span className="absolute left-0 top-2 h-3.5 w-3.5 rounded-full border-2 border-white bg-black shadow-sm" aria-hidden="true" />
            <div className="mb-3 rounded-sm border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase text-black/65">
                    {getPurchaseEventLabel(event.eventType)}
                  </span>
                  <p className="mt-2 text-sm font-medium text-black">{event.description ?? "Evento registrado."}</p>
                </div>
                <time className="shrink-0 text-xs text-black/45">{formatEventDate(event.createdAt)}</time>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-black/55">
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-sm bg-black/[0.03] px-2">
                  <UserCircle className="h-4 w-4" aria-hidden="true" />
                  {actor}
                </span>
                {target ? (
                  <span className="inline-flex min-h-8 items-center rounded-sm bg-black/[0.03] px-2">
                    Afecta a: {target}
                  </span>
                ) : null}
                {link && LinkIcon ? (
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-black/10 px-2 text-black/65">
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    {link.label}: {link.value}
                  </span>
                ) : null}
              </div>

              <PurchaseEventDiff oldValues={event.oldValues} newValues={event.newValues} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
