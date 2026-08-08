export const ProductTypes = {
  PRIMA: "PRIMA",
  FINISHED: "FINISHED",
  PRODUCT: "PRODUCT",
  MATERIAL: "MATERIAL",
  SUPPLY: "SUPPLY",
} as const;

export type ProductType = typeof ProductTypes[keyof typeof ProductTypes];


