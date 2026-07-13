import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { cn } from "@/shared/lib/utils";

type MoneyCurrency = "PEN" | "USD" | string;

type MoneyInputProps = {
  label: string;
  name: string;
  currency?: MoneyCurrency;
  value?: string | number;
  error?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "onChange" | "placeholder" | "type"
>;

const currencyPrefix = (currency?: MoneyCurrency) => {
  if (currency === "USD") return "$";
  return "S/";
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    {
      label,
      name,
      currency = "PEN",
      value,
      error,
      onChange,
      disabled,
      className = "",
      defaultValue,
      id,
      readOnly,
      "aria-describedby": ariaDescribedBy,
      ...props
    }: MoneyInputProps,
    ref,
  ) {
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
    const isReadOnly = Boolean(readOnly);
    const prefix = currencyPrefix(currency);

    return (
      <div className="w-full">
        <div className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-2 top-1/2 z-10 flex h-7 min-w-10 -translate-y-1/2 items-center justify-center rounded-md border px-2 text-xs font-semibold tabular-nums",
              disabled || isReadOnly
                ? "border-border/70 bg-muted text-muted-foreground"
                : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            {prefix}
          </span>

          <input
            ref={ref}
            id={inputId}
            name={name}
            type="number"
            inputMode="decimal"
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
            placeholder="0.00"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              "peer h-10 w-full rounded-lg border bg-background py-2 pl-14 pr-3 text-right text-sm tabular-nums text-foreground outline-none transition-all",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0",
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
              "pointer-events-none absolute left-14 px-1 text-xs transition-all duration-200",
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
