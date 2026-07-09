import { RefreshCcw, UserCheck, Workflow, X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";

export type SaleOrderBulkActionsBarProps = {
    selectedCount: number;
    disabled?: boolean;
    onOpenAssign: () => void;
    onOpenChangeState: () => void;
    onClearSelection: () => void;
};

export function SaleOrderBulkActionsBar({
    selectedCount,
    disabled = false,
    onOpenAssign,
    onOpenChangeState,
    onClearSelection,
}: SaleOrderBulkActionsBarProps) {
    if (selectedCount <= 0) return null;

    return (
        <div className="flex flex-col gap-3 rounded-md  bg-primary/5 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">
                    {selectedCount} pedido(s) seleccionado(s)
                </p>
                <p className="text-xs text-zinc-600">
                    Puedes asignar asesor o ejecutar una transición masiva.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <SystemButton
                    size="sm"
                    variant="outline"
                    className="rounded-md"
                    leftIcon={<UserCheck className="h-4 w-4" />}
                    disabled={disabled}
                    onClick={onOpenAssign}
                >
                    Asignar asesor
                </SystemButton>

                <SystemButton
                    size="sm"
                    variant="outline"
                    className="rounded-md"
                    leftIcon={<Workflow className="h-4 w-4" />}
                    disabled={disabled}
                    onClick={onOpenChangeState}
                >
                    Cambiar estado
                </SystemButton>

                <SystemButton
                    size="sm"
                    variant="ghost"
                    className="rounded-md"
                    leftIcon={disabled ? <RefreshCcw className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    disabled={disabled}
                    onClick={onClearSelection}
                >
                    Limpiar
                </SystemButton>
            </div>
        </div>
    );
}
