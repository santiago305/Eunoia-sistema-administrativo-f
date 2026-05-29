import { SystemButton } from "@/shared/components/components/SystemButton";
import { cn } from "./usersPage.helpers";

type UserPermissionsSummaryProps = {
  effectivePermissionsCount: number;
  allowedOverrides: number;
  deniedOverrides: number;
  onOpenPermissions: () => void;
};

export function UserPermissionsSummary({
  effectivePermissionsCount,
  allowedOverrides,
  deniedOverrides,
  onOpenPermissions,
}: UserPermissionsSummaryProps) {
  return (
    <section className="border-b border-zinc-100 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">Permisos directos</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {effectivePermissionsCount} efectivos · {allowedOverrides} extras · {deniedOverrides} denegados
          </p>
        </div>
        <SystemButton variant="outline" onClick={onOpenPermissions}>
          Administrar
        </SystemButton>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { label: "Efectivos", value: effectivePermissionsCount, tone: "from-primary/30" },
          { label: "Permitidos", value: allowedOverrides, tone: "from-emerald-300/40" },
          { label: "Denegados", value: deniedOverrides, tone: "from-red-300/40" },
        ].map((item) => (
          <div key={item.label} className="relative overflow-hidden rounded-sm border border-zinc-100 px-3 py-3">
            <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent", item.tone)} />
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-950">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
