import { Boxes, Plus } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { Modal } from "@/components/modales/Modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import { parseDecimalInput } from "@/utils/functionPurchases";
import type { AdjustmentItem } from "@/pages/catalog/types/adjustment";

const ADJUSTMENT_TYPE_OPTIONS = [
    { value: "REDUCIR", label: "Reducir" },
    { value: "AUMENTAR", label: "Aumentar" },
];

type AdjustmentItemModalMessages = {
    missingType?: string;
    zeroQuantity?: string;
};

export type AdjustmentItemModalProps = {
    open: boolean;
    pendingItem: AdjustmentItem;
    onChange: (patch: Partial<AdjustmentItem>) => void;
    onClose: () => void;
    onAdd: () => void;
    title?: string;
    sectionTitle?: string;
    messages?: AdjustmentItemModalMessages;
};

export function AdjustmentItemModal({
    open,
    pendingItem,
    onChange,
    onClose,
    onAdd,
    title = "Agregar item",
    sectionTitle = "Productos",
    messages,
}: AdjustmentItemModalProps) {
    const { showFlash } = useFlashMessage();

    if (!open) return null;

    const missingTypeMessage = messages?.missingType ?? "Debe ingresar el tipo de ajuste";
    const zeroQuantityMessage = messages?.zeroQuantity ?? "La cantidad no puede ser cero";

    return (
        <Modal open={open} title={title} onClose={onClose} className="w-[400px] space-y-3">
            <div className="grid grid-cols-1 gap-3">
                <SectionHeaderForm icon={Boxes} title={sectionTitle} />

                {pendingItem.adjustmentType === "REDUCIR" && (
                    <FloatingInput
                        label="Cantidad"
                        name="adjustment-qty"
                        type="number"
                        max={-0.0001}
                        value={String(pendingItem.quantity)}
                        onChange={(e) => {
                            const value = parseDecimalInput(e.target.value);
                            onChange({ quantity: value > 0 ? -Math.abs(value) : value });
                        }}
                        className="h-9 text-xs text-black/90"
                    />
                )}

                {pendingItem.adjustmentType === "AUMENTAR" && (
                    <FloatingInput
                        label="Cantidad"
                        name="adjustment-qty"
                        type="number"
                        min={0.0001}
                        value={String(pendingItem.quantity)}
                        onChange={(e) => {
                            const value = parseDecimalInput(e.target.value);
                            onChange({ quantity: value < 0 ? Math.abs(value) : value });
                        }}
                        className="h-9 text-xs text-black/90"
                    />
                )}

                <FloatingSelect
                    label="Tipo de ajuste"
                    name="adjustmentType"
                    value={pendingItem.adjustmentType ?? ""}
                    onChange={(value) => onChange({ adjustmentType: value })}
                    options={ADJUSTMENT_TYPE_OPTIONS}
                    placeholder="Seleccionar tipo"
                    emptyMessage="Sin tipos"
                    className="h-9 text-xs"
                />
            </div>

            <div className="mt-4 flex justify-end gap-2">
                <SystemButton variant="outline" size="sm" onClick={onClose}>
                    Cancelar
                </SystemButton>
                <SystemButton
                    size="sm"
                    onClick={() => {
                        if (!pendingItem.adjustmentType) {
                            return showFlash(errorResponse(missingTypeMessage));
                        }
                        if (pendingItem.quantity === 0) {
                            return showFlash(errorResponse(zeroQuantityMessage));
                        }
                        onAdd();
                    }}
                    leftIcon={<Plus className="h-4 w-4" />}
                >
                    Agregar
                </SystemButton>
            </div>
        </Modal>
    );
}
