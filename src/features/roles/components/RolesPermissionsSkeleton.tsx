import { PageShell } from "@/shared/layouts/PageShell";

export function RolesPermissionsSkeleton() {
  return (
    <PageShell contentClassName="gap-0">
      <div className="w-full space-y-4">
        <div className="h-16 animate-pulse bg-zinc-100/70" />
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="h-64 animate-pulse bg-zinc-100/70" />
          <div className="space-y-2">
            <div className="h-20 animate-pulse bg-zinc-100/70" />
            <div className="h-20 animate-pulse bg-zinc-100/70" />
            <div className="h-20 animate-pulse bg-zinc-100/70" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
