import type { DataTableSearchOption } from "@/shared/components/table/search";
import type { ProductSearchSnapshot } from "@/features/catalog/utils/productSmartSearch";

export type ProductRecentSearch = {
  recentId: string;
  label: string;
  snapshot: ProductSearchSnapshot;
  lastUsedAt: string;
};

export type ProductSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: ProductSearchSnapshot;
  updatedAt: string;
};

export type ProductSearchStateResponse = {
  recent: ProductRecentSearch[];
  saved: ProductSavedMetric[];
  catalogs: {
    statuses: DataTableSearchOption[];
  };
};

