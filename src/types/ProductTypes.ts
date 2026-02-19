export const ProductTypes = {
  PRIMA: "PRIMA",
  FINISHED: "FINISHED",
} as const;

export type ProductType = typeof ProductTypes[keyof typeof ProductTypes];
