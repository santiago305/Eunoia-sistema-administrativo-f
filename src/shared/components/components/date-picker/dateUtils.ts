export type CalendarMonth = {
  year: number;
  month: number; // 0-11
};

export type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

export function cloneDate(date: Date) {
  return new Date(date.getTime());
}

export function startOfDay(date: Date) {
  const next = cloneDate(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = cloneDate(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, days: number) {
  const next = cloneDate(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  const next = cloneDate(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isSameDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isBeforeDay(a: Date, b: Date) {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfterDay(a: Date, b: Date) {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function isWithinInclusiveRange(
  target: Date,
  start?: Date | null,
  end?: Date | null,
) {
  if (!start || !end) return false;
  const time = startOfDay(target).getTime();
  const startTime = startOfDay(start).getTime();
  const endTime = startOfDay(end).getTime();
  return time >= startTime && time <= endTime;
}

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthLabel(month: number) {
  return MONTH_LABELS[month] ?? "";
}

export function getMonthTitle(date: Date) {
  return `${getMonthLabel(date.getMonth())} ${date.getFullYear()}`;
}

export function getWeekStartOffset(date: Date) {
  const jsDay = date.getDay(); // 0 sunday
  return jsDay === 0 ? 6 : jsDay - 1; // monday first
}

export function getMonthGrid(date: Date): CalendarDay[] {
  const firstOfMonth = startOfMonth(date);
  const offset = getWeekStartOffset(firstOfMonth);
  const gridStart = addDays(firstOfMonth, -offset);

  return Array.from({ length: 42 }, (_, index) => {
    const current = addDays(gridStart, index);
    return {
      date: current,
      dateKey: getDateKey(current),
      dayNumber: current.getDate(),
      isCurrentMonth: isSameMonth(current, date),
      isToday: isSameDay(current, new Date()),
    };
  });
}

export function clampDateToRange(
  date: Date,
  minDate?: Date,
  maxDate?: Date,
) {
  const time = date.getTime();
  if (minDate && time < minDate.getTime()) return cloneDate(minDate);
  if (maxDate && time > maxDate.getTime()) return cloneDate(maxDate);
  return cloneDate(date);
}

export function isDateDisabled(
  date: Date,
  options?: {
    minDate?: Date;
    maxDate?: Date;
    disablePast?: boolean;
    disableFuture?: boolean;
  },
) {
  if (!options) return false;

  const candidate = startOfDay(date).getTime();
  const today = startOfDay(new Date()).getTime();

  if (options.minDate && candidate < startOfDay(options.minDate).getTime()) {
    return true;
  }

  if (options.maxDate && candidate > startOfDay(options.maxDate).getTime()) {
    return true;
  }

  if (options.disablePast && candidate < today) {
    return true;
  }

  if (options.disableFuture && candidate > today) {
    return true;
  }

  return false;
}

export function formatDate(date?: Date | null) {
  if (!date) return "";
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(date?: Date | null) {
  if (!date) return "";
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatRange(start?: Date | null, end?: Date | null) {
  if (!start && !end) return "";
  if (start && !end) return `${formatDate(start)} - ...`;
  if (!start && end) return `... - ${formatDate(end)}`;
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function setTimeParts(date: Date, hours: number, minutes: number) {
  const next = cloneDate(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function getHours(date?: Date | null) {
  return date ? date.getHours() : 0;
}

export function getMinutes(date?: Date | null) {
  return date ? date.getMinutes() : 0;
}

export function formatTime(date?: Date | null) {
  if (!date) return "";
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function buildTimeOptions(limit: number) {
  return Array.from({ length: limit }, (_, index) => ({
    value: `${index}`.padStart(2, "0"),
    label: `${index}`.padStart(2, "0"),
  }));
}