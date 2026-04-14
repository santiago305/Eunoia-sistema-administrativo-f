import { z } from "zod";
import {
  createProductEquivalenceSchema,
  listProductEquivalencesQuerySchema,
} from "@/schemas/equivalenceSchema";

export type ListProductEquivalencesQuery = z.infer<typeof listProductEquivalencesQuerySchema>;
export type CreateProductEquivalenceDto = z.infer<typeof createProductEquivalenceSchema>;

export type ProductEquivalence = {
  id: string;
  productId: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
  product?: {
    id: string;
    name: string;
  };
  fromUnit?: {
    id: string;
    code: string;
    name: string;
  };
  toUnit?: {
    id: string;
    code: string;
    name: string;
  };
};

export type ListProductEquivalencesResponse = ProductEquivalence[];

export type EquivalenceDraft = {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};


