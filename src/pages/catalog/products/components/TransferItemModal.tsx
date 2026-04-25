import { Boxes, Plus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { parseDecimalInput } from "@/utils/functionPurchases";
import type { TransferItemModalProps } from "@/pages/catalog/types/transfer";
import { Modal } from "@/components/modales/Modal";

export function TransferItemModal({ open, pendingItem, onChange, onClose, onAdd }: TransferItemModalProps) {
    const quantityInputRef = useRef<HTMLInputElement | null>(null);
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

    return (
        <Modal
            title="Agregar item"
            onClose={handleClose}
            className="w-[400px] space-y-3"
            initialFocusRef={quantityInputRef}
            open
        >
            <div className="grid grid-cols-1 gap-3">
                <SectionHeaderForm icon={Boxes} title="Productos" />
                <FloatingInput
                    ref={quantityInputRef}
                    label="Cantidad"
                    name="transfer-qty"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0}
                    step="0.001"
                    value={String(pendingItem.quantity)}
                    onFocus={(event) => {
                        event.currentTarget.select();
                    }}
                    onChange={(e) => {
                        const value = parseDecimalInput(e.target.value);
                        onChange({ quantity: value < 0 ? Math.abs(value) : value });
                    }}
                    className="h-9 text-xs text-black/90"
                />
            </div>
            <div className="mt-4 flex justify-end gap-2">
                <SystemButton variant="outline" size="sm" onClick={handleClose}>
                    Cancelar
                </SystemButton>
                <SystemButton size="sm" onClick={handleAdd} leftIcon={<Plus className="h-4 w-4" />}>
                    Agregar
                </SystemButton>
            </div>
        </Modal>
    );
}
