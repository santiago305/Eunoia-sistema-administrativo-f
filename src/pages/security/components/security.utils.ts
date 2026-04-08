import { RoutesPaths } from "@/router/config/routesPaths";

export const BRAND = "hsl(var(--primary))";

export const CHART_COLORS = [
  "#f59e0b",
  "hsl(var(--primary))",
  "#0f172a",
  "#14b8a6",
  "#6366f1",
  "#ef4444",
];

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const buildIpDetailPath = (ip: string) =>
  RoutesPaths.ipsdetails.replace(":ip", encodeURIComponent(ip));

export const formatDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

/**
 * Convierte una fecha a una etiqueta relativa en español para mostrar cuánto
 * tiempo ha pasado desde la última actualización del panel.
 */
export const formatRelativeTime = (
  value?: Date | string | null,
  now = Date.now(),
) => {
  if (!value) return "sin actualizar";

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return "sin actualizar";

  const diffMs = Math.max(0, now - timestamp);
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 10) return "justo ahora";
  if (diffSeconds < 60) return `hace ${diffSeconds} s`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) return "hace 1 min";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "hace 1 h";
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "hace 1 día";
  return `hace ${diffDays} días`;
};

export const getBanBadgeStyles = (
  banLevel?: string | number,
  permanent?: boolean,
) => {
  if (permanent) return "border-red-200 bg-red-50 text-red-700";
  if (banLevel === "PERMANENT") return "border-red-200 bg-red-50 text-red-700";
  if (banLevel === "TEMPORARY") return "border-amber-200 bg-amber-50 text-amber-700";
  if (typeof banLevel === "number") {
    return banLevel >= 4
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
};
