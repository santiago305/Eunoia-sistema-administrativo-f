type Props = {
  events: Array<Record<string, unknown>>;
  loading?: boolean;
};

const eventLabel = (event: Record<string, unknown>) =>
  String(event.eventType ?? event.type ?? event.action ?? "Evento");

const eventDate = (event: Record<string, unknown>) => {
  const raw = event.createdAt ?? event.performedAt ?? event.date;
  return typeof raw === "string" ? new Date(raw).toLocaleString() : "-";
};

export function PurchaseTimelineTab({ events, loading = false }: Props) {
  if (loading) return <div className="rounded-sm border border-black/10 bg-white p-4 text-sm text-black/50">Cargando historial...</div>;

  return (
    <section className="space-y-2">
      {events.length ? events.map((event, index) => (
        <div key={String(event.eventId ?? event.id ?? index)} className="rounded-sm border border-black/10 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-black">{eventLabel(event)}</p>
            <span className="text-xs text-black/45">{eventDate(event)}</span>
          </div>
          {event.comment || event.reason ? (
            <p className="mt-1 text-sm text-black/60">{String(event.comment ?? event.reason)}</p>
          ) : null}
        </div>
      )) : (
        <div className="rounded-sm border border-black/10 bg-white p-4 text-sm text-black/50">Sin eventos registrados.</div>
      )}
    </section>
  );
}
