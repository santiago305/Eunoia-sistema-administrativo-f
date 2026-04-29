import type { CSSProperties, Dispatch, SetStateAction } from "react";

export type PaymentMethodFormState = {
  name: string;
  isActive: boolean;
};

type PaymentMethodFormFieldsProps = {
  form: PaymentMethodFormState;
  setForm: Dispatch<SetStateAction<PaymentMethodFormState>>;
  primaryColor: string;
  disabled?: boolean;
};

export function PaymentMethodFormFields({
  form,
  setForm,
  primaryColor,
  disabled,
}: PaymentMethodFormFieldsProps) {
  const ringStyle = { "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)` } as CSSProperties;

  return (
    <div className="space-y-3">
      <label className="text-xs">
        Nombre
        <input
          className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
          style={ringStyle}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
