import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Modal } from "@/shared/components/settings/modal";
import { getPaymentMethodById, createPaymentMethod, updatePaymentMethod, setPaymentMethodActive } from "@/shared/services/paymentMethodService";
import { PaymentMethodFormFields, type PaymentMethodFormState } from "./PaymentMethodFormFields";
import { SystemButton } from "@/shared/components/components/SystemButton";

type PaymentMethodFormModalProps = {
    open: boolean;
    mode: "create" | "edit";
    paymentMethodId?: string | null;
    canManage?: boolean;
    onClose: () => void;
    onSaved?: () => void;
    primaryColor: string;
    entityLabel?: string;
};

const DEFAULT_FORM: PaymentMethodFormState = {
    name: "",
    isActive: true,
    requiresVoucher: true,
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        if (typeof response?.data?.message === "string") return response.data.message;
    }
    return fallback;
};

export function PaymentMethodFormModal({ open, mode, paymentMethodId, canManage = true, onClose, onSaved, primaryColor, entityLabel = "metodo de pago" }: PaymentMethodFormModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const [form, setForm] = useState<PaymentMethodFormState>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                    isActive: method.isActive ?? true,
                    requiresVoucher: method.requiresVoucher ?? true,
                });
            } catch (e: unknown) {
                if (!cancelled) {
                    setError(getErrorMessage(e, "No se pudo cargar el metodo de pago."));
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
    const canSubmit = Boolean(form.name.trim()) && !saving && canManage;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setSaving(true);
        setError(null);
        try {
            if (mode === "edit") {
                if (!paymentMethodId) return;
                await updatePaymentMethod(paymentMethodId, {
                    name: form.name.trim() || undefined,
                    requiresVoucher: form.requiresVoucher,
                });
                await setPaymentMethodActive(paymentMethodId, { isActive: form.isActive });
            } else {
                await createPaymentMethod({
                    name: form.name.trim(),
                    isActive: form.isActive,
                    requiresVoucher: form.requiresVoucher,
                });
            }

            onSaved?.();
            onClose();
        } catch (e: unknown) {
            setError(getErrorMessage(e, "No se pudo guardar el metodo de pago."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={title} onClose={onClose} className="max-w-lx">
            <motion.div initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }} animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.16 }}>
                {loading ? (
                    <div className="px-1 py-6 text-sm text-black/60">Cargando metodo de pago...</div>
                ) : (
                    <PaymentMethodFormFields form={form} setForm={setForm} primaryColor={primaryColor} disabled={loading || !canManage} />
                )}

                {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

                <div className="mt-4 flex justify-end gap-2">
                    <SystemButton variant="outline" size="sm" onClick={onClose} disabled={saving}>
                        Cancelar
                    </SystemButton>
                    <SystemButton
                        size="sm"
                        onClick={handleSubmit}
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
