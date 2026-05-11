import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type PageActionsRowProps = {
  children: ReactNode;
  className?: string;
};

export function PageActionsRow({ children, className }: PageActionsRowProps) {
  return <div className={cn("flex w-full flex-wrap items-center justify-end gap-2", className)}>{children}</div>;
}
