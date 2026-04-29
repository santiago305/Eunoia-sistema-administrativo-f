import { Pencil, Plus } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { PaymentMethodSelectComposedProps } from "@/features/payment-methods/types/paymentMethodSelect";

export function PaymentMethodSelectComposed(props: PaymentMethodSelectComposedProps) {
  const {
    label = "Método de pago",
    value,
    onChange,
    options,
    searchPlaceholder = "Buscar método...",
    className = "h-10",
    textSize = "text-xs",
    onCreate,
    onEdit,
    disabled,
    emptyLabel = "Sin resultados",
  } = props;

  const selectClassName = [className, textSize].filter(Boolean).join(" ");

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <FloatingSelect
          label={label}
          name="payment-method-select"
          value={value}
          options={options}
          searchable
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyLabel}
          onChange={onChange}
          disabled={disabled}
          className={selectClassName}
        />
      </div>

      {onEdit && (
        <SystemButton
          variant="outline"
          size="icon"
          onClick={() => {
            if (!value || disabled) return;
            onEdit(value);
          }}
          disabled={!value || disabled}
          title="Editar método"
        >
          <Pencil className="h-4 w-4" />
        </SystemButton>
      )}

      {onCreate && (
        <SystemButton
          variant="outline"
          size="icon"
          onClick={onCreate}
          disabled={disabled}
          title="Nuevo método"
        >
          <Plus className="h-4 w-4" />
        </SystemButton>
      )}
    </div>
  );
}
