import { useEffect, useRef, useState, type ReactNode } from "react";
import { Save, Search } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { SystemButton } from "@/components/SystemButton";
import { cn } from "@/lib/utils";
import { DataTableSaveMetricModal } from "./DataTableSaveMetricModal";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmitSearch: () => void;
  children: ReactNode;
  searchLabel?: string;
  searchName?: string;
  panelClassName?: string;
  helperText?: string;
  canSaveMetric?: boolean;
  saveLoading?: boolean;
  onSaveMetric?: (name: string) => Promise<boolean | void> | boolean | void;
};

export function DataTableSearchBar({
  value,
  onChange,
  onSubmitSearch,
  children,
  searchLabel = "Buscar...",
  searchName = "data-table-smart-search",
  panelClassName,
  helperText,
  canSaveMetric = false,
  saveLoading = false,
  onSaveMetric,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [metricName, setMetricName] = useState("");

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (metricModalOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-floating-overlay-root='true']")) {
        return;
      }
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [metricModalOpen]);

  const handleSaveMetric = async () => {
    const trimmed = metricName.trim();
    if (!trimmed || !onSaveMetric) return;
    const result = await onSaveMetric(trimmed);
    if (result === false) return;
    setMetricName("");
    setMetricModalOpen(false);
  };

  return (
    <>
      <div ref={wrapperRef} className="relative z-40">
        <div className="min-w-0">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FloatingInput
              label={searchLabel}
              name={searchName}
              value={value}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onSubmitSearch();
              }}
              onChange={(event) => {
                onChange(event.target.value);
                setOpen(true);
              }}
              className="h-11 rounded-sm border-border pl-4 pr-20 shadow-sm"
            />

            <button
              type="button"
              onClick={onSubmitSearch}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl bg-background text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {helperText ? (
            <p className="mt-2 text-[11px] text-muted-foreground">{helperText}</p>
          ) : null}
        </div>

        {open ? (
          <div
            className={cn(
              "absolute left-0 top-[calc(100%+0.5rem)] flex w-full max-w-md flex-col overflow-hidden rounded-sm border border-border/70 bg-background shadow-xl",
              panelClassName,
            )}
          >
            <div className="p-4">
              {children}
            </div>

            {onSaveMetric ? (
              <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground">
                    Guardar metrica
                  </p>
                </div>

                <SystemButton
                  variant="primary"
                  size="sm"
                  className="shrink-0 rounded-sm px-3 text-[11px]"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  disabled={!canSaveMetric}
                  onClick={() => {
                    setOpen(false);
                    setMetricModalOpen(true);
                  }}
                >
                  Guardar
                </SystemButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {onSaveMetric ? (
        <DataTableSaveMetricModal
          open={metricModalOpen}
          metricName={metricName}
          saveLoading={saveLoading}
          inputName={`${searchName}-metric-name`}
          onMetricNameChange={setMetricName}
          onClose={() => {
            setMetricModalOpen(false);
          }}
          onSave={() => void handleSaveMetric()}
        />
      ) : null}
    </>
  );
}
