import { RoutesPaths } from "@/Router/config/routesPaths";

export const BRAND = "#21b8a6";

export const CHART_COLORS = [
  "#21b8a6",
  "#0f172a",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
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

export const getBanBadgeStyles = (banLevel?: string, permanent?: boolean) => {
  if (permanent) return "border-red-200 bg-red-50 text-red-700";
  if (banLevel === "PERMANENT") return "border-red-200 bg-red-50 text-red-700";
  if (banLevel === "TEMPORARY") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
};
