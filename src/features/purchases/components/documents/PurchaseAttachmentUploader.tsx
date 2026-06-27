import { useState } from "react";
import { Upload } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { Payment } from "@/features/purchases/types/purchase";
import {
  PurchaseAttachmentTypes,
  purchaseAttachmentTypeLabels,
  type PurchaseAttachmentType,
} from "@/features/purchases/types/purchase-attachment.types";

type Props = {
  payments?: Payment[];
  loading?: boolean;
  canUpload?: boolean;
  allowedTypes?: PurchaseAttachmentType[];
  onUpload: (params: {
    type: PurchaseAttachmentType;
    file: File;
    paymentId?: string | null;
    note?: string | null;
  }) => Promise<void> | void;
};

export function PurchaseAttachmentUploader({ payments = [], loading = false, canUpload = true, allowedTypes, onUpload }: Props) {
  const typeOptions = allowedTypes?.length ? allowedTypes : Object.keys(purchaseAttachmentTypeLabels) as PurchaseAttachmentType[];
  const [type, setType] = useState<PurchaseAttachmentType>(typeOptions[0] ?? PurchaseAttachmentTypes.INVOICE);
  const [paymentId, setPaymentId] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!file || !canUpload || loading) return;
    await onUpload({
      type,
      file,
      paymentId: paymentId || null,
      note: note.trim() || null,
    });
    setFile(null);
    setPaymentId("");
    setNote("");
  };

  return (
    <div className="rounded-md border border-black/10 bg-slate-50/70 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-black/45">Tipo</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as PurchaseAttachmentType)}
            disabled={!canUpload || loading}
            className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-black/75 outline-none focus:border-primary"
          >
            {typeOptions.map((value) => (
              <option key={value} value={value}>
                {purchaseAttachmentTypeLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-black/45">Pago asociado</span>
          <select
            value={paymentId}
            onChange={(event) => setPaymentId(event.target.value)}
            disabled={!canUpload || loading || payments.length === 0}
            className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-black/75 outline-none focus:border-primary"
          >
            <option value="">Sin asociar a pago</option>
            {payments.map((payment, index) => (
              <option key={payment.payDocId ?? index} value={payment.payDocId ?? ""}>
                {payment.method} · {payment.operationNumber || payment.date}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-black/20 bg-white px-3 text-xs text-black/60">
          <input
            type="file"
            className="sr-only"
            disabled={!canUpload || loading}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="truncate">{file ? file.name : "Seleccionar documento"}</span>
        </label>

        <SystemButton
          size="sm"
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={() => void submit()}
          disabled={!file || !canUpload || loading}
          className="h-11"
        >
          {loading ? "Subiendo..." : "Subir"}
        </SystemButton>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        disabled={!canUpload || loading}
        placeholder="Nota interna del documento"
        className="mt-2 min-h-16 w-full resize-y rounded-md border border-black/10 bg-white px-3 py-2 text-xs text-black/70 outline-none focus:border-primary"
      />
    </div>
  );
}

