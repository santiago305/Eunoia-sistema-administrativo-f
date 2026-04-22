import type { DataTableRecentSearchItem } from "@/components/table/search";

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

export function loadLocalRecentSearches<TSnapshot>(
  storageKey: string,
): DataTableRecentSearchItem<TSnapshot>[] {
  if (!canUseLocalStorage()) return [];
  const parsed = safeParseJson<DataTableRecentSearchItem<TSnapshot>[]>(
    window.localStorage.getItem(storageKey),
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function pushLocalRecentSearch<TSnapshot>(
  storageKey: string,
  item: DataTableRecentSearchItem<TSnapshot>,
  maxItems = 8,
): DataTableRecentSearchItem<TSnapshot>[] {
  if (!item?.id) return loadLocalRecentSearches(storageKey);

  const current = loadLocalRecentSearches<TSnapshot>(storageKey);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(
    0,
    maxItems,
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

