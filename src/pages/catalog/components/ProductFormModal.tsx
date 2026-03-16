import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { createProduct, getById, updateProduct, updateProductActive } from "@/services/productService";
import { listUnits } from "@/services/unitService";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { ProductForm } from "@/pages/catalog/types/product";
import { ProductFormFields } from "./ProductFormField";

type ProductFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  productId?: string | null;
  productType: ProductType;
  units?: ListUnitResponse;
  primaryColor?: string;
  entityLabel?: string;
  onClose: () => void;
  onSaved?: () => void;
};

const DEFAULT_FORM: ProductForm = {
  name: "",
  description: "",
  isActive: true,
  barcode: "",
  price: "",
  cost: "",
  attribute: {},
  baseUnitId: "",
};

export function ProductFormModal({
  open,
  mode,
  productId,
  productType,
  units,
  primaryColor = "#21b8a6",
  entityLabel,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localUnits, setLocalUnits] = useState<ListUnitResponse>();
  const [loadingUnits, setLoadingUnits] = useState(false);

  const label = useMemo(() => {
    if (entityLabel) return entityLabel;
    return productType === ProductTypes.PRIMA ? "materia prima" : "producto";
  }, [entityLabel, productType]);

  useEffect(() => {
    if (!open) return;

    if (!units && !localUnits && !loadingUnits) {
      setLoadingUnits(true);
      listUnits()
        .then((res) => {
          setLocalUnits(res);
        })
        .catch(() => {
          showFlash(errorResponse("Error al cargar unidades"));
        })
        .finally(() => {
          setLoadingUnits(false);
        });
    }

    if (mode === "create") {
      setForm(DEFAULT_FORM);
      return;
    }

    if (!productId) {
      setForm(DEFAULT_FORM);
      return;
    }

    clearFlash();
    setLoading(true);

    getById(productId)
      .then((product) => {
        setForm({
          name: product.name ?? "",
          description: product.description ?? "",
          isActive: product.isActive ?? true,
          barcode: product.barcode ?? "",
          price: product.price ? String(product.price) : "",
          cost: product.cost ? String(product.cost) : "",
          attribute: {
            presentation: product.attributes?.presentation,
            color: product.attributes?.color,
            variant: product.attributes?.variant,
          },
          baseUnitId: product.baseUnitId ?? "",
        });
      })
      .catch(() => {
        showFlash(errorResponse(`No se pudo cargar ${label}`));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, mode, productId, clearFlash, showFlash, label]);

  const canSave = useMemo(() => Boolean(form.name.trim()), [form.name]);
  const effectiveUnits = units ?? localUnits;

  const saveProduct = async () => {
    if (!canSave || saving) return;
    clearFlash();
    setSaving(true);

    try {
      if (mode === "edit" && productId) {
        await updateProduct(productId, {
          name: form.name.trim() || undefined,
          description: form.description.trim() || null,
          barcode: form.barcode.trim() || null,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          baseUnitId: form.baseUnitId,
          attributes: form.attribute,
        });
        await updateProductActive(productId, { isActive: form.isActive });
        showFlash(successResponse(`${label} actualizado`));
      } else {
        await createProduct({
          type: productType,
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
          barcode: form.barcode.trim() || null,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          baseUnitId: form.baseUnitId,
          attributes: form.attribute,
        });
        showFlash(successResponse(`${label} creado`));
      }

      onSaved?.();
      onClose();
    } catch {
      showFlash(errorResponse(mode === "edit" ? `Error al actualizar ${label}` : `Error al crear ${label}`));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal title={mode === "edit" ? `Editar ${label}` : `Nuevo ${label}`} onClose={onClose} className="max-w-[700px]">
      {loading || loadingUnits ? (
        <div className="px-1 py-6 text-sm text-black/60">Cargando...</div>
      ) : (
        <ProductFormFields
          form={form}
          setForm={setForm}
          units={effectiveUnits}
          PRIMARY={primaryColor}
          primaBoolean={productType === ProductTypes.PRIMA}
        />
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-2xl border border-black/10 px-4 py-2 text-sm" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="rounded-2xl border px-4 py-2 text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
          onClick={saveProduct}
          disabled={!canSave || saving || loading}
        >
          {mode === "edit" ? "Guardar cambios" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}


