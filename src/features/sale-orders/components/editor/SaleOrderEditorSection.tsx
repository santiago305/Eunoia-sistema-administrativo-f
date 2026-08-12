import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { FloatingRequiredLabel } from "@/shared/components/components/FloatingRequiredLabel";

type Props = {
  title: string;
  description?: string;
  requiredIndicator?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export function SaleOrderEditorSection({
  title,
  description,
  requiredIndicator = false,
  actions,
  children,
  bodyClassName = "",
  collapsible = false,
  defaultCollapsed = false,
}: Props) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const bodyId = useId();
  const titleContent = (
    <>
      <span
        aria-hidden="true"
        className="h-5 w-1 shrink-0 rounded-full bg-primary/70"
      />
      <span className="min-w-0 text-left">
        <span className="block text-sm font-semibold leading-tight">
          <FloatingRequiredLabel label={title} required={requiredIndicator} />
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-xl bg-muted/25">
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-2 bg-muted/70 px-3 py-2">
        {collapsible ? (
          <button
            type="button"
            className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => setCollapsed((current) => !current)}
          >
            {titleContent}
            <ChevronDown
              aria-hidden="true"
              className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${collapsed ? "-rotate-90" : "rotate-0"}`}
            />
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            {titleContent}
          </div>
        )}
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div
        id={bodyId}
        hidden={collapsible && collapsed}
        className={twMerge("min-w-0 p-3", bodyClassName)}
      >
        {children}
      </div>
    </section>
  );
}
