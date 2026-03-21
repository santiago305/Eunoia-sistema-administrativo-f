import { PROFILE_PRIMARY, cn } from "./profile.utils";

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-black/50">{label}</span>
      <span className="text-xs font-semibold text-black/80 text-right">{value || "—"}</span>
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white",
        "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      style={{ backgroundColor: PROFILE_PRIMARY, ...(props.style ?? {}) }}
    >
      {children}
    </button>
  );
}


