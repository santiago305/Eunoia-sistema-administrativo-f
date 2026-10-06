import type { LucideIcon } from "lucide-react";
import { PlaceholderPattern } from "@/shared/components/ui/placeholder-pattern";

export type SummaryMetricFormat = "number" | "currency" | "percent";
export type SummaryMetricTone = "primary" | "success" | "warning" | "danger" | "neutral" | "info";

export type SummaryMetricItem = {
  key: string;
  label: string;
  value: number | null;
  format?: SummaryMetricFormat;
  currency?: string;
  Icon: LucideIcon;
  badgeLabel?: string;
  description?: string;
  tone?: SummaryMetricTone;
  onClick?: () => void;
};

type Props = {
  items: readonly SummaryMetricItem[];
  loading?: boolean;
  columnsClassName?: string;
  ariaLabel?: string;
};

const tones: Record<SummaryMetricTone, { pattern: string; badge: string; icon: string }> = {
  primary: { pattern: "text-blue-600/10", badge: "bg-blue-100 text-blue-700", icon: "text-blue-600" },
  success: { pattern: "text-emerald-600/10", badge: "bg-emerald-100 text-emerald-700", icon: "text-emerald-600" },
  warning: { pattern: "text-amber-600/10", badge: "bg-amber-100 text-amber-700", icon: "text-amber-600" },
  danger: { pattern: "text-rose-600/10", badge: "bg-rose-100 text-rose-700", icon: "text-rose-600" },
  neutral: { pattern: "text-slate-600/10", badge: "bg-slate-100 text-slate-700", icon: "text-slate-600" },
  info: { pattern: "text-sky-600/10", badge: "bg-sky-100 text-sky-700", icon: "text-sky-600" },
};

const formatValue = (item: SummaryMetricItem) => {
  if (item.value === null) return "—";
  if (item.format === "currency") {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: item.currency ?? "PEN" }).format(item.value);
  }
  if (item.format === "percent") return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(item.value)}%`;
  return new Intl.NumberFormat("es-PE").format(item.value);
};

export function SummaryMetricCards({ items, loading = false, columnsClassName = "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", ariaLabel = "Resumen de métricas" }: Props) {
  return (
    <section aria-label={ariaLabel} className={`grid ${columnsClassName}`}>
      {items.map((item) => {
        const tone = tones[item.tone ?? "neutral"];
        const content = (
          <>
            <PlaceholderPattern className={`pointer-events-none absolute inset-0 size-full ${tone.pattern}`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <item.Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${tone.icon}`} />
                  <span className="truncate" title={item.label}>{item.label}</span>
                </p>
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tone.badge}`}>{loading ? "…" : item.badgeLabel ?? "Actual"}</span>
              </div>
              <div className="mt-2 text-xl font-semibold leading-none tabular-nums text-foreground">{loading ? "—" : formatValue(item)}</div>
              {item.description ? <p className="mt-2 line-clamp-2 text-xs leading-4 text-muted-foreground">{item.description}</p> : null}
            </div>
          </>
        );
        return item.onClick ? (
          <button key={item.key} type="button" onClick={item.onClick} className="relative min-h-[112px] min-w-0 overflow-hidden rounded-xl border border-border bg-background px-3 py-3 text-left shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{content}</button>
        ) : (
          <article key={item.key} className="relative min-h-[112px] min-w-0 overflow-hidden rounded-xl border border-border bg-background px-3 py-3 shadow-sm">{content}</article>
        );
      })}
    </section>
  );
}
