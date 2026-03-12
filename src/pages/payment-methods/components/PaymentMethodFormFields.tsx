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
  const ringStyle = { "--tw-ring-color": `${primaryColor}33` } as CSSProperties;

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

      <label className="text-xs">
        Estado
        <select
          className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-xs bg-white outline-none focus:ring-2"
          style={ringStyle}
          value={form.isActive ? "active" : "inactive"}
          onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
          disabled={disabled}
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </label>
    </div>
  );
}
