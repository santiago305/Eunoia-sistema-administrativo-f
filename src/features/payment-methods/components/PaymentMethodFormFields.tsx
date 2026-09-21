import type { Dispatch, SetStateAction } from "react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  type PaymentMethodCode,
} from "../paymentMethodCatalog";

export type PaymentMethodFormState = {
  code: PaymentMethodCode;
  name: string;
  isActive: boolean;
  requiresVoucher: boolean;
};

type PaymentMethodFormFieldsProps = {
  form: PaymentMethodFormState;
  setForm: Dispatch<SetStateAction<PaymentMethodFormState>>;
  disabled?: boolean;
  codeDisabled?: boolean;
};

export function PaymentMethodFormFields({
  form,
  setForm,
  disabled,
  codeDisabled,
}: PaymentMethodFormFieldsProps) {
  return (
    <div className="space-y-4">
      <FloatingSelect
        label="Tipo de método"
        name="payment-method-code"
        value={form.code}
        options={PAYMENT_METHOD_OPTIONS.map((option) => ({ ...option }))}
        onChange={(value) => {
          const code = value as PaymentMethodCode;
          setForm((previous) => ({
            ...previous,
            code,
            name: code === "OTHER" ? previous.name : getPaymentMethodLabel(code),
            requiresVoucher: code !== "CASH",
          }));
        }}
        disabled={disabled || codeDisabled}
        requiredIndicator
      />

      <FloatingInput
        label="Nombre"
        name="payment-method-name"
        value={form.name}
        onChange={(event) => {
          const name = event.target.value;
          setForm((previous) => ({
            ...previous,
            name,
            requiresVoucher:
              previous.code === "CASH" ? false : previous.requiresVoucher,
          }));
        }}
        disabled={disabled}
        requiredIndicator
      />

      <label
        htmlFor="payment-method-requires-voucher"
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/35 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
      >
        <Checkbox
          id="payment-method-requires-voucher"
          checked={form.requiresVoucher}
          onCheckedChange={(checked) =>
            setForm((previous) => ({
              ...previous,
              requiresVoucher: checked === true,
            }))
          }
          disabled={disabled || form.code === "CASH"}
          aria-label="Voucher obligatorio"
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block font-medium">Voucher obligatorio</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
            Solicita una evidencia al registrar pagos con este método.
          </span>
        </span>
      </label>
    </div>
  );
}
