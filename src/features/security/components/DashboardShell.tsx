import { PageShell } from "@/shared/layouts/PageShell";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <PageShell className="bg-background" contentClassName="px-3 sm:px-4 py-4 sm:py-5">
        {children}
    </PageShell>
  );
}
