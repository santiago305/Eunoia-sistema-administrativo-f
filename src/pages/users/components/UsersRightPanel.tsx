import { motion } from "framer-motion";
import type { Role, User } from "../types/users.types";

const PRIMARY = "#21b8a6";
const ROLES: Role[] = ["admin", "moderator", "adviser"];

const cn = (...s: Array<string | false | null | undefined>) => s.filter(Boolean).join(" ");
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

function RoleChip({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: "border-zinc-300 bg-zinc-900 text-white",
    moderator: "border-[rgba(33,184,166,.25)] bg-[rgba(33,184,166,.08)] text-[rgba(12,98,88,1)]",
    adviser: "border-indigo-200 bg-indigo-50 text-indigo-700",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", map[role])}>{role}</span>;
}

interface UsersRightPanelProps {
  selected: User | null;
  roleDraft: Role;
  setRoleDraft: (role: Role) => void;
  savingRole: boolean;
  saveRole: () => Promise<void>;
}

export function UsersRightPanel({ selected, roleDraft, setRoleDraft, savingRole, saveRole }: UsersRightPanelProps) {
  return (
    <section className="h-auto rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(0,0,0,.04)]">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-medium text-zinc-900 2xl:text-[14px]">Detalle</h2>
              <p className="mt-1 text-[12px] text-zinc-600 2xl:text-[13px]">Solo rol editable</p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600 2xl:text-[12px]">
              {selected ? `ID #${selected.id}` : "—"}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 p-4">
          {!selected ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
              <div>
                <div className="text-[13px] font-medium text-zinc-900">Selecciona un usuario</div>
                <div className="mt-1 text-[12px] text-zinc-600">Desde la lista izquierda.</div>
              </div>
            </div>
          ) : (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="grid h-full grid-rows-[auto_auto_1fr] gap-3"
            >
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-500">Nombre</div>
                    <div className="truncate text-[15px] font-medium text-zinc-900 2xl:text-[16px]">{selected.name}</div>
                  </div>
                  <RoleChip role={selected.role} />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-[11px] text-zinc-500">Email</div>
                    <div className="truncate text-[12px] text-zinc-800 2xl:text-[13px]">{selected.email}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-[11px] text-zinc-500">Teléfono</div>
                    <div className="truncate text-[12px] text-zinc-800 2xl:text-[13px]">{selected.phone}</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-zinc-500 2xl:text-[12px]">Creado: {fmtDate(selected.createdAt)}</div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-zinc-500">Rol</div>
                    <div className="text-[13px] font-medium text-zinc-900 2xl:text-[14px]">Cambiar rol</div>
                  </div>
                  {roleDraft !== selected.role && (
                    <span className="rounded-full border border-[rgba(33,184,166,.25)] bg-[rgba(33,184,166,.08)] px-2 py-1 text-[11px] text-[rgba(12,98,88,1)]">
                      Pendiente
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <select
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value as Role)}
                    className={cn(
                      "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-800",
                      "outline-none focus:border-[rgba(33,184,166,.45)] focus:bg-white focus:ring-4 focus:ring-[rgba(33,184,166,.10)]",
                      "2xl:text-[14px]"
                    )}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={saveRole}
                    disabled={savingRole || roleDraft === selected.role}
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-[13px] font-medium text-white transition",
                      savingRole || roleDraft === selected.role ? "cursor-not-allowed opacity-60" : "active:scale-[.99]"
                    )}
                    style={{ background: PRIMARY, boxShadow: "0 10px 26px rgba(33,184,166,.16)" }}
                  >
                    {savingRole ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4">
                <div className="text-[12px] text-zinc-600 2xl:text-[13px]">
                  Espacio para futuras acciones (permisos, logs, reset password) sin romper el alto.
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
