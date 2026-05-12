import type { ReactNode } from "react";
import { cn } from "../lib/utils";


type PageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollArea?: boolean;
};

export function PageShell({
  children,
  className,
  contentClassName,
  scrollArea = true,
}: PageShellProps) {
  return (
    <main
      className={cn(
        "w-full min-h-0 flex-1 bg-white text-black",
        scrollArea && "scroll-area overflow-y-auto",
        className,
      )}
    >

      <div className={cn("h-full max-w-[1700px] mx-auto p-4 flex flex-col gap-4", contentClassName)}>
        {children}
      </div>
    </main>
  );
}
