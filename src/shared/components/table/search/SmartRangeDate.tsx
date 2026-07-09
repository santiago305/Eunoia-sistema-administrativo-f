import { CalendarRange, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { CalendarPanel } from "@/shared/components/components/date-picker/CalendarPanel";
import { DatePickerPanelPortal } from "@/shared/components/components/date-picker/DatePickerPanelPortal";
import {
  addDays,
  addMonths,
  endOfCalendarWeek,
  endOfMonth,
  formatCalendarMonth,
  formatCalendarWeek,
  getDateKey,
  getMonthLabel,
  normalizeCalendarMonthValue,
  parseDateOnly,
  startOfCalendarWeek,
  startOfMonth,
} from "@/shared/components/components/date-picker/dateUtils";
import { useFloatingDatePanel } from "@/shared/components/components/date-picker/useFloatingDatePanel";
import { cn } from "@/shared/lib/utils";
import type { SmartSearchRule } from "./types";

type SmartRangeDateMode = "range" | "weeks" | "month";
type SmartRangeWeeksPreset = "month-start" | "past" | "current" | "future";
type SmartRangeMonthsPreset = "past" | "future";

export type SmartRangeDateProps<
  TFieldKey extends string,
  TOperator extends string,
> = {
  fieldId: TFieldKey;
  value: SmartSearchRule<TFieldKey, TOperator> | null;
  onChange: (rule: SmartSearchRule<TFieldKey, TOperator> | null) => void;
  operators: {
    range: TOperator;
    week: TOperator;
    month: TOperator;
  };
  label?: string;
  disabled?: boolean;
  className?: string;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: `${index + 1}`.padStart(2, "0"),
  label: getMonthLabel(index),
}));

const QUICK_COUNTS = [1, 2, 3, 4, 5];

function resolveMode<TOperator extends string>(
  value: SmartSearchRule<string, TOperator> | null,
  weekOperator: TOperator,
  monthOperator: TOperator,
): SmartRangeDateMode {
  if (value?.operator === monthOperator) return "month";
  if (value?.operator === weekOperator) return "weeks";
  return "range";
}

function formatRangeSummary(start?: string, end?: string) {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  if (!startDate && !endDate) return "";

  const format = (date: Date | null) =>
    date
      ? `${String(date.getDate()).padStart(2, "0")}/${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}/${date.getFullYear()}`
      : "...";

  return `${format(startDate)} - ${format(endDate)}`;
}

function toMonthValue(year: number, month: string) {
  return `${year}-${month}`;
}

function toMonthDate(value: string) {
  const normalized = normalizeCalendarMonthValue(value);
  if (!normalized) return null;

  const [year, month] = normalized.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function compareMonthValues(a: string, b: string) {
  return a.localeCompare(b);
}

function orderMonthRange(start: string, end: string) {
  return compareMonthValues(start, end) <= 0
    ? { start, end }
    : { start: end, end: start };
}

function getMonthRange(value: string) {
  const date = toMonthDate(value);
  if (!date) return null;

  return {
    start: getDateKey(startOfMonth(date)),
    end: getDateKey(endOfMonth(date)),
  };
}

function getMonthValuesRange(startValue: string, endValue: string) {
  const ordered = orderMonthRange(startValue, endValue);
  const first = getMonthRange(ordered.start);
  const last = getMonthRange(ordered.end);

  if (!first || !last) return null;

  return {
    start: first.start,
    end: last.end,
  };
}

function getMonthValueFromDate(value?: string) {
  const date = parseDateOnly(value);
  if (!date) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getRuleMonthRange<TOperator extends string>(
  value: SmartSearchRule<string, TOperator> | null,
  rangeOperator: TOperator,
  monthOperator: TOperator,
) {
  if (value?.operator === monthOperator) {
    const normalized = normalizeCalendarMonthValue(value.value);
    return { start: normalized, end: normalized };
  }

  if (value?.operator === rangeOperator) {
    const start = getMonthValueFromDate(value.range?.start);
    const end = getMonthValueFromDate(value.range?.end) ?? start;
    return { start, end };
  }

  return { start: null, end: null };
}

function formatMonthRangeSelection(start?: string | null, end?: string | null) {
  if (!start) return "";
  if (!end || start === end) return formatCalendarMonth(start);

  const ordered = orderMonthRange(start, end);
  return `${formatCalendarMonth(ordered.start)} - ${formatCalendarMonth(ordered.end)}`;
}

function isMonthWithinRange(
  value: string,
  start?: string | null,
  end?: string | null,
) {
  if (!start || !end) return false;

  const ordered = orderMonthRange(start, end);
  return (
    compareMonthValues(value, ordered.start) >= 0 &&
    compareMonthValues(value, ordered.end) <= 0
  );
}

function clampCount(value: number, max: number) {
  return Math.min(Math.max(Math.trunc(value) || 1, 1), max);
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

export function buildSmartCalendarWeeksRange(
  weeksCount: number,
  preset: SmartRangeWeeksPreset = "future",
  fromDate = new Date(),
) {
  const safeWeeks = clampCount(weeksCount, 52);
  const currentWeekStart = startOfCalendarWeek(fromDate);
  const currentWeekEnd = endOfCalendarWeek(fromDate);

  if (preset === "month-start") {
    const monthStart = startOfMonth(fromDate);
    const monthEnd = endOfMonth(fromDate);
    const firstCalendarWeekStart = startOfCalendarWeek(monthStart);
    const endDate = minDate(
      endOfCalendarWeek(addDays(firstCalendarWeekStart, (safeWeeks - 1) * 7)),
      monthEnd,
    );

    return {
      start: getDateKey(monthStart),
      end: getDateKey(endDate),
    };
  }

  if (preset === "past") {
    return {
      start: getDateKey(addDays(currentWeekStart, -(safeWeeks - 1) * 7)),
      end: getDateKey(currentWeekEnd),
    };
  }

  if (preset === "current") {
    return {
      start: getDateKey(currentWeekStart),
      end: getDateKey(currentWeekEnd),
    };
  }

  return {
    start: getDateKey(currentWeekStart),
    end: getDateKey(endOfCalendarWeek(addDays(currentWeekStart, (safeWeeks - 1) * 7))),
  };
}

export function buildForwardCalendarWeeksRange(weeksCount: number, fromDate = new Date()) {
  return buildSmartCalendarWeeksRange(weeksCount, "future", fromDate);
}

function buildSmartCalendarMonthsRange(
  monthsCount: number,
  preset: SmartRangeMonthsPreset,
  fromDate = new Date(),
) {
  const safeMonths = clampCount(monthsCount, 24);
  const currentMonthStart = startOfMonth(fromDate);

  if (preset === "past") {
    const startDate = startOfMonth(addMonths(currentMonthStart, -(safeMonths - 1)));
    return {
      start: getDateKey(startDate),
      end: getDateKey(endOfMonth(currentMonthStart)),
    };
  }

  return {
    start: getDateKey(currentMonthStart),
    end: getDateKey(endOfMonth(addMonths(currentMonthStart, safeMonths - 1))),
  };
}

type SmartRangeWeeksSectionProps = {
  weeksCount: number;
  weeksPreset?: SmartRangeWeeksPreset;
  onWeeksCountChange: (value: number) => void;
  onWeeksPresetChange?: (value: SmartRangeWeeksPreset) => void;
  onApply?: () => void;
  applyLabel?: string;
};

export function SmartRangeWeeksSection({
  weeksCount,
  weeksPreset = "future",
  onWeeksCountChange,
  onWeeksPresetChange,
  onApply,
  applyLabel = "Aplicar semanas",
}: SmartRangeWeeksSectionProps) {
  const weekButtonClassName = (selected: boolean) =>
    cn(
      "h-8 rounded-md px-2 text-[11px] font-medium transition",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  const presetButtonClassName = (selected: boolean) =>
    cn(
      "rounded-lg border px-3 py-2 text-left text-[11px] transition",
      selected
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        {[
          ["month-start", "Inicio de mes", "Desde el día 1"],
          ["past", "Últimas", "Incluye actual"],
          ["current", "Actual", "Solo esta semana"],
          ["future", "Próximas", "Incluye actual"],
        ].map(([value, title, description]) => (
          <button
            key={value}
            type="button"
            aria-pressed={weeksPreset === value}
            onClick={() => onWeeksPresetChange?.(value as SmartRangeWeeksPreset)}
            className={presetButtonClassName(weeksPreset === value)}
          >
            <span className="block font-semibold">{title}</span>
            <span className="block text-[10px] opacity-80">{description}</span>
          </button>
        ))}
      </div>

      {weeksPreset !== "current" ? (
        <>
          <label className="block text-xs font-medium text-muted-foreground">
            Cantidad de semanas
            <input
              type="number"
              min={1}
              max={52}
              value={weeksCount}
              onChange={(event) =>
                onWeeksCountChange(Number(event.target.value) || 1)
              }
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div className="grid grid-cols-5 gap-2">
            {QUICK_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={weeksCount === count}
                onClick={() => onWeeksCountChange(count)}
                className={weekButtonClassName(weeksCount === count)}
              >
                {count}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {onApply ? (
        <div className="flex justify-end">
          <SystemButton
            type="button"
            size="custom"
            className="h-9 rounded-md px-3 text-xs"
            onClick={onApply}
          >
            {applyLabel}
          </SystemButton>
        </div>
      ) : null}
    </div>
  );
}

export function SmartRangeDate<
  TFieldKey extends string,
  TOperator extends string,
>({
  fieldId,
  value,
  onChange,
  operators,
  label = "Fecha",
  disabled = false,
  className,
}: SmartRangeDateProps<TFieldKey, TOperator>) {
  const panelId = useId();

  const {
    range: rangeOperator,
    week: weekOperator,
    month: monthOperator,
  } = operators;

  const [mode, setMode] = useState<SmartRangeDateMode>(() =>
    resolveMode(value, weekOperator, monthOperator),
  );

  const [draftRule, setDraftRule] =
    useState<SmartSearchRule<TFieldKey, TOperator> | null>(value);

  const [monthDate, setMonthDate] = useState<Date>(() => {
    const start = value?.range?.start ? parseDateOnly(value.range.start) : null;
    return start ?? new Date();
  });

  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [weeksCount, setWeeksCount] = useState(1);
  const [weeksPreset, setWeeksPreset] = useState<SmartRangeWeeksPreset>("future");
  const [monthsCount, setMonthsCount] = useState(1);

  const [monthYear, setMonthYear] = useState(() => {
    const normalized =
      value?.operator === monthOperator
        ? normalizeCalendarMonthValue(value.value)
        : "";

    return normalized
      ? Number(normalized.slice(0, 4))
      : new Date().getFullYear();
  });

  const [monthRangeStart, setMonthRangeStart] = useState<string | null>(() =>
    getRuleMonthRange(value, rangeOperator, monthOperator).start,
  );
  const [monthRangeEnd, setMonthRangeEnd] = useState<string | null>(() =>
    getRuleMonthRange(value, rangeOperator, monthOperator).end,
  );
  const [hoverMonthValue, setHoverMonthValue] = useState<string | null>(null);

  const {
    open,
    panelStyle,
    rootRef,
    triggerRef,
    panelRef,
    canOpen,
    closePanel,
    togglePanel,
  } = useFloatingDatePanel({
    disabled,
    panelMinWidth: 372,
    preferredHeight: 520,
  });

  useEffect(() => {
    setDraftRule(value);
    setMode(resolveMode(value, weekOperator, monthOperator));

    const nextMonthRange = getRuleMonthRange(
      value,
      rangeOperator,
      monthOperator,
    );

    if (nextMonthRange.start) {
      setMonthRangeStart(nextMonthRange.start);
      setMonthRangeEnd(nextMonthRange.end);
      setMonthYear(Number(nextMonthRange.start.slice(0, 4)));
      return;
    }

    if (!value) {
      setMonthRangeStart(null);
      setMonthRangeEnd(null);
    }
  }, [value, rangeOperator, weekOperator, monthOperator]);

  useEffect(() => {
    if (!open) return;

    const start = draftRule?.range?.start
      ? parseDateOnly(draftRule.range.start)
      : null;

    setMonthDate(start ?? new Date());
  }, [draftRule, open]);

  const rangeValue = useMemo(() => {
    if (draftRule?.operator !== rangeOperator) {
      return { startDate: null, endDate: null };
    }

    return {
      startDate: parseDateOnly(draftRule.range?.start),
      endDate: parseDateOnly(draftRule.range?.end),
    };
  }, [draftRule, rangeOperator]);

  const monthValue =
    draftRule?.operator === monthOperator
      ? normalizeCalendarMonthValue(draftRule.value)
      : "";

  const hasSupportedValue = Boolean(
    (draftRule?.operator === rangeOperator &&
      (draftRule.range?.start || draftRule.range?.end)) ||
      (draftRule?.operator === weekOperator && draftRule.value) ||
      (draftRule?.operator === monthOperator && monthValue),
  );

  const summary = useMemo(() => {
    if (draftRule?.operator === rangeOperator) {
      return formatRangeSummary(draftRule.range?.start, draftRule.range?.end);
    }

    if (draftRule?.operator === weekOperator) {
      return formatCalendarWeek(draftRule.value);
    }

    if (draftRule?.operator === monthOperator) {
      return formatCalendarMonth(draftRule.value);
    }

    return "";
  }, [draftRule, rangeOperator, weekOperator, monthOperator]);

  const emitRule = (rule: SmartSearchRule<TFieldKey, TOperator> | null) => {
    setDraftRule(rule);
    onChange(rule);
  };

  const emitRange = (range: { start: string; end: string }) => {
    emitRule({
      field: fieldId,
      operator: rangeOperator,
      range,
    });

    closePanel();
  };

  const applyWeeks = () => {
    emitRange(buildSmartCalendarWeeksRange(weeksCount, weeksPreset));
  };

  const applyRelativeMonths = (preset: SmartRangeMonthsPreset) => {
    const range = buildSmartCalendarMonthsRange(monthsCount, preset);
    setMonthRangeStart(getMonthValueFromDate(range.start));
    setMonthRangeEnd(getMonthValueFromDate(range.end));
    emitRange(range);
  };

  const emitMonthRange = (startValue: string, endValue: string) => {
    const ordered = orderMonthRange(startValue, endValue);

    if (ordered.start === ordered.end) {
      emitRule({
        field: fieldId,
        operator: monthOperator,
        value: ordered.start,
      });

      closePanel();
      return;
    }

    const range = getMonthValuesRange(ordered.start, ordered.end);
    if (!range) return;

    emitRange(range);
  };

  const selectMonthRangeValue = (value: string) => {
    if (!monthRangeStart || monthRangeEnd) {
      setMonthRangeStart(value);
      setMonthRangeEnd(null);
      setHoverMonthValue(null);
      return;
    }

    const ordered = orderMonthRange(monthRangeStart, value);
    setMonthRangeStart(ordered.start);
    setMonthRangeEnd(ordered.end);
    setHoverMonthValue(null);
    emitMonthRange(ordered.start, ordered.end);
  };

  const clearMonthRangeSelection = () => {
    setMonthRangeStart(null);
    setMonthRangeEnd(null);
    setHoverMonthValue(null);
  };

  const modeButtonClassName = (selected: boolean) =>
    cn(
      "h-8 rounded-md px-2 text-[11px] font-medium transition",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  const monthButtonClassName = (selected: boolean, inRange: boolean) =>
    cn(
      "h-10 px-2 text-sm transition",
      selected
        ? "z-10 rounded-lg bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary"
        : inRange
          ? "rounded-none bg-primary/10 text-foreground hover:bg-primary/15"
          : "rounded-lg text-foreground hover:bg-muted",
    );

  const previewMonthRangeEnd = monthRangeEnd ?? hoverMonthValue;
  const selectedMonthsSummary = formatMonthRangeSelection(
    monthRangeStart,
    previewMonthRangeEnd,
  );

  return (
    <div
      ref={rootRef}
      className={cn("flex min-w-0 items-center justify-end gap-2", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={() => {
          if (!canOpen) return;
          togglePanel();
        }}
        className={cn(
          "inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-border/70 bg-background text-left text-xs text-foreground shadow-sm outline-none transition",
          summary ? "w-auto max-w-[280px] px-3" : "w-11 justify-center px-0",
          open && "border-primary ring-2 ring-primary/30",
          disabled &&
            "cursor-not-allowed bg-muted text-muted-foreground opacity-70",
        )}
      >
        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />

        <span
          className={cn(
            "min-w-0 truncate",
            summary ? "block flex-1" : "hidden",
          )}
        >
          {summary}
        </span>
      </button>

      {hasSupportedValue ? (
        <button
          type="button"
          aria-label={`Limpiar ${label.toLowerCase()}`}
          disabled={disabled}
          title={summary ? `Limpiar ${summary}` : undefined}
          onClick={() => emitRule(null)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      <DatePickerPanelPortal
        open={open && !disabled}
        panelRef={panelRef}
        panelStyle={panelStyle}
        panelId={panelId}
      >
        <div
          role="dialog"
          aria-label={`${label}: filtros de fecha`}
          className="w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-floating-panel"
        >
          <div className="border-b border-border p-2">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
              {[
                ["range", "Rango"],
                ["weeks", "Semanas"],
                ["month", "Meses"],
              ].map(([itemMode, text]) => (
                <button
                  key={itemMode}
                  type="button"
                  aria-pressed={mode === itemMode}
                  onClick={() => setMode(itemMode as SmartRangeDateMode)}
                  className={modeButtonClassName(mode === itemMode)}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {mode === "range" ? (
            <CalendarPanel
              mode="range"
              monthDate={monthDate}
              onMonthDateChange={setMonthDate}
              rangeStart={rangeValue.startDate}
              rangeEnd={rangeValue.endDate}
              hoverDate={hoverDate}
              onHoverDateChange={setHoverDate}
              onSelectDate={(date) => {
                const { startDate, endDate } = rangeValue;

                if (!startDate || endDate) {
                  setDraftRule({
                    field: fieldId,
                    operator: rangeOperator,
                    range: {
                      start: getDateKey(date),
                      end: undefined,
                    },
                  });

                  return;
                }

                const nextStart =
                  date.getTime() < startDate.getTime() ? date : startDate;

                const nextEnd =
                  date.getTime() < startDate.getTime() ? startDate : date;

                emitRule({
                  field: fieldId,
                  operator: rangeOperator,
                  range: {
                    start: getDateKey(nextStart),
                    end: getDateKey(nextEnd),
                  },
                });

                closePanel();
              }}
              footer={
                <div className="flex items-center justify-end gap-2">
                  <SystemButton
                    type="button"
                    variant="ghost"
                    size="custom"
                    className="h-8 rounded-md px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      emitRule(null);
                      closePanel();
                    }}
                  >
                    Limpiar
                  </SystemButton>
                </div>
              }
              className="rounded-none border-0 shadow-none"
            />
          ) : null}

          {mode === "weeks" ? (
            <SmartRangeWeeksSection
              weeksCount={weeksCount}
              weeksPreset={weeksPreset}
              onWeeksCountChange={setWeeksCount}
              onWeeksPresetChange={setWeeksPreset}
              onApply={applyWeeks}
            />
          ) : null}

          {mode === "month" ? (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Año
                  <input
                    type="number"
                    value={monthYear}
                    onChange={(event) =>
                      setMonthYear(
                        Number(event.target.value) || new Date().getFullYear(),
                      )
                    }
                    className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="block w-24 text-xs font-medium text-muted-foreground">
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={monthsCount}
                    onChange={(event) =>
                      setMonthsCount(Number(event.target.value) || 1)
                    }
                    className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>

              {/* <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((count) => (
                  <SystemButton
                    key={count}
                    type="button"
                    variant={monthsCount === count ? "primary" : "outline"}
                    size="custom"
                    className="h-9 rounded-md px-2 text-[11px]"
                    onClick={() => setMonthsCount(count)}
                  >
                    {count} mes{count > 1 ? "es" : ""}
                  </SystemButton>
                ))}
              </div> */}

              <div className="grid grid-cols-2 gap-2">
                <SystemButton
                  type="button"
                  variant="outline"
                  size="custom"
                  className="h-9 rounded-md px-2 text-[11px]"
                  onClick={() => applyRelativeMonths("past")}
                >
                  Últimos {monthsCount} mes(es)
                </SystemButton>
                <SystemButton
                  type="button"
                  variant="outline"
                  size="custom"
                  className="h-9 rounded-md px-2 text-[11px]"
                  onClick={() => applyRelativeMonths("future")}
                >
                  Próximos {monthsCount} mes(es)
                </SystemButton>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Rango de meses
                  </p>

                  {selectedMonthsSummary ? (
                    <p className="truncate text-right text-[11px] text-muted-foreground">
                      {selectedMonthsSummary}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/30 p-1">
                  {MONTH_OPTIONS.map((month) => {
                    const currentValue = toMonthValue(monthYear, month.value);
                    const isStart = currentValue === monthRangeStart;
                    const isEnd = currentValue === monthRangeEnd;
                    const isInRange = isMonthWithinRange(
                      currentValue,
                      monthRangeStart,
                      previewMonthRangeEnd,
                    );
                    const isSelected = isStart || isEnd;

                    return (
                      <button
                        key={month.value}
                        type="button"
                        aria-pressed={isSelected || isInRange}
                        onClick={() => selectMonthRangeValue(currentValue)}
                        onMouseEnter={() => {
                          if (!monthRangeStart || monthRangeEnd) return;
                          setHoverMonthValue(currentValue);
                        }}
                        onMouseLeave={() => setHoverMonthValue(null)}
                        className={monthButtonClassName(isSelected, isInRange)}
                      >
                        {month.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Haz clic en el mes inicial y luego en el mes final. Para un solo mes, selecciona el mismo mes dos veces.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <SystemButton
                  type="button"
                  variant="ghost"
                  size="custom"
                  className="h-9 rounded-md px-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearMonthRangeSelection}
                >
                  Limpiar rango
                </SystemButton>
              </div>
            </div>
          ) : null}
        </div>
      </DatePickerPanelPortal>
    </div>
  );
}
