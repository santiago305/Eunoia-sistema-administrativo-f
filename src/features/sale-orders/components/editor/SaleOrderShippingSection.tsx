import { Eye, ImagePlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { env } from "@/env";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSuggestInput } from "@/shared/components/components/FloatingSuggestInput";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import {
  parseDateInputValue,
  toLocalDateKey,
} from "@/shared/utils/functionPurchases";
import type { SaleOrderEditorForm } from "./saleOrderEditorForm";
import { markAttachmentRemoved } from "./saleOrderEditorForm";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";
import { SaleOrderTrackingCell } from "../sale-order/SaleOrderTrackingCell";

type Props = {
  form: SaleOrderEditorForm;
  setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
  subsidiaryOptions: Array<{
    value: string;
    label: string;
    address?: string;
    cost?: number;
    payableCost?: number;
    generatesPayable?: boolean;
  }>;
  onSearchSubsidiaries?: (query: string) => void | Promise<void>;
  tracking?: { preguide: boolean; prepared: boolean };
  canUpdatePreguide?: boolean;
  canUpdatePrepared?: boolean;
  onTrackingChange?: (field: "preguide" | "prepared", value: boolean) => Promise<void>;
};

const resolveUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  try {
    return new URL(value, env.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

export function SaleOrderShippingSection({
  form,
  setForm,
  subsidiaryOptions,
  onSearchSubsidiaries,
  tracking,
  canUpdatePreguide = false,
  canUpdatePrepared = false,
  onTrackingChange,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageUrl = useMemo(
    () =>
      form.shippingPhoto
        ? URL.createObjectURL(form.shippingPhoto)
        : resolveUrl(form.existingShippingPhotoUrl),
    [form.existingShippingPhotoUrl, form.shippingPhoto],
  );
  const inputClassName = "h-9 text-xs";


  return (
    <SaleOrderEditorSection title="Envío"
    actions={
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted">
          <ImagePlus className="h-4 w-4" />
          {imageUrl ? "Reemplazar foto" : "Añadir foto"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                shippingPhoto: event.target.files?.[0] ?? null,
              }))
            }
          />
        </label>
        {imageUrl ? (
          <>
            <SystemButton
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => setPreviewOpen(true)}
            >
              Ver foto
            </SystemButton>
            <SystemButton
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() =>
                setForm((current) => {
                  const next = markAttachmentRemoved(
                    current,
                    current.existingShippingAttachmentId,
                  );
                  return {
                    ...next,
                    shippingPhoto: null,
                    existingShippingPhotoUrl: null,
                    existingShippingAttachmentId: null,
                  };
                })
              }
            >
              Quitar
            </SystemButton>
          </>
        ) : null}
      </div>
    }>
      <div
        data-testid="sale-order-shipping-primary-grid"
        className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]"
      >
        <div
          data-testid="sale-order-shipping-agency"
          className={tracking ? "min-w-0" : "min-w-0 lg:col-span-2"}
        >
          <FloatingSuggestInput
            label="Agencia/Dirección"
            name="sale-order-subsidiary"
            className={inputClassName}
            value={form.agencyDetail}
            options={subsidiaryOptions}
            onChange={(agencyDetail) => {
              void onSearchSubsidiaries?.(agencyDetail);
              setForm((current) => ({
                ...current,
                agencyDetail,
              }));
            }}
            onOptionSelect={(option) =>
              setForm((current) => {
                const subsidiary = subsidiaryOptions.find((item) => item.value === option.value);
                const chargedCost = Math.max(0, Number(subsidiary?.cost ?? 0));
                const payableCost = Math.max(
                  0,
                  Number(subsidiary?.payableCost ?? chargedCost),
                );
                return {
                  ...current,
                  agencyDetail: option.label,
                  sendAddress: subsidiary?.address ?? current.sendAddress,
                  deliveryCost: chargedCost,
                  logisticsCost: payableCost,
                  logisticsGeneratesPayable: Boolean(subsidiary?.generatesPayable),
                };
              })
            }
            searchPlaceholder="Selecciona una agencia"
            emptyMessage="Sin agencias"
            panelWidthMode="min-trigger"
          />
        </div>
        {tracking ? (
          <div
            data-testid="sale-order-shipping-tracking"
            className="min-w-0 rounded-lg border border-border bg-background px-3 py-2"
          >
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
              Seguimiento del envío
            </p>
            <SaleOrderTrackingCell
              order={tracking}
              canUpdatePreguide={canUpdatePreguide}
              canUpdatePrepared={canUpdatePrepared}
              onChange={(field, value) => onTrackingChange?.(field, value) ?? Promise.resolve()}
              variant="editor"
            />
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 space-y-2 mt-3">
        <FloatingInput
          label="Tarifa cobrada al cliente"
          className={inputClassName}
          name="sale-order-delivery-charge"
          value={form.deliveryCost}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              deliveryCost: Number(event.target.value) || 0,
              logisticsCost: current.logisticsCost || Number(event.target.value) || 0,
            }))
          }
        />
        <FloatingInput
          label="Costo a pagar a agencia"
          className={inputClassName}
          name="sale-order-logistics-cost"
          value={form.logisticsCost}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              logisticsCost: Number(event.target.value) || 0,
            }))
          }
        />
        <FloatingDatePicker
          label="Fecha de envío"
          name="sale-order-send-date"
          className={inputClassName}
          value={parseDateInputValue(form.sendDate)}
          onChange={(date) =>
            setForm((current) => ({
              ...current,
              sendDate: date ? toLocalDateKey(date) : "",
            }))
          }
        />
        <FloatingInput
          label="Clave"
          name="sale-order-send-code"
          className={inputClassName}
          value={form.sendCode}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              sendCode: event.target.value,
            }))
          }
        />
      </div>
      {form.logisticsGeneratesPayable ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Generara cuenta por pagar logistica
        </p>
      ) : null}
      
      <ImagePreviewModal
        open={previewOpen}
        images={imageUrl ? [imageUrl] : []}
        currentIndex={0}
        onClose={() => setPreviewOpen(false)}
        altPrefix="Foto de envío"
      />
    </SaleOrderEditorSection>
  );
}
