import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import type { SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { buildSaleOrderItemFromSku } from "@/features/sale-orders/utils/saleOrderDirectSku";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { listSkus } from "@/shared/services/skuService";

type Props = {
  disabled: boolean;
  onAddItem: (item: SaleOrderItemInput) => void;
};

const SEARCH_DELAY_MS = 350;

const getSkuLabel = (item: ProductSkuWithAttributes) =>
  deriveSkuPresentation(
    { ...item.sku, attributes: item.attributes },
    item.sku.id,
  ).skuLabel;

export function SaleOrderDirectSkuSelect({ disabled, onAddItem }: Props) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProductSkuWithAttributes[]>([]);
  const [loading, setLoading] = useState(false);
  const latestQueryRef = useRef("");

  const options = useMemo(
    () =>
      items.map((item) => ({
        value: item.sku.id,
        label: getSkuLabel(item),
      })),
    [items],
  );

  useEffect(() => {
    if (disabled) return;

    const requestQuery = query.trim();
    latestQueryRef.current = requestQuery;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      void listSkus({
        q: requestQuery || undefined,
        productType: ProductTypes.PRODUCT,
        isActive: true,
        page: 1,
        limit: 10,
      })
        .then((result) => {
          if (latestQueryRef.current !== requestQuery) return;
          setItems(result.items ?? []);
        })
        .catch(() => {
          if (latestQueryRef.current !== requestQuery) return;
          setItems([]);
          sileo.error({ title: "No se pudieron buscar productos." });
        })
        .finally(() => {
          if (latestQueryRef.current === requestQuery) {
            setLoading(false);
          }
        });
    }, requestQuery ? SEARCH_DELAY_MS : 0);

    return () => window.clearTimeout(timeoutId);
  }, [disabled, query]);

  const selectSku = useCallback(
    (nextValue: string) => {
      if (!nextValue) {
        setValue("");
        return;
      }

      const selected = items.find((item) => item.sku.id === nextValue);
      if (!selected) {
        sileo.error({ title: "SKU no encontrado." });
        return;
      }

      onAddItem(buildSaleOrderItemFromSku(selected));
      setValue("");
      setQuery("");
    },
    [items, onAddItem],
  );

  return (
    <div className="w-[260px] max-w-full">
      <FloatingSelect
        label="Producto"
        name="sale-order-direct-sku"
        value={value}
        options={options}
        onChange={selectSku}
        searchable
        searchPlaceholder="Buscar producto..."
        emptyMessage={loading ? "Cargando..." : "Sin productos"}
        onSearchChange={setQuery}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}
