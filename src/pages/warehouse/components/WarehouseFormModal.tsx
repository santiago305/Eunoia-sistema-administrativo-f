import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Modal } from "@/components/settings/modal";
import { UbigeoSelectSection, type UbigeoSelection } from "@/components/UbigeoSelectSection";
import { createWarehouse, getWarehouseById, updateWarehouse, updateWarehouseActive } from "@/services/warehouseServices";


export type WarehouseFormState = {
    name: string;
    department: string;
    province: string;
    district: string;
    address: string;
    isActive: boolean;
};

type WarehouseFormModalProps = {
    open: boolean;
    mode: "create" | "edit";
    warehouseId?: string | null;
    onClose: () => void;
    onSaved?: () => void;
    primaryColor: string;
    entityLabel?: string;
};

export function WarehouseFormModal({
    open,
    mode,
    warehouseId,
    onClose,
    onSaved,
    primaryColor,
    entityLabel = "almacén",
}: WarehouseFormModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const [form, setForm] = useState<WarehouseFormState>({
        name: "",
        department: "",
        province: "",
        district: "",
        address: "",
        isActive: true,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const primaryRing = useMemo(() => ({ "--tw-ring-color": `${primaryColor}33` } as CSSProperties), [primaryColor]);

    useEffect(() => {
        if (!open) return;
        setError(null);

        if (mode === "create") {
            setForm({
                name: "",
                department: "",
                province: "",
                district: "",
                address: "",
                isActive: true,
            });
            return;
        }

        if (!warehouseId) return;

        let cancelled = false;
        setLoading(true);
        void (async () => {
            try {
                const warehouse = await getWarehouseById(warehouseId);
                if (cancelled) return;
                setForm({
                    name: warehouse.name ?? "",
                    department: warehouse.department ?? "",
                    province: warehouse.province ?? "",
                    district: warehouse.district ?? "",
                    address: warehouse.address ?? "",
                    isActive: warehouse.isActive ?? true,
                });
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.response?.data?.message ?? "No se pudo cargar el almacén.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, mode, warehouseId]);

    if (!open) return null;

    const title = mode === "edit" ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`;
    const submitLabel = mode === "edit" ? "Guardar cambios" : "Guardar";
    const canSubmit =
        Boolean(form.name.trim()) &&
        Boolean(form.department.trim()) &&
        Boolean(form.province.trim()) &&
        Boolean(form.district.trim()) &&
        !saving;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setSaving(true);
        setError(null);
        try {
            if (mode === "edit") {
                if (!warehouseId) return;
                await updateWarehouse(warehouseId, {
                    name: form.name.trim() || undefined,
                    department: form.department.trim() || undefined,
                    province: form.province.trim() || undefined,
                    district: form.district.trim() || undefined,
                    address: form.address.trim() || null,
                });
                await updateWarehouseActive(warehouseId, { isActive: form.isActive });
            } else {
                await createWarehouse({
                    name: form.name.trim(),
                    department: form.department.trim(),
                    province: form.province.trim(),
                    district: form.district.trim(),
                    address: form.address.trim() || null,
                    isActive: form.isActive,
                });
            }

            onSaved?.();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "No se pudo guardar el almacén.");
        } finally {
            setSaving(false);
        }
    };

    const handleUbigeoChange = (next: UbigeoSelection) => {
        setForm((prev) => ({
            ...prev,
            department: next.department,
            province: next.province,
            district: next.district,
        }));
    };

    return (
        <Modal title={title} onClose={onClose} className="max-w-lg">
            <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 6 }}
                animate={shouldReduceMotion ? false : { opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.16 }}
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-1">
                        <label className="text-sm">
                            Nombre
                            <input
                                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:ring-2"
                                style={primaryRing}
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                disabled={loading}
                            />
                        </label>
                    </div>
                        <UbigeoSelectSection
                            value={{
                                ubigeo: "",
                                department: form.department,
                                province: form.province,
                                district: form.district,
                            }}
                            onChange={handleUbigeoChange}
                            disabled={loading}
                            showUbigeoInput={false}
                            className="h-11"
                            textSize="text-sm mt-2"
                        />
                    <div className="grid grid-cols-1">
                        <label className="text-sm">
                            Dirección (opcional)
                            <textarea
                                className="mt-2 min-h-[90px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2"
                                style={primaryRing}
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                disabled={loading}
                            />
                        </label>
                    </div>
                </div>

                {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/10"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        className="rounded-lg border px-4 py-2 text-sm text-white focus:outline-none focus:ring-2"
                        style={
                            {
                                backgroundColor: primaryColor,
                                borderColor: `${primaryColor}33`,
                                "--tw-ring-color": `${primaryColor}33`,
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


