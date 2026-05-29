import { ShieldCheck } from "lucide-react";
import { cn } from "./usersPage.helpers";

type UsersEmptyStateProps = {
  title: string;
  description: string;
  className?: string;
  size?: "sm" | "lg";
};

export function UsersEmptyState({
  title,
  description,
  className,
  size = "sm",
}: UsersEmptyStateProps) {
  return (
    <div className={cn("flex w-full items-center justify-center px-4 text-center", className)}>
      <div className="max-w-sm">
        <div
          className={cn(
            "mx-auto grid place-items-center rounded-sm bg-zinc-50 ring-1 ring-zinc-100",
            size === "lg" ? "h-14 w-14" : "h-12 w-12",
          )}
        >
          <ShieldCheck className={cn(size === "lg" ? "h-6 w-6" : "h-5 w-5", "text-zinc-400")} />
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}
