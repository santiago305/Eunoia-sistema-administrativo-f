import { useEffect, useRef, useState } from "react";
import { InventoryRow, InventorySnapshotOutput } from "../types/inventory";
import * as echarts from "echarts";

export const useEChart = (options: echarts.EChartsOption) => {
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const optionsRef = useRef(options);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  optionsRef.current = options;

  useEffect(() => {
    if (!container) return;
    let disposed = false;

    const initChart = () => {
      if (disposed || chartRef.current) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      const instance = echarts.init(container);
      chartRef.current = instance;
      instance.setOption(optionsRef.current, { notMerge: true });
      instance.resize();
    };

    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      } else {
        initChart();
      }
    };

    initChart();
    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    const timer = setTimeout(handleResize, 50);

    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [container]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(options, { notMerge: false, lazyUpdate: true });
  }, [options]);

  return setContainer;
};


const buildItemLabel = (
  baseName: string | null | undefined,
  attributes?: { presentation?: string; variant?: string; color?: string } | null,
  sku?: string | null,
  customSku?: string | null,
) => {
  const cleanedParts = [
    baseName ?? "Producto",
    attributes?.presentation ?? "",
    attributes?.variant ?? "",
    attributes?.color ?? "",
  ]
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const namePart = cleanedParts.join(" ");
  const skuPart = sku ? ` - ${sku}` : "";
  const customPart = ` (${customSku ?? "-"})`;

  return `${namePart}${skuPart}${customPart}`.trim();
};

export const mapSnapshotToRow = (item: InventorySnapshotOutput): InventoryRow => {
  const productSnapshot = item.stockItem?.product ?? null;
  const variantWrapper = item.stockItem?.variant ?? null;
  const hasWrappedVariant =
    !!variantWrapper && typeof variantWrapper === "object" && "variant" in variantWrapper;
  const variantSnapshot = hasWrappedVariant
    ? variantWrapper.variant
    : variantWrapper;
  const productNameFromVariant = hasWrappedVariant
    ? variantWrapper.productName
    : undefined;
  const sku =
    variantSnapshot?.sku ??
    productSnapshot?.sku ??
    item.stockItem?.id ??
    "SKU";
  const attributes =
    variantSnapshot?.attributes ??
    productSnapshot?.attributes ??
    null;
  const customSku =
    variantSnapshot?.customSku ??
    productSnapshot?.customSku ??
    null;
  const name = buildItemLabel(
    productNameFromVariant ?? variantSnapshot?.name ?? productSnapshot?.name,
    attributes,
    sku,
    customSku,
  );
  const availableValue =
    typeof item.available === "number"
      ? item.available
      : item.onHand - item.reserved;
  const minStock =
    variantSnapshot?.minStock ??
    productSnapshot?.minStock ??
    0;
  const productType = productSnapshot?.type ?? "unknown";

  return {
    id: `${item.stockItemId}-${item.warehouseId}-${item.locationId ?? "na"}`,
    stockItemId: item.stockItemId,
    sku,
    name,
    warehouse: item.warehouse?.name ?? item.warehouseId,
    warehouseId: item.warehouseId,
    onHand: item.onHand ?? 0,
    reserved: item.reserved ?? 0,
    available: availableValue ?? 0,
    min: 0,
    minStock,
    ideal: 0,
    daysRemaining: null,
    dailyConsumption: 0,
    productType,
  };
};

export const aggregateByWarehouse = (rows: InventoryRow[]) => {
  const map = new Map<string, InventoryRow>();

  rows.forEach((row) => {
    const key = row.warehouseId || row.warehouse;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row });
      return;
    }

    map.set(key, {
      ...existing,
      onHand: existing.onHand + row.onHand,
      reserved: existing.reserved + row.reserved,
      available: existing.available + row.available,
    });
  });

  return Array.from(map.values());
};
