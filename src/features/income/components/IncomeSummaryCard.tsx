import type { LucideIcon } from "lucide-react";

type IncomeSummaryCardTone = "primary" | "warning" | "success" | "neutral";

type IncomeSummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: IncomeSummaryCardTone;
};

const toneStyles: Record<
  IncomeSummaryCardTone,
  { accent: string; icon: string }
> = {
  primary: {
    accent: "bg-primary",
    icon: "bg-primary/10 text-primary",
  },
  warning: {
    accent: "bg-amber-500",
    icon: "bg-amber-50 text-amber-700",
  },
  success: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700",
  },
  neutral: {
    accent: "bg-slate-400",
    icon: "bg-slate-100 text-slate-600",
  },
};

export function IncomeSummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: IncomeSummaryCardProps) {
  const styles = toneStyles[tone];

  return (
    <article className="relative min-w-0 overflow-hidden rounded-lg border border-border/70 bg-background p-4 shadow-sm">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`}
      />

      <div className="flex items-start justify-between gap-4 pl-1">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>

        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
      </div>

      <p className="mt-3 pl-1 text-sm leading-5 text-muted-foreground">
        {detail}
      </p>
    </article>
  );
}
