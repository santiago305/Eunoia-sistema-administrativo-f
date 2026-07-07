import { Eye, ImagePlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { env } from "@/env";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
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

type Props = {
  form: SaleOrderEditorForm;
  setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
  subsidiaryOptions: Array<{ value: string; label: string; address?:string }>;
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
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageUrl = useMemo(
    () =>
      form.shippingPhoto
        ? URL.createObjectURL(form.shippingPhoto)
        : resolveUrl(form.existingShippingPhotoUrl),
    [form.existingShippingPhotoUrl, form.shippingPhoto],
  );

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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 space-y-2">
        <FloatingSelect
          label="Sucursal"
          name="sale-order-subsidiary"
          value={form.agencySubsidiaryId}
          options={subsidiaryOptions}
          onChange={(agencySubsidiaryId) =>
            setForm((current) => ({
              ...current,
              agencySubsidiaryId,
              sendAddress: subsidiaryOptions.find((item) => item.value === agencySubsidiaryId)?.address ?? "",
            }))
          }
          searchable
        />
        <FloatingInput
          label="Clave"
          name="sale-order-send-code"
          value={form.sendCode}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              sendCode: event.target.value,
            }))
          }
        />
        <FloatingDatePicker
          label="Fecha de envío"
          name="sale-order-send-date"
          value={parseDateInputValue(form.sendDate)}
          onChange={(date) =>
            setForm((current) => ({
              ...current,
              sendDate: date ? toLocalDateKey(date) : "",
            }))
          }
        />
      </div>
      <div className="mt-2">
        <FloatingInput
          label="Dirección de sucursal"
          name="sale-order-send-address"
          type="text"
          value={form.sendAddress}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              sendAddress: event.target.value,
            }))
          }
        />
      </div>
      
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
