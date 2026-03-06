import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import {
  createSupplier,
  getSupplierById,
  lookupSupplierIdentity,
  updateSupplier,
} from "@/services/supplierService";
import type { SupplierDniLookupData, SupplierForm, SupplierRucLookupData } from "@/pages/providers/types/supplier";
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

const buildPayload = (form: SupplierForm) => ({
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
});

export function SupplierFormModal({
  open,
  mode,
  supplierId,
  onClose,
  onSaved,
  primaryColor = "#21b8a6",
}: SupplierFormModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [form, setForm] = useState<SupplierForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      setForm(DEFAULT_FORM);
      return;
    }

    if (!supplierId) {
      setForm(DEFAULT_FORM);
      return;
    }

    clearFlash();
    setLoading(true);

    getSupplierById(supplierId)
      .then((supplier) => {
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
      })
      .catch(() => {
        showFlash(errorResponse("No se pudo cargar el proveedor"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, mode, supplierId, clearFlash, showFlash]);

  const canSave = useMemo(
    () => Boolean(form.documentType.trim() && form.documentNumber.trim()),
    [form.documentType, form.documentNumber],
  );

  const lookupIdentity = async () => {
    if (!canSave) return;
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
      if (form.documentType === DocumentType.DNI && "name" in payload) {
        const data = payload as SupplierDniLookupData;

        setForm((prev) => ({
          ...prev,
          documentNumber: result.documentNumber ?? prev.documentNumber,
          name: data.name || prev.name,
          lastName: data.lastName || prev.lastName,
        }));

        showFlash(successResponse("Datos actualizados"));
        return;
      }
      if (form.documentType === DocumentType.RUC && "tradeName" in payload) {
        const data = payload as SupplierRucLookupData;

        setForm((prev) => ({
          ...prev,
          documentNumber: result.documentNumber ?? prev.documentNumber,
          tradeName: data.tradeName || prev.tradeName,
          address: data.address || prev.address,
        }));

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
    if (!canSave || saving) return;
    clearFlash();
    setSaving(true);

    try {
      if (mode === "edit" && supplierId) {
        await updateSupplier(supplierId, buildPayload(form));
        showFlash(successResponse("Proveedor actualizado"));
      } else {
        await createSupplier(buildPayload(form));
        showFlash(successResponse("Proveedor creado"));
      }

      onSaved?.();
      onClose();
    } catch {
      showFlash(errorResponse(mode === "edit" ? "Error al actualizar proveedor" : "Error al crear proveedor"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      title={mode === "edit" ? "Editar proveedor" : "Nuevo proveedor"}
      onClose={onClose}
      className="max-w-[750px]"
    >
      {loading ? (
        <div className="px-1 py-6 text-sm text-black/60">Cargando proveedor...</div>
      ) : (
        <SupplierFormFields
          form={form}
          setForm={setForm}
          PRIMARY={primaryColor}
          onLookupIdentity={lookupIdentity}
          lookupDisabled={lookupLoading || !canSave}
        />
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="rounded-2xl border px-4 py-2 text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` } as CSSProperties}
          onClick={saveSupplier}
          disabled={!canSave || saving || loading}
        >
          {mode === "edit" ? "Guardar cambios" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}


