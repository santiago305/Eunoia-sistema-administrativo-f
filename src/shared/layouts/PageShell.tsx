import type { ReactNode } from "react";
import { cn } from "../lib/utils";


type PageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PageShell({ children, className, contentClassName }: PageShellProps) {
  return (
    <main className={cn("w-full min-h-screen bg-white text-black", className)}>
      <div className={cn("h-full max-w-[1600px] mx-auto p-4 flex flex-col gap-4", contentClassName)}>
        {children}
      </div>
    </main>
  );
}
