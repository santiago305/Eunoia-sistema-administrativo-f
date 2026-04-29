import { SystemButton } from "@/shared/components/components/SystemButton";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { ProductEquivalence } from "../types/equivalence";
import { WorkspaceTab } from "../types/product";

export type TabOption = {
  id: WorkspaceTab;
  label: string;
  icon: LucideIcon;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type EquivalenceLike = Pick<
  ProductEquivalence,
  "id" | "fromUnitId" | "toUnitId" | "factor" | "fromUnit" | "toUnit"
>;


export function SectionCard({
  title,
  description,
  icon: Icon,
  aside,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-black/70">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div>
              <h3 className="text-sm font-semibold text-black">{title}</h3>
              {description ? <p className="text-xs text-black/55">{description}</p> : null}
            </div>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function PendingNotice({
  children,
  actionLabel,
  onAction,
  disabled,
}: {
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px] flex-1">{children}</div>
        {actionLabel && onAction ? (
          <SystemButton
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={onAction}
            disabled={disabled}
          >
            {actionLabel}
          </SystemButton>
        ) : null}
      </div>
    </div>
  );
}

export function ProductWorkspaceTabs({
  tabs,
  activeTab,
  primaryColor,
  onChange,
}: {
  tabs: TabOption[];
  activeTab: WorkspaceTab;
  primaryColor: string;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              active ? "text-white shadow-sm" : "text-black/70 hover:bg-black/[0.04]"
            }`}
            style={
              active
                ? {
                    backgroundColor: primaryColor,
                    borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                  }
                : undefined
            }
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}