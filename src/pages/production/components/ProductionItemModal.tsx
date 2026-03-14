import { Modal } from "@/components/settings/modal";
import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import type { AddProductionOrderItemDto } from "@/pages/production/types/production";

type ProductionItemModalProps = {
  open: boolean;
  pendingItem: AddProductionOrderItemDto;
  ringStyle: CSSProperties;
  primaryColor?: string;
  onChange: (patch: Partial<AddProductionOrderItemDto>) => void;
  onClose: () => void;
  onAdd: () => void;
};

const DEFAULT_PRIMARY = "#21b8a6";

export function ProductionItemModal({
  open,
  pendingItem,
  ringStyle,
  primaryColor,
  onChange,
  onClose,
  onAdd,
}: ProductionItemModalProps) {
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
            className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
            style={ringStyle}
            value={pendingItem.unitCost === 0 ? "" : pendingItem.unitCost}
            onChange={(e) => onChange({ unitCost: e.target.value === "" ? 0 : Number(e.target.value) })}
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
          style={{ backgroundColor: accent, borderColor: `${accent}33` }}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>
    </Modal>
  );
}
