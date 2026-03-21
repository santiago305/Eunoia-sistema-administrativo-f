import { FilterableSelectComposed as FS } from "@/components/SelectFilterableComposed";
import { Pencil, Plus } from "lucide-react";
import type { PaymentMethodSelectComposedProps } from "@/pages/payment-methods/types/paymentMethodSelect";

export function PaymentMethodSelectComposed({
  value,
  onChange,
  options,
  placeholder = "Seleccionar método",
  searchPlaceholder = "Buscar método...",
  className = "h-10",
  textSize = "text-xs",
  onCreate,
  onEdit,
  disabled,
  emptyLabel = "Sin resultados",
  renderOptionExtra,
}: PaymentMethodSelectComposedProps) {
  return (
    <div className="mt-2 flex items-center gap-1">
      <div className="flex-1">
        <FS.Root
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          className={className}
          textSize={textSize}
          disabled={disabled}
        >
          <FS.Trigger />
          <FS.Content>
            <FS.Search />
            <FS.Options emptyLabel={emptyLabel}>
              {options.map((option) => (
                <FS.Option
                  key={option.value}
                  value={option.value}
                  label={option.label}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{option.label}</span>
                    <div className="flex items-center gap-1">
                      {renderOptionExtra?.(option.value)}
                      {onEdit && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="rounded-md border border-black/10 bg-gray-100 px-2 py-1 text-[10px] text-black/70 hover:bg-black/[0.03]"
                          onClick={() => {
                            if (disabled) return;
                            onChange(option.value);
                            onEdit(option.value);
                          }}
                          onKeyDown={(event) => {
                            if (disabled) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onChange(option.value);
                              onEdit(option.value);
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </FS.Option>
              ))}
            </FS.Options>
          </FS.Content>
        </FS.Root>
      </div>
      {onCreate && (
        <button
          type="button"
          className="h-9 rounded-lg border border-black/10 bg-white px-3 text-xs hover:bg-black/[0.03] disabled:opacity-50"
          onClick={onCreate}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
