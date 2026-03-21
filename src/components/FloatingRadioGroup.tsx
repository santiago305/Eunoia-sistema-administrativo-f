type RadioOption<T extends string | boolean | number> = {
  label: string;
  value: T;
  description?: string;
};

type FloatingRadioGroupProps<T extends string | boolean | number> = {
  label?: string;
  name: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
};

export function FloatingRadioGroup<T extends string | boolean | number>({
  label,
  name,
  value,
  options,
  onChange,
  error,
  disabled = false,
  className = "",
  optionClassName = "",
}: FloatingRadioGroupProps<T>) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <p className="mb-2 text-sm font-medium text-black/70">{label}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const checked = option.value === value;

          return (
            <label
              key={String(option.value)}
              className={[
                "flex min-w-[140px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all",
                checked
                  ? "border-primary bg-primary/10"
                  : "border-black/10 bg-white hover:border-black/20",
                disabled ? "cursor-not-allowed opacity-60" : "",
                optionClassName,
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="sr-only"
              />

              <span
                className={[
                  "flex h-4 w-4 items-center justify-center rounded-full border transition-all",
                  checked ? "border-primary" : "border-black/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-full transition-all",
                    checked ? "bg-primary" : "bg-transparent",
                  ].join(" ")}
                />
              </span>

              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    checked ? "text-primary" : "text-black/80"
                  }`}
                >
                  {option.label}
                </span>

                {option.description && (
                  <span className="text-xs text-black/50">
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}