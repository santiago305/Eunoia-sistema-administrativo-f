import { RefreshCcw, RotateCcw, Trash2, UserCheck, Workflow, X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";

export type SaleOrderBulkActionsBarProps = {
    selectedCount: number;
    disabled?: boolean;
    onOpenAssign: () => void;
    onOpenChangeState: () => void;
    onOpenToggleActive: () => void;
    onClearSelection: () => void;
    restoreMode?: boolean;
    canAssign?: boolean;
    canChangeState?: boolean;
    canDelete?: boolean;
    canRestore?: boolean;
};

export function SaleOrderBulkActionsBar({
    selectedCount,
    disabled = false,
    onOpenAssign,
    onOpenChangeState,
    onOpenToggleActive,
    onClearSelection,
    restoreMode = false,
    canAssign = true,
    canChangeState = true,
    canDelete = true,
    canRestore = true,
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
                {canAssign ? <SystemButton
                    size="sm"
                    variant="outline"
                    className="rounded-md"
                    leftIcon={<UserCheck className="h-4 w-4" />}
                    disabled={disabled}
                    onClick={onOpenAssign}
                >
                    Asignar asesor
                </SystemButton> : null}

                {canChangeState ? <SystemButton
                    size="sm"
                    variant="outline"
                    className="rounded-md"
                    leftIcon={<Workflow className="h-4 w-4" />}
                    disabled={disabled}
                    onClick={onOpenChangeState}
                >
                    Cambiar estado
                </SystemButton> : null}

                {(restoreMode ? canRestore : canDelete) ? <SystemButton
                    size="sm"
                    variant={restoreMode ? "success" : "danger"}
                    className="rounded-md"
                    leftIcon={restoreMode ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    disabled={disabled}
                    onClick={onOpenToggleActive}
                >
                    {restoreMode ? "Restaurar pedidos" : "Eliminar pedidos"}
                </SystemButton> : null}

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
