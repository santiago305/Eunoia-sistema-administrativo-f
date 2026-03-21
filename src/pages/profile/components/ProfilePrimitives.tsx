import { PROFILE_PRIMARY, cn } from "./profile.utils";
import type { FieldProps } from "../types/components.types";

type CardProps = {
  children: React.ReactNode;
};

export function Card({ children }: CardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/8 bg-white shadow-sm">
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  subtitle?: string;
};

export function CardHeader({ title, subtitle }: CardHeaderProps) {
  return (
    <div className="px-5 py-5">
      <div className="flex items-start gap-3"> 
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-black">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-1 max-w-sm text-sm leading-5 text-black/60">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-black/50">{label}</span>
      <span className="text-xs font-semibold text-black/80 text-right">{value || "—"}</span>
    </div>
  );
}

export function Field({ label, error, className, ...props }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-black/70">{label}</label>
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
          "focus:border-black/20 focus:ring-2 focus:ring-black/5",
          error && "border-red-500/50 focus:ring-red-500/10",
          className
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export const PasswordField = Field;

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


