import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Box, CalendarDays, FileText, History, Menu, Pencil, Truck, UserRound, Workflow } from "lucide-react";
import type { SaleOrder, SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import type { AvailableTransition } from "@/features/workflows/types/workflow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";
import { SaleOrderItemComponentsStockModal } from "@/features/sale-orders/components/modal-create/SaleOrderItemComponentsStockModal";
import { changeSaleOrderState, getAvailableSaleOrderTransitions } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { SaleOrderWorkflowHistoryModal } from "./SaleOrderWorkflowHistoryModal";
import { getClientById, updateClient } from "@/shared/services/clientService";
import type { Client, ClientForm } from "@/features/clients/types/client";
import { ClientFormModal } from "@/features/clients/components/ClientFormModal";

type Props = {
    order: SaleOrder | null;
    onEdit: (order: SaleOrder) => void;
    onOpenPdf: (order: SaleOrder) => void;
    onOpenPayments: (order: SaleOrder) => void;
    onOrderChanged: (orderId: string) => void | Promise<void>;
    showActions?: boolean;
};

function formatMoney(value?: number | null) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(value ?? 0));
}

function parseTransitionError(error: unknown) {
    if (typeof error !== "object" || error === null) return parseApiError(error);

    const response = (
        error as {
            response?: {
                status?: number;
                data?: {
                    message?: string;
                    failures?: Array<{ reason?: string; type?: string } | string>;
                };
            };
        }
    ).response;

    if (response?.status !== 422 || !Array.isArray(response.data?.failures)) {
        return parseApiError(error);
    }

    const reasons = response.data.failures.map((failure) => (typeof failure === "string" ? failure : (failure.reason ?? failure.type))).filter(Boolean);

    return reasons.length ? reasons.join(". ") : (response.data.message ?? parseApiError(error));
}

function EmptyState() {
    return (
        <div className="flex h-full min-h-[520px] w-full items-center justify-center px-4 text-center">
            <div>
                <div className="text-sm font-semibold text-zinc-950">Selecciona un pedido</div>
                <div className="mt-1 text-xs text-zinc-500">Aquí verás cliente, entrega, pagos, productos y workflow.</div>
            </div>
        </div>
    );
}

export function SaleOrderDetailsPanel({ order, onEdit, onOpenPdf, onOpenPayments, onOrderChanged, showActions = true }: Props) {
    const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
    const [loadingTransitionId, setLoadingTransitionId] = useState<string | null>(null);
    const [transitionError, setTransitionError] = useState("");
    const [workflowHistoryOpen, setWorkflowHistoryOpen] = useState(false);
    const [openItemDetail, setOpenItemDetail] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SaleOrderItemInput | null>(null);
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [clientLoading, setClientLoading] = useState(false);
    const [clientSaving, setClientSaving] = useState(false);
    const [clientEditError, setClientEditError] = useState("");

    const workflowId = order?.workflow?.id ?? order?.workflowId ?? null;
    const currentStateId = order?.currentState?.id ?? order?.currentStateId ?? null;

    const loadTransitions = useCallback(async () => {
        if (!showActions || !order?.id || !workflowId) {
            setTransitions([]);
            return;
        }

        try {
            const nextTransitions = await getAvailableSaleOrderTransitions(order.id);
            setTransitions(nextTransitions);
            setTransitionError("");
        } catch (error) {
            setTransitions([]);
            setTransitionError(parseApiError(error, "No se pudieron cargar las transiciones."));
        }
    }, [currentStateId, order?.id, workflowId, order?.deliveryDate, showActions]);

    useEffect(() => {
        if (showActions) void loadTransitions();
    }, [loadTransitions, showActions]);

    useEffect(() => {
        setOpenItemDetail(false);
        setSelectedItem(null);
        setWorkflowHistoryOpen(false);
        setTransitionError("");

        setClientModalOpen(false);
        setEditingClient(null);
        setClientLoading(false);
        setClientEditError("");
    }, [order?.id]);

    const executeTransition = useCallback(
        async (transition: AvailableTransition) => {
            if (!order?.id || !transition.available) return;

            setLoadingTransitionId(transition.id);
            setTransitionError("");

            try {
                await changeSaleOrderState(order.id, transition.id, {
                    source: "sale-order-details-actions",
                });

                await onOrderChanged(order.id);
                await loadTransitions();
            } catch (error) {
                setTransitionError(parseTransitionError(error));
            } finally {
                setLoadingTransitionId(null);
            }
        },
        [loadTransitions, onOrderChanged, order?.id],
    );

    const transitionByActionId = useMemo(() => {
        return new Map(transitions.map((transition) => [`transition:${transition.id}`, transition]));
    }, [transitions]);

    const actions = useMemo<ActionItem[]>(() => {
        if (!order) return [];

        const isFinal = Boolean(order.currentState?.isFinal);
        const isCancelled = order.currentState?.code?.toUpperCase() === "CANCELLED";
        const hideEdit = isFinal || isCancelled;

        const baseActions: ActionItem[] = [
            {
                id: "edit",
                label: "Editar",
                icon: <Pencil className="h-4 w-4" />,
                hidden: hideEdit,
                onClick: () => onEdit(order),
            },
            {
                id: "pdf",
                label: "PDF",
                icon: <FileText className="h-4 w-4" />,
                onClick: () => onOpenPdf(order),
            },
            {
                id: "payments",
                label: "Pagos",
                icon: <Banknote className="h-4 w-4" />,
                onClick: () => onOpenPayments(order),
            },
            {
                id: "workflow-history",
                label: "Historial del tipo",
                icon: <History className="h-4 w-4" />,
                onClick: () => setWorkflowHistoryOpen(true),
            },
        ];

        const transitionActions: ActionItem[] = transitions.map((transition) => ({
            id: `transition:${transition.id}`,
            label: transition.name,
            icon: <Workflow className="h-4 w-4" />,
            disabled: !transition.available || loadingTransitionId !== null,
            danger: transition.code?.toUpperCase() === "CANCEL",
            onClick: () => void executeTransition(transition),
        }));

        return [...baseActions, ...transitionActions];
    }, [executeTransition, loadingTransitionId, onEdit, onOpenPayments, onOpenPdf, order, transitions]);

    const openClientEdit = useCallback(async () => {
        if (!order?.client?.id) return;

        setClientEditError("");
        setEditingClient(null);
        setClientModalOpen(true);
        setClientLoading(true);

        try {
            const detail = await getClientById(order.client.id);

            setEditingClient({
                id: detail.id,
                type: detail.type,
                fullName: detail.fullName,
                docType: detail.docType,
                docNumber: detail.docNumber,
                departmentId: detail.departmentId,
                provinceId: detail.provinceId,
                districtId: detail.districtId,
                address: detail.address ?? null,
                reference: detail.reference ?? null,
                isActive: detail.isActive,
            });
        } catch (error) {
            setClientEditError(parseApiError(error, "No se pudo cargar el cliente."));
            setClientModalOpen(false);
            setEditingClient(null);
        } finally {
            setClientLoading(false);
        }
    }, [order?.client?.id]);

    const handleUpdateClient = useCallback(
        async (form: ClientForm) => {
            if (!order?.client?.id || !order.id) return;
            setClientSaving(true);
            setClientEditError("");
            try {
                await updateClient(order.client.id, {
                    type: form.type,
                    fullName: form.fullName.trim(),
                    docType: form.docType,
                    docNumber: form.docType === "NONE" ? "" : form.docNumber.trim(),
                    reference: form.docType === "NONE" ? form.reference.trim() : form.reference.trim() || undefined,
                    address: form.address.trim() || undefined,
                    departmentId: form.departmentId,
                    provinceId: form.provinceId,
                    districtId: form.districtId,
                    telephonesReplace: form.telephonesReplace?.length
                        ? form.telephonesReplace
                              .map((item) => ({
                                  id: item.id,
                                  number: item.number?.trim() || undefined,
                                  isMain: item.isMain,
                              }))
                              .filter((item) => Boolean(item.id || item.number))
                        : undefined,
                });
                await onOrderChanged(order.id);
                await loadTransitions();
                setClientModalOpen(false);
                setEditingClient(null);
            } catch (error) {
                setClientEditError(parseApiError(error, "No se pudo actualizar el cliente."));
            } finally {
                setClientSaving(false);
            }
        },
        [onOrderChanged, order?.client?.id, order?.id],
    );

    if (!order) return <EmptyState />;

    const code = `${order.serie ?? "-"}-${order.correlative ?? "-"}`;
    const stateName = order.currentState?.name ?? "Sin estado";
    const stateColor = order.currentState?.color ?? "#64748b";

    return (
        <>
            <div className="flex min-h-full w-full flex-col">
                <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 pb-2 backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="mt-1 flex items-center gap-2 text-md text-zinc-500">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stateColor }} />
                                {stateName}
                            </div>
                        </div>

                        {showActions ? (
                            <ActionsPopover
                                actions={actions}
                                columns={1}
                                compact
                                showLabels
                                triggerIcon={<Menu className="h-5 w-5" />}
                                triggerVariant="solid"
                                triggerLabel="Acciones del pedido"
                                popoverClassName="min-w-[260px]"
                                popoverBodyClassName="p-2"
                                renderAction={(action, helpers) => {
                                    const transition = transitionByActionId.get(action.id);
                                    const isTransition = Boolean(transition);

                                    if (!isTransition || !transition) {
                                        return (
                                            <button
                                                type="button"
                                                disabled={action.disabled}
                                                onClick={() => helpers.onAction(action)}
                                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 ${
                                                    action.className ?? ""
                                                }`}
                                            >
                                                <span className="text-zinc-500">{action.icon}</span>
                                                <span className="font-medium">{action.label}</span>
                                            </button>
                                        );
                                    }

                                    const failureText = transition.failures
                                        .map((failure) => failure.reason ?? failure.type)
                                        .filter(Boolean)
                                        .join(". ");

                                    return (
                                        <button
                                            type="button"
                                            disabled={action.disabled}
                                            title={failureText || undefined}
                                            onClick={() => helpers.onAction(action)}
                                            className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 ${
                                                action.danger ? "text-rose-700 hover:bg-rose-50" : "text-zinc-700"
                                            }`}
                                        >
                                            <span
                                                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor: transition.fromState?.color ?? "#64748b",
                                                }}
                                            />

                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-xs font-semibold">{transition.name}</span>

                                                <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                                                    {transition.fromState?.name ?? "Sin estado"} {transition.toState ? `→ ${transition.toState.name}` : "→ Acción global"}
                                                </span>

                                                {!transition.available && failureText ? <span className="mt-1 block text-[10px] text-rose-600">{failureText}</span> : null}
                                            </span>
                                        </button>
                                    );
                                }}
                            />
                        ) : null}
                    </div>

                    {transitionError ? <div className="mt-3 rounded-md bg-rose-50 p-2 text-xs text-rose-700">{transitionError}</div> : null}
                </div>

                <div className="grid gap-5 py-5">
                    <Section
                        title="Cliente"
                        icon={<UserRound className="h-4 w-4" />}
                        onEditClient={
                            order.client?.id
                                ? () => {
                                      void openClientEdit();
                                  }
                                : undefined
                        }
                    >
                        <Info label="Nombre" value={order.client?.fullName} />
                        <div className="grid grid-cols-2">
                            <Info label="Documento" value={order.client?.docNumber} />
                            <Info label="Telefono" value={order.client?.mainPhone} />
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <Info label="Departamento" value={order.client?.department?.name} />
                            <Info label="Provincia" value={order.client?.province?.name} />
                            <Info label="Distrito" value={order.client?.district?.name} />
                        </div>
                        <Info label="Referencia" value={order.client?.reference} />
                    </Section>
                    <Section title="Agenda y entrega" icon={<Truck className="h-4 w-4" />}>
                        <Info label="Fecha agenda" value={order.scheduleDate} icon={<CalendarDays className="h-3.5 w-3.5" />} />
                        <Info label="Fecha entrega" value={order.deliveryDate} icon={<CalendarDays className="h-3.5 w-3.5" />} />
                        <Info label="Enganche" value={order.source?.name} />
                        <Info label="Agencia/Dirección exacta" value={order.agencyDetail} />
                        <Info label="Código publicitario" value={order.advertisingCode} />
                        <Info label="Observación" value={order.observation} />
                        <Info label="Almacen" value={order.warehouse?.name} />
                        <Info label="Tarifa de envio" value={order.deliveryCost} />
                    </Section>

                    <Section title="Productos" icon={<Box className="h-4 w-4" />}>
                        {order.items?.length ? (
                            <div className="space-y-2 md:col-span-2">
                                {order.items.map((item: any) => (
                                    <div key={item.id} className="rounded-lg border border-zinc-200 p-3 text-xs">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-semibold text-zinc-950">{item.productName ?? item.sku?.name ?? item.description ?? "Producto"}</div>

                                                <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-zinc-500">
                                                    <span>Cant: {item.quantity ?? "-"}</span>
                                                    <span>P. Unit: {formatMoney(item.unitPrice)}</span>
                                                    <span>Total: {formatMoney(item.total)}</span>
                                                </div>
                                            </div>

                                            <SystemButton
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedItem(item as SaleOrderItemInput);
                                                    setOpenItemDetail(true);
                                                }}
                                            >
                                                Detalle
                                            </SystemButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-zinc-500">Sin productos registrados.</div>
                        )}
                    </Section>

                    <Section title="Detalle" icon={<FileText className="h-4 w-4" />}>
                        <Info label="Creado por" value={order.createdBy?.email} />
                        <Info label="Nota" value={order.note} />
                    </Section>
                </div>
            </div>

            <SaleOrderItemComponentsStockModal open={openItemDetail} onClose={() => setOpenItemDetail(false)} item={selectedItem} showStock={false} />
            <SaleOrderWorkflowHistoryModal open={workflowHistoryOpen} saleOrderId={order.id} saleOrderLabel={code} onClose={() => setWorkflowHistoryOpen(false)} />
            <ClientFormModal
                open={clientModalOpen}
                mode="edit"
                client={editingClient}
                loading={clientLoading || clientSaving}
                onClose={() => {
                    if (clientLoading || clientSaving) return;

                    setClientModalOpen(false);
                    setEditingClient(null);
                    setClientEditError("");
                }}
                onSubmit={(form) => {
                    void handleUpdateClient(form);
                }}
            />
            {clientEditError ? <div className="fixed bottom-4 right-4 z-50 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow">{clientEditError}</div> : null}
        </>
    );
}

function Section({ title, icon, children, onEditClient }: { title: string; icon: React.ReactNode; children: React.ReactNode; onEditClient?: () => void }) {
    return (
        <section className="border-b border-zinc-100 pb-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                {icon}
                {title}
                {onEditClient && (
                    <div className="ml-auto">
                        <SystemButton variant="ghost" size="sm" title="Editar cliente" leftIcon={<Pencil className="w-4 h-4" />} onClick={onEditClient} />
                    </div>
                )}
            </div>

            <div className="grid gap-2 md:grid-cols-2">{children}</div>
        </section>
    );
}

function Info({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
    return (
        <div className="rounded-sm bg-zinc-50 p-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                {icon}
                <span className="truncate">{value || "-"}</span>
            </div>
        </div>
    );
}
