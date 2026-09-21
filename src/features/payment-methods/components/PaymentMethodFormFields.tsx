import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { PAYMENT_METHOD_OPTIONS, getPaymentMethodLabel, type PaymentMethodCode } from "../paymentMethodCatalog";

export type PaymentMethodFormState = {
  code: PaymentMethodCode;
  name: string;
  isActive: boolean;
  requiresVoucher: boolean;
};

type PaymentMethodFormFieldsProps = {
  form: PaymentMethodFormState;
  setForm: Dispatch<SetStateAction<PaymentMethodFormState>>;
  primaryColor: string;
  disabled?: boolean;
  codeDisabled?: boolean;
};

export function PaymentMethodFormFields({
  form,
  setForm,
  primaryColor,
  disabled,
  codeDisabled,
}: PaymentMethodFormFieldsProps) {
  const ringStyle = { "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)` } as CSSProperties;

  return (
    <div className="space-y-3">
      <label className="text-xs">
        Tipo de método
        <select
          className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
          style={ringStyle}
          value={form.code}
          onChange={(event) => {
            const code = event.target.value as PaymentMethodCode;
            setForm((prev) => ({
              ...prev,
              code,
              name: code === "OTHER" ? prev.name : getPaymentMethodLabel(code),
              requiresVoucher: code === "CASH" ? false : true,
            }));
          }}
          disabled={disabled || codeDisabled}
        >
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="text-xs">
        Nombre
        <input
          className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
          style={ringStyle}
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            setForm((prev) => ({
              ...prev,
              name,
               requiresVoucher: prev.code === "CASH" ? false : prev.requiresVoucher,
            }));
          }}
          disabled={disabled}
        />
      </label>
      <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-black/70">
        <input
          type="checkbox"
          checked={form.requiresVoucher}
          onChange={(event) => setForm((prev) => ({ ...prev, requiresVoucher: event.target.checked }))}
          className="h-4 w-4 accent-primary"
          disabled={disabled}
        />
        Voucher obligatorio
      </label>
    </div>
  );
}
