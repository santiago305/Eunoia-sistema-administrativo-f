import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  getIncomeScopeOptions,
  getUserIncomeScopes,
  replaceUserIncomeScopes,
  type IncomeScopeAssignment,
  type IncomeScopeOptions,
} from "@/shared/services/accessControlService";
import type { User } from "../types/users.types";

type Props = { open: boolean; user: User | null; onClose: () => void; onSaved: () => void };
const EMPTY_OPTIONS: IncomeScopeOptions = { subsidiaries: [], clients: [], paymentAccounts: [] };

export function UserIncomeScopesModal({ open, user, onClose, onSaved }: Props) {
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [assignments, setAssignments] = useState<IncomeScopeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([getIncomeScopeOptions(), getUserIncomeScopes(user.id)])
      .then(([nextOptions, current]) => {
        if (cancelled) return;
        setOptions(nextOptions);
        setAssignments(current);
      })
      .catch(() => { if (!cancelled) setError("No se pudieron cargar los alcances. Verifica tu permiso y vuelve a intentar."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, user]);

  const sections = useMemo(() => [
    { type: "SUBSIDIARY" as const, title: "Sucursales", options: options.subsidiaries },
    { type: "PAYMENT_ACCOUNT" as const, title: "Cuentas receptoras", options: options.paymentAccounts },
    { type: "CLIENT" as const, title: "Clientes", options: options.clients },
  ], [options]);

  const toggle = (item: IncomeScopeAssignment, checked: boolean) => setAssignments((current) => {
    const key = `${item.type}:${item.id}`;
    return checked
      ? [...current.filter((entry) => `${entry.type}:${entry.id}` !== key), item]
      : current.filter((entry) => `${entry.type}:${entry.id}` !== key);
  });

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await replaceUserIncomeScopes(user.id, assignments);
      onSaved();
      onClose();
    } catch {
      setError("No se guardaron los cambios. Revisa los permisos o si alguna opción dejó de estar activa.");
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open && Boolean(user)}
      onClose={onClose}
      title="Alcance de ingresos"
      description={`Define qué ingresos puede consultar ${user?.name ?? "este usuario"}. El permiso Ver todos no se concede desde aquí.`}
      className="max-w-3xl"
      footer={(
        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose} disabled={saving}>Cancelar</SystemButton>
          <SystemButton leftIcon={<Save className="h-4 w-4" />} onClick={() => void save()} loading={saving} disabled={loading}>Guardar alcance</SystemButton>
        </div>
      )}
    >
      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-zinc-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando opciones y asignaciones…
        </div>
      ) : (
        <div className="space-y-5">
          <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
            Las opciones se combinan con los registros propios del usuario. Si no marcas ninguna, seguirá viendo únicamente sus propios ingresos.
          </p>
          {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-3">
            {sections.map((section) => (
              <fieldset key={section.type} className="min-w-0 rounded-md border border-zinc-200 p-3">
                <legend className="px-1 text-sm font-semibold text-zinc-900">{section.title}</legend>
                <div className="max-h-64 space-y-1 overflow-auto" aria-label={section.title}>
                  {section.options.length ? section.options.map((option) => {
                    const checked = assignments.some((item) => item.type === section.type && item.id === option.id);
                    return (
                      <label key={option.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm text-zinc-800 hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-400 text-primary focus-visible:ring-2 focus-visible:ring-primary"
                          checked={checked}
                          onChange={(event) => toggle({ type: section.type, id: option.id }, event.target.checked)}
                        />
                        <span className="break-words">{option.label}</span>
                      </label>
                    );
                  }) : <p className="px-2 py-3 text-sm text-zinc-500">No hay opciones activas.</p>}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
