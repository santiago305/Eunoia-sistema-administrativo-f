import { Boxes, Plus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse } from "@/shared/common/utils/response";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { Direction } from "@/features/out-orders/type/outOrder";

type AdjustmentItemModalValue = {
    quantity: number;
    adjustmentType?: string;
};

const ADJUSTMENT_TYPE_OPTIONS = [
    { value: Direction.OUT, label: "Reducir" },
    { value: Direction.IN, label: "Aumentar" },
];

type AdjustmentItemModalMessages = {
    missingType?: string;
    zeroQuantity?: string;
};

export type AdjustmentItemModalProps = {
    open: boolean;
    pendingItem: AdjustmentItemModalValue;
    onChange: (patch: Partial<AdjustmentItemModalValue>) => void;
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
    const onCloseRef = useRef(onClose);
    const onAddRef = useRef(onAdd);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        onAddRef.current = onAdd;
    }, [onAdd]);

    const handleClose = useCallback(() => {
        onCloseRef.current();
    }, []);

    const handleAdd = useCallback(() => {
        onAddRef.current();
    }, []);

    if (!open) return null;

    const missingTypeMessage = messages?.missingType ?? "Debe ingresar el tipo de ajuste";
    const zeroQuantityMessage = messages?.zeroQuantity ?? "La cantidad no puede ser cero";

    return (
        <Modal
            open={open}
            title={title}
            onClose={handleClose}
            className="max-h-90 space-y-3"
        >
            <div className="grid grid-cols-1 gap-3">
                <SectionHeaderForm icon={Boxes} title={sectionTitle} />

                {pendingItem.adjustmentType === Direction.OUT && (
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

                {pendingItem.adjustmentType === Direction.IN && (
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
                    emptyMessage="Sin tipos"
                    className="h-9 text-xs"
                />
            </div>

            <div className="mt-15 flex justify-end gap-2">
                <SystemButton variant="outline" size="sm" onClick={handleClose}>
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
                        handleAdd();
                    }}
                    leftIcon={<Plus className="h-4 w-4" />}
                >
                    Agregar
                </SystemButton>
            </div>
        </Modal>
    );
}
