import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Modal } from "@/shared/components/modales/Modal";

import {
  createWarehouse,
  getWarehouseById,
  updateWarehouse,
  updateWarehouseActive,
} from "@/shared/services/warehouseServices";
import type { UbigeoSelection } from "@/shared/types/ubigeo";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { UbigeoSelectSection } from "@/shared/components/components/UbigeoSelectSection";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { SystemButton } from "@/shared/components/components/SystemButton";

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

type BackendErrorPayload = {
  message?: string | string[];
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<BackendErrorPayload>(error)) return fallback;

  const message = error.response?.data?.message;
  if (Array.isArray(message)) {
    return message.find(Boolean) ?? fallback;
  }

  return message || fallback;
}

export function WarehouseFormModal({
  open,
  mode,
  warehouseId,
  onClose,
  onSaved,
  primaryColor,
  entityLabel = "almacén",
}: WarehouseFormModalProps) {
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
  const requestedWarehouseIdRef = useRef<string | null>(null);

  const primaryRing = useMemo(
    () =>
      ({
        "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
      }) as CSSProperties,
    [primaryColor],
  );

  useEffect(() => {
    if (!open) {
      requestedWarehouseIdRef.current = null;
      return;
    }
    setError(null);

    if (mode === "create") {
      requestedWarehouseIdRef.current = null;
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
    if (requestedWarehouseIdRef.current === warehouseId) return;

    let cancelled = false;
    requestedWarehouseIdRef.current = warehouseId;
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
      } catch (error: unknown) {
        if (!cancelled) {
          setError(extractErrorMessage(error, "No se pudo cargar el almacén."));
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

  const title = mode === "edit" ? `Detalle de ${entityLabel}` : `Nuevo ${entityLabel}`;
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
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "No se pudo guardar el almacén."));
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
    <Modal open={open} title={title} onClose={onClose} className="w-[500px] max-h-[500px]">
      <div className="space-y-4">
        <FloatingInput
          label="Nombre"
          name="warehouse-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={loading}
          className="h-11 text-sm"
          style={primaryRing}
        />

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

        <FloatingTextarea
          label="Direccion"
          name="warehouse-address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          disabled={loading}
          rows={4}
          className="min-h-[90px] text-sm"
          style={primaryRing}
        />
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <SystemButton variant="outline" size="md" onClick={onClose} disabled={saving}>
          Cancelar
        </SystemButton>
        <SystemButton
          size="md"
          style={
            {
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
              "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            } as CSSProperties
          }
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          loading={saving}
        >
          {saving ? "Guardando..." : submitLabel}
        </SystemButton>
      </div>
    </Modal>
  );
}
