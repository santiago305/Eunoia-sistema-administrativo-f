import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Modal } from "@/shared/components/settings/modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
  createSaleOrderState,
  getSaleOrderState,
  updateSaleOrderState,
} from "@/features/workflows/services/workflowService";

type SaleOrderStateFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  stateId?: string | null;
  onClose: () => void;
  onSaved?: (state: { id?: string | null; name: string; color: string }) => void;
  primaryColor?: string;
};

const DEFAULT_FORM = {
  name: "",
  color: "#64748b",
};

const COLOR_OPTIONS = [
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
  "#111827",
];

export function SaleOrderStateFormModal({
  open,
  mode,
  stateId,
  onClose,
  onSaved,
  primaryColor = "#2563eb",
}: SaleOrderStateFormModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);

    if (mode === "create") {
      setLoading(false);
      setForm(DEFAULT_FORM);
      return;
    }

    if (!stateId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const state = await getSaleOrderState(stateId);
        if (cancelled) return;

        setForm({
          name: state.name ?? "",
          color: state.color || DEFAULT_FORM.color,
        });
      } catch (err) {
        if (!cancelled) setError(parseApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, open, stateId]);

  if (!open) return null;

  const title = mode === "edit" ? "Editar estado" : "Nuevo estado";
  const submitLabel = mode === "edit" ? "Guardar cambios" : "Guardar";
  const canSubmit = Boolean(form.name.trim()) && Boolean(form.color.trim()) && !saving;
  const ringStyle = {
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
      };
      const saved =
        mode === "edit" && stateId
          ? await updateSaleOrderState(stateId, payload)
          : await createSaleOrderState(payload);

      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} className="max-w-lx">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
      >
        {loading ? (
          <div className="px-1 py-6 text-sm text-black/60">Cargando estado...</div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs">
              Nombre
              <input
                className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                style={ringStyle}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={saving}
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs">Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, color: event.target.value }))
                  }
                  disabled={saving}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-white p-1 disabled:cursor-not-allowed"
                  aria-label="Color del estado"
                />
                <input
                  value={form.color}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, color: event.target.value }))
                  }
                  disabled={saving}
                  className="h-10 flex-1 rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                  style={ringStyle}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={saving}
                    onClick={() => setForm((current) => ({ ...current, color }))}
                    className={[
                      "h-7 w-7 rounded-full border transition",
                      form.color.toLowerCase() === color
                        ? "border-black ring-2 ring-black/15"
                        : "border-black/10 hover:scale-105",
                    ].join(" ")}
                    style={{ backgroundColor: color }}
                    aria-label={`Usar color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <SystemButton variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </SystemButton>
          <SystemButton
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || loading}
            loading={saving}
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
          >
            {submitLabel}
          </SystemButton>
        </div>
      </motion.div>
    </Modal>
  );
}
