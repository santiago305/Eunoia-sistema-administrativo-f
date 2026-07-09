import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Workflow } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type { AvailableTransition } from "@/features/workflows/types/workflow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { cn } from "@/shared/lib/utils";
import { getAvailableSaleOrderTransitions } from "@/shared/services/saleOrderService";

export type SaleOrderBulkTransitionGroup = {
    transitionId: string;
    transitionName: string;
    saleOrderIds: string[];
};

export type SaleOrderBulkTransitionPlan = {
    transitionKey: string;
    transitionName: string;
    saleOrderIds: string[];
    transitionGroups: SaleOrderBulkTransitionGroup[];
};

export type SaleOrderBulkChangeStateSelection = {
    saleOrderIds: string[];
    transitionPlans: SaleOrderBulkTransitionPlan[];
};

export type SaleOrderBulkChangeStateModalProps = {
    open: boolean;
    selectedOrders: SaleOrder[];
    selectedOrderIds: string[];
    loading?: boolean;
    onClose: () => void;
    onSubmit: (selection: SaleOrderBulkChangeStateSelection) => void | Promise<void>;
};

type TransitionGroup = {
    transitionId: string;
    transition: AvailableTransition;
    saleOrderIds: string[];
};

type TransitionSummary = {
    key: string;
    label: string;
    transition: AvailableTransition;
    availableOrderIds: string[];
    unavailableOrderIds: string[];
    missingOrderIds: string[];
    availableCount: number;
    unavailableCount: number;
    missingCount: number;
    totalCount: number;
    transitionGroups: TransitionGroup[];
};

type TransitionSummaryDraft = {
    key: string;
    label: string;
    transition: AvailableTransition;
    availableOrderIds: string[];
    unavailableOrderIds: string[];
    transitionGroupMap: Map<string, TransitionGroup>;
};

type GroupedOrder = {
    key: string;
    typeLabel: string;
    stateLabel: string;
    stateColor: string | null;
    orders: SaleOrderGroupItem[];
};

type SaleOrderGroupItem = {
    saleOrderId: string;
    order?: SaleOrder;
    orderLabel: string;
    typeLabel: string;
    stateLabel: string;
    stateColor: string | null;
};

const normalizeTextKey = (value: string) =>
    value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

function getTransitionKey(transition: AvailableTransition) {
    return normalizeTextKey(transition.name || transition.code || transition.id);
}

function getTransitionLabel(transition: AvailableTransition) {
    return transition.name || transition.code || "Transición";
}

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

function getOrderStateColor(order: SaleOrder | undefined) {
    return order?.currentState?.color || null;
}

function buildOrderGroups(input: {
    selectedOrders: SaleOrder[];
    selectedOrderIds: string[];
}) {
    const orderById = new Map(input.selectedOrders.map((order) => [order.id, order]));
    const groupMap = new Map<string, GroupedOrder>();

    input.selectedOrderIds.forEach((saleOrderId) => {
        const order = orderById.get(saleOrderId);
        const typeLabel = getOrderTypeLabel(order);
        const stateLabel = getOrderStateLabel(order);
        const stateColor = getOrderStateColor(order);
        const groupKey = `${typeLabel}::${stateLabel}`;
        const current = groupMap.get(groupKey) ?? {
            key: groupKey,
            typeLabel,
            stateLabel,
            stateColor,
            orders: [],
        };

        current.orders.push({
            saleOrderId,
            order,
            orderLabel: getOrderLabel(order, saleOrderId),
            typeLabel,
            stateLabel,
            stateColor,
        });
        groupMap.set(groupKey, current);
    });

    return Array.from(groupMap.values())
        .map((group) => ({
            ...group,
            orders: [...group.orders].sort((a, b) =>
                a.orderLabel.localeCompare(b.orderLabel, "es", { numeric: true }),
            ),
        }))
        .sort((a, b) => {
            const byType = a.typeLabel.localeCompare(b.typeLabel, "es");
            if (byType !== 0) return byType;
            return a.stateLabel.localeCompare(b.stateLabel, "es");
        });
}

function buildTransitionSummaries(input: {
    selectedOrderIds: string[];
    transitionsByOrderId: Record<string, AvailableTransition[]>;
}) {
    const transitionMap = new Map<string, TransitionSummaryDraft>();

    input.selectedOrderIds.forEach((saleOrderId) => {
        const transitions = input.transitionsByOrderId[saleOrderId] ?? [];
        const transitionsByKey = new Map<
            string,
            { available: AvailableTransition | null; unavailable: AvailableTransition | null }
        >();

        transitions.forEach((transition) => {
            const key = getTransitionKey(transition);
            const current = transitionsByKey.get(key) ?? {
                available: null,
                unavailable: null,
            };

            if (transition.available && !current.available) {
                current.available = transition;
            }
            if (!transition.available && !current.unavailable) {
                current.unavailable = transition;
            }

            transitionsByKey.set(key, current);
        });

        transitionsByKey.forEach((entry, key) => {
            const transition = entry.available ?? entry.unavailable;
            if (!transition) return;

            const current = transitionMap.get(key) ?? {
                key,
                label: getTransitionLabel(transition),
                transition,
                availableOrderIds: [],
                unavailableOrderIds: [],
                transitionGroupMap: new Map<string, TransitionGroup>(),
            };

            if (entry.available) {
                current.availableOrderIds.push(saleOrderId);

                const group = current.transitionGroupMap.get(entry.available.id) ?? {
                    transitionId: entry.available.id,
                    transition: entry.available,
                    saleOrderIds: [],
                };

                group.saleOrderIds.push(saleOrderId);
                current.transitionGroupMap.set(entry.available.id, group);
            } else {
                current.unavailableOrderIds.push(saleOrderId);
            }

            transitionMap.set(key, current);
        });
    });

    return Array.from(transitionMap.values())
        .map<TransitionSummary>((summary) => {
            const missingOrderIds = input.selectedOrderIds.filter(
                (saleOrderId) =>
                    !summary.availableOrderIds.includes(saleOrderId) &&
                    !summary.unavailableOrderIds.includes(saleOrderId),
            );

            return {
                key: summary.key,
                label: summary.label,
                transition: summary.transition,
                availableOrderIds: summary.availableOrderIds,
                unavailableOrderIds: summary.unavailableOrderIds,
                missingOrderIds,
                availableCount: summary.availableOrderIds.length,
                unavailableCount: summary.unavailableOrderIds.length,
                missingCount: missingOrderIds.length,
                totalCount: input.selectedOrderIds.length,
                transitionGroups: Array.from(summary.transitionGroupMap.values()).sort((a, b) =>
                    a.transition.name.localeCompare(b.transition.name, "es"),
                ),
            };
        })
        .sort((a, b) => {
            if (b.availableCount !== a.availableCount) {
                return b.availableCount - a.availableCount;
            }
            return a.label.localeCompare(b.label, "es");
        });
}

function BulkCheckbox({
    checked,
    indeterminate = false,
    disabled = false,
    ariaLabel,
    onChange,
}: {
    checked: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    ariaLabel: string;
    onChange: () => void;
}) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-label={ariaLabel}
            onChange={onChange}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        />
    );
}

function OrderStateBadge({
    label,
    color,
}: {
    label: string;
    color: string | null;
}) {
    return (
        <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={
                color
                    ? {
                        borderColor: color,
                        color,
                    }
                    : undefined
            }
        >
            {label}
        </span>
    );
}

function getAvailableTransitionsForOrder(
    saleOrderId: string,
    transitionSummaries: TransitionSummary[],
) {
    return transitionSummaries.filter((summary) =>
        summary.availableOrderIds.includes(saleOrderId),
    );
}

function TransitionButton({
    label,
    countLabel,
    selected = false,
    partiallySelected = false,
    disabled = false,
    title,
    onClick,
}: {
    label: string;
    countLabel?: string;
    selected?: boolean;
    partiallySelected?: boolean;
    disabled?: boolean;
    title?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                "disabled:cursor-not-allowed disabled:opacity-55",
                selected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : partiallySelected
                      ? "border-primary/70 bg-primary/10 text-primary"
                      : "border-border bg-background text-zinc-700 hover:border-primary/60 hover:bg-muted/40",
            )}
        >
            <span>{label}</span>
            {countLabel ? (
                <span
                    className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px]",
                        selected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                    )}
                >
                    {countLabel}
                </span>
            ) : null}
        </button>
    );
}

export function SaleOrderBulkChangeStateModal({
    open,
    selectedOrders,
    selectedOrderIds,
    loading = false,
    onClose,
    onSubmit,
}: SaleOrderBulkChangeStateModalProps) {
    const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]);
    const [assignedTransitionByOrderId, setAssignedTransitionByOrderId] = useState<Record<string, string>>({});
    const [transitionsByOrderId, setTransitionsByOrderId] = useState<Record<string, AvailableTransition[]>>({});
    const [loadingTransitions, setLoadingTransitions] = useState(false);
    const [loadErrors, setLoadErrors] = useState<Array<{ saleOrderId: string; message: string }>>([]);
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (!open) {
            requestIdRef.current += 1;
            setActiveOrderIds([]);
            setAssignedTransitionByOrderId({});
            setTransitionsByOrderId({});
            setLoadErrors([]);
            return;
        }

        setActiveOrderIds(selectedOrderIds);
        setAssignedTransitionByOrderId({});
    }, [open, selectedOrderIds]);

    useEffect(() => {
        if (!open) return;

        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        const loadTransitions = async () => {
            setLoadingTransitions(true);
            setLoadErrors([]);
            setTransitionsByOrderId({});

            const pairs = await Promise.all(
                selectedOrderIds.map(async (saleOrderId) => {
                    try {
                        const transitions = await getAvailableSaleOrderTransitions(saleOrderId);
                        return { saleOrderId, transitions, error: null };
                    } catch (error) {
                        return {
                            saleOrderId,
                            transitions: [],
                            error: parseApiError(error, "No se pudieron cargar las transiciones."),
                        };
                    }
                }),
            );

            if (requestId !== requestIdRef.current) return;

            setTransitionsByOrderId(
                Object.fromEntries(
                    pairs.map((pair) => [pair.saleOrderId, pair.transitions]),
                ),
            );
            setLoadErrors(
                pairs
                    .filter((pair) => pair.error)
                    .map((pair) => ({
                        saleOrderId: pair.saleOrderId,
                        message: pair.error ?? "Error inesperado",
                    })),
            );
            setLoadingTransitions(false);
        };

        void loadTransitions();
    }, [open, selectedOrderIds]);

    const orderById = useMemo(
        () => new Map(selectedOrders.map((order) => [order.id, order])),
        [selectedOrders],
    );

    const groupedOrders = useMemo(
        () => buildOrderGroups({ selectedOrders, selectedOrderIds }),
        [selectedOrders, selectedOrderIds],
    );

    const transitionSummaries = useMemo(
        () => buildTransitionSummaries({ selectedOrderIds, transitionsByOrderId }),
        [selectedOrderIds, transitionsByOrderId],
    );

    const executableTransitionSummaries = useMemo(
        () => transitionSummaries.filter((summary) => summary.availableCount > 0),
        [transitionSummaries],
    );

    const activeOrderIdSet = useMemo(() => new Set(activeOrderIds), [activeOrderIds]);

    const assignedEntries = useMemo(
        () =>
            Object.entries(assignedTransitionByOrderId).filter(
                ([saleOrderId, transitionKey]) =>
                    selectedOrderIds.includes(saleOrderId) &&
                    activeOrderIdSet.has(saleOrderId) &&
                    Boolean(transitionKey),
            ),
        [activeOrderIdSet, assignedTransitionByOrderId, selectedOrderIds],
    );

    const assignedCount = assignedEntries.length;
    const activeCount = activeOrderIds.length;

    const assignedCountByTransitionKey = useMemo(() => {
        const counts = new Map<string, number>();
        assignedEntries.forEach(([, transitionKey]) => {
            counts.set(transitionKey, (counts.get(transitionKey) ?? 0) + 1);
        });
        return counts;
    }, [assignedEntries]);

    const bulkTransitionOptions = useMemo(
        () =>
            executableTransitionSummaries
                .map((summary) => {
                    const availableOrderIds = summary.availableOrderIds.filter((saleOrderId) =>
                        activeOrderIdSet.has(saleOrderId),
                    );
                    const assignedToThisCount = availableOrderIds.filter(
                        (saleOrderId) => assignedTransitionByOrderId[saleOrderId] === summary.key,
                    ).length;

                    return {
                        summary,
                        availableOrderIds,
                        assignedToThisCount,
                    };
                })
                .filter((option) => option.availableOrderIds.length > 0),
        [activeOrderIdSet, assignedTransitionByOrderId, executableTransitionSummaries],
    );

    const loadErrorMap = useMemo(
        () => new Map(loadErrors.map((item) => [item.saleOrderId, item.message])),
        [loadErrors],
    );

    const toggleOrderActive = (saleOrderId: string) => {
        setActiveOrderIds((current) => {
            if (current.includes(saleOrderId)) {
                setAssignedTransitionByOrderId((assigned) => {
                    const next = { ...assigned };
                    delete next[saleOrderId];
                    return next;
                });
                return current.filter((id) => id !== saleOrderId);
            }
            return [...current, saleOrderId];
        });
    };

    const toggleGroupActive = (saleOrderIds: string[]) => {
        setActiveOrderIds((current) => {
            const allActive = saleOrderIds.every((saleOrderId) => current.includes(saleOrderId));
            if (allActive) {
                setAssignedTransitionByOrderId((assigned) => {
                    const next = { ...assigned };
                    saleOrderIds.forEach((saleOrderId) => {
                        delete next[saleOrderId];
                    });
                    return next;
                });
                return current.filter((saleOrderId) => !saleOrderIds.includes(saleOrderId));
            }

            return Array.from(new Set([...current, ...saleOrderIds]));
        });
    };

    const setTransitionForOrders = (transitionKey: string, saleOrderIds: string[]) => {
        setActiveOrderIds((current) => Array.from(new Set([...current, ...saleOrderIds])));
        setAssignedTransitionByOrderId((current) => {
            const next = { ...current };
            saleOrderIds.forEach((saleOrderId) => {
                next[saleOrderId] = transitionKey;
            });
            return next;
        });
    };

    const clearTransitionForOrders = (transitionKey: string, saleOrderIds: string[]) => {
        setAssignedTransitionByOrderId((current) => {
            const next = { ...current };
            saleOrderIds.forEach((saleOrderId) => {
                if (next[saleOrderId] === transitionKey) {
                    delete next[saleOrderId];
                }
            });
            return next;
        });
    };

    const toggleOrderTransition = (saleOrderId: string, transitionKey: string) => {
        setActiveOrderIds((current) =>
            current.includes(saleOrderId) ? current : [...current, saleOrderId],
        );
        setAssignedTransitionByOrderId((current) => {
            const next = { ...current };
            if (next[saleOrderId] === transitionKey) {
                delete next[saleOrderId];
            } else {
                next[saleOrderId] = transitionKey;
            }
            return next;
        });
    };

    const toggleGroupTransition = (transitionKey: string, saleOrderIds: string[]) => {
        const allAssigned = saleOrderIds.every(
            (saleOrderId) =>
                activeOrderIdSet.has(saleOrderId) &&
                assignedTransitionByOrderId[saleOrderId] === transitionKey,
        );

        if (allAssigned) {
            clearTransitionForOrders(transitionKey, saleOrderIds);
            return;
        }

        setTransitionForOrders(transitionKey, saleOrderIds);
    };

    const clearPlan = () => {
        setAssignedTransitionByOrderId({});
    };

    const buildSelection = (): SaleOrderBulkChangeStateSelection => {
        const transitionPlans = executableTransitionSummaries
            .map<SaleOrderBulkTransitionPlan | null>((summary) => {
                const saleOrderIds = summary.availableOrderIds.filter(
                    (saleOrderId) =>
                        activeOrderIdSet.has(saleOrderId) &&
                        assignedTransitionByOrderId[saleOrderId] === summary.key,
                );

                if (saleOrderIds.length === 0) return null;

                const transitionGroups = summary.transitionGroups
                    .map<SaleOrderBulkTransitionGroup | null>((group) => {
                        const groupSaleOrderIds = group.saleOrderIds.filter((saleOrderId) =>
                            saleOrderIds.includes(saleOrderId),
                        );

                        if (groupSaleOrderIds.length === 0) return null;

                        return {
                            transitionId: group.transitionId,
                            transitionName: group.transition.name,
                            saleOrderIds: groupSaleOrderIds,
                        };
                    })
                    .filter((group): group is SaleOrderBulkTransitionGroup => Boolean(group));

                return {
                    transitionKey: summary.key,
                    transitionName: summary.label,
                    saleOrderIds,
                    transitionGroups,
                };
            })
            .filter((plan): plan is SaleOrderBulkTransitionPlan => Boolean(plan));

        return {
            saleOrderIds: transitionPlans.flatMap((plan) => plan.saleOrderIds),
            transitionPlans,
        };
    };

    const submitTransitionPlan = () => {
        const selection = buildSelection();
        if (selection.saleOrderIds.length === 0 || loading || loadingTransitions) return;
        void onSubmit(selection);
    };

    return (
        <Modal
            open={open}
            title="Cambio de estado masivo"
            description={`${assignedCount} de ${selectedOrderIds.length} pedido(s) tienen una transición seleccionada.`}
            onClose={() => {
                if (loading) return;
                onClose();
            }}
            className="w-full max-w-4xl"
            closeButtonClassName="rounded-sm"
            bodyClassName="px-4 py-4"
            footer={
                <div className="grid grid-cols-2">
                    <div className="flex justify-start gap-2 text-xs leading-5 text-zinc-700">
                        {assignedCount > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {executableTransitionSummaries
                                    .filter((summary) => (assignedCountByTransitionKey.get(summary.key) ?? 0) > 0)
                                    .map((summary) => (
                                        <span
                                            key={summary.key}
                                            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                                        >
                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                            {summary.label}: {assignedCountByTransitionKey.get(summary.key)}
                                        </span>
                                    ))}
                            </div>
                        ) : null}
                    </div>
                    <div className="flex justify-end gap-2">
                        <SystemButton
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </SystemButton>
                        <SystemButton
                            size="sm"
                            className="rounded-md"
                            leftIcon={<Workflow className="h-4 w-4" />}
                            onClick={submitTransitionPlan}
                            disabled={assignedCount === 0 || loading || loadingTransitions}
                            loading={loading}
                        >
                            Ejecutar ({assignedCount})
                        </SystemButton>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background">
                    <div className="flex flex-col gap-3 border-b border-border px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold text-zinc-900">Pedidos seleccionados</p>
                            <p className="text-[11px] text-muted-foreground">
                                Total: {activeCount}.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <SystemButton
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md text-[11px]"
                                onClick={clearPlan}
                                disabled={loading || assignedCount === 0}
                            >
                                Limpiar transiciones
                            </SystemButton>
                        </div>
                    </div>

                    {!loadingTransitions && bulkTransitionOptions.length ? (
                        <div className="border-b border-border bg-muted/10 px-3 py-3">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-zinc-900 mt-2">Marcar opción masiva</p>
                                </div>

                                <div className="flex max-w-full flex-wrap gap-1.5 xl:justify-end">
                                    {bulkTransitionOptions.map(({ summary, availableOrderIds, assignedToThisCount }) => {
                                        const allAssignedToThis =
                                            assignedToThisCount === availableOrderIds.length &&
                                            availableOrderIds.length > 0;
                                        const partiallyAssignedToThis =
                                            assignedToThisCount > 0 &&
                                            assignedToThisCount < availableOrderIds.length;

                                        return (
                                            <TransitionButton
                                                key={summary.key}
                                                label={summary.label}
                                                countLabel={`${assignedToThisCount}/${availableOrderIds.length}`}
                                                selected={allAssignedToThis}
                                                partiallySelected={partiallyAssignedToThis}
                                                disabled={loading}
                                                title={`Asignar ${summary.label} a ${availableOrderIds.length} pedido(s) marcado(s) donde esté disponible`}
                                                onClick={() => toggleGroupTransition(summary.key, availableOrderIds)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="max-h-[520px] overflow-auto p-2 scrollbar-panel">
                        {loadingTransitions ? (
                            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                                Cargando transiciones...
                            </div>
                        ) : groupedOrders.length === 0 ? (
                            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                                No hay pedidos seleccionados.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {groupedOrders.map((group) => {
                                    const groupOrderIds = group.orders.map((item) => item.saleOrderId);
                                    const groupActiveCount = groupOrderIds.filter((saleOrderId) =>
                                        activeOrderIdSet.has(saleOrderId),
                                    ).length;
                                    const groupAssignedCount = groupOrderIds.filter(
                                        (saleOrderId) =>
                                            activeOrderIdSet.has(saleOrderId) &&
                                            Boolean(assignedTransitionByOrderId[saleOrderId]),
                                    ).length;
                                    const groupChecked = groupActiveCount === group.orders.length && group.orders.length > 0;
                                    const groupIndeterminate = groupActiveCount > 0 && groupActiveCount < group.orders.length;
                                    const groupTransitionOptions = executableTransitionSummaries
                                        .map((summary) => {
                                            const availableOrderIds = groupOrderIds.filter((saleOrderId) =>
                                                summary.availableOrderIds.includes(saleOrderId),
                                            );
                                            const assignedToThisCount = availableOrderIds.filter(
                                                (saleOrderId) =>
                                                    activeOrderIdSet.has(saleOrderId) &&
                                                    assignedTransitionByOrderId[saleOrderId] === summary.key,
                                            ).length;

                                            return {
                                                summary,
                                                availableOrderIds,
                                                assignedToThisCount,
                                            };
                                        })
                                        .filter((option) => option.availableOrderIds.length > 0);

                                    return (
                                        <div key={group.key} className="overflow-hidden rounded-lg border border-border/70 bg-muted/10">
                                            <div className="border-b border-border/60 bg-muted/30 px-3 py-3">
                                                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <BulkCheckbox
                                                                checked={groupChecked}
                                                                indeterminate={groupIndeterminate}
                                                                disabled={loading}
                                                                ariaLabel={`Marcar pedidos del grupo ${group.typeLabel} ${group.stateLabel}`}
                                                                onChange={() => toggleGroupActive(groupOrderIds)}
                                                            />
                                                            <span className="text-xs font-semibold text-zinc-900">
                                                                {group.typeLabel}
                                                            </span>
                                                            <OrderStateBadge label={group.stateLabel} color={group.stateColor} />
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {groupAssignedCount} de {group.orders.length} con transición
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex max-w-full flex-wrap gap-1.5">
                                                        {groupTransitionOptions.length ? (
                                                            groupTransitionOptions.map(({ summary, availableOrderIds, assignedToThisCount }) => {
                                                                const allAssignedToThis =
                                                                    assignedToThisCount === availableOrderIds.length &&
                                                                    availableOrderIds.length > 0;
                                                                const partiallyAssignedToThis =
                                                                    assignedToThisCount > 0 &&
                                                                    assignedToThisCount < availableOrderIds.length;

                                                                return (
                                                                    <TransitionButton
                                                                        key={summary.key}
                                                                        label={summary.label}
                                                                        countLabel={`${availableOrderIds.length}`}
                                                                        selected={allAssignedToThis}
                                                                        partiallySelected={partiallyAssignedToThis}
                                                                        disabled={loading}
                                                                        title={`Asignar ${summary.label} a ${availableOrderIds.length} pedido(s) de este grupo`}
                                                                        onClick={() => toggleGroupTransition(summary.key, availableOrderIds)}
                                                                    />
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-medium text-zinc-500">
                                                                Sin opciones disponibles
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-border/50 bg-background">
                                                {group.orders.map((item) => {
                                                    const active = activeOrderIdSet.has(item.saleOrderId);
                                                    const assignedTransitionKey = assignedTransitionByOrderId[item.saleOrderId];
                                                    const availableTransitions = getAvailableTransitionsForOrder(
                                                        item.saleOrderId,
                                                        executableTransitionSummaries,
                                                    );
                                                    const loadError = loadErrorMap.get(item.saleOrderId);

                                                    return (
                                                        <div
                                                            key={item.saleOrderId}
                                                            className={cn(
                                                                "grid gap-2 px-3 py-2.5 lg:grid-cols-[minmax(180px,0.6fr)_minmax(0,1fr)] lg:items-center",
                                                                !active && "bg-muted/20 opacity-70",
                                                            )}
                                                        >
                                                            <div className="flex min-w-0 items-start gap-2">
                                                                <div className="pt-0.5">
                                                                    <BulkCheckbox
                                                                        checked={active}
                                                                        disabled={loading}
                                                                        ariaLabel={`Marcar pedido ${item.orderLabel}`}
                                                                        onChange={() => toggleOrderActive(item.saleOrderId)}
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="text-xs font-semibold tabular-nums text-zinc-900">
                                                                            {item.orderLabel}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            Tipo: <span className="font-medium text-zinc-700">{item.typeLabel}</span>
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            Estado: <span className="font-medium text-zinc-700">{item.stateLabel}</span>
                                                                        </span>
                                                                    </div>

                                                                    {loadError ? (
                                                                        <p className="mt-1 text-[10px] font-medium text-rose-700">
                                                                            Error al cargar transiciones: {loadError}
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap gap-1.5 lg:justify-end">
                                                                {availableTransitions.length ? (
                                                                    availableTransitions.map((summary) => {
                                                                        const selected = active && assignedTransitionKey === summary.key;
                                                                        return (
                                                                            <TransitionButton
                                                                                key={summary.key}
                                                                                label={summary.label}
                                                                                selected={selected}
                                                                                disabled={loading}
                                                                                title={
                                                                                    selected
                                                                                        ? `Quitar ${summary.label} del pedido ${item.orderLabel}`
                                                                                        : `Asignar ${summary.label} al pedido ${item.orderLabel}`
                                                                                }
                                                                                onClick={() => toggleOrderTransition(item.saleOrderId, summary.key)}
                                                                            />
                                                                        );
                                                                    })
                                                                ) : loadError ? null : (
                                                                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-medium text-zinc-500">
                                                                        Sin transiciones disponibles
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {loadErrors.length ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                        <div className="flex items-start gap-2 font-semibold">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            No se pudieron cargar transiciones de {loadErrors.length} pedido(s).
                        </div>
                        <div className="mt-2 max-h-24 space-y-1 overflow-auto pr-1">
                            {loadErrors.slice(0, 5).map((item) => (
                                <p key={item.saleOrderId}>
                                    {getOrderLabel(orderById.get(item.saleOrderId), item.saleOrderId)}: {item.message}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}
