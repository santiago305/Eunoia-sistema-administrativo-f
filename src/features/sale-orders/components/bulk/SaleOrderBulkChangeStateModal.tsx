import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Workflow, X } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type { SaleOrderSearchRule } from "@/features/sale-orders/types/saleOrder";
import type { SaleOrderState } from "@/features/workflows/types/workflow";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { AnimatedDateRangePicker } from "@/shared/components/components/date-picker/AnimatedDateRangePicker";
import { getDateKey } from "@/shared/components/components/date-picker/dateUtils";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { listSaleOrderStates } from "@/shared/services/workflowService";

export type SaleOrderBulkChangeStateSelection = {
    saleOrderIds: string[];
    targetStateId: string;
};

export type SaleOrderBulkChangeStateModalProps = {
    open: boolean;
    selectedOrders: SaleOrder[];
    selectedOrderIds: string[];
    loading?: boolean;
    onClose: () => void;
    onDiscardOrder?: (saleOrderId: string) => void;
    onLoadFilteredOrders?: (input: { page: 1; limit: 100; filters: SaleOrderSearchRule[] }) => Promise<SaleOrder[]>;
    onSubmit: (selection: SaleOrderBulkChangeStateSelection) => void | Promise<void>;
};

function getOrderLabel(order: SaleOrder | undefined, orderId: string) {
    if (!order) return orderId.slice(0, 8);
    const number = [order.serie, order.correlative].filter(Boolean).join("-");
    return number || orderId.slice(0, 8);
}

function getOrderTypeLabel(order: SaleOrder | undefined) {
    return order?.workflow?.name || "Sin tipo";
}

function getOrderStateLabel(order: SaleOrder | undefined) {
    return order?.currentState?.name || "Sin estado";
}

export function SaleOrderBulkChangeStateModal({
    open,
    selectedOrders,
    selectedOrderIds,
    loading = false,
    onClose,
    onDiscardOrder,
    onLoadFilteredOrders,
    onSubmit,
}: SaleOrderBulkChangeStateModalProps) {
    const [states, setStates] = useState<SaleOrderState[]>([]);
    const [targetStateId, setTargetStateId] = useState("");
    const [loadingStates, setLoadingStates] = useState(false);
    const [error, setError] = useState("");
    const [stateFilter, setStateFilter] = useState<string[]>([]);
    const [range, setRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
    const [remoteOrders, setRemoteOrders] = useState<SaleOrder[]>([]);
    const [hasRemoteSearch, setHasRemoteSearch] = useState(false);
    const [loadingRemoteOrders, setLoadingRemoteOrders] = useState(false);
    const requestIdRef = useRef(0);

    const allOrders = useMemo(() => {
        const map = new Map<string, SaleOrder>();
        selectedOrders.forEach((order) => map.set(order.id, order));
        remoteOrders.forEach((order) => map.set(order.id, order));
        return Array.from(map.values());
    }, [remoteOrders, selectedOrders]);

    const orderById = useMemo(
        () => new Map(allOrders.map((order) => [order.id, order])),
        [allOrders],
    );

    const effectiveOrderIds = useMemo(
        () => {
            const sourceIds = hasRemoteSearch ? remoteOrders.map((order) => order.id) : selectedOrderIds;
            return Array.from(new Set(sourceIds));
        },
        [hasRemoteSearch, remoteOrders, selectedOrderIds],
    );

    const previewRows = useMemo(
        () =>
            effectiveOrderIds.map((saleOrderId) => {
                const order = orderById.get(saleOrderId);
                return {
                    saleOrderId,
                    orderLabel: getOrderLabel(order, saleOrderId),
                    typeLabel: getOrderTypeLabel(order),
                    stateLabel: getOrderStateLabel(order),
                    color: order?.currentState?.color,
                    stateId: order?.currentState?.id ?? "__none__",
                    clientLabel: order?.client?.fullName || "Sin cliente",
                };
            }),
        [effectiveOrderIds, orderById],
    );

    const currentStateOptions = useMemo(() => {
        const options = Array.from(new Set(states.map((state) => state.name).filter(Boolean)))
            .map((stateName) => ({
                value: stateName,
                label: stateName,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, "es"));

        if (previewRows.some((row) => row.stateId === "__none__")) {
            options.unshift({ value: "__none__", label: "Sin estado" });
        }

        return [{ value: "__all__", label: "Todos los estados" }, ...options];
    }, [previewRows, states]);

    const currentStateIdsByName = useMemo(() => {
        const map = new Map<string, string[]>();
        states.forEach((state) => {
            if (!state.name || !state.id) return;
            map.set(state.name, [...(map.get(state.name) ?? []), state.id]);
        });
        return map;
    }, [states]);

    const remoteFilters = useMemo(() => {
        const filters: SaleOrderSearchRule[] = [];
        const stateIds = stateFilter.flatMap((label) => currentStateIdsByName.get(label) ?? []);
        if (stateIds.length > 0) {
            filters.push({ field: "saleOrderStateId", operator: "in", values: Array.from(new Set(stateIds)) });
        }
        if (range.startDate && range.endDate) {
            filters.push({
                field: "createdAt",
                operator: "between",
                range: { start: getDateKey(range.startDate), end: getDateKey(range.endDate) },
            });
        }
        return filters;
    }, [currentStateIdsByName, range.endDate, range.startDate, stateFilter]);

    const visiblePreviewRows = useMemo(
        () =>
            stateFilter.length === 0
                ? previewRows
                : previewRows.filter((row) => stateFilter.includes(row.stateLabel)),
        [previewRows, stateFilter],
    );

    const executableSaleOrderIds = useMemo(
        () => visiblePreviewRows.map((row) => row.saleOrderId),
        [visiblePreviewRows],
    );

    const stateOptions = useMemo(
        () =>
            states
                .filter((state) => Boolean(state.id))
                .map((state) => ({
                    value: state.id as string,
                    label: state.name,
                })),
        [states],
    );

    useEffect(() => {
        if (!open) {
            requestIdRef.current += 1;
            setTargetStateId("");
            setError("");
            setStateFilter([]);
            setRange({ startDate: null, endDate: null });
            setRemoteOrders([]);
            setHasRemoteSearch(false);
            return;
        }

        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        const loadStates = async () => {
            setLoadingStates(true);
            setError("");
            try {
                const response = await listSaleOrderStates();
                if (requestId !== requestIdRef.current) return;
                setStates(response);
            } catch (loadError) {
                if (requestId !== requestIdRef.current) return;
                setStates([]);
                setError(parseApiError(loadError, "No se pudieron cargar los estados."));
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoadingStates(false);
                }
            }
        };

        void loadStates();
    }, [open]);

    const toggleStateFilter = (value: string) => {
        setStateFilter((current) => {
            if (!value || value === "__all__") return [];
            return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        });
    };

    const removeStateFilter = (value: string) => {
        setStateFilter((current) => current.filter((item) => item !== value));
    };

    useEffect(() => {
        if (!open) return;
        if (!range.startDate || !range.endDate) {
            setRemoteOrders([]);
            setLoadingRemoteOrders(false);
            return;
        }
        if (!onLoadFilteredOrders) return;

        let cancelled = false;
        setHasRemoteSearch(true);
        setLoadingRemoteOrders(true);
        setError("");
        void onLoadFilteredOrders({ page: 1, limit: 100, filters: remoteFilters })
            .then((orders) => {
                if (cancelled) return;
                setRemoteOrders(orders);
            })
            .catch((loadError) => {
                if (cancelled) return;
                setError(parseApiError(loadError, "No se pudieron traer pedidos con los filtros activos."));
                setRemoteOrders([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingRemoteOrders(false);
            });

        return () => {
            cancelled = true;
        };
    }, [onLoadFilteredOrders, open, range.endDate, range.startDate, remoteFilters]);

    const submit = () => {
        if (!targetStateId || loading || loadingStates || executableSaleOrderIds.length === 0) return;
        void onSubmit({
            saleOrderIds: executableSaleOrderIds,
            targetStateId,
        });
    };

    return (
        <Modal
            open={open}
            title="Cambio masivo de estado"
            description={`Total: ${effectiveOrderIds.length}. Visibles: ${visiblePreviewRows.length}.`}
            onClose={() => {
                if (loading) return;
                onClose();
            }}
            className="w-180"
            closeButtonClassName="rounded-sm"
            bodyClassName="px-4 py-4"
            footer={
                <div className="flex justify-end">
                    <SystemButton
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </SystemButton>
                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="rounded-lg border border-border bg-muted/10">
                    <div className="space-y-2 border-b border-border px-3 py-2">
                        <div className="flex">
                            <p className="text-md p-3 font-semibold text-zinc-900">Pedidos</p>
                            <div className="flex items-center gap-2">
                                <AnimatedDateRangePicker
                                    label="Rango de fechas"
                                    name="bulk-change-state-date-range"
                                    startDate={range.startDate}
                                    endDate={range.endDate}
                                    onChange={setRange}
                                    disabled={loading || loadingRemoteOrders}
                                />
                            </div>
                        </div>
                        <FloatingSelect
                            label="Filtrar por estado"
                            name="bulk-current-state-filter"
                            value={stateFilter.at(-1) ?? "__all__"}
                            options={currentStateOptions}
                            onChange={toggleStateFilter}
                            disabled={loading}
                            searchable
                            panelWidthMode="min-trigger"
                        />
                        {stateFilter.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {stateFilter.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
                                        onClick={() => removeStateFilter(item)}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <div className="max-h-[420px] overflow-scroll scroll-area p-2">
                        {visiblePreviewRows.map((row) => (
                            <div key={row.saleOrderId} className="grid grid-cols-[1fr_auto] gap-2 rounded-md px-2 py-2 text-xs hover:bg-background">
                                <div className="min-w-0">
                                    <p className="font-semibold text-zinc-900">
                                        {row.orderLabel}   
                                    </p>
                                    <div className="space-y-0">
                                    <p className="grid grid-cols-[55px_1fr] items-center text-[11px] text-muted-foreground">
                                        <span>Cliente:</span>
                                        <span className="font-semibold text-zinc-700">
                                        {row.clientLabel}
                                        </span>
                                    </p>

                                    <p className="grid grid-cols-[55px_1fr] items-center text-[11px] text-muted-foreground">
                                        <span>Tipo:</span>
                                        <span className="w-fit rounded-md bg-amber-50 px-1.5 py-1 text-[10px] font-semibold text-amber-700">
                                        {row.typeLabel}
                                        </span>
                                    </p>
                                    <p className="grid grid-cols-[55px_1fr] items-center text-[11px] text-muted-foreground">
                                        <span>Estado:</span>
                                        <span
                                        className="w-fit rounded-md px-1.5 py-1 text-[10px] font-semibold text-white"
                                        style={{
                                            backgroundColor: row.color || "#F59E0B",
                                        }}
                                        >
                                        {row.stateLabel}
                                        </span>
                                    </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Descartar pedido ${row.orderLabel}`}
                                    title="Descartar de la seleccion"
                                    disabled={loading || !onDiscardOrder}
                                    onClick={() => onDiscardOrder?.(row.saleOrderId)}
                                    className="flex h-12 w-12 items-center justify-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                <div className="space-y-4">
                    {error ? (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : null}

                    <FloatingSelect
                        label="Estado destino"
                        name="bulk-target-state"
                        value={targetStateId}
                        options={stateOptions}
                        onChange={setTargetStateId}
                        disabled={loading || loadingStates || stateOptions.length === 0}
                        searchable
                        panelWidthMode="min-trigger"
                        emptyMessage="Sin estados"
                    />

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SystemButton
                            size="sm"
                            className="rounded-md"
                            leftIcon={<Workflow className="h-4 w-4" />}
                            disabled={!targetStateId || loading || loadingStates}
                            loading={loading}
                            onClick={submit}
                        >
                            Cambiar estado
                        </SystemButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
