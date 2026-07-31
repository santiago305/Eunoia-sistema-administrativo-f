import { useState } from "react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";

type Props = { order: SaleOrder; canUpdatePreguide: boolean; canUpdatePrepared: boolean; onChange: (field: "preguide" | "prepared", value: boolean) => Promise<void> };

export function SaleOrderTrackingCell({ order, canUpdatePreguide, canUpdatePrepared, onChange }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const update = async (field: "preguide" | "prepared", value: boolean) => { setLoading(field); try { await onChange(field, value); } finally { setLoading(null); } };
  const badge = (label: string, active: boolean, field: "preguide" | "prepared", allowed: boolean) => (
    <label className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[9px] font-medium" title={label}>
      {allowed ? <Checkbox aria-label={label} checked={active} disabled={loading === field} onCheckedChange={(checked) => void update(field, checked === true)} /> : null}
      <span className={active ? "text-emerald-700" : "text-zinc-600"}>{active ? (field === "preguide" ? "Con preguía" : "Preparado") : `Sin ${field === "preguide" ? "preguía" : "preparar"}`}</span>
    </label>
  );
  return <div className="grid w-[200px] grid-cols-2 gap-1" onClick={(event) => event.stopPropagation()}>{badge("Tiene preguía", order.preguide === true, "preguide", canUpdatePreguide)}{badge("Está preparado", order.prepared === true, "prepared", canUpdatePrepared)}</div>;
}
