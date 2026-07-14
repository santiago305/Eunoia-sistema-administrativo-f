import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, Plus, UserCheck, UserX, X } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type { SaleOrderSearchRule } from "@/features/sale-orders/types/saleOrder";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { AnimatedDateRangePicker } from "@/shared/components/components/date-picker/AnimatedDateRangePicker";
import { getDateKey } from "@/shared/components/components/date-picker/dateUtils";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useAuth } from "@/shared/hooks/useAuth";
import {
    createAdviser,
    listAdvisers,
    type AdviserOption,
} from "@/shared/services/adviserService";
import { listUsers, type UserApiListItem } from "@/shared/services/userService";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

export type SaleOrderBulkAssignModalProps = {
    open: boolean;
    selectedOrders: SaleOrder[];
    selectedOrderIds: string[];
    loading?: boolean;
    onClose: () => void;
    onDiscardOrder?: (saleOrderId: string) => void;
    onLoadFilteredOrders?: (input: { page: 1; limit: 100; filters: SaleOrderSearchRule[] }) => Promise<SaleOrder[]>;
    onSubmit: (input: { assignedBy: string | null; saleOrderIds: string[] }) => void | Promise<void>;
};

export function SaleOrderBulkAssignModal({
    open,
    selectedOrders,
    selectedOrderIds,
    loading = false,
    onClose,
    onDiscardOrder,
    onLoadFilteredOrders,
    onSubmit,
}: SaleOrderBulkAssignModalProps) {
    const { permissions = [] } = useAuth();
    const canAssignRoles = Array.isArray(permissions) && permissions.includes("users.assign_roles");

    const [advisers, setAdvisers] = useState<AdviserOption[]>([]);
    const [selectedAdviserId, setSelectedAdviserId] = useState("");
    const [loadingAdvisers, setLoadingAdvisers] = useState(false);
    const [allUsers, setAllUsers] = useState<UserApiListItem[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [error, setError] = useState("");
    const [creatorFilter, setCreatorFilter] = useState<string[]>([]);
    const [assignedToFilter, setAssignedToFilter] = useState<string[]>([]);
    const [range, setRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
    const [remoteOrders, setRemoteOrders] = useState<SaleOrder[]>([]);
    const [hasRemoteSearch, setHasRemoteSearch] = useState(false);
    const [loadingRemoteOrders, setLoadingRemoteOrders] = useState(false);
    const requestIdRef = useRef(0);

    const [addAdviserOpen, setAddAdviserOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [savingAdviser, setSavingAdviser] = useState(false);
    const [addError, setAddError] = useState("");

    const adviserIds = useMemo(() => new Set(advisers.map((adviser) => adviser.id)), [advisers]);

    useEffect(() => {
        if (!open) {
            requestIdRef.current += 1;
            setSelectedAdviserId("");
            setError("");
            setAddAdviserOpen(false);
            setCreatorFilter([]);
            setAssignedToFilter([]);
            setRange({ startDate: null, endDate: null });
            setRemoteOrders([]);
            setHasRemoteSearch(false);
            return;
        }

        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        const loadAdvisers = async () => {
            setLoadingAdvisers(true);
            setError("");
            try {
                const [adviserResponse, userResponse] = await Promise.all([
                    listAdvisers(),
                    listUsers({ status: "active", page: 1 }),
                ]);
                if (requestId !== requestIdRef.current) return;
                setAdvisers(adviserResponse);
                setAllUsers(userResponse.items);
            } catch (loadError) {
                if (requestId !== requestIdRef.current) return;
                setAdvisers([]);
                setAllUsers([]);
                setError(parseApiError(loadError, "No se pudieron cargar los asesores."));
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoadingAdvisers(false);
                    setLoadingUsers(false);
                }
            }
        };

        setLoadingUsers(true);
        void loadAdvisers();
    }, [open]);

    useEffect(() => {
        if (!addAdviserOpen) {
            setSelectedUserId("");
            setAddError("");
            return;
        }

        if (allUsers.length === 0) {
            setLoadingUsers(true);
            setAddError("");
            void listUsers({ status: "active", page: 1 })
                .then((response) => setAllUsers(response.items))
                .catch((loadError) => setAddError(parseApiError(loadError, "No se pudieron cargar los usuarios.")))
                .finally(() => setLoadingUsers(false));
        }
    }, [addAdviserOpen, allUsers.length]);

    const adviserOptions = useMemo(
        () =>
            advisers.map((adviser) => ({
                value: adviser.id,
                label: adviser.name?.trim() ? `${adviser.name} (${adviser.email})` : adviser.email,
            })),
        [advisers],
    );

    const creatorOptions = useMemo(
        () => [
            { value: "__all__", label: "Todos" },
            { value: "__none__", label: "Sin creador" },
            ...allUsers
                .map((user) => ({
                    value: user.id,
                    label: user.name?.trim() ? `${user.name} (${user.email})` : user.email,
                }))
                .sort((a, b) => a.label.localeCompare(b.label, "es")),
        ],
        [allUsers],
    );

    const assignedToOptions = useMemo(
        () => [
            { value: "__all__", label: "Todos" },
            { value: "__none__", label: "Sin asesor" },
            { value: "__assigned__", label: "Con asesor" },
            ...adviserOptions,
        ],
        [adviserOptions],
    );

    const addableUserOptions = useMemo(
        () =>
            allUsers
                .filter((user) => !adviserIds.has(user.id))
                .map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                })),
        [adviserIds, allUsers],
    );

    const allOrders = useMemo(() => {
        const map = new Map<string, SaleOrder>();
        selectedOrders.forEach((order) => map.set(order.id, order));
        remoteOrders.forEach((order) => map.set(order.id, order));
        return Array.from(map.values());
    }, [remoteOrders, selectedOrders]);

    const orderById = useMemo(() => new Map(allOrders.map((order) => [order.id, order])), [allOrders]);

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
                const number = order ? [order.serie, order.correlative].filter(Boolean).join("-") : "";
                return {
                    saleOrderId,
                    orderLabel: number || saleOrderId.slice(0, 8),
                    clientLabel: order?.client?.fullName || "Sin cliente",
                    createdById: order?.createdBy?.id ?? "__none__",
                    createdByLabel: order?.createdBy?.name || order?.createdBy?.email || "Sin creador",
                    assignedById: order?.assignedBy?.id ?? "__none__",
                    assignedByLabel: order?.assignedBy?.name || order?.assignedBy?.email || "Sin asesor",
                    assigned: Boolean(order?.assignedBy?.id),
                };
            }),
        [effectiveOrderIds, orderById],
    );

    const visibleRows = useMemo(
        () =>
            previewRows.filter((row) => {
                const matchesCreator = creatorFilter.length === 0 || creatorFilter.includes(row.createdById);
                const matchesAssignedTo =
                    assignedToFilter.length === 0 ||
                    assignedToFilter.some((filter) =>
                        filter === "__assigned__" ? row.assigned : row.assignedById === filter,
                    );
                return matchesCreator && matchesAssignedTo;
            }),
        [assignedToFilter, creatorFilter, previewRows],
    );

    const executableSaleOrderIds = useMemo(
        () => visibleRows.map((row) => row.saleOrderId),
        [visibleRows],
    );

    const remoteCatalogValues = (values: string[]) => values.filter((value) => value && !value.startsWith("__"));

    const remoteFilters = useMemo(() => {
        const filters: SaleOrderSearchRule[] = [];
        const creatorValues = remoteCatalogValues(creatorFilter);
        if (creatorValues.length > 0) {
            filters.push({ field: "createdBy", operator: "in", values: creatorValues });
        }
        const assigneeValues = remoteCatalogValues(assignedToFilter);
        if (assigneeValues.length > 0) {
            filters.push({ field: "assignedBy", operator: "in", values: assigneeValues });
        }
        if (range.startDate && range.endDate) {
            filters.push({
                field: "createdAt",
                operator: "between",
                range: { start: getDateKey(range.startDate), end: getDateKey(range.endDate) },
            });
        }
        return filters;
    }, [assignedToFilter, creatorFilter, range.endDate, range.startDate]);

    const submitAssignment = () => {
        if (!selectedAdviserId || loading || loadingAdvisers || executableSaleOrderIds.length === 0) return;
        void onSubmit({ assignedBy: selectedAdviserId, saleOrderIds: executableSaleOrderIds });
    };

    const submitClearAssignment = () => {
        if (loading || loadingAdvisers || executableSaleOrderIds.length === 0) return;
        void onSubmit({ assignedBy: null, saleOrderIds: executableSaleOrderIds });
    };

    const toggleFilter = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
        setter((current) => {
            if (!value || value === "__all__") return [];
            return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        });
    };

    const removeFilter = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
        setter((current) => current.filter((item) => item !== value));
    };

    const optionLabelByValue = (options: Array<{ value: string; label: string }>, value: string) =>
        options.find((option) => option.value === value)?.label ?? value;

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

    const createSelectedAdviser = () => {
        if (!selectedUserId || savingAdviser) return;

        setSavingAdviser(true);
        setAddError("");
        void createAdviser(selectedUserId)
            .then((adviser) => {
                setAdvisers((current) => (current.some((item) => item.id === adviser.id) ? current : [...current, adviser]));
                setSelectedAdviserId(adviser.id);
                setAddAdviserOpen(false);
                setSelectedUserId("");
            })
            .catch((createError) => {
                setAddError(parseApiError(createError, "No se pudo anadir el asesor."));
            })
            .finally(() => setSavingAdviser(false));
    };

    return (
        <Modal
            open={open}
            title="Asignacion masiva"
            description={`Total: ${effectiveOrderIds.length}. Visibles: ${visibleRows.length}. A ejecutar: ${executableSaleOrderIds.length}.`}
            onClose={() => {
                if (loading) return;
                onClose();
            }}
            className="w-200"
            closeButtonClassName="rounded-sm"
            bodyClassName="px-4 py-4"
            footer={
                <div className="flex justify-end">
                    <SystemButton variant="outline" size="sm" className="rounded-md" onClick={onClose} disabled={loading}>
                        Cancelar
                    </SystemButton>

                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="rounded-lg border border-border bg-muted/10">
                    <div className="space-y-2 border-b border-border px-3 py-2">
                        <div className="flex">
                            <p className="text-md p-3 font-semibold text-zinc-900">Pedidos </p>
                            <div className="flex items-center gap-2">
                                <AnimatedDateRangePicker
                                    label="Rango de fechas"
                                    name="bulk-assign-date-range"
                                    startDate={range.startDate}
                                    endDate={range.endDate}
                                    onChange={setRange}
                                    disabled={loading || loadingRemoteOrders}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <FloatingSelect
                                label="Creado por"
                                name="bulk-assign-created-by-filter"
                                value={creatorFilter.at(-1) ?? "__all__"}
                                options={creatorOptions}
                                onChange={(value) => toggleFilter(value, setCreatorFilter)}
                                disabled={loading || loadingUsers}
                                searchable
                                panelWidthMode="min-trigger"
                            />
                            <FloatingSelect
                                label="Asignado a"
                                name="bulk-assign-assigned-to-filter"
                                value={assignedToFilter.at(-1) ?? "__all__"}
                                options={assignedToOptions}
                                onChange={(value) => toggleFilter(value, setAssignedToFilter)}
                                disabled={loading || loadingAdvisers}
                                searchable
                                panelWidthMode="min-trigger"
                            />

                        </div>
                        {creatorFilter.length > 0 || assignedToFilter.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {creatorFilter.map((item) => (
                                    <button
                                        key={`creator-${item}`}
                                        type="button"
                                        className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
                                        onClick={() => removeFilter(item, setCreatorFilter)}
                                    >
                                        {optionLabelByValue(creatorOptions, item)}
                                    </button>
                                ))}
                                {assignedToFilter.map((item) => (
                                    <button
                                        key={`assigned-${item}`}
                                        type="button"
                                        className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
                                        onClick={() => removeFilter(item, setAssignedToFilter)}
                                    >
                                        {optionLabelByValue(assignedToOptions, item)}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <div className="max-h-[420px] overflow-scroll scroll-area p-2">
                        {visibleRows.map((row) => (
                            <div key={row.saleOrderId} className="grid grid-cols-[1fr_auto] gap-2 rounded-md px-2 py-2 text-xs hover:bg-background">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="font-semibold text-zinc-900">{row.orderLabel}</p>
                                        {row.assigned ? (
                                            <span className="bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                                Asignado
                                            </span>
                                        ) : (
                                             <span className="bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                                                Sin asignar
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">Cliente: <span className="font-semibold">{row.clientLabel}</span></p>
                                    <p className="text-[11px] text-muted-foreground">Creado por: <span className="font-semibold">{row.createdByLabel}</span></p>
                                    <p className="text-[11px] text-muted-foreground">Asesor actual: <span className="font-semibold">{row.assignedByLabel}</span></p>
                                </div>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={loading || !onDiscardOrder}
                                            onClick={() => onDiscardOrder?.(row.saleOrderId)}
                                            className="flex h-12 w-12 items-center justify-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        </TooltipTrigger>
                                    <TooltipContent side="bottom">{`Descartar pedido ${row.orderLabel}`}</TooltipContent>
                                </Tooltip>
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

                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <FloatingSelect
                            label="Asesor"
                            name="bulk-assigned-by"
                            value={selectedAdviserId}
                            options={adviserOptions}
                            onChange={setSelectedAdviserId}
                            disabled={loading || loadingAdvisers || adviserOptions.length === 0}
                            searchable
                            panelWidthMode="min-trigger"
                            emptyMessage="Sin asesores"
                        />
                        {canAssignRoles ? (
                            <SystemButton
                                type="button"
                                size="icon"
                                className="h-10 w-10 rounded-md"
                                tooltip="Añadir asesor"
                                onClick={() => setAddAdviserOpen(true)}
                                disabled={loading || loadingAdvisers}
                            >
                                <Plus className="h-4 w-4" />
                            </SystemButton>
                        ) : null}
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <SystemButton
                            variant="danger"
                            size="sm"
                            className="rounded-md"
                            tooltip="Quitar asignados"
                            leftIcon={<UserX className="h-5 w-5" />}
                            onClick={submitClearAssignment}
                            disabled={loading || loadingAdvisers || selectedOrderIds.length === 0}
                            loading={loading && !selectedAdviserId}
                        />
                        <SystemButton
                            size="sm"
                            className="rounded-md"
                            tooltip="Asignar"
                            leftIcon={<UserCheck className="h-5 w-5" />}
                            onClick={submitAssignment}
                            disabled={!selectedAdviserId || loading || loadingAdvisers || executableSaleOrderIds.length === 0}
                            loading={loading && Boolean(selectedAdviserId)}
                        />
                    </div>
                </div>
            </div>

            <Modal
                open={addAdviserOpen}
                onClose={() => {
                    if (savingAdviser) return;
                    setAddAdviserOpen(false);
                }}
                title="Anadir usuario a lista de asesores"
                className="w-[440px]"
                closeButtonClassName="rounded-sm"
                bodyClassName="px-4 py-4"
            >
                <div className="space-y-4">
                    {addError ? (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{addError}</span>
                        </div>
                    ) : null}

                    <FloatingSelect
                        label="Usuario"
                        name="bulk-new-adviser-user"
                        value={selectedUserId}
                        options={addableUserOptions}
                        onChange={setSelectedUserId}
                        disabled={loadingUsers || savingAdviser}
                        searchable
                        panelWidthMode="min-trigger"
                        emptyMessage="Sin usuarios disponibles"
                    />

                    <div className="flex justify-end gap-2">
                        <SystemButton variant="outline" size="sm" className="rounded-md" onClick={() => setAddAdviserOpen(false)} disabled={savingAdviser}>
                            Cancelar
                        </SystemButton>
                        <SystemButton
                            size="sm"
                            className="rounded-md"
                            leftIcon={<Plus className="h-4 w-4" />}
                            disabled={!selectedUserId || savingAdviser || loadingUsers}
                            loading={savingAdviser}
                            onClick={createSelectedAdviser}
                        >
                            Anadir
                        </SystemButton>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
}
