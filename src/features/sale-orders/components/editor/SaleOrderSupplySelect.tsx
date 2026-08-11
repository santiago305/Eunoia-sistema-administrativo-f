import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { listSkus } from "@/shared/services/skuService";
import type { SaleOrderEditorSupply } from "./saleOrderEditorForm";

type Props = {
  disabled?: boolean;
  onAdd: (supply: SaleOrderEditorSupply) => void;
};

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;

const toSupply = (item: ProductSkuWithAttributes): SaleOrderEditorSupply => ({
  supplySkuId: item.sku.id,
  quantity: "1",
  unitId: item.unit?.id ?? "",
  referenceRecipeItemId: null,
  supplyName: item.sku.name,
  skuName: item.sku.name,
  backendSku: item.sku.backendSku,
  customSku: item.sku.customSku ?? null,
  unitName: item.unit?.name ?? "",
  unitCode: item.unit?.code ?? "",
});

export function SaleOrderSupplySelect({ disabled = false, onAdd }: Props) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProductSkuWithAttributes[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (search: string) => {
    const requestId = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const result = await listSkus(
        {
          q: search || undefined,
          productType: ProductTypes.SUPPLY,
          isActive: true,
          page: 1,
          limit: PAGE_SIZE,
        },
        { signal: controller.signal },
      );
      if (requestId === requestRef.current) setItems(result.items ?? []);
    } catch {
      if (!controller.signal.aborted && requestId === requestRef.current) {
        setItems([]);
        sileo.error({ title: "No se pudieron buscar los insumos." });
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (disabled) return;
    const search = query.trim();
    const timerId = window.setTimeout(
      () => void load(search),
      search ? SEARCH_DELAY_MS : 0,
    );
    return () => window.clearTimeout(timerId);
  }, [disabled, load, query]);

  useEffect(
    () => () => {
      requestRef.current += 1;
      abortRef.current?.abort();
    },
    [],
  );

  const options = useMemo(
    () =>
      items.map((item) => ({
        value: item.sku.id,
        label: item.sku.name,
        metaText: item.sku.customSku ?? item.sku.backendSku,
      })),
    [items],
  );

  const select = (supplySkuId: string) => {
    const item = items.find((row) => row.sku.id === supplySkuId);
    if (!item) return;
    if (!item.unit?.id) {
      sileo.error({ title: "El insumo no tiene una unidad configurada." });
      return;
    }
    onAdd(toSupply(item));
    setValue("");
    setQuery("");
  };

  return (
    <div className="w-[300px] max-w-full">
      <FloatingSelect
        label="Agregar insumo"
        name="sale-order-supply"
        value={value}
        options={options}
        onChange={(next) => {
          setValue(next);
          select(next);
        }}
        searchable
        searchPlaceholder="Buscar insumo..."
        emptyMessage={loading ? "Cargando..." : "Sin insumos"}
        onSearchChange={setQuery}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}
