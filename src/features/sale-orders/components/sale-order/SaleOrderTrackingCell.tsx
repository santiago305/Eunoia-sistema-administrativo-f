import { useCallback, useEffect, useRef, useState } from "react";
import { FileCheck2, FileClock, LoaderCircle, PackageCheck, PackageOpen } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { cn } from "@/shared/lib/utils";

type TrackingField = "preguide" | "prepared";

type Props = {
  order: Pick<SaleOrder, "preguide" | "prepared">;
  canUpdatePreguide: boolean;
  canUpdatePrepared: boolean;
  onChange: (field: TrackingField, value: boolean) => Promise<void>;
  variant?: "table" | "editor";
};

const UPDATE_DELAY_MS = 250;

function useCoalescedTrackingValue(
  field: TrackingField,
  value: boolean,
  onChange: Props["onChange"],
) {
  const [displayed, setDisplayed] = useState(value);
  const [saving, setSaving] = useState(false);
  const confirmedRef = useRef(value);
  const desiredRef = useRef(value);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, UPDATE_DELAY_MS);
  }, [clearTimer]);

  flushRef.current = async () => {
    if (inFlightRef.current) return;
    const requestedValue = desiredRef.current;
    if (requestedValue === confirmedRef.current) return;

    inFlightRef.current = true;
    if (mountedRef.current) setSaving(true);
    try {
      await onChange(field, requestedValue);
      confirmedRef.current = requestedValue;
    } catch {
      if (desiredRef.current === requestedValue) {
        desiredRef.current = confirmedRef.current;
        if (mountedRef.current) setDisplayed(confirmedRef.current);
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setSaving(false);
      if (mountedRef.current && desiredRef.current !== confirmedRef.current) {
        schedule();
      }
    }
  };

  useEffect(() => {
    confirmedRef.current = value;
    if (!inFlightRef.current && timerRef.current === null) {
      desiredRef.current = value;
      setDisplayed(value);
    }
  }, [value]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  const toggle = useCallback(() => {
    const nextValue = !desiredRef.current;
    desiredRef.current = nextValue;
    setDisplayed(nextValue);
    if (!inFlightRef.current) schedule();
  }, [schedule]);

  return { displayed, saving, toggle };
}

function TrackingTag({
  field,
  value,
  allowed,
  onChange,
  variant,
}: {
  field: TrackingField;
  value: boolean;
  allowed: boolean;
  onChange: Props["onChange"];
  variant: NonNullable<Props["variant"]>;
}) {
  const { displayed, saving, toggle } = useCoalescedTrackingValue(field, value, onChange);
  const isPreguide = field === "preguide";
  const text = displayed
    ? isPreguide
      ? "Con preguía"
      : "Preparado"
    : isPreguide
      ? "Sin preguía"
      : "Sin preparar";
  const action = displayed
    ? isPreguide
      ? "Marcar sin preguía"
      : "Marcar sin preparar"
    : isPreguide
      ? "Marcar con preguía"
      : "Marcar preparado";
  const Icon = saving
    ? LoaderCircle
    : displayed
      ? isPreguide
        ? FileCheck2
        : PackageCheck
      : isPreguide
        ? FileClock
        : PackageOpen;
  const className = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors duration-200",
    variant === "editor" ? "min-h-9 px-3 py-1.5 text-xs" : "min-h-7 px-2 py-1 text-[10px]",
    displayed
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700",
    allowed && "cursor-pointer hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1",
  );

  const content = (
    <>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", saving && "animate-spin")} aria-hidden="true" />
      <span>{text}</span>
    </>
  );

  if (!allowed) {
    return (
      <span className={className} title={text}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={`${text}. ${action}`}
      aria-busy={saving}
      title={action}
      onClick={toggle}
    >
      {content}
    </button>
  );
}

export function SaleOrderTrackingCell({
  order,
  canUpdatePreguide,
  canUpdatePrepared,
  onChange,
  variant = "table",
}: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1.5",
        variant === "editor" ? "w-full" : "w-[220px]",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <TrackingTag
        field="preguide"
        value={order.preguide === true}
        allowed={canUpdatePreguide}
        onChange={onChange}
        variant={variant}
      />
      <TrackingTag
        field="prepared"
        value={order.prepared === true}
        allowed={canUpdatePrepared}
        onChange={onChange}
        variant={variant}
      />
    </div>
  );
}
