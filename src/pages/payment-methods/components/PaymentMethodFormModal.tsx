import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Modal } from "@/components/settings/modal";
import { getPaymentMethodById, createPaymentMethod, updatePaymentMethod, setPaymentMethodActive } from "@/services/paymentMethodService";
import { PaymentMethodFormFields, type PaymentMethodFormState } from "./PaymentMethodFormFields";

type PaymentMethodFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  paymentMethodId?: string | null;
  onClose: () => void;
  onSaved?: () => void;
  primaryColor: string;
  entityLabel?: string;
};

const DEFAULT_FORM: PaymentMethodFormState = {
  name: "",
  number: "",
  isActive: true,
};

export function PaymentMethodFormModal({
  open,
  mode,
  paymentMethodId,
  onClose,
  onSaved,
  primaryColor,
  entityLabel = "metodo de pago",
}: PaymentMethodFormModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [form, setForm] = useState<PaymentMethodFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryRing = useMemo(
    () => ({ "--tw-ring-color": `${primaryColor}33` } as CSSProperties),
    [primaryColor],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (mode === "create") {
      setForm(DEFAULT_FORM);
      return;
    }

    if (!paymentMethodId) return;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const method = await getPaymentMethodById(paymentMethodId);
        if (cancelled) return;
        setForm({
          name: method.name ?? "",
          number: method.number ?? "",
          isActive: method.isActive ?? true,
        });
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message ?? "No se pudo cargar el metodo de pago.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, paymentMethodId]);

  if (!open) return null;

  const title = mode === "edit" ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`;
  const submitLabel = mode === "edit" ? "Guardar cambios" : "Guardar";
  const canSubmit = Boolean(form.name.trim()) && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      if (mode === "edit") {
        if (!paymentMethodId) return;
        await updatePaymentMethod(paymentMethodId, {
          name: form.name.trim() || undefined,
          number: form.number.trim() || undefined,
        });
        await setPaymentMethodActive(paymentMethodId, { isActive: form.isActive });
      } else {
        await createPaymentMethod({
          name: form.name.trim(),
          number: form.number.trim() || undefined,
          isActive: form.isActive,
        });
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo guardar el metodo de pago.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} className="max-w-lg">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
        animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16 }}
      >
        {loading ? (
          <div className="px-1 py-6 text-sm text-black/60">Cargando metodo de pago...</div>
        ) : (
          <PaymentMethodFormFields
            form={form}
            setForm={setForm}
            primaryColor={primaryColor}
            disabled={loading}
          />
        )}

        {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border border-black/10 bg-white px-4 py-2 text-xs hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="rounded-lg border px-4 py-2 text-xs text-white focus:outline-none focus:ring-2"
            style={
              {
                backgroundColor: primaryColor,
                borderColor: `${primaryColor}33`,
                ...primaryRing,
              } as CSSProperties
            }
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {saving ? "Guardando..." : submitLabel}
          </button>
        </div>
      </motion.div>
    </Modal>
  );
}
