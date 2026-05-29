import { Trash2 } from "lucide-react";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn } from "@/shared/lib/utils";
import {
  normalizeMoney,
  parseDateInputValue,
  parseDecimalInput,
  toLocalDateKey,
} from "@/shared/utils/functionPurchases";
import type { SaleOrderPaymentInput } from "@/features/sale-orders/types/saleOrder";

type Props = {
  payment: SaleOrderPaymentInput;
  methodOptions: Array<{ value: string; label: string }>;
  bankAccountOptions: Array<{ value: string; label: string }>;
  maxAmount?: number;
  className?: string;
  onChange: (patch: Partial<SaleOrderPaymentInput>) => void;
  onRemove?: () => void;
  showRemove?: boolean;
};

export function SaleOrderPaymentEditor({
  payment,
  methodOptions,
  bankAccountOptions,
  maxAmount,
  className,
  onChange,
  onRemove,
  showRemove = true,
}: Props) {
  return (
    <div className={cn("rounded-xl border border-black/10 p-3 space-y-2", className)}>
      <div className="grid grid-cols-[1.5fr_1fr_50px] gap-2">
        <FloatingDatePicker
          label="Fecha"
          name="payment-date"
          value={parseDateInputValue(payment.date)}
          onChange={(date) => onChange({ date: date ? toLocalDateKey(date) : undefined })}
          className="h-9 text-xs"
        />
        <FloatingInput
          label="Monto"
          name="payment-amount"
          type="number"
          min={0}
          max={maxAmount}
          value={String(payment.amount ?? "")}
          onChange={(e) => {
            const next = normalizeMoney(parseDecimalInput(e.target.value));
            const bounded =
              typeof maxAmount === "number" ? Math.min(Math.max(0, next), maxAmount) : Math.max(0, next);
            onChange({ amount: bounded });
          }}
          className="h-9 text-xs"
        />
        <div className="flex justify-end">
          {showRemove ? (
            <SystemButton
              variant="danger"
              size="icon"
              className="h-9 w-9"
              onClick={onRemove}
              title="Eliminar pago"
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FloatingSelect
          label="Metodo"
          name="payment-method"
          value={payment.method}
          onChange={(value) => onChange({ method: value })}
          options={methodOptions}
          searchable={false}
          className="h-9 text-xs"
        />
        <FloatingSelect
          label="Cuenta"
          name="payment-bank-account"
          value={payment.bankAccountId ?? ""}
          onChange={(value) => onChange({ bankAccountId: value || undefined })}
          options={bankAccountOptions}
          searchable
          searchPlaceholder="Buscar cuenta..."
          emptyMessage="Sin cuentas"
          className="h-9 text-xs"
        />
        <FloatingInput
          label="Numero de operacion"
          name="payment-operation"
          value={payment.operationNumber ?? ""}
          onChange={(e) => onChange({ operationNumber: e.target.value })}
          className="h-9 text-xs"
        />
      </div>
      <FloatingInput
        label="Nota"
        name="payment-note"
        value={payment.note ?? ""}
        onChange={(e) => onChange({ note: e.target.value })}
        className="h-9 text-xs"
      />
    </div>
  );
}

