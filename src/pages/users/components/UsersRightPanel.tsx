import { motion } from "framer-motion";
import type { Role, User } from "../types/users.types";
import { ROLE_LABELS, RoleType } from "../types/roles.types";
import { formatDateTimeLabel } from "../utils/dateFormat";

const ROLES = Object.values(RoleType) as Role[];

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");

function RoleChip({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    admin: "border-zinc-300 bg-zinc-900 text-white",
    moderator: "border-[#21b8a6]/20 bg-[#21b8a6]/8 text-[#16897d]",
    adviser: "border-indigo-200 bg-indigo-50 text-indigo-600",
  };

  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-medium", styles[role])}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusChip({ inactive }: { inactive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-medium",
        inactive ? "border-rose-200 bg-rose-50 text-rose-600" : "border-emerald-200 bg-emerald-50 text-emerald-600"
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", inactive ? "bg-rose-500" : "bg-emerald-500")} />
      {inactive ? "Desactivado" : "Activo"}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="truncate text-[12px] text-zinc-800">{value || "-"}</p>
    </div>
  );
}

interface UsersRightPanelProps {
  selected: User | null;
  roleDraft: Role;
  setRoleDraft: (role: Role) => void;
  savingRole: boolean;
  saveRole: () => Promise<void>;
  togglingStatus: boolean;
  deactivateUser: () => Promise<void>;
  restoreUser: () => Promise<void>;
}

export function UsersRightPanel({
  selected,
  roleDraft,
  setRoleDraft,
  savingRole,
  saveRole,
  togglingStatus,
  deactivateUser,
  restoreUser,
}: UsersRightPanelProps) {
  const isDeleted = Boolean(selected?.deleted || selected?.deletedAt);

  return (
    <section className="h-full rounded-2xl border border-zinc-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <h2 className="text-[12px] font-semibold text-zinc-900">Usuario</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">Detalle y acciones</p>
          </div>

          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-500">
            {selected ? `#${selected.id}` : "Sin seleccion"}
          </span>
        </div>

        <div className="flex-1 p-4">
          {!selected ? (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70">
              <div className="text-center">
                <p className="text-[12px] font-medium text-zinc-700">Selecciona un usuario</p>
                <p className="mt-1 text-[11px] text-zinc-500">Aqui veras su informacion.</p>
              </div>
            </div>
          ) : (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex h-full flex-col gap-4"
            >
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-zinc-900">{selected.name}</p>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">{selected.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusChip inactive={isDeleted} />
                    <RoleChip role={selected.role} />

                    {!isDeleted ? (
                      <button
                        onClick={deactivateUser}
                        disabled={togglingStatus}
                        className={cn(
                          "h-7 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-medium text-rose-600 transition",
                          togglingStatus ? "cursor-not-allowed opacity-60" : "hover:bg-rose-100 active:scale-[.99]"
                        )}
                      >
                        {togglingStatus ? "..." : "Eliminar"}
                      </button>
                    ) : (
                      <button
                        onClick={restoreUser}
                        disabled={togglingStatus}
                        className={cn(
                          "h-7 rounded-lg px-2.5 text-[11px] font-medium text-white transition",
                          togglingStatus ? "cursor-not-allowed opacity-60" : "hover:opacity-90 active:scale-[.99]"
                        )}
                        style={{ background: "hsl(var(--primary))" }}
                      >
                        {togglingStatus ? "..." : "Restablecer"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Telefono" value={selected.phone} /> 
                  <Field label="Creado" value={formatDateTimeLabel(selected.createdAt)} />
                  <Field label="Ult. actualizado" value={formatDateTimeLabel(selected.updatedAt)} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-400">Rol</p>
                    <p className="mt-1 text-[12px] font-medium text-zinc-800">Editar rol del usuario</p>
                  </div>

                  {roleDraft !== selected.role && (
                    <span className="rounded-full border border-[#21b8a6]/20 bg-[#21b8a6]/8 px-2 py-1 text-[10px] text-[#16897d]">
                      Pendiente
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value as Role)}
                    className={cn(
                      "h-9 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-[12px] text-zinc-800 outline-none transition",
                      "focus:border-[#21b8a6]/40 focus:ring-4 focus:ring-[#21b8a6]/10"
                    )}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={saveRole}
                    disabled={savingRole || roleDraft === selected.role}
                    className={cn(
                      "h-9 rounded-xl px-4 text-[12px] font-medium text-white transition",
                      savingRole || roleDraft === selected.role ? "cursor-not-allowed opacity-60" : "active:scale-[.99]"
                    )}
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    {savingRole ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
