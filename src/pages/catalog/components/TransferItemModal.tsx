import { Boxes, Plus } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { Modal } from "@/components/settings/modal";
import { parseDecimalInput } from "@/utils/functionPurchases";
import type { TransferItemModalProps } from "@/pages/catalog/types/transfer";

export function TransferItemModal({ open, pendingItem, onChange, onClose, onAdd }: TransferItemModalProps) {
    if (!open) return null;

    return (
        <Modal title="Agregar item" onClose={onClose} className="w-[400px] space-y-3">
            <div className="grid grid-cols-1 gap-3">
                <SectionHeaderForm icon={Boxes} title="Productos" />
                <FloatingInput
                    label="Cantidad"
                    name="transfer-qty"
                    type="number"
                    min={0.0001}
                    value={String(pendingItem.quantity)}
                    onChange={(e) => {
                        const value = parseDecimalInput(e.target.value);
                        onChange({ quantity: value < 0 ? Math.abs(value) : value });
                    }}
                    className="h-9 text-xs text-black/90"
                />
            </div>
            <div className="mt-4 flex justify-end gap-2">
                <SystemButton variant="outline" size="sm" onClick={onClose}>
                    Cancelar
                </SystemButton>
                <SystemButton size="sm" onClick={onAdd} leftIcon={<Plus className="h-4 w-4" />}>
                    Agregar
                </SystemButton>
            </div>
        </Modal>
    );
}
