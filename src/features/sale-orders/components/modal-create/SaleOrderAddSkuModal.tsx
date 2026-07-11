import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { listSkus } from "@/shared/services/skuService";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";

export type SaleOrderAddSkuSelection = {
  skuId: string;
  label: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  skuImage?:string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (selection: SaleOrderAddSkuSelection) => void;
};

const buildSkuLabel = (item: ProductSkuWithAttributes) => {
  const name = (item.sku?.name ?? "SKU").trim() || "SKU";
  const attrsText = (item.attributes ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const skuPart = item.sku?.backendSku ? ` -${item.sku.backendSku}` : "";
  const customPart = item.sku?.customSku ? ` (${item.sku.customSku})` : "";
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  return `${name}${attrsPart}${skuPart}${customPart}`.trim();
};

type SkuOption = { value: string; label: string; price?: number; skuImage?: string | null };

export function SaleOrderAddSkuModal({ open, onClose, onAdd }: Props) {
  const [skuId, setSkuId] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [quantityText, setQuantityText] = useState("1");
  const [priceText, setPriceText] = useState("");

  const selectedOption = useMemo(() => options.find((o) => o.value === skuId) ?? null, [options, skuId]);

  const reset = () => {
    setSkuId("");
    setQuery("");
    setOptions([]);
    setQuantityText("1");
    setPriceText("");
  };

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await listSkus({
        q: q.trim() || undefined,
        productType: ProductTypes.PRODUCT,
        isActive: true,
        page: 1,
        limit: 10,
      });
      const items = (res.items ?? []) as ProductSkuWithAttributes[];
      setOptions(
        items.map((item) => ({
          value: item.sku.id,
          label: buildSkuLabel(item),
          price: Number(item.sku.price ?? 0),
          skuImage: item.sku.image ?? null,
        })),
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => void load(query), query.trim() ? 350 : 0);
    return () => window.clearTimeout(id);
  }, [load, open, query]);

  useEffect(() => {
    if (!open) return;
    if (!skuId) return;
    if (priceText.trim()) return;
    const price = selectedOption?.price;
    if (price == null) return;
    setPriceText(String(price));
  }, [open, priceText, selectedOption?.price, skuId]);

  const submit = () => {
    const quantity = parseDecimalInput(quantityText);
    const basePrice = Number(selectedOption?.price ?? 0);
    const unitPrice = parseDecimalInput(
      priceText || String(basePrice),
    );
    if (!skuId) return;
    if (quantity <= 0) return;
    if (unitPrice < 0) return;

    onAdd({
      skuId,
      label: selectedOption?.label ?? skuId,
      quantity,
      basePrice,
      unitPrice,
      skuImage: selectedOption?.skuImage ?? null,
    });
    reset();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Agregar SKU"
      className="max-w-xl"
    >
      <div className="p-4 space-y-3">
        <FloatingSelect
          label="Producto"
          name="sale-order-add-sku"
          value={skuId}
          onChange={(next) => {
            setSkuId(next);
            setPriceText("");
          }}
          options={options.map(({ value, label }) => ({ value, label }))}
          searchable
          searchPlaceholder="Buscar producto..."
          emptyMessage={loading ? "Cargando..." : "Sin productos"}
          onSearchChange={setQuery}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FloatingInput
            label="Cantidad"
            name="sale-order-add-sku-qty"
            type="number"
            min={0}
            step="0.001"
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value)}
          />
          <FloatingInput
            label="Precio unit."
            name="sale-order-add-sku-price"
            type="number"
            min={0}
            step="0.01"
            value={String(priceText)}
            onFocus={(event) => {
              if (event.currentTarget.value === "0") {
                event.currentTarget.select();
              }
            }}
            onChange={(event) => setPriceText(event.target.value)}
            onBlur={() => {
              if (String(priceText).trim() === "") {
                setPriceText("0");
              }
            }}
          />
        </div>
      </div>

      <div className="p-4 border-t flex justify-end gap-2">
        <SystemButton
          variant="outline"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancelar
        </SystemButton>
        <SystemButton leftIcon={<Plus className="h-4 w-4" />} onClick={submit}>
          Agregar
        </SystemButton>
      </div>
    </Modal>
  );
}

