import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { FloatingRequiredLabel } from "@/shared/components/components/FloatingRequiredLabel";

type Props = {
  title: string;
  description?: string;
  requiredIndicator?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
};

export function SaleOrderEditorSection({
  title,
  description,
  requiredIndicator = false,
  actions,
  children,
  bodyClassName = "",
}: Props) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl bg-muted/25">
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-2 bg-muted/70 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-5 w-1 shrink-0 rounded-full bg-primary/70"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">
              <FloatingRequiredLabel label={title} required={requiredIndicator} />
            </h3>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className={twMerge("min-w-0 p-3", bodyClassName)}>{children}</div>
    </section>
  );
}
