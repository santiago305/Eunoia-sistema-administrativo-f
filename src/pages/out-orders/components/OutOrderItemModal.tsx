import { Modal } from "@/components/settings/modal";
import { Plus, PackagePlus } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import type { CSSProperties } from "react";
import type { AddOutOrderItemDto } from "@/pages/out-orders/type/outOrder";
import { parseDecimalInput } from "@/utils/functionPurchases";

type OutOrderItemModalProps = {
  open: boolean;
  pendingItem: AddOutOrderItemDto;
  ringStyle?: CSSProperties;
  primaryColor?: string;
  onChange: (patch: Partial<AddOutOrderItemDto>) => void;
  onClose: () => void;
  onAdd: () => void;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function OutOrderItemModal({
  open,
  pendingItem,
  primaryColor,
  onChange,
  onClose,
  onAdd,
}: OutOrderItemModalProps) {
  if (!open) return null;

  const accent = primaryColor ?? DEFAULT_PRIMARY;

  return (
    <Modal title="Agregar item" onClose={onClose} className="max-w-xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm space-y-4">
          <SectionHeaderForm icon={PackagePlus} title="Datos del item" />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FloatingInput
              label="Cantidad"
              name="quantity"
              type="number"
              min={0}
              step="0.001"
              value={String(pendingItem.quantity)}
              onChange={(e) => onChange({ quantity: parseDecimalInput(e.target.value) })}
            />

            <FloatingInput
              label="Precio unit."
              name="unitCost"
              type="number"
              min={0}
              step="0.0001"
              value={String(pendingItem.unitCost)}
              onChange={(e) =>
                onChange({
                  unitCost: parseDecimalInput(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <SystemButton variant="outline"  onClick={onClose}>
            Cancelar
          </SystemButton>

          <SystemButton
            leftIcon={<Plus className="h-4 w-4" />}
            style={{
              backgroundColor: accent,
              borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
            }}
            onClick={onAdd}
          >
            Agregar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}