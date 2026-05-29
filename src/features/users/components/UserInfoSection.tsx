import { formatDateTimeLabel } from "../utils/dateFormat";
import type { User } from "../types/users.types";

type UserInfoSectionProps = {
  selected: User;
  isSuperAdmin: boolean;
};

export function UserInfoSection({ selected, isSuperAdmin }: UserInfoSectionProps) {
  return (
    <>
      <div className="grid divide-y divide-zinc-100 border-y border-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: "Telefono", value: selected.phone || "-" },
          { label: "Creado", value: formatDateTimeLabel(selected.createdAt) },
          { label: "Actualizado", value: formatDateTimeLabel(selected.updatedAt) },
        ].map((item) => (
          <div key={item.label} className="min-w-0 px-0 py-3 sm:px-4 first:sm:pl-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">{item.label}</p>
            <p className="mt-1 truncate text-sm font-medium text-zinc-800">{item.value}</p>
          </div>
        ))}
      </div>

      {isSuperAdmin ? (
        <div className="border-b border-zinc-100 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Creado por</p>
          <p className="mt-1 truncate text-sm font-medium text-zinc-800">
            {selected.createdByUserName?.trim() || selected.createdByUserId || "No registrado"}
          </p>
        </div>
      ) : null}
    </>
  );
}
