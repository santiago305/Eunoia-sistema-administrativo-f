import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Modal } from "@/components/modales/Modal";
import { SystemButton } from "@/components/SystemButton";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import {
  createSupplier,
  getSupplierById,
  lookupSupplierIdentity,
  updateSupplier,
} from "@/services/supplierService";
import type {
  SupplierDniLookupData,
  SupplierForm,
  SupplierRucLookupData,
} from "@/pages/providers/types/supplier";
import { DocumentType } from "@/pages/providers/types/DocumentType";
import { SupplierFormFields } from "./FormProviders";

type SupplierFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  supplierId?: string | null;
  onClose: () => void;
  onSaved?: () => void;
  primaryColor?: string;
};

type BackendErrorPayload = {
  message?: string | string[];
};

const DEFAULT_FORM: SupplierForm = {
  documentType: DocumentType.DNI,
  documentNumber: "",
  name: "",
  lastName: "",
  tradeName: "",
  address: "",
  phone: "",
  email: "",
  note: "",
  leadTimeDays: "",
  isActive: true,
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<BackendErrorPayload>(error)) return fallback;

  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.find(Boolean) ?? fallback;
  return message || fallback;
}

function buildPayload(form: SupplierForm) {
  return {
    documentType: form.documentType.trim(),
    documentNumber: form.documentNumber.trim(),
    name: form.name.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    tradeName: form.tradeName.trim() || undefined,
    address: form.address.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    note: form.note.trim() || undefined,
    leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
    isActive: form.isActive,
  };
}

export function SupplierFormModal({
  open,
  mode,
  supplierId,
  onClose,
  onSaved,
  primaryColor = "hsl(var(--primary))",
}: SupplierFormModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [form, setForm] = useState<SupplierForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedSupplierIdRef = useRef<string | null>(null);

  const canSave = Boolean(form.documentType.trim() && form.documentNumber.trim());

  const fieldStyle: CSSProperties = {
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const saveButtonStyle: CSSProperties = {
    backgroundColor: primaryColor,
    borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  useEffect(() => {
    if (!open) {
      requestedSupplierIdRef.current = null;
      return;
    }

    setError(null);

    if (mode === "create" || !supplierId) {
      requestedSupplierIdRef.current = null;
      setForm(DEFAULT_FORM);
      return;
    }

    if (requestedSupplierIdRef.current === supplierId) return;

    let cancelled = false;
    requestedSupplierIdRef.current = supplierId;
    setLoading(true);

    const loadSupplier = async () => {
      try {
        const supplier = await getSupplierById(supplierId);
        if (cancelled) return;

        setForm({
          documentType: supplier.documentType ?? DocumentType.DNI,
          documentNumber: supplier.documentNumber ?? "",
          name: supplier.name ?? "",
          lastName: supplier.lastName ?? "",
          tradeName: supplier.tradeName ?? "",
          address: supplier.address ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          note: supplier.note ?? "",
          leadTimeDays: supplier.leadTimeDays ? String(supplier.leadTimeDays) : "",
          isActive: supplier.isActive ?? true,
        });
      } catch (error: unknown) {
        if (!cancelled) {
          setError(extractErrorMessage(error, "No se pudo cargar el proveedor."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSupplier();

    return () => {
      cancelled = true;
    };
  }, [open, mode, supplierId]);

  const lookupIdentity = async () => {
    if (!canSave || lookupLoading) return;

    setError(null);
    clearFlash();
    setLookupLoading(true);

    try {
      const result = await lookupSupplierIdentity({
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
      });

      const payload = result?.data;

      if (!payload) {
        showFlash(errorResponse("No se pudo obtener la identidad"));
        return;
      }

      setForm((prev) => {
        if (form.documentType === DocumentType.DNI && "name" in payload) {
          const data = payload as SupplierDniLookupData;

          return {
            ...prev,
            documentNumber: result.documentNumber ?? prev.documentNumber,
            name: data.name || prev.name,
            lastName: data.lastName || prev.lastName,
          };
        }

        if (form.documentType === DocumentType.RUC && "tradeName" in payload) {
          const data = payload as SupplierRucLookupData;

          return {
            ...prev,
            documentNumber: result.documentNumber ?? prev.documentNumber,
            tradeName: data.tradeName || prev.tradeName,
            address: data.address || prev.address,
          };
        }

        return prev;
      });

      if (form.documentType === DocumentType.DNI || form.documentType === DocumentType.RUC) {
        showFlash(successResponse("Datos actualizados"));
        return;
      }

      showFlash(errorResponse("Tipo de documento no soportado"));
    } catch {
      showFlash(errorResponse("No se pudo obtener la identidad"));
    } finally {
      setLookupLoading(false);
    }
  };

  const saveSupplier = async () => {
    if (!canSave || saving || loading) return;

    setError(null);
    setSaving(true);

    try {
      const payload = buildPayload(form);

      if (mode === "edit" && supplierId) {
        await updateSupplier(supplierId, payload);
      } else {
        await createSupplier(payload);
      }

      showFlash(successResponse(mode === "edit" ? "Proveedor actualizado" : "Proveedor creado"));
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      setError(
        extractErrorMessage(
          error,
          mode === "edit" ? "No se pudo guardar el proveedor." : "No se pudo crear el proveedor.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Detalle de proveedor" : "Nuevo proveedor"}
      onClose={onClose}
      className="w-[560px] max-h-[640px]"
    >
      <SupplierFormFields
        form={form}
        setForm={setForm}
        primaryColor={primaryColor}
        onLookupIdentity={lookupIdentity}
        lookupDisabled={lookupLoading || !canSave}
        disabled={saving || loading}
        fieldStyle={fieldStyle}
      />

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <SystemButton variant="outline" size="md" onClick={onClose} disabled={saving}>
          Cancelar
        </SystemButton>

        <SystemButton
          size="md"
          onClick={saveSupplier}
          disabled={!canSave || saving || loading}
          loading={saving}
          style={saveButtonStyle}
        >
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar"}
        </SystemButton>
      </div>
    </Modal>
  );
}