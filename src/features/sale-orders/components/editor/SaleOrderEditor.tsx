import { Plus, Save, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { sileo } from "sileo";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { FloatingSuggestOption } from "@/shared/components/components/FloatingSuggestInput";
import { getClientById, listClients } from "@/shared/services/clientService";
import type { AdviserOption } from "@/shared/services/adviserService";
import { listSubsidiaries } from "@/shared/services/agencyService";
import {
  getSaleOrderEditorCatalogs,
  saveSaleOrderWithClient,
} from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useCompany } from "@/shared/hooks/useCompany";
import type { SaleOrder } from "../../types/saleOrder";
import {
  SaleOrderItemsSection,
  type SaleOrderItemsSectionHandle,
} from "../modal-create/SaleOrderItemsSection";
import { SaleOrderClientSection } from "./SaleOrderClientSection";
import { SaleOrderInformationSection } from "./SaleOrderInformationSection";
import { SaleOrderPaymentCards } from "./SaleOrderPaymentCards";
import { SaleOrderShippingSection } from "./SaleOrderShippingSection";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";
import {
  buildEmptySaleOrderEditorForm,
  calculateSaleOrderTotals,
  mapSaleOrderToEditorForm,
  toSaveSaleOrderWithClientDto,
  type SaleOrderEditorForm,
} from "./saleOrderEditorForm";
import { normalizeMoney, parseDecimalInput } from "@/shared/utils/functionPurchases";
import {
  buildSaleOrderBankAccountOptions,
  buildSaleOrderPaymentMethodOptions,
  type SaleOrderPaymentSelectOption,
} from "../useSaleOrderPaymentOptions";

type Props = {
  mode: "create" | "edit";
  order: SaleOrder | null;
  onCancel: () => void;
  onSaved: (saleOrderId: string) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  onFooterChange?: (footer: ReactNode | null) => void;
};

const comparable = (form: SaleOrderEditorForm) =>
  JSON.stringify({
    ...form,
    shippingPhoto: form.shippingPhoto?.name ?? null,
    payments: form.payments.map((payment) => ({
      ...payment,
      photo: payment.photo?.name ?? null,
    })),
  });

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function SaleOrderEditor({
  mode,
  order,
  onCancel,
  onSaved,
  onDirtyChange,
  onFooterChange,
}: Props) {
  const { company } = useCompany();
  const companyId = company?.companyId ?? "";
  const [form, setForm] = useState<SaleOrderEditorForm>(() =>
    order
      ? mapSaleOrderToEditorForm(order)
      : buildEmptySaleOrderEditorForm(),
  );
  const [saving, setSaving] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [clientOptions, setClientOptions] = useState<FloatingSuggestOption[]>(
    [],
  );
  const [initialClientOptions, setInitialClientOptions] = useState<
    FloatingSuggestOption[]
  >([]);
  const [warehouseOptions, setWarehouseOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [workflowOptions, setWorkflowOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [sourceOptions, setSourceOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [subsidiaryOptions, setSubsidiaryOptions] = useState<
    Array<{ value: string; label: string; address?: string, cost?: number }>
  >([]);
  const [initialSubsidiaryOptions, setInitialSubsidiaryOptions] = useState<
    Array<{ value: string; label: string; address?: string, cost?: number }>
  >([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [subsidiarySearchQuery, setSubsidiarySearchQuery] = useState("");
  const [adviserOptions, setAdviserOptions] = useState<AdviserOption[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<
    SaleOrderPaymentSelectOption[]
  >(() => buildSaleOrderPaymentMethodOptions([]));
  const [bankAccountOptions, setBankAccountOptions] = useState<
    SaleOrderPaymentSelectOption[]
  >([]);
  const initialSnapshot = useRef("");
  const itemsSectionRef = useRef<SaleOrderItemsSectionHandle>(null);

  useEffect(() => {
    const next =
      mode === "edit" && order
        ? mapSaleOrderToEditorForm(order)
        : buildEmptySaleOrderEditorForm();
    setForm(next);
    initialSnapshot.current = comparable(next);
    onDirtyChange?.(false);
  }, [mode, onDirtyChange, order]);

  useEffect(() => {
    onDirtyChange?.(
      Boolean(initialSnapshot.current) &&
        comparable(form) !== initialSnapshot.current,
    );
  }, [form, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void getSaleOrderEditorCatalogs(companyId || undefined)
      .then((catalogs) => {
        if (cancelled) return;
        const nextClientOptions = catalogs.clients.map((client) => ({
          value: client.id,
          label: client.fullName,
          searchText: `${client.fullName} ${client.docNumber ?? ""}`.trim(),
          metaText: client.docNumber || undefined,
        }));
        setInitialClientOptions(nextClientOptions);
        setClientOptions(nextClientOptions);
        setWarehouseOptions(
          catalogs.warehouses.map((warehouse) => ({
            value: warehouse.warehouseId,
            label: warehouse.name,
          })),
        );
        const nextSubsidiaryOptions = catalogs.subsidiaries.map((subsidiary) => ({
          value: subsidiary.id,
          label: subsidiary.alias,
          address: subsidiary.address ?? undefined,
          cost: subsidiary.basePrice ?? undefined,
        }));
        setInitialSubsidiaryOptions(nextSubsidiaryOptions);
        setSubsidiaryOptions(nextSubsidiaryOptions);
        setSourceOptions(
          catalogs.sources.map((source) => ({
            value: source.id,
            label: source.name,
          })),
        );
        setWorkflowOptions(
          catalogs.workflows
            .filter((workflow) => workflow.isActive)
            .map((workflow) => ({
              value: workflow.id,
              label: workflow.name,
            })),
        );
        setAdviserOptions(catalogs.advisers);
        setPaymentMethodOptions(
          buildSaleOrderPaymentMethodOptions(catalogs.paymentMethods),
        );
        setBankAccountOptions(
          buildSaleOrderBankAccountOptions(catalogs.companyPaymentAccounts),
        );
      })
      .catch(() =>
        sileo.error({ title: "No se pudieron cargar los catálogos." }),
      )
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    const q = clientSearchQuery.trim();
    if (!q) {
      setClientOptions(initialClientOptions);
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      void listClients({ page: 1, limit: 25, q })
        .then((result) => {
          if (cancelled) return;
          setClientOptions(
            (result.items ?? []).map((client) => ({
              value: client.id,
              label: client.fullName,
              searchText: `${client.fullName} ${client.docNumber ?? ""}`.trim(),
              metaText: client.docNumber || undefined,
            })),
          );
        })
        .catch(() => {
          if (cancelled) return;
          setClientOptions([]);
          sileo.error({ title: "No se pudieron buscar clientes." });
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [clientSearchQuery, initialClientOptions]);

  useEffect(() => {
    const q = subsidiarySearchQuery.trim();
    if (!q) {
      setSubsidiaryOptions(initialSubsidiaryOptions);
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      void listSubsidiaries({ isActive: true, q })
        .then((result) => {
          if (cancelled) return;
          setSubsidiaryOptions(
            result.map((subsidiary) => ({
              value: subsidiary.id,
              label: subsidiary.alias,
              address: subsidiary.address ?? undefined,
              cost: subsidiary.basePrice ?? undefined,
            })),
          );
        })
        .catch(() => {
          if (cancelled) return;
          setSubsidiaryOptions([]);
          sileo.error({ title: "No se pudieron buscar sucursales." });
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [subsidiarySearchQuery, initialSubsidiaryOptions]);

  const selectClient = useCallback((clientId: string) => {
    setCatalogLoading(true);
    void getClientById(clientId)
      .then((client) =>
        setForm((current) => ({
          ...current,
          clientMode: "update",
          selectedClientId: client.id,
          clientData: {
            type: client.type,
            fullName: client.fullName,
            docType: client.docType,
            docNumber: client.docNumber,
            reference: client.reference ?? "",
            address: client.address ?? "",
            departmentId: client.departmentId,
            provinceId: client.provinceId,
            districtId: client.districtId,
            isActive: client.isActive,
            telephonesReplace: client.telephones.map((telephone) => ({
              id: telephone.id,
              number: telephone.number,
              isMain: telephone.isMain,
              isActive: telephone.isActive,
            })),
          },
        })),
      )
      .catch(() =>
        sileo.error({ title: "No se pudo cargar el cliente." }),
      )
      .finally(() => setCatalogLoading(false));
  }, []);

  const validationMessage = useMemo(() => {
    if (!form.workflowId) return "Selecciona el tipo de pedido.";
    if (!form.items.length) return "Añade al menos un producto o pack.";
    if (!form.clientData.fullName.trim()) return "Ingresa el nombre del cliente.";
    if (
      form.clientData.docType !== "NONE" &&
      !form.clientData.docNumber.trim()
    ) {
      return "Ingresa el documento del cliente.";
    }
    if (
      !form.clientData.departmentId ||
      !form.clientData.provinceId ||
      !form.clientData.districtId
    ) {
      return "Completa el ubigeo del cliente.";
    }
    if (
      form.payments.some(
        (payment) => !payment.method || Number(payment.amount) <= 0,
      )
    ) {
      return "Completa el método y monto de cada pago.";
    }
    return null;
  }, [form]);

  const totals = useMemo(
    () =>
      calculateSaleOrderTotals(
        form.items,
        form.deliveryCost,
        form.discount,
      ),
    [form.deliveryCost, form.discount, form.items],
  );

  const totalPaid = useMemo(
    () =>
      form.payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
    [form.payments],
  );
  const pendingAmount = Math.max(0, totals.total - totalPaid);

  const save = useCallback(async () => {
    if (validationMessage) {
      sileo.error({ title: validationMessage });
      return;
    }
    setSaving(true);
    try {
      const payload = toSaveSaleOrderWithClientDto(form);
      const paymentPhotos = new Map<string, File>();
      for (const payment of form.payments) {
        if (payment.photo) {
          paymentPhotos.set(payment.clientKey, payment.photo);
        }
      }
      const result = await saveSaleOrderWithClient(
        payload,
        {
          shippingPhoto: form.shippingPhoto,
          paymentPhotos,
        },
        mode === "edit" ? order?.id : null,
      );
      initialSnapshot.current = comparable(form);
      onDirtyChange?.(false);
      sileo.success({
        title:
          mode === "edit"
            ? "Pedido actualizado correctamente."
            : `Pedido creado: ${result.serie}-${result.correlative}`,
      });
      await onSaved(result.orderId);
    } catch (error) {
      sileo.error({
        title: parseApiError(error, "No se pudo guardar el pedido."),
      });
    } finally {
      setSaving(false);
    }
  }, [form, mode, onDirtyChange, onSaved, order?.id, validationMessage]);

  const footerActions = useMemo(
    () => (
      <div className="flex justify-end gap-2">
        <SystemButton
          type="button"
          variant="outline"
          leftIcon={<X className="h-4 w-4" />}
          onClick={onCancel}
          disabled={saving}
        >
          Cerrar
        </SystemButton>
        <SystemButton
          type="button"
          leftIcon={<Save className="h-4 w-4" />}
          onClick={() => void save()}
          disabled={saving || Boolean(validationMessage)}
          title={validationMessage ?? undefined}
        >
          {saving
            ? "Guardando..."
            : mode === "edit"
              ? "Actualizar pedido"
              : "Crear pedido"}
        </SystemButton>
      </div>
    ),
    [mode, onCancel, save, saving, validationMessage],
  );

  useEffect(() => {
    onFooterChange?.(footerActions);
  }, [footerActions, onFooterChange]);

  useEffect(() => {
    return () => onFooterChange?.(null);
  }, [onFooterChange]);

  return (
    <div className="flex min-h-full flex-col">
      {form.editPolicy.stockStatus === "RESERVED" ? (
        <div
          role="status"
          className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
        >
          Stock reservado. Los productos, cantidades y almacén están bloqueados.
        </div>
      ) : null}
      <div className="grid flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[minmax(0,1.75fr)_minmax(360px,1fr)]">
        <div className="space-y-3">
          <SaleOrderEditorSection
            title="Packs"
            requiredIndicator
            bodyClassName="max-h-[500px] min-h-[180px] py-4 overflow-hidden"
            actions={
              <div className="flex items-center justify-end gap-2">
                <SystemButton
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => itemsSectionRef.current?.openCreate()}
                  disabled={!form.editPolicy.productsEditable}
                >
                  Agregar Pack
                </SystemButton>
              </div>
            }
          >
            <SaleOrderItemsSection
              ref={itemsSectionRef}
              form={form}
              setForm={setForm}
              productsEditable={form.editPolicy.productsEditable}
              showActions={false}
            />
          </SaleOrderEditorSection>
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-1 gap-3 max-h-164 overflow-scroll scroll-area lg:grid-cols-2">
              <div>
                <SaleOrderEditorSection title="Resumen">
                  <dl className="grid gap-2 text-xs">
                     <div className="rounded-lg bg-background/80 px-3 py-2">
                      <FloatingInput
                        label="Descuento"
                        name="sale-order-discount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={String(form.discount ?? 0)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            discount: Math.max(
                              0,
                              normalizeMoney(parseDecimalInput(event.target.value)),
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="font-semibold tabular-nums">
                        {money.format(totals.subTotal)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                      <dt className="text-muted-foreground">Tarifa</dt>
                      <dd className="font-semibold tabular-nums">
                        {money.format(totals.deliveryCost)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {money.format(totals.total)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                      <dt className="text-muted-foreground">Total pagado</dt>
                      <dd className="font-semibold tabular-nums">
                        {money.format(totalPaid)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                      <dt className="text-muted-foreground">Pendiente</dt>
                      <dd className="font-semibold tabular-nums">
                        {money.format(pendingAmount)}
                      </dd>
                    </div>
                  </dl>
                </SaleOrderEditorSection>
              </div>
              <div>
                <SaleOrderPaymentCards
                  form={form}
                  setForm={setForm}
                  methodOptions={paymentMethodOptions}
                  bankAccountOptions={bankAccountOptions}
                />
                <SaleOrderEditorSection title="Nota">
                  <FloatingTextarea
                    label="Nota"
                    name="sale-order-note"
                    value={form.note}
                    rows={3}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                  />
                </SaleOrderEditorSection>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <SaleOrderClientSection
            form={form}
            setForm={setForm}
            clientOptions={clientOptions}
            onSelectClient={selectClient}
            onSearchClients={setClientSearchQuery}
            loading={catalogLoading}
          />
          <SaleOrderInformationSection
            form={form}
            setForm={setForm}
            workflowOptions={workflowOptions}
            warehouseOptions={warehouseOptions}
            sourceOptions={sourceOptions}
            adviserOptions={adviserOptions}
            onAdviserCreated={(adviser) =>
              setAdviserOptions((current) =>
                current.some((item) => item.id === adviser.id)
                  ? current
                  : [...current, adviser],
              )
            }
          />
          <SaleOrderShippingSection
            form={form}
            setForm={setForm}
            subsidiaryOptions={subsidiaryOptions}
            onSearchSubsidiaries={setSubsidiarySearchQuery}
          />
        </aside>
      </div>
    </div>
  );
}
