import { ReactNode } from "react";
import { FilterableSelectComposed as FS } from "@/components/SelectFilterableComposed";
import { Pencil, Plus } from "lucide-react";

type SelectOption = { value: string; label: string };

type PaymentMethodSelectComposedProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  textSize?: string;
  onCreate?: () => void;
  onEdit?: (value: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  renderOptionExtra?: (value: string) => ReactNode;
};

export function PaymentMethodSelectComposed({
  value,
  onChange,
  options,
  placeholder = "Seleccionar metodo",
  searchPlaceholder = "Buscar metodo...",
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
              {options.map((opt) => (
                <FS.Option key={opt.value} value={opt.value} label={opt.label}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{opt.label}</span>
                    <div className="flex items-center gap-1">
                      {renderOptionExtra?.(opt.value)}
                      {onEdit && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="rounded-md border border-black/10 bg-gray-100 px-2 py-1 text-[10px] 
                          text-black/70 hover:bg-black/[0.03]"
                          onClick={() => {
                            if (disabled) return;
                            onChange(opt.value);
                            onEdit(opt.value);
                          }}
                          onKeyDown={(e) => {
                            if (disabled) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onChange(opt.value);
                              onEdit(opt.value);
                            }
                          }}
                        >
                          <Pencil className="w-4 h-4 "/>
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
          className="h-9 rounded-lg border border-black/10 bg-white px-3 
          text-xs hover:bg-black/[0.03] disabled:opacity-50"
          onClick={onCreate}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
