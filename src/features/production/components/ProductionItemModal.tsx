import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import type { AddProductionOrderItemDto } from "@/features/production/types/production";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";

type ProductionItemModalProps = {
  open: boolean;
  pendingItem: AddProductionOrderItemDto;
  ringStyle: CSSProperties;
  primaryColor?: string;
  onChange: (patch: Partial<AddProductionOrderItemDto>) => void;
  onClose: () => void;
  onAdd: () => void;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

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
    <Modal open={open} title="Agregar item" onClose={onClose} className="w-[300px] max-h-[300px]
     space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <FloatingInput
          label="Cantidad"
          name="production-item-quantity"
          type="number"
          min={0}
          value={String(pendingItem.quantity)}
          onChange={(e) => onChange({ quantity: parseDecimalInput(e.target.value) })}
          className="h-9 text-xs"
          style={ringStyle}
        />
        {/* <label className="text-[11px] text-black/60">
          Costo unit.
          <input
            type="number"
            className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
            style={ringStyle}
            value={pendingItem.unitCost === 0 ? "" : pendingItem.unitCost}
            onChange={(e) => onChange({ unitCost: e.target.value === "" ? 0 : Number(e.target.value) })}
            placeholder="0"
          />
        </label> */}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <SystemButton variant="outline" size="sm" onClick={onClose}>
          Cancelar
        </SystemButton>
        <SystemButton
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          style={{ backgroundColor: accent, borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
          onClick={onAdd}
        >
          Agregar
        </SystemButton>
      </div>
    </Modal>
  );
}
