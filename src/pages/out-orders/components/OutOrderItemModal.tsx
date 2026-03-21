import { Modal } from "@/components/settings/modal";
import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import type { AddOutOrderItemDto } from "@/pages/out-orders/type/outOrder";

type OutOrderItemModalProps = {
  open: boolean;
  pendingItem: AddOutOrderItemDto;
  ringStyle: CSSProperties;
  primaryColor?: string;
  onChange: (patch: Partial<AddOutOrderItemDto>) => void;
  onClose: () => void;
  onAdd: () => void;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function OutOrderItemModal({
  open,
  pendingItem,
  ringStyle,
  primaryColor,
  onChange,
  onClose,
  onAdd,
}: OutOrderItemModalProps) {
  if (!open) return null;

  const accent = primaryColor ?? DEFAULT_PRIMARY;

  return (
    <Modal title="Agregar item" onClose={onClose} className="max-w-xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] text-black/60">
          Cantidad
          <input
            type="number"
            min={1}
            className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
            style={ringStyle}
            value={pendingItem.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) })}
            placeholder="Cantidad"
          />
        </label>
        <label className="text-[11px] text-black/60">
          Costo unit.
          <input
            type="number"
            min={0}
            className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
            style={ringStyle}
            value={pendingItem.unitCost ?? ""}
            onChange={(e) => onChange({ unitCost: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="0"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-lg border border-black/10 px-4 py-2 text-xs" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs text-white focus:outline-none focus:ring-2"
          style={{ backgroundColor: accent, borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>
    </Modal>
  );
}
