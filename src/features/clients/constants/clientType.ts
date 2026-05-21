import type { ClientType } from "@/features/clients/types/client";

export const CLIENT_TYPE_META: Record<ClientType, { label: string; className: string }> = {
  NEW: { label: "Nuevo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  LAGGING: { label: "Rezagado", className: "border-amber-200 bg-amber-50 text-amber-700" },
  REPURCHASE: { label: "Recompra", className: "border-sky-200 bg-sky-50 text-sky-700" },
  UNDEFINED: { label: "Sin definir", className: "border-slate-200 bg-slate-50 text-slate-700" },
};

export const CLIENT_TYPE_OPTIONS: Array<{ value: ClientType; label: string }> = [
  { value: "NEW", label: "NUEVO" },
  { value: "LAGGING", label: "REZAGADO" },
  { value: "REPURCHASE", label: "RECOMPRA" },
  { value: "UNDEFINED", label: "SIN DEFINIR" },
];

