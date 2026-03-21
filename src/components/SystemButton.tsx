import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "ghost"
  | "link";

type ButtonSize = "sm" | "md" | "lg" | "icon";

type SystemButtonProps = {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:brightness-110 active:scale-[0.98] focus-visible:ring-primary/30",
  secondary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-[0.98] focus-visible:ring-zinc-300",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] focus-visible:ring-emerald-200",
  warning:
    "bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-[0.98] focus-visible:ring-amber-200",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98] focus-visible:ring-red-200",
  outline:
    "border border-black/10 bg-white text-black hover:bg-black/[0.03] active:scale-[0.98] focus-visible:ring-black/10",
  ghost:
    "bg-transparent text-black hover:bg-black/[0.04] active:scale-[0.98] focus-visible:ring-black/10",
  link:
    "bg-transparent text-primary underline-offset-4 hover:underline active:scale-[0.99] focus-visible:ring-primary/20 shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-sm rounded-xl",
  icon: "h-10 w-10 rounded-lg p-0",
};

export function SystemButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  type = "button",
  ...props
}: SystemButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium outline-none transition-all duration-200",
        "focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-60",
        "select-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}

      {!loading && leftIcon && (
        <span className="flex items-center justify-center">{leftIcon}</span>
      )}

      {children && <span>{children}</span>}

      {!loading && rightIcon && (
        <span className="flex items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
}