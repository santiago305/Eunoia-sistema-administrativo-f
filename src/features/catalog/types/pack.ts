export type PackIdDomain = { value: string };

export type SkuAttribute = { code: string; name?: string | null; value: string };

export type PackItemSku = {
  id: string;
  backendSku: string;
  customSku: string | null;
  name: string;
  barcode?: string | null;
  price: number;
  image?: string | null;
  isActive: boolean;
  attributes: SkuAttribute[];
};

export type PackListItem = {
  packId: PackIdDomain;
  description: string;
  total: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PackListEntry = {
  pack: {
    packId: PackIdDomain | string;
    description: string;
    total: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  items: PackDetailResponse["items"];
};

export type PackRow = {
  packId: string;
  description: string;
  total: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  itemsPreview: string[];
  itemsCount: number;
};

export type PackDetailResponse = {
  pack: PackListItem;
  items: Array<{
    id: string;
    skuId: string;
    quantity: number;
    price: number;
    lineTotal: number;
    sku: PackItemSku | null;
  }>;
};

export type CreatePackBody = {
  description: string;
  total: number;
  isActive?: boolean;
  items: Array<{
    skuId: string;
    quantity: number;
    price: number;
  }>;
};

export type PackItemReplaceInput = {
  id?: string;
  skuId: string;
  quantity: number;
  price: number;
};

export type UpdatePackBody = {
  description?: string;
  isActive?: boolean;
  total: number;
  itemsReplace: PackItemReplaceInput[];
};

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };
