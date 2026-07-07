import { BadgePercent, Bike, Plus, Save, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { sileo } from "sileo";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { FloatingSuggestOption } from "@/shared/components/components/FloatingSuggestInput";
import { getClientById, listClients } from "@/shared/services/clientService";
import { listSubsidiaries } from "@/shared/services/agencyService";
import { listSources } from "@/shared/services/sourceService";
import { listWorkflows } from "@/shared/services/workflowService";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import {
  listAdvisers,
  type AdviserOption,
} from "@/shared/services/adviserService";
import { saveSaleOrderWithClient } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
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

type Props = {
  mode: "create" | "edit";
  order: SaleOrder | null;
  onCancel: () => void;
  onSaved: (saleOrderId: string) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
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
}: Props) {
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
    Array<{ value: string; label: string; address?: string }>
  >([]);
  const [adviserOptions, setAdviserOptions] = useState<AdviserOption[]>([]);
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
    void Promise.all([
      listClients({ page: 1, limit: 100 }),
      listActiveWarehouses({ page: 1, limit: 100 }),
      listSubsidiaries({ isActive: true }),
      listSources({ page: 1, limit: 100, isActive: "true" }),
      listWorkflows(),
      listAdvisers(),
    ])
      .then(
        ([
          clients,
          warehouses,
          subsidiaries,
          sources,
          workflows,
          advisers,
        ]) => {
          if (cancelled) return;
          setClientOptions(
            clients.items.map((client) => ({
              value: client.id,
              label: client.fullName,
              searchText: `${client.fullName} ${client.docNumber ?? ""}`.trim(),
              metaText: client.docNumber || undefined,
            })),
          );
          setWarehouseOptions(
            warehouses.items.map((warehouse) => ({
              value: warehouse.warehouseId,
              label: warehouse.name,
            })),
          );
          setSubsidiaryOptions(
            subsidiaries.map((subsidiary) => ({
              value: subsidiary.id,
              label: subsidiary.alias,
              address: subsidiary.address ?? undefined,
            })),
          );
          setSourceOptions(
            sources.items.map((source) => ({
              value: source.id,
              label: source.name,
            })),
          );
          setWorkflowOptions(
            workflows
              .filter((workflow) => workflow.isActive)
              .map((workflow) => ({
                value: workflow.id,
                label: workflow.name,
              })),
          );
          setAdviserOptions(advisers);
        },
      )
      .catch(() =>
        sileo.error({ title: "No se pudieron cargar los catálogos." }),
      )
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const save = async () => {
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
  };

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
            bodyClassName="max-h-[500px] min-h-[180px] py-4 overflow-hidden"
            actions={
              <div className="flex items-center justify-end gap-2">
                <SystemButton
                  size="sm"
                  variant="motion"
                  leftIcon={<Bike className="h-4 w-4" />}
                  onClick={() => itemsSectionRef.current?.openTariff()}
                >
                  Tarifa
                </SystemButton>
                <SystemButton
                  size="sm"
                  variant="warning"
                  leftIcon={<BadgePercent className="h-4 w-4" />}
                  onClick={() => itemsSectionRef.current?.openDiscount()}
                >
                  Descuento
                </SystemButton>
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
            <div className="grid grid-cols-1 gap-3 max-h-164 overflow-scroll scroll-area">
              <SaleOrderPaymentCards form={form} setForm={setForm} />
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <SaleOrderClientSection
            form={form}
            setForm={setForm}
            clientOptions={clientOptions}
            onSelectClient={selectClient}
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
          
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5">
            <div>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-[14px] font-semibold tabular-nums">
                {money.format(totals.subTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tarifa</dt>
              <dd className="text-[14px] font-semibold tabular-nums">
                {money.format(totals.deliveryCost)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Descuento</dt>
              <dd className="text-[14px] font-semibold tabular-nums text-rose-600">
                -{money.format(totals.discount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="text-[14px] font-semibold tabular-nums">
                {money.format(totals.total)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total pagado</dt>
              <dd className="text-[14px] font-semibold tabular-nums">
                {money.format(totalPaid)}
              </dd>
            </div>
          </dl>
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
        </div>
      </div>
    </div>
  );
}
