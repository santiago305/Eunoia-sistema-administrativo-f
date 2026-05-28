import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { PageShell } from "@/shared/layouts/PageShell";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import { listClients } from "@/shared/services/clientService";
import { listAgencies } from "@/shared/services/agencyService";
import { errorResponse } from "@/shared/common/utils/response";
import { useCompany } from "@/shared/hooks/useCompany";
import { sileo } from "sileo";
import { buildEmptySaleOrderForm } from "@/features/sale-orders/utils/saleOrderForm";
import { type CreateSaleOrderDto } from "@/features/sale-orders/types/saleOrder";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";
import { createSaleOrder } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { validateSaleOrderForm } from "@/features/sale-orders/utils/saleOrderValidation";
import { SaleOrderItemsSection } from "@/features/sale-orders/components/SaleOrderItemsSection";
import { SaleOrderPaymentsModal } from "@/features/sale-orders/components/SaleOrderPaymentsModal";
import { FloatingSuggestInput } from "@/shared/components/components/FloatingSuggestInput";
import { listSources } from "@/shared/services/sourceService";

type Props = {
  inModal?: boolean;
  onClose?: () => void;
};

const PRIMARY = "hsl(var(--primary))";

const dateOnlyToDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function SaleOrderCreate({ inModal = false, onClose }: Props) {
  const showFeedbackRef = useRef((msg: { type?: string; message?: string }) => {
    if ((msg?.type ?? "error") === "success") sileo.success({ title: msg?.message ?? "Operación correcta" });
    else sileo.error({ title: msg?.message ?? "Ocurrió un error" });
  });

  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;

  const [loading, setLoading] = useState(false);
  const [openPayments, setOpenPayments] = useState(false);
  const [form, setForm] = useState<CreateSaleOrderDto>(() => buildEmptySaleOrderForm());

  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [clientOptions, setClientOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [agencyOptions, setAgencyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sourceOptions, setSourceOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [warehouses, clients, agencies, sources] = await Promise.all([
          listActiveWarehouses({ page: 1, limit: 100 }),
          listClients({ page: 1, limit: 100 }),
          listAgencies({ page: 1, limit: 100, isActive: "true" }),
          listSources({ page: 1, limit: 100, isActive: "true" }),
        ]);

        setWarehouseOptions((warehouses.items ?? []).map((w) => ({ value: w.warehouseId, label: w.name })));
        setClientOptions((clients.items ?? []).map((c) => ({ value: c.id, label: `${c.fullName} ${c.docNumber ? 
          `(${c.docNumber})` : `(${c.reference})`}` })));
        setAgencyOptions((agencies.items ?? []).map((a) => ({ value: a.id, label: a.name })));
        setSourceOptions((sources.items ?? []).map((s) => ({ value: s.id, label: s.name })));
      } catch {
        showFeedbackRef.current(errorResponse("No se pudieron cargar catálogos para pedidos."));
      }
    };
    void load();
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const validation = validateSaleOrderForm(form);
    if (!validation.ok) {
      showFeedbackRef.current(errorResponse(validation.message));
      return false;
    }

    setLoading(true);
    try {
      const res = await createSaleOrder(form);
      showFeedbackRef.current({ type: "success", message: `Pedido creado: ${res.serie}-${res.correlative}` });
      onClose?.();
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
  }, [form, onClose]);

  const content = (
    <>
      <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
        <div
          className={`py-4 grid grid-cols-1 gap-3 lg:grid-cols-[4.5fr_2.5fr] ${
            inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]"
          }`}
        >
          <SaleOrderItemsSection form={form} setForm={setForm} />
          <aside className="overflow-hidden flex flex-col border-0 border-black/10 lg:border-l">
            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5">
              <div className="space-y-1">
                <FloatingSelect
                  label="Cliente"
                  name="client"
                  value={form.clientId}
                  onChange={(value) => setForm((prev) => ({ ...prev, clientId: value }))}
                  options={clientOptions}
                  searchable
                  searchPlaceholder="Buscar cliente..."
                  emptyMessage="Sin clientes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FloatingSelect
                  label="Almacén"
                  name="warehouse"
                  value={form.warehouseId}
                  onChange={(value) => setForm((prev) => ({ ...prev, warehouseId: value }))}
                  options={warehouseOptions}
                  searchable
                  searchPlaceholder="Buscar almacén..."
                  emptyMessage="Sin almacenes"
                />
                <FloatingSelect
                  label="Enganche"
                  name="source"
                  value={form.sourceId ?? ""}
                  onChange={(value) => setForm((prev) => ({ ...prev, sourceId: value || undefined }))}
                  options={sourceOptions}
                  searchable
                  searchPlaceholder="Buscar enganche..."
                  emptyMessage="Sin enganches"
                />
              </div>
              <FloatingSuggestInput
                label="Agencia/Dirección exacta"
                name="agencyDetail"
                value={form.agencyDetail ?? ""}
                onChange={(text) =>
                  setForm((prev) => ({ ...prev, agencyDetail: text.trim() ? text : undefined }))
                }
                options={agencyOptions}
                emptyMessage="Sin agencias"
              />
              <div className="grid grid-cols-2 gap-3">
                <FloatingDatePicker
                  label="Fecha agenda"
                  name="schedule-date"
                  value={dateOnlyToDate(form.scheduleDate)}
                  onChange={(date) => setForm((prev) => ({ ...prev, scheduleDate: date ? toLocalDateKey(date) : "" }))}
                  clearable={false}
                />
                <FloatingDatePicker
                  label="Fecha entrega"
                  name="delivery-date"
                  value={dateOnlyToDate(form.deliveryDate)}
                  onChange={(date) =>
                    setForm((prev) => ({ ...prev, deliveryDate: date ? toLocalDateKey(date) : undefined }))
                  }
                />
              </div>
              <FloatingInput
                label="Nota"
                name="note"
                value={form.note ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>

            <div className="p-3 flex justify-end grid-cols-2  gap-3">
              <SystemButton
                variant="outline"
                onClick={() => onClose?.()}
              >
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
                Crear pedido
              </SystemButton>
            </div>
          </aside>
        </div>
      </div>

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
