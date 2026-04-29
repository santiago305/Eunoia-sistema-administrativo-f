import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/utils";

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

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput(
    {
      label,
      name,
      value,
      error,
      onChange,
      type = "text",
      disabled,
      className = "",
      defaultValue,
      id,
      readOnly,
      "aria-describedby": ariaDescribedBy,
      ...props
    }: FloatingInputProps,
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const [uncontrolledValue, setUncontrolledValue] = useState(
      String(defaultValue ?? ""),
    );
    const generatedId = useId();
    const inputId = id ?? `${name}-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;
    const isControlled = value !== undefined && value !== null;

    const resolvedValue = isControlled ? String(value) : uncontrolledValue;
    const hasValue = resolvedValue.trim().length > 0;
    const isPassword = type === "password";
    const isNumber = type === "number";
    const isReadOnly = Boolean(readOnly);
    const canTogglePassword = isPassword && !disabled;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            value={value}
            defaultValue={defaultValue}
            onChange={(event) => {
              if (!isControlled) {
                setUncontrolledValue(event.target.value);
              }
              onChange?.(event);
            }}
            disabled={disabled}
            readOnly={readOnly}
            placeholder=" "
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              "peer h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all",
              isPassword ? "pr-10" : "",
              isNumber
                ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                : "",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200/40"
                : "border-border focus:border-primary focus:ring-2 focus:ring-primary/30",
              disabled
                ? "cursor-not-allowed border-border/70 bg-muted text-muted-foreground"
                : "",
              isReadOnly
                ? "cursor-default bg-muted/40 text-foreground"
                : "",
              className,
            )}
            {...props}
          />

          <label
            htmlFor={inputId}
            className={cn(
              "pointer-events-none absolute left-3 px-1 text-xs transition-all duration-200",
              disabled ? "bg-muted" : isReadOnly ? "bg-muted/40" : "bg-background",
              hasValue ? "top-0 -translate-y-1/2 text-[11px]" : "top-1/2 -translate-y-1/2",
              disabled
                ? "text-muted-foreground/80 peer-focus:text-muted-foreground/80"
                : isReadOnly
                  ? "text-muted-foreground peer-focus:text-muted-foreground"
                  : error
                    ? "text-red-500 peer-focus:text-red-500"
                    : "text-muted-foreground peer-focus:text-primary",
              "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px]",
            )}
          >
            {label}
          </label>

          {isPassword ? (
            <button
              type="button"
              onClick={() => {
                if (!canTogglePassword) return;
                setShowPassword((prev) => !prev);
              }}
              disabled={!canTogglePassword}
              tabIndex={disabled ? -1 : 0}
              aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition",
                canTogglePassword ? "hover:text-foreground" : "cursor-not-allowed opacity-50",
              )}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>

        {error ? (
          <p id={errorId} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
