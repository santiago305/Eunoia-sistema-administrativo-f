import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { PageShell } from "@/shared/layouts/PageShell";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import { createClient, getClientById, listClients, updateClient } from "@/shared/services/clientService";
import { listSubsidiaries } from "@/shared/services/agencyService";
import { errorResponse } from "@/shared/common/utils/response";
import { useCompany } from "@/shared/hooks/useCompany";
import { sileo } from "sileo";
import { buildEmptySaleOrderForm } from "@/features/sale-orders/utils/saleOrderForm";
import type { CreateSaleOrderDto } from "@/features/sale-orders/types/saleOrder";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";
import { createSaleOrder, fetchSaleOrderById, getSaleOrderPdf, updateSaleOrder } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { validateSaleOrderForm } from "@/features/sale-orders/utils/saleOrderValidation";
import { SaleOrderItemsSection } from "@/features/sale-orders/components/modal-create/SaleOrderItemsSection";
import { SaleOrderPaymentsModal } from "@/features/sale-orders/components/modal-create/SaleOrderPaymentsModal";
import { FloatingSuggestInput } from "@/shared/components/components/FloatingSuggestInput";
import { listSources } from "@/shared/services/sourceService";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { ClientFormModal } from "@/features/clients/components/ClientFormModal";
import type { Client, ClientForm } from "@/features/clients/types/client";
import { listWorkflows } from "@/shared/services/workflowService";

type Props = {
    inModal?: boolean;
    onClose?: () => void;
    orderId?: string | null;
    onSaved?: () => void;
};

const PRIMARY = "hsl(var(--primary))";

const dateOnlyToDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function SaleOrderCreate({ inModal = false, onClose, orderId, onSaved }: Props) {
    const showFeedbackRef = useRef((msg: { type?: string; message?: string }) => {
        if ((msg?.type ?? "error") === "success") sileo.success({ title: msg?.message ?? "Operación correcta" });
        else sileo.error({ title: msg?.message ?? "Ocurrió un error" });
    });

    const { hasCompany } = useCompany();
    const companyActionDisabled = !hasCompany;

    const [loading, setLoading] = useState(false);
    const [clientLoading, setClientLoading] = useState(false);
    const [openPayments, setOpenPayments] = useState(false);
    const [openClientModal, setOpenClientModal] = useState(false);
    const [clientModalMode, setClientModalMode] = useState<"create" | "edit">("create");
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form, setForm] = useState<CreateSaleOrderDto>(() => buildEmptySaleOrderForm());

    const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [clientOptions, setClientOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [agencyOptions, setAgencyOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [subsidiaryBasePrices, setSubsidiaryBasePrices] = useState<Record<string, number>>({});
    const [sourceOptions, setSourceOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [workflowOptions, setWorkflowOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfOrderId, setPdfOrderId] = useState<string | null>(null);

    const isEdit = Boolean(orderId);

    const loadClientsOptions = useCallback(async () => {
        const clients = await listClients({ page: 1, limit: 100 });

        setClientOptions(
            (clients.items ?? []).map((c) => ({
                value: c.id,
                label: `${c.fullName} ${c.docNumber ? `(${c.docNumber})` : ""}`.trim(),
            })),
        );
    }, []);

    useEffect(() => {
        if (!orderId) {
            setForm(buildEmptySaleOrderForm());
            return;
        }

        const loadOrder = async () => {
            setLoading(true);

            try {
                const order = await fetchSaleOrderById(orderId);

                setForm({
                    workflowId: order.workflow?.id ?? order.workflowId ?? "",
                    warehouseId: order.warehouse?.id ?? "",
                    clientId: order.client?.id ?? "",
                    agencyDetail: order.agencyDetail ?? undefined,
                    sourceId: order.source?.id ?? undefined,
                    scheduleDate: order.scheduleDate ?? toLocalDateKey(new Date()),
                    deliveryDate: order.deliveryDate ?? undefined,
                    deliveryCost: Number(order.deliveryCost ?? 0),
                    subTotal: Number(order.subTotal ?? 0),
                    total: Number(order.total ?? 0),
                    note: order.note ?? "",
                    advertisingCode: order.advertisingCode ?? null,
                    observation: order.observation ?? null,
                    items: (order.items ?? []).map((item) => ({
                        id: item.id,
                        quantity: Number(item.quantity ?? 0),
                        unitPrice: Number(item.unitPrice ?? 0),
                        total: Number(item.total ?? 0),
                        description: item.description ?? "",
                        referencePackId: item.referencePackId ?? undefined,
                        components: (item.components ?? []).map((component) => {
                            const skuId = component.skuId ?? component.sku?.id ?? "";
                            const { skuLabel, skuCode, skuImage } = deriveSkuPresentation(component.sku ?? null, skuId);

                            return {
                                id: component.id,
                                skuId,
                                quantity: Number(component.quantity ?? 0),
                                unitPrice: Number(component.unitPrice ?? 0),
                                total: Number(component.total ?? 0),
                                referencePackItemId: component.referencePackItemId ?? undefined,
                                skuLabel,
                                skuCode,
                                skuImage,
                            };
                        }),
                    })),
                    payments: (order.payments ?? []).map((payment) => ({
                        method: payment.method ?? "",
                        amount: Number(payment.amount ?? 0),
                        bankAccountId: payment.bankAccount?.id ?? undefined,
                        date: payment.date ? payment.date.slice(0, 10) : undefined,
                        operationNumber: payment.operationNumber ?? "",
                        note: payment.note ?? "",
                    })),
                    currentState: order.currentState?.name,
                });
            } catch (err) {
                showFeedbackRef.current(errorResponse(parseApiError(err, "No se pudo cargar el pedido.")));
            } finally {
                setLoading(false);
            }
        };

        void loadOrder();
    }, [orderId]);

    useEffect(() => {
        const load = async () => {
            try {
                const [warehouses, subsidiaries, sources, workflows] = await Promise.all([
                    listActiveWarehouses({ page: 1, limit: 100 }),
                    listSubsidiaries({ isActive: true }),
                    listSources({ page: 1, limit: 100, isActive: "true" }),
                    listWorkflows(),
                ]);

                setWarehouseOptions((warehouses.items ?? []).map((w) => ({ value: w.warehouseId, label: w.name })));
                setAgencyOptions(
                    subsidiaries.map((subsidiary) => ({
                        value: subsidiary.id,
                        label: [subsidiary.alias, subsidiary.address].filter(Boolean).join(" - "),
                    })),
                );
                setSubsidiaryBasePrices(Object.fromEntries(subsidiaries.map((subsidiary) => [subsidiary.id, Number(subsidiary.basePrice ?? 0)])));
                setSourceOptions((sources.items ?? []).map((s) => ({ value: s.id, label: s.name })));
                setWorkflowOptions(
                    workflows
                        .filter((workflow) => workflow.isActive)
                        .map((workflow) => ({
                            value: workflow.id,
                            label: workflow.name,
                        })),
                );

                await loadClientsOptions();
            } catch {
                showFeedbackRef.current(errorResponse("No se pudieron cargar catálogos para pedidos."));
            }
        };

        void load();
    }, [loadClientsOptions]);

    const handleCreateClient = useCallback(
        async (clientForm: ClientForm) => {
            setClientLoading(true);

            try {
                const created = await createClient({
                    type: clientForm.type,
                    fullName: clientForm.fullName.trim(),
                    docType: clientForm.docType,
                    docNumber: clientForm.docType === "NONE" ? "" : clientForm.docNumber.trim(),
                    reference: clientForm.docType === "NONE" ? clientForm.reference.trim() : clientForm.reference.trim() || undefined,
                    address: clientForm.address.trim() || undefined,
                    departmentId: clientForm.departmentId,
                    provinceId: clientForm.provinceId,
                    districtId: clientForm.districtId,
                    isActive: clientForm.isActive,
                    telephonesReplace: clientForm.telephonesReplace?.length
                        ? clientForm.telephonesReplace
                              .filter((item) => !item.id && Boolean(item.number?.trim()))
                              .map((item) => ({
                                  number: item.number!.trim(),
                                  isMain: item.isMain,
                              }))
                        : undefined,
                });
                const clientId = created?.id ?? "";

                if (clientId) {
                    setForm((prev) => ({
                        ...prev,
                        clientId,
                    }));

                    void getClientById(clientId)
                        .then((client) => {
                            const label = `${client.fullName} ${client.docNumber ? `(${client.docNumber})` : client.reference ? `(${client.reference})` : ""}`.trim();

                            setClientOptions((prev) => {
                                if (prev.some((option) => option.value === clientId)) return prev;
                                return [{ value: clientId, label }, ...prev];
                            });
                        })
                        .catch(() => {
                            // Si falla, igual queda seleccionado por id; el listado se refresca abajo.
                        });
                }

                setOpenClientModal(false);
                showFeedbackRef.current({ type: "success", message: "Cliente creado correctamente." });
                void loadClientsOptions();
            } catch (err) {
                showFeedbackRef.current(errorResponse(parseApiError(err, "No se pudo crear el cliente.")));
            } finally {
                setClientLoading(false);
            }
        },
        [loadClientsOptions],
    );

    const openClientEdit = useCallback(async () => {
        if (!form.clientId || clientLoading) return;

        setClientLoading(true);
        try {
            const client = await getClientById(form.clientId);
            setEditingClient(client);
            setClientModalMode("edit");
            setOpenClientModal(true);
        } catch (err) {
            showFeedbackRef.current(errorResponse(parseApiError(err, "No se pudo cargar el cliente.")));
        } finally {
            setClientLoading(false);
        }
    }, [clientLoading, form.clientId]);

    const handleUpdateClient = useCallback(
        async (clientForm: ClientForm) => {
            if (!editingClient?.id) return;

            setClientLoading(true);
            try {
                await updateClient(editingClient.id, {
                    type: clientForm.type,
                    fullName: clientForm.fullName.trim(),
                    docType: clientForm.docType,
                    docNumber: clientForm.docType === "NONE" ? "" : clientForm.docNumber.trim(),
                    reference: clientForm.docType === "NONE" ? clientForm.reference.trim() : clientForm.reference.trim() || undefined,
                    address: clientForm.address.trim() || undefined,
                    departmentId: clientForm.departmentId,
                    provinceId: clientForm.provinceId,
                    districtId: clientForm.districtId,
                    telephonesReplace: clientForm.telephonesReplace?.length
                        ? clientForm.telephonesReplace
                              .map((item) => ({
                                  id: item.id,
                                  number: item.number?.trim() || undefined,
                                  isMain: item.isMain,
                              }))
                              .filter((item) => Boolean(item.id || item.number))
                        : undefined,
                });
                await loadClientsOptions();
                setOpenClientModal(false);
                setEditingClient(null);
                showFeedbackRef.current({ type: "success", message: "Cliente actualizado correctamente." });
            } catch (err) {
                showFeedbackRef.current(errorResponse(parseApiError(err, "No se pudo actualizar el cliente.")));
            } finally {
                setClientLoading(false);
            }
        },
        [editingClient?.id, loadClientsOptions],
    );

    const save = useCallback(async (): Promise<boolean> => {
        const validation = validateSaleOrderForm(form);

        if (!validation.ok) {
            showFeedbackRef.current(errorResponse(validation.message));
            return false;
        }
        setLoading(true);
        try {
            const subTotal = (form.items ?? []).reduce((acc, item) => acc + (item.total ?? 0), 0);
            const total = subTotal + (form.deliveryCost ?? 0);
            const payload = { ...form, subTotal, total };

            const res = isEdit && orderId ? await updateSaleOrder(orderId, payload) : await createSaleOrder(payload);

            showFeedbackRef.current({
                type: "success",
                message: isEdit ? "Pedido actualizado correctamente." : `Pedido creado: ${res.serie}-${res.correlative}`,
            });

            const nextOrderId = res.orderId ?? orderId;

            if (nextOrderId) {
                setPdfOrderId(nextOrderId);
                setPdfOpen(true);
            }

            onSaved?.();
            return true;
        } catch (err) {
            const message = parseApiError(err);

            if (message.includes("No hay serie activa para pedidos")) {
                showFeedbackRef.current(errorResponse(`${message} Configura/seed la serie SALE_ORDER para este almacén.`));
            } else if (message.includes("Stock insuficiente")) {
                showFeedbackRef.current(errorResponse(message));
            } else if (message.includes("Fecha de pago inválida")) {
                showFeedbackRef.current(errorResponse("Fecha de pago inválida. Revisa payments[].date."));
            } else {
                showFeedbackRef.current(errorResponse(message));
            }

            return false;
        } finally {
            setLoading(false);
        }
    }, [form, isEdit, orderId, onSaved]);

    const content = (
        <>
            <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
                <div className={`py-4 grid grid-cols-1 gap-3 lg:grid-cols-[4.5fr_2.5fr] ${inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]"}`}>
                    <SaleOrderItemsSection form={form} setForm={setForm} />

                    <aside className="overflow-hidden flex flex-col border-0 border-black/10 lg:border-l">
                        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5 scroll-area">
                            <div className="grid grid-cols-[1fr_38px_38px] gap-1">
                                <FloatingSelect
                                    label="Cliente"
                                    name="client"
                                    className="text-black/70 text-xs"
                                    value={form.clientId}
                                    onChange={(value) => setForm((prev) => ({ ...prev, clientId: value }))}
                                    options={clientOptions}
                                    searchable
                                    searchPlaceholder="Buscar cliente..."
                                    emptyMessage="Sin clientes"
                                />

                                <SystemButton
                                    size="icon"
                                    type="button"
                                    className="h-10 w-10"
                                    title="Crear cliente"
                                    disabled={clientLoading}
                                    onClick={() => {
                                        setEditingClient(null);
                                        setClientModalMode("create");
                                        setOpenClientModal(true);
                                    }}
                                >
                                    <Plus className="h-5 w-5" />
                                </SystemButton>
                                <SystemButton
                                    size="icon"
                                    type="button"
                                    className="h-10 w-10"
                                    title="Editar cliente"
                                    leftIcon={<Pencil className="h-5 w-5" />}
                                    disabled={!form.clientId || clientLoading}
                                    onClick={() => void openClientEdit()}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <FloatingSelect
                                    label="Tipo"
                                    name="workflow"
                                    className="text-black/70 text-xs"
                                    value={form.workflowId}
                                    onChange={(value) => setForm((prev) => ({ ...prev, workflowId: value }))}
                                    options={workflowOptions}
                                    searchable
                                    searchPlaceholder="Buscar tipo..."
                                    emptyMessage="Sin tipos activos"
                                />
                                <FloatingSelect
                                    label="Almacén"
                                    name="warehouse"
                                    className="text-black/70 text-xs"
                                    value={form.warehouseId}
                                    onChange={(value) => setForm((prev) => ({ ...prev, warehouseId: value }))}
                                    options={warehouseOptions}
                                    searchable
                                    searchPlaceholder="Buscar almacén..."
                                    emptyMessage="Sin almacenes"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FloatingSelect
                                    label="Enganche"
                                    name="source"
                                    className="text-black/70 text-xs"
                                    value={form.sourceId ?? ""}
                                    onChange={(value) => setForm((prev) => ({ ...prev, sourceId: value || undefined }))}
                                    options={sourceOptions}
                                    searchable
                                    searchPlaceholder="Buscar enganche..."
                                    emptyMessage="Sin enganches"
                                />
                                <FloatingSuggestInput
                                    label="Agencia/Dirección"
                                    name="agencyDetail"
                                    className="text-black text-xs"
                                    value={form.agencyDetail ?? ""}
                                    onChange={(text) => setForm((prev) => ({ ...prev, agencyDetail: text.trim() ? text : undefined }))}
                                    onOptionSelect={(option) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            agencyDetail: option.label,
                                            deliveryCost: subsidiaryBasePrices[option.value] ?? 0,
                                        }))
                                    }
                                    options={agencyOptions}
                                    searchPlaceholder="Selecciona una sucursal"
                                    emptyMessage="Sin sucursales"
                                    panelWidthMode="min-trigger"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FloatingInput
                                    label="Código publicitario"
                                    name="advertisingCode"
                                    className="text-black text-xs"
                                    value={form.advertisingCode ?? ""}
                                    onChange={(e) => setForm((prev) => ({ ...prev, advertisingCode: e.target.value || null }))}
                                />

                                <FloatingInput
                                    label="Observación Jose"
                                    name="observation"
                                    className="text-black text-xs"
                                    value={form.observation ?? ""}
                                    onChange={(e) => setForm((prev) => ({ ...prev, observation: e.target.value || null }))}
                                />
                            </div>
                            <FloatingInput label="Nota" name="note" className="text-black text-xs" value={form.note ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <FloatingDatePicker
                                    label="Fecha agenda"
                                    name="schedule-date"
                                    className="text-black/70 text-xs"
                                    value={dateOnlyToDate(form.scheduleDate)}
                                    onChange={(date) => setForm((prev) => ({ ...prev, scheduleDate: date ? toLocalDateKey(date) : "" }))}
                                    clearable={false}
                                />

                                <FloatingDatePicker
                                    label="Fecha entrega"
                                    name="delivery-date"
                                    className="text-black/70 text-xs"
                                    value={dateOnlyToDate(form.deliveryDate)}
                                    onChange={(date) => setForm((prev) => ({ ...prev, deliveryDate: date ? toLocalDateKey(date) : undefined }))}
                                />
                            </div>
                        </div>

                        <div className="p-3 flex justify-end gap-3">
                            <SystemButton variant="outline" onClick={() => onClose?.()}>
                                Cerrar
                            </SystemButton>

                            <SystemButton
                                style={{
                                    backgroundColor: PRIMARY,
                                    borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                                }}
                                leftIcon={<Plus className="h-4 w-4" />}
                                disabled={companyActionDisabled || loading || !(form.items ?? []).length}
                                onClick={() => setOpenPayments(true)}
                            >
                                {isEdit ? "Actualizar pedido" : "Crear pedido"}
                            </SystemButton>
                        </div>
                    </aside>
                </div>
            </div>

            <ClientFormModal
                open={openClientModal}
                mode={clientModalMode}
                client={editingClient}
                onClose={() => {
                    if (clientLoading) return;
                    setOpenClientModal(false);
                    setEditingClient(null);
                }}
                onSubmit={(clientForm) => {
                    if (clientModalMode === "edit") void handleUpdateClient(clientForm);
                    else void handleCreateClient(clientForm);
                }}
                loading={clientLoading}
            />

            <PdfViewerModal
                open={pdfOpen}
                title="PDF del pedido"
                iframeTitle="PDF del pedido"
                loadWhen={Boolean(pdfOrderId)}
                getPdf={() => {
                    if (!pdfOrderId) {
                        return Promise.reject(new Error("Pedido no encontrado."));
                    }

                    return getSaleOrderPdf(pdfOrderId);
                }}
                onClose={() => {
                    setPdfOpen(false);
                    setPdfOrderId(null);
                    setOpenPayments(false);
                    onClose?.();
                }}
            />

            {openPayments && (
                <SaleOrderPaymentsModal
                    open={openPayments}
                    onClose={() => setOpenPayments(false)}
                    form={form}
                    setForm={setForm}
                    onSave={save}
                    saveDisabled={companyActionDisabled || loading || !(form.items ?? []).length}
                />
            )}
        </>
    );

    if (inModal) return content;

    return <PageShell>{content}</PageShell>;
}
