import { useEffect, useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { MoneyInput } from "@/shared/components/components/MoneyInput";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { getDateKey } from "@/shared/components/components/date-picker/dateUtils";
import { registerRecurringPurchasePayment } from "@/shared/services/recurringPurchaseService";
import { uploadPurchaseAttachment } from "@/shared/services/purchaseAttachmentService";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { getPaymentMethodOptions } from "@/features/payments/paymentView";
import { PurchaseAttachmentTypes } from "../../types/purchase-attachment.types";
import type { RecurringPurchase } from "../../types/recurring-purchase.types";

type Props = {
  open: boolean;
  item: RecurringPurchase | null;
  onClose: () => void;
  onSaved: () => void;
  canUploadEvidence?: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export function RecurringPurchasePaymentModal({
  open,
  item,
  onClose,
  onSaved,
  canUploadEvidence = true,
}: Props) {
  const [methodRecords, setMethodRecords] = useState<PaymentMethod[] | null>(null);
  const [method, setMethod] = useState("");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [operationNumber, setOperationNumber] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAllPaymentMethods().then(setMethodRecords).catch(() => setMethodRecords(null));
  }, [open]);

  const methodOptions = useMemo(() => {
    if (methodRecords?.length) {
      return methodRecords.map((record) => ({
        value: record.name,
        label: record.name,
        requiresVoucher: record.requiresVoucher,
      }));
    }

    return getPaymentMethodOptions(null);
  }, [methodRecords]);

  const selectedMethod = methodOptions.find((option) => option.value === method);
  const requiresVoucher =
    selectedMethod && "requiresVoucher" in selectedMethod
      ? selectedMethod.requiresVoucher
      : undefined;
  const shouldShowEvidence = canUploadEvidence && requiresVoucher !== false;

  useEffect(() => {
    if (!open || !item) return;
    setAmount(String(item.amount ?? ""));
    setDate(today());
    setOperationNumber("");
    setNote("");
    setFile(null);
    setMethod("");
  }, [item, open]);

  useEffect(() => {
    if (!open || methodOptions.length === 0) return;
    setMethod((prev) => {
      if (prev && methodOptions.some((option) => option.value === prev)) return prev;
      return methodOptions[0]?.value || "";
    });
  }, [methodOptions, open]);

  if (!open || !item) return null;

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (!method || !Number.isFinite(numericAmount) || numericAmount <= 0) return;

    setSaving(true);
    try {
      const result = await registerRecurringPurchasePayment(item.recurringPurchaseTemplateId, {
        method,
        date,
        currency: item.currency,
        amount: numericAmount,
        operationNumber: operationNumber.trim() || undefined,
        note: note.trim() || undefined,
      });

      if (shouldShowEvidence && file && result.purchaseId && result.paymentId) {
        await uploadPurchaseAttachment({
          purchaseId: result.purchaseId,
          paymentId: result.paymentId,
          type: PurchaseAttachmentTypes.PAYMENT_PROOF,
          file,
          note: "Comprobante de pago recurrente",
        });
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago recurrente"
      description={item.name}
      className="w-full max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FloatingSelect
            label="Método"
            name="method"
            value={method}
            onChange={setMethod}
            options={methodOptions}
          />

          <FloatingDatePicker
            label="Fecha"
            name="paymentDate"
            value={parseDateKey(date)}
            onChange={(nextDate) => setDate(nextDate ? getDateKey(nextDate) : today())}
            clearable={false}
          />

          <MoneyInput
            min="0.01"
            step="0.01"
            label="Monto"
            name="amount"
            currency={item.currency}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <FloatingInput
            label="Operación"
            name="operationNumber"
            value={operationNumber}
            onChange={(event) => setOperationNumber(event.target.value)}
          />
        </div>

        {shouldShowEvidence ? (
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-muted/35 px-3 text-xs text-foreground/70 hover:border-primary/40 hover:bg-primary/5">
            <FileUp className="h-4 w-4 shrink-0 text-foreground/45" />
            <input
              aria-label="Comprobante"
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <span className="min-w-0 truncate">
              {file ? file.name : "Seleccionar comprobante"}
            </span>
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-xs font-medium text-foreground/70">
          Nota
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </label>

        <div className="flex justify-end gap-2">
          <SystemButton variant="ghost" onClick={onClose}>
            Cancelar
          </SystemButton>
          <SystemButton onClick={() => void handleSubmit()} loading={saving}>
            Guardar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
