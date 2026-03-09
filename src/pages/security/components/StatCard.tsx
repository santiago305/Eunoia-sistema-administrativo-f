import { cn } from "./security.utils";

export function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneStyles = {
    default: "border-zinc-200 bg-white",
    success:
      "border-[rgba(33,184,166,.16)] bg-[linear-gradient(180deg,rgba(33,184,166,.08),rgba(255,255,255,1))]",
    warning:
      "border-amber-200 bg-[linear-gradient(180deg,rgba(251,191,36,.10),rgba(255,255,255,1))]",
    danger:
      "border-red-200 bg-[linear-gradient(180deg,rgba(239,68,68,.08),rgba(255,255,255,1))]",
  };

  return (
    <div
      className={cn(
        "rounded-[28px] border p-5 shadow-[0_14px_36px_rgba(15,23,42,.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,.08)]",
        toneStyles[tone]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 md:text-4xl">
            {value}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{hint}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/80 text-zinc-800 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}
