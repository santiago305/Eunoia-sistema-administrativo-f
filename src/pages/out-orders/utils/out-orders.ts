import { DocType } from "@/pages/warehouse/types/warehouse";
import { CreateOutOrder, AddOutOrderItemDto  } from "../type/outOrder";
import { ProductCatalogSkuAttribute } from "@/pages/catalog/types/product";

export const buildEmptyFormOutOrder = (): CreateOutOrder => ({
  docType: DocType.OUT,
  serieId: "",
  warehouseId: "",
  note: "",
  items: [],
});

export const buildEmptyItemOutOrder = (): AddOutOrderItemDto => ({
  itemId: "",
  quantity: 1,
  unitCost: undefined,
});


export const getAttr = (attrs: ProductCatalogSkuAttribute[] | undefined, code: string) =>
  (attrs ?? []).find((a) => a.code === code)?.value?.trim() ?? "";

export const formatAttrs = (attrs: ProductCatalogSkuAttribute[] | undefined) =>
  (attrs ?? [])
    .map((a) => a.value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");