import { Trash2 } from "lucide-react";
import type { DataTableSavedSearchItem } from "./types";

type Props<TSnapshot> = {
  items: DataTableSavedSearchItem<TSnapshot>[];
  onApplySnapshot: (snapshot: TSnapshot) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function SmartSearchSavedMetricsSection<TSnapshot>({
  items,
  onApplySnapshot,
  onDeleteMetric,
}: Props<TSnapshot>) {
  if (!items.length) return null;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Metricas</h3>
        <p className="text-[11px] text-slate-500">
          Reaplica filtros guardados para esta tabla.
        </p>
      </div>

      <div className="space-y-1">
        {items.map((metric) => (
          <div
            key={metric.id}
            className="group flex items-center gap-2 rounded-sm px-3 py-2 transition hover:bg-slate-100"
          >
            <button
              type="button"
              onClick={() => onApplySnapshot(metric.snapshot)}
              className="min-w-0 flex-1 text-left"
              title={metric.name}
            >
              <div className="truncate text-[13px] font-medium text-slate-800">
                {metric.name}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {metric.label}
              </div>
            </button>

            {onDeleteMetric ? (
              <button
                type="button"
                onClick={() => onDeleteMetric(metric.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Eliminar ${metric.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
