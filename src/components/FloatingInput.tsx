import { forwardRef, useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";

type FloatingInputProps = {
  label: string;
  name: string;
  value?: string | number;
  error?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "onChange" | "placeholder"
>;

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(function FloatingInput({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  disabled,
  className = "",
  defaultValue,
  ...props
}: FloatingInputProps, ref) {
  const [showPassword, setShowPassword] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ""));

  const resolvedValue = useMemo(() => {
    if (value !== undefined && value !== null) return String(value);
    return uncontrolledValue;
  }, [uncontrolledValue, value]);

  const hasValue = resolvedValue.trim().length > 0;
  const isPassword = type === "password";

  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={ref}
          id={name}
          name={name}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => {
            if (value === undefined) {
              setUncontrolledValue(event.target.value);
            }
            onChange?.(event);
          }}
          disabled={disabled}
          placeholder=" "
          className={[
            "peer h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-all",
            isPassword ? "pr-10" : "", // espacio para el icono 👁️
            error
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : "border-black/20 focus:border-primary focus:ring-2 focus:ring-primary/30",
            disabled ? "cursor-not-allowed bg-black/5 text-black/50" : "",
            className,
          ].join(" ")}
          {...props}
        />

        {/* LABEL */}
        <label
          htmlFor={name}
          className={[
            "pointer-events-none absolute left-3 bg-white px-1 text-sm transition-all duration-200",
            hasValue
              ? "top-0 -translate-y-1/2 text-[11px]"
              : "top-1/2 -translate-y-1/2 text-sm",
            error
              ? "text-red-500 peer-focus:text-red-500"
              : "text-black/50 peer-focus:text-primary",
            "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px]",
          ].join(" ")}
        >
          {label}
        </label>

        {/* 👁️ TOGGLE PASSWORD */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/50 hover:text-black"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});
