import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleOrderExportColumn, SaleOrderExportPreset } from "@/features/sale-orders/types/saleOrder";
import {
  clearSaleOrderExportCache,
  invalidateSaleOrderExportPresetsCache,
  loadSaleOrderExportColumnsCached,
  loadSaleOrderExportPresetsCached,
} from "./saleOrderExportCache";
import {
  getSaleOrderExportColumns,
  getSaleOrderExportPresets,
} from "@/shared/services/saleOrderService";

vi.mock("@/shared/services/saleOrderService", () => ({
  getSaleOrderExportColumns: vi.fn(),
  getSaleOrderExportPresets: vi.fn(),
}));

const getSaleOrderExportColumnsMock = vi.mocked(getSaleOrderExportColumns);
const getSaleOrderExportPresetsMock = vi.mocked(getSaleOrderExportPresets);

describe("saleOrderExportCache", () => {
  beforeEach(() => {
    clearSaleOrderExportCache();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("reuses cached export columns after the first request", async () => {
    const columns: SaleOrderExportColumn[] = [{ key: "number", label: "Numero" }];
    getSaleOrderExportColumnsMock.mockResolvedValue(columns);

    await expect(loadSaleOrderExportColumnsCached()).resolves.toEqual(columns);
    await expect(loadSaleOrderExportColumnsCached()).resolves.toEqual(columns);

    expect(getSaleOrderExportColumnsMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent export column requests", async () => {
    const columns: SaleOrderExportColumn[] = [{ key: "client", label: "Cliente" }];
    getSaleOrderExportColumnsMock.mockResolvedValue(columns);

    const [first, second] = await Promise.all([
      loadSaleOrderExportColumnsCached(),
      loadSaleOrderExportColumnsCached(),
    ]);

    expect(first).toEqual(columns);
    expect(second).toEqual(columns);
    expect(getSaleOrderExportColumnsMock).toHaveBeenCalledTimes(1);
  });

  it("reuses export columns from session storage after a page reload", async () => {
    const columns: SaleOrderExportColumn[] = [{ key: "number", label: "Numero" }];
    getSaleOrderExportColumnsMock.mockResolvedValue(columns);

    await expect(loadSaleOrderExportColumnsCached()).resolves.toEqual(columns);
    expect(getSaleOrderExportColumnsMock).toHaveBeenCalledTimes(1);

    vi.resetModules();
    const reloadedCache = await import("./saleOrderExportCache");

    await expect(reloadedCache.loadSaleOrderExportColumnsCached()).resolves.toEqual(columns);
    expect(getSaleOrderExportColumnsMock).toHaveBeenCalledTimes(1);
  });

  it("ignores old export column storage so new backend columns are loaded", async () => {
    const oldColumns: SaleOrderExportColumn[] = [{ key: "number", label: "Numero" }];
    const updatedColumns: SaleOrderExportColumn[] = [
      ...oldColumns,
      { key: "SKUS", label: "SKUS" },
      { key: "detail", label: "Detalle" },
    ];
    sessionStorage.setItem("sale-orders:export-columns:v1", JSON.stringify(oldColumns));
    getSaleOrderExportColumnsMock.mockResolvedValue(updatedColumns);

    await expect(loadSaleOrderExportColumnsCached()).resolves.toEqual(updatedColumns);

    expect(getSaleOrderExportColumnsMock).toHaveBeenCalledTimes(1);
  });

  it("caches export presets by user", async () => {
    const userOnePresets: SaleOrderExportPreset[] = [
      { metricId: "metric-1", name: "Usuario 1", snapshot: { columns: [] } },
    ];
    const userTwoPresets: SaleOrderExportPreset[] = [
      { metricId: "metric-2", name: "Usuario 2", snapshot: { columns: [] } },
    ];
    getSaleOrderExportPresetsMock
      .mockResolvedValueOnce(userOnePresets)
      .mockResolvedValueOnce(userTwoPresets);

    await expect(loadSaleOrderExportPresetsCached("user-1")).resolves.toEqual(userOnePresets);
    await expect(loadSaleOrderExportPresetsCached("user-1")).resolves.toEqual(userOnePresets);
    await expect(loadSaleOrderExportPresetsCached("user-2")).resolves.toEqual(userTwoPresets);

    expect(getSaleOrderExportPresetsMock).toHaveBeenCalledTimes(2);
  });

  it("reuses user export presets from session storage after a page reload", async () => {
    const presets: SaleOrderExportPreset[] = [
      { metricId: "metric-1", name: "Persistido", snapshot: { columns: [] } },
    ];
    getSaleOrderExportPresetsMock.mockResolvedValue(presets);

    await expect(loadSaleOrderExportPresetsCached("user-1")).resolves.toEqual(presets);
    expect(getSaleOrderExportPresetsMock).toHaveBeenCalledTimes(1);

    vi.resetModules();
    const reloadedCache = await import("./saleOrderExportCache");

    await expect(reloadedCache.loadSaleOrderExportPresetsCached("user-1")).resolves.toEqual(presets);
    expect(getSaleOrderExportPresetsMock).toHaveBeenCalledTimes(1);
  });

  it("refetches export presets after invalidating the user cache", async () => {
    const firstPresets: SaleOrderExportPreset[] = [
      { metricId: "metric-1", name: "Inicial", snapshot: { columns: [] } },
    ];
    const updatedPresets: SaleOrderExportPreset[] = [
      { metricId: "metric-2", name: "Actualizado", snapshot: { columns: [] } },
    ];
    getSaleOrderExportPresetsMock
      .mockResolvedValueOnce(firstPresets)
      .mockResolvedValueOnce(updatedPresets);

    await expect(loadSaleOrderExportPresetsCached("user-1")).resolves.toEqual(firstPresets);
    invalidateSaleOrderExportPresetsCache("user-1");

    await expect(loadSaleOrderExportPresetsCached("user-1")).resolves.toEqual(updatedPresets);

    expect(getSaleOrderExportPresetsMock).toHaveBeenCalledTimes(2);
  });
});
