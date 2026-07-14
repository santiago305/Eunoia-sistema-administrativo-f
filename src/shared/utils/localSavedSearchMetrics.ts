import type { DataTableSavedSearchItem } from "@/shared/components/table/search";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function loadLocalSavedSearchMetrics<TSnapshot>(
  storageKey: string,
): DataTableSavedSearchItem<TSnapshot>[] {
  if (!canUseLocalStorage()) return [];
  const parsed = safeParseJson<DataTableSavedSearchItem<TSnapshot>[]>(
    window.localStorage.getItem(storageKey),
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function saveLocalSearchMetric<TSnapshot>(
  storageKey: string,
  item: Omit<DataTableSavedSearchItem<TSnapshot>, "id"> & { id?: string },
): DataTableSavedSearchItem<TSnapshot>[] {
  const nextItem: DataTableSavedSearchItem<TSnapshot> = {
    ...item,
    id: item.id ?? `local-${Date.now()}`,
  };
  const current = loadLocalSavedSearchMetrics<TSnapshot>(storageKey);
  const next = [nextItem, ...current.filter((entry) => entry.id !== nextItem.id)];

  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }

  return next;
}

export function deleteLocalSearchMetric<TSnapshot>(
  storageKey: string,
  metricId: string,
): DataTableSavedSearchItem<TSnapshot>[] {
  const next = loadLocalSavedSearchMetrics<TSnapshot>(storageKey).filter(
    (entry) => entry.id !== metricId,
  );

  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }

  return next;
}
