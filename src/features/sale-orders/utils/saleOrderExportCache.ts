import type { SaleOrderExportColumn, SaleOrderExportPreset } from "@/features/sale-orders/types/saleOrder";
import {
  getSaleOrderExportColumns,
  getSaleOrderExportPresets,
} from "@/shared/services/saleOrderService";

let exportColumnsCache: SaleOrderExportColumn[] | null = null;
let exportColumnsRequest: Promise<SaleOrderExportColumn[]> | null = null;

const exportPresetsCache = new Map<string, SaleOrderExportPreset[]>();
const exportPresetsRequests = new Map<string, Promise<SaleOrderExportPreset[]>>();

const EXPORT_COLUMNS_STORAGE_KEY = "sale-orders:export-columns:v2";
const EXPORT_PRESETS_STORAGE_PREFIX = "sale-orders:export-presets:v1:";

const getPresetCacheKey = (userId?: string | null) => userId?.trim() || null;
const getPresetStorageKey = (cacheKey: string) => `${EXPORT_PRESETS_STORAGE_PREFIX}${encodeURIComponent(cacheKey)}`;

const getSessionStorage = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage ?? null;
};

const readStorageArray = <T>(key: string): T[] | null => {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) return parsed as T[];

    storage.removeItem(key);
    return null;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

const writeStorageArray = <T>(key: string, value: T[]) => {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    storage.removeItem(key);
  }
};

const removeStorageItem = (key: string) => {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(key);
};

export const loadSaleOrderExportColumnsCached = async (): Promise<SaleOrderExportColumn[]> => {
  if (exportColumnsCache) return exportColumnsCache;
  if (exportColumnsRequest) return exportColumnsRequest;

  const storedColumns = readStorageArray<SaleOrderExportColumn>(EXPORT_COLUMNS_STORAGE_KEY);
  if (storedColumns) {
    exportColumnsCache = storedColumns;
    return storedColumns;
  }

  exportColumnsRequest = getSaleOrderExportColumns()
    .then((columns) => {
      exportColumnsCache = columns ?? [];
      writeStorageArray(EXPORT_COLUMNS_STORAGE_KEY, exportColumnsCache);
      return exportColumnsCache;
    })
    .finally(() => {
      exportColumnsRequest = null;
    });

  return exportColumnsRequest;
};

export const loadSaleOrderExportPresetsCached = async (
  userId?: string | null,
): Promise<SaleOrderExportPreset[]> => {
  const cacheKey = getPresetCacheKey(userId);
  if (!cacheKey) return getSaleOrderExportPresets();

  const cached = exportPresetsCache.get(cacheKey);
  if (cached) return cached;

  const storageKey = getPresetStorageKey(cacheKey);
  const storedPresets = readStorageArray<SaleOrderExportPreset>(storageKey);
  if (storedPresets) {
    exportPresetsCache.set(cacheKey, storedPresets);
    return storedPresets;
  }

  const pending = exportPresetsRequests.get(cacheKey);
  if (pending) return pending;

  const request = getSaleOrderExportPresets()
    .then((presets) => {
      const next = presets ?? [];
      exportPresetsCache.set(cacheKey, next);
      writeStorageArray(storageKey, next);
      return next;
    })
    .finally(() => {
      exportPresetsRequests.delete(cacheKey);
    });

  exportPresetsRequests.set(cacheKey, request);
  return request;
};

export const invalidateSaleOrderExportPresetsCache = (userId?: string | null) => {
  const cacheKey = getPresetCacheKey(userId);
  if (!cacheKey) return;

  exportPresetsCache.delete(cacheKey);
  exportPresetsRequests.delete(cacheKey);
  removeStorageItem(getPresetStorageKey(cacheKey));
};

export const clearSaleOrderExportCache = () => {
  exportColumnsCache = null;
  exportColumnsRequest = null;
  exportPresetsCache.clear();
  exportPresetsRequests.clear();
  removeStorageItem(EXPORT_COLUMNS_STORAGE_KEY);

  const storage = getSessionStorage();
  if (!storage) return;

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(EXPORT_PRESETS_STORAGE_PREFIX)) {
      storage.removeItem(key);
    }
  }
};
