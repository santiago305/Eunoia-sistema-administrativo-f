import { useState } from "react";
import { FileUp, ReceiptText, Upload } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { Payment } from "@/features/purchases/types/purchase";
import {
  PurchaseAttachmentTypes,
  purchaseAttachmentTypeLabels,
  type PurchaseAttachmentType,
} from "@/features/purchases/types/purchase-attachment.types";
import {
  VoucherDocTypes,
  type VoucherDocType,
} from "@/features/purchases/types/purchaseEnums";

type Props = {
  payments?: Payment[];
  loading?: boolean;
  canUpload?: boolean;
  allowedTypes?: PurchaseAttachmentType[];
  fiscalMode?: boolean;
  onUpload: (params: {
    type: PurchaseAttachmentType;
    fiscalDocumentType?: VoucherDocType | null;
    file: File;
    paymentId?: string | null;
    note?: string | null;
  }) => Promise<void> | void;
};

const fiscalDocumentOptions: Array<{ value: VoucherDocType; label: string }> = [
  { value: VoucherDocTypes.FACTURA, label: "Factura" },
  { value: VoucherDocTypes.BOLETA, label: "Boleta" },
  { value: VoucherDocTypes.NOTA_VENTA, label: "Nota de venta" },
];

const paymentOptionLabel = (payment: Payment, index: number) => {
  const amount = typeof payment.amount === "number" ? ` · ${payment.currency} ${payment.amount.toFixed(2)}` : "";
  return `${payment.method || `Pago ${index + 1}`} · ${payment.operationNumber || payment.date}${amount}`;
};

export function PurchaseAttachmentUploader({ payments = [], loading = false, canUpload = true, allowedTypes, fiscalMode = false, onUpload }: Props) {
  const typeOptions = allowedTypes?.length ? allowedTypes : Object.keys(purchaseAttachmentTypeLabels) as PurchaseAttachmentType[];
  const [type, setType] = useState<PurchaseAttachmentType>(typeOptions[0] ?? PurchaseAttachmentTypes.INVOICE);
  const [fiscalDocumentType, setFiscalDocumentType] = useState<VoucherDocType>(VoucherDocTypes.FACTURA);
  const [paymentId, setPaymentId] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!file || !canUpload || loading) return;
    const resolvedPaymentId = fiscalMode && payments.length === 1
      ? payments[0]?.payDocId ?? ""
      : paymentId;
    if (fiscalMode && payments.length > 1 && !resolvedPaymentId) {
      setError("Selecciona el pago que corresponde a este comprobante.");
      return;
    }
    setError("");
    await onUpload({
      type: fiscalMode ? PurchaseAttachmentTypes.FISCAL_DOCUMENT : type,
      fiscalDocumentType: fiscalMode ? fiscalDocumentType : null,
      file,
      paymentId: resolvedPaymentId || null,
      note: fiscalMode ? null : note.trim() || null,
    });
    setFile(null);
    setPaymentId("");
    setNote("");
  };

  if (fiscalMode) {
    return (
      <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-black">Registrar comprobante fiscal</h3>
            <p className="mt-1 text-xs leading-5 text-black/55">
              Sube un solo archivo en PDF o imagen y asocialo al pago de esta compra.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Tipo de documento</span>
            <select
              value={fiscalDocumentType}
              onChange={(event) => setFiscalDocumentType(event.target.value as VoucherDocType)}
              disabled={!canUpload || loading}
              className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-black/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {fiscalDocumentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-black/50">Asociar pago</span>
            <select
              value={payments.length === 1 ? payments[0]?.payDocId ?? "" : paymentId}
              onChange={(event) => setPaymentId(event.target.value)}
              disabled={!canUpload || loading || payments.length <= 1}
              className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-black/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-black/45"
            >
              {payments.length === 0 ? <option value="">Sin pagos registrados</option> : null}
              {payments.length > 1 ? <option value="">Seleccionar pago</option> : null}
              {payments.map((payment, index) => (
                <option key={payment.payDocId ?? index} value={payment.payDocId ?? ""}>
                  {paymentOptionLabel(payment, index)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-black/20 bg-slate-50 px-3 text-sm text-black/65 hover:border-primary/40 hover:bg-primary/5">
            <FileUp className="h-4 w-4 shrink-0 text-black/45" />
            <input
              aria-label="Archivo fiscal"
              type="file"
              className="sr-only"
              disabled={!canUpload || loading}
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <span className="min-w-0 truncate">{file ? file.name : "Seleccionar PDF o imagen"}</span>
          </label>

          <SystemButton
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => void submit()}
            disabled={!file || !canUpload || loading}
            className="h-12"
          >
            {loading ? "Subiendo..." : "Subir"}
          </SystemButton>
        </div>

        {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
      </div>
    );
  }

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

