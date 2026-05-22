export type SnoozeQuickOption = {
  key: "today-later" | "tomorrow" | "next-week";
  label: string;
  date: Date;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const clone = (date: Date) => new Date(date.getTime());

const setLocalTime = (date: Date, hours: number, minutes: number) => {
  const next = clone(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
};

export const getTodayLaterDate = (baseDate: Date) => {
  const todayAtEighteen = setLocalTime(baseDate, 18, 0);
  if (todayAtEighteen.getTime() > baseDate.getTime()) return todayAtEighteen;
  const plusSixHours = new Date(baseDate.getTime() + 6 * MS_PER_HOUR);
  plusSixHours.setMinutes(0, 0, 0);
  return plusSixHours;
};

export const getTomorrowAtEightDate = (baseDate: Date) => {
  const tomorrow = clone(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return setLocalTime(tomorrow, 8, 0);
};

export const getNextWeekAtEightDate = (baseDate: Date) => {
  const localWeekday = (baseDate.getDay() + 6) % 7; // monday = 0
  const daysUntilNextMonday = 7 - localWeekday || 7;
  const nextMonday = clone(baseDate);
  nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday);
  return setLocalTime(nextMonday, 8, 0);
};

export const buildSnoozeQuickOptions = (baseDate = new Date()): SnoozeQuickOption[] => [
  { key: "today-later", label: "Hoy más tarde", date: getTodayLaterDate(baseDate) },
  { key: "tomorrow", label: "Mañana", date: getTomorrowAtEightDate(baseDate) },
  { key: "next-week", label: "Próxima semana", date: getNextWeekAtEightDate(baseDate) },
];

export const formatSnoozeQuickDate = (date: Date) =>
  new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

export const formatSnoozeDateInput = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = MONTHS_ES[date.getMonth()] ?? "";
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatSnoozeTimeInput = (date: Date) => `${date.getHours()}:${`${date.getMinutes()}`.padStart(2, "0")}`;

export const parseSnoozeDateInput = (raw: string, baseDate: Date) => {
  const normalized = raw.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})\s+([a-záéíóú]{3,})\s+(\d{4})$/i);
  if (!match) return null;
  const day = Number(match[1]);
  const monthToken = match[2].slice(0, 3);
  const year = Number(match[3]);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;
  const month = MONTHS_ES.indexOf(monthToken);
  if (month < 0) return null;
  const next = clone(baseDate);
  next.setFullYear(year, month, day);
  if (next.getMonth() !== month || next.getDate() !== day || next.getFullYear() !== year) return null;
  return next;
};

export const parseSnoozeTimeInput = (raw: string) => {
  const normalized = raw.trim();
  const match = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
};

