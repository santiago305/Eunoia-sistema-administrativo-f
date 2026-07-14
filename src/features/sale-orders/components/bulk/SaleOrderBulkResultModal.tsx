import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type {
    SaleOrderBulkActionFailedRow,
    SaleOrderBulkActionResponse,
    SaleOrderBulkActionSuccessRow,
} from "@/shared/services/saleOrderService";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";

export type SaleOrderBulkResultModalProps = {
    open: boolean;
    result: SaleOrderBulkActionResponse | null;
    knownOrders?: SaleOrder[];
    onClose: () => void;
};

function getOrderLabel(order: SaleOrder | undefined, saleOrderId: string) {
    if (!order) return saleOrderId.slice(0, 8);
    const number = [order.serie, order.correlative].filter(Boolean).join("-");
    const client = order.client?.fullName ? ` · ${order.client.fullName}` : "";
    return `${number || saleOrderId.slice(0, 8)}${client}`;
}

function getStateRouteLabel(row: SaleOrderBulkActionFailedRow | SaleOrderBulkActionSuccessRow) {
    const finalState = row.finalState?.name;
    const completed = row.completedTransitions?.length ?? 0;
    if (!finalState && completed === 0) return null;
    return `${finalState ? `Estado final: ${finalState}. ` : ""}Transiciones completadas: ${completed}.`;
}

function getConditionFailureReasons(row: SaleOrderBulkActionFailedRow) {
    const failures = row.failure?.details?.failures;
    if (!Array.isArray(failures)) return [];

    return failures
        .map((failure) => {
            if (!failure || typeof failure !== "object") return null;
            const item = failure as {
                reason?: unknown;
            };
            const reason = typeof item.reason === "string" ? item.reason : null;
            return [reason].filter(Boolean).join(": ");
        })
        .filter((value): value is string => Boolean(value));
}

export function SaleOrderBulkResultModal({
    open,
    result,
    knownOrders = [],
    onClose,
}: SaleOrderBulkResultModalProps) {
    const rows = result?.data.results ?? [];
    const failedRows = rows.filter(
        (row): row is SaleOrderBulkActionFailedRow => row.status === "failed",
    );
    const warningRows = rows.filter(
        (row): row is SaleOrderBulkActionSuccessRow =>
            row.status === "success" && Boolean(row.warnings?.length),
    );
    const orderById = new Map(knownOrders.map((order) => [order.id, order]));

    return (
        <Modal
            open={open}
            title="Resultado de acción masiva"
            onClose={onClose}
            className="w-140 h-500 "
            closeButtonClassName="rounded-sm"
            bodyClassName="px-4 py-4"
            footer={
                <div className="flex justify-end">
                    <SystemButton size="sm" className="rounded-md" onClick={onClose}>
                        Entendido
                    </SystemButton>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Solicitados
                        </p>
                        <p className="text-lg font-semibold text-zinc-900">
                            {result?.data.requested ?? 0}
                        </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            Exitosos
                        </p>
                        <p className="text-lg font-semibold text-emerald-800">
                            {result?.data.succeeded ?? 0}
                        </p>
                    </div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                            Fallidos
                        </p>
                        <p className="text-lg font-semibold text-rose-800">
                            {result?.data.failed ?? 0}
                        </p>
                    </div>
                </div>

                {failedRows.length ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                        <div className="mb-2 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            Pedidos que fallaron
                        </div>
                        <div className="h-full space-y-2 pr-1">
                            {failedRows.map((row) => (
                                <div key={row.saleOrderId} className="rounded-md bg-white/70 px-2 py-2">
                                    <p className="font-semibold text-rose-900">
                                        {getOrderLabel(orderById.get(row.saleOrderId), row.saleOrderId)}
                                    </p>
                                    {getStateRouteLabel(row) ? (
                                        <p className="mt-0.5 leading-5 text-rose-700">
                                            {getStateRouteLabel(row)}
                                        </p>
                                    ) : null}
                                    <p className="mt-0.5 leading-5">{row.message}</p>
                                    {row.failure?.code ? (
                                        <p className="mt-0.5 text-[11px] font-semibold text-rose-700">
                                            Código: {row.failure.code}
                                        </p>
                                    ) : null}
                                    {getConditionFailureReasons(row).length ? (
                                        <ul className="mt-1 list-disc space-y-1 pl-4">
                                            {getConditionFailureReasons(row).map((reason) => (
                                                <li key={reason}>{reason}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Todos los pedidos fueron procesados correctamente.
                    </div>
                )}

                {warningRows.length ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <div className="mb-2 flex items-center gap-2 font-semibold">
                            <Info className="h-4 w-4" />
                            Advertencias
                        </div>
                        <div className="max-h-40 space-y-2 overflow-auto pr-1">
                            {warningRows.map((row) => (
                                <div key={row.saleOrderId} className="rounded-md bg-white/70 px-2 py-2">
                                    <p className="font-semibold text-amber-900">
                                        {getOrderLabel(orderById.get(row.saleOrderId), row.saleOrderId)}
                                    </p>
                                    {getStateRouteLabel(row) ? (
                                        <p className="mt-0.5 leading-5 text-amber-700">
                                            {getStateRouteLabel(row)}
                                        </p>
                                    ) : null}
                                    <ul className="mt-1 list-disc space-y-1 pl-4">
                                        {row.warnings?.map((warning) => (
                                            <li key={warning}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}
