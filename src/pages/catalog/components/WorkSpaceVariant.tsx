// VariantWorkspaceSection.tsx
import { useEffect, useMemo, useState } from "react";
import { GitBranch, Pencil, Plus, Power, Save, XCircle } from "lucide-react";
import { createVariant, getVariantById, getVariantByIdp, updateVariant, updateVariantActive } from "@/services/catalogService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { money } from "@/utils/functionPurchases";
import type { ProductOption, Variant, VariantForm } from "@/pages/catalog/types/variant";
import { VariantFormFields } from "./VariantFormFields";

type VariantRow = {
  id: string;
  sku: string;
  presentation: string;
  variant: string;
  color: string;
  price: number;
  cost: number;
  active: string;
};

type VariantWorkspaceSectionProps = {
  productId: string;
  productName: string;
  primaryColor: string;
};

const DEFAULT_FORM: VariantForm = {
  productId: "",
  barcode: "",
  price: "",
  cost: "",
  attributes: {},
  isActive: true,
};

export function VariantWorkspaceSection({
  productId,
  productName,
  primaryColor,
}: VariantWorkspaceSectionProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<VariantForm>({
    ...DEFAULT_FORM,
    productId,
  });

  const [saving, setSaving] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  const productOptions = useMemo<ProductOption[]>(
    () => [{ productId, name: productName || "Producto" }],
    [productId, productName],
  );

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      productId,
    });
    setEditingVariantId(null);
  };

  const loadVariants = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const res = await getVariantByIdp(productId);
      setVariants(res ?? []);
    } catch {
      setVariants([]);
      showFlash(errorResponse("Error al cargar variantes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVariants();
    resetForm();
  }, [productId]);

  const openEdit = async (id: string) => {
    clearFlash();
    try {
      const row = await getVariantById(id);
      setForm({
        productId: row.productId,
        barcode: row.barcode ?? "",
        price: String(row.price ?? ""),
        cost: String(row.cost ?? ""),
        attributes: {
          presentation: row.attributes?.presentation,
          variant: row.attributes?.variant,
          color: row.attributes?.color,
        },
        isActive: row.isActive,
      });
      setEditingVariantId(id);
    } catch {
      showFlash(errorResponse("No se pudo cargar la variante"));
    }
  };

  const saveVariant = async () => {
    if (!form.productId || saving) return;

    clearFlash();
    setSaving(true);

    try {
      if (editingVariantId) {
        await updateVariant(editingVariantId, {
          barcode: form.barcode.trim() || null,
          attributes: form.attributes,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
        });

        await updateVariantActive(editingVariantId, { isActive: form.isActive });
        showFlash(successResponse("Variante actualizada"));
      } else {
        await createVariant({
          productId: form.productId,
          barcode: form.barcode.trim() || undefined,
          attributes: form.attributes,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          isActive: form.isActive,
        });
        showFlash(successResponse("Variante creada"));
      }

      resetForm();
      await loadVariants();
    } catch {
      showFlash(errorResponse(editingVariantId ? "Error al editar variante" : "Error al crear variante"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: Variant) => {
    try {
      await updateVariantActive(row.id, { isActive: !row.isActive });
      showFlash(successResponse(!row.isActive ? "Variante restaurada" : "Variante desactivada"));
      await loadVariants();
    } catch {
      showFlash(errorResponse("Error al cambiar estado"));
    }
  };

  const rows = useMemo<VariantRow[]>(
    () =>
      (variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku ?? "-",
        presentation: v.attributes?.presentation ?? "-",
        variant: v.attributes?.variant ?? "-",
        color: v.attributes?.color ?? "-",
        price: Number(v.price ?? 0),
        cost: Number(v.cost ?? 0),
        active: v.isActive ? "Activo" : "Inactivo",
      })),
    [variants],
  );

  const columns = useMemo<DataTableColumn<VariantRow>[]>(
    () => [
      { id: "sku", header: "SKU", accessorKey: "sku", hideable: false },
      { id: "presentation", header: "Presentación", accessorKey: "presentation" },
      { id: "variant", header: "Variante", accessorKey: "variant" },
      { id: "color", header: "Color", accessorKey: "color" },
      {
        id: "price",
        header: "Precio",
        cell: (row) => <span>{money(row.price, "PEN")}</span>,
      },
      {
        id: "cost",
        header: "Costo",
        cell: (row) => <span>{money(row.cost, "PEN")}</span>,
      },
      { id: "active", header: "Estado", accessorKey: "active" },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => {
          const original = variants.find((v) => v.id === row.id);
          return (
            <div className="flex justify-end gap-2">
              <SystemButton
                variant="secondary"
                size="custom"
                className="h-8 w-9 rounded-lg"
                onClick={() => void openEdit(row.id)}
              >
                <Pencil className="h-4 w-4" />
              </SystemButton>
              <SystemButton
                variant="danger"
                size="custom"
                className="h-8 w-9 rounded-lg"
                onClick={() => original && void toggleActive(original)}
              >
                <Power className="h-4 w-4" />
              </SystemButton>
            </div>
          );
        },
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [rows, variants],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <SectionHeaderForm icon={GitBranch} title="Variantes del producto" />
          <div className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/70">
            {productName}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-black">
              {editingVariantId ? "Editar variante" : "Nueva variante"}
            </p>

            {editingVariantId && (
              <SystemButton
                variant="secondary"
                leftIcon={<XCircle className="h-4 w-4" />}
                onClick={resetForm}
              >
                Cancelar edición
              </SystemButton>
            )}
          </div>

          <VariantFormFields
            form={form}
            setForm={setForm}
            products={productOptions}
            lockProduct
          />

          <div className="mt-4 flex justify-end">
            <SystemButton
              leftIcon={editingVariantId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              style={{
                backgroundColor: primaryColor,
                borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
              }}
              onClick={() => void saveVariant()}
              disabled={!form.productId || saving}
            >
              {saving ? "Guardando..." : editingVariantId ? "Guardar cambios" : "Agregar variante"}
            </SystemButton>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <DataTable
          tableId={`product-variants-inline-${productId}`}
          data={rows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay variantes registradas."
          hoverable={false}
          animated={false}
        />
      </div>
    </div>
  );
}