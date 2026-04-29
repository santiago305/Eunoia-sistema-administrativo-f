import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type HeadedSize = "sm" | "md" | "lg" | "xl";
type HeadedAlign = "start" | "center" | "end";

type HeadedProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  size?: HeadedSize;
  align?: HeadedAlign;
  showAccent?: boolean;
  accentClassName?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

const sizeStyles: Record<HeadedSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

const subtitleSizeStyles: Record<HeadedSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
  xl: "text-base",
};

const alignStyles: Record<HeadedAlign, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

export function Headed({
  title,
  subtitle,
  as: TitleTag = "h1",
  size = "lg",
  align = "start",
  showAccent = true,
  accentClassName,
  className,
  titleClassName,
  subtitleClassName,
}: HeadedProps) {
  return (
    <div className={cn("flex items-center gap-3", alignStyles[align], className)}>
      {showAccent && (
        <span className={cn("h-6 w-1 rounded-full bg-primary", accentClassName)} />
      )}

      <div className={cn("min-w-0", align === "center" && "flex flex-col items-center")}>
        <TitleTag
          className={cn(
            "font-semibold tracking-tight text-gray-900",
            sizeStyles[size],
            titleClassName
          )}
        >
          {title}
        </TitleTag>
        {subtitle && (
          <p className={cn("mt-1 text-gray-500", subtitleSizeStyles[size], subtitleClassName)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
