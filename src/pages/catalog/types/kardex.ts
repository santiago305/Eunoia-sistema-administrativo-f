import { z } from "zod";
import { listKardexQuerySchema } from "@/schemas/kardexSchemas";

export type KardexListQuery = z.infer<typeof listKardexQuerySchema>;

export type LedgerWarehouseSnapshot = {
  id: string;
  name: string;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  address?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export type LedgerProductSnapshot = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  isActive?: boolean;
  createdAt?: string;
  unidad?:string | null;
};

export type LedgerVariantSnapshot = {
  id: string;
  name: string;
  productId?: string | null;
  sku: string;
  barcode?: string | null;
  isActive?: boolean;
  createdAt?: string;
  unidad?:string | null;
};

export type LedgerStockItemSnapshot = {
  id: string;
  type: string;
  productId?: string | null;
  variantId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  product?: LedgerProductSnapshot | null;
  variant?: LedgerVariantSnapshot | null;
};

export type LedgerSerieSnapshot = {
  id: string;
  code: string;
};

export type LedgerDocumentSnapshot = {
  id: string;
  docType?: string;
  status?: string;
  serieId?: string | null;
  serie?: LedgerSerieSnapshot | null;
  correlative?: number | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  fromWarehouse?: LedgerWarehouseSnapshot | null;
  toWarehouse?: LedgerWarehouseSnapshot | null;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
  createdBy?: LedgerUserSnapshot;
  postedBy?: LedgerUserSnapshot;
  postedAt?: string | null;
  createdAt?: string | null;
};

export type LedgerSupplierSnapshot = {
  id: string;
  documentType?: string | null;
  documentNumber?: string | null;
  name?: string | null;
  lastName?: string | null;
  tradeName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  leadTimeDays?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LedgerUserSnapshot = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  telefono?: string | null;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LedgerPurchaseSnapshot = {
  id: string;
  supplierId: string;
  warehouseId: string;
  documentType?: string | null;
  serie?: string | null;
  correlative?: number | null;
  currency?: string | null;
  paymentForm?: string | null;
  creditDays?: number | null;
  numQuotas?: number | null;
  totalTaxed?: number | null;
  totalExempted?: number | null;
  totalIgv?: number | null;
  purchaseValue?: number | null;
  total?: number | null;
  note?: string | null;
  status?: string | null;
  isActive?: boolean;
  expectedAt?: string | null;
  dateIssue?: string | null;
  dateExpiration?: string | null;
  createdAt?: string;
};

export type LedgerProductionSnapshot = {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  docType?: string | null;
  serieId?: string | null;
  serie?: string | null;
  correlative?: number | null;
  status?: string | null;
  reference?: string | null;
  manufactureDate?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LedgerReferenceDocSnapshot = {
  type: string;
  purchase?: LedgerPurchaseSnapshot;
  production?: LedgerProductionSnapshot;
  warehouse?: LedgerWarehouseSnapshot;
  supplier?: LedgerSupplierSnapshot;
  fromWarehouse?: LedgerWarehouseSnapshot;
  toWarehouse?: LedgerWarehouseSnapshot;
  createdBy?: LedgerUserSnapshot;
};

export type LedgerEntry = {
  id: string;
  docId?: string | null;
  document?: LedgerDocumentSnapshot | null;
  referenceDoc?: LedgerReferenceDocSnapshot | null;
  warehouse?: LedgerWarehouseSnapshot | null;
  stockItem?: LedgerStockItemSnapshot | null;
  locationId?: string | null;
  stockItemId?: string | null;
  direction: string;
  quantity: number;
  unitCost?: number | string | null;
  createdAt?: string | null;
  balance?: number | null;
  createdBy?: LedgerUserSnapshot;
};

export type KardexBalances = {
  entradaRango?: number;
  salidaRango?: number;
  balanceRango?: number;
  balanceInicial?: number;
  balanceFinal?: number;
  balanceTotal?: number;
};

export type KardexListResponse = {
  items: LedgerEntry[];
  total: number;
  page: number;
  limit: number;
  balances?: KardexBalances;
};

export type KardexTotalsQuery = {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  docId?: string;
  from?: string;
  to?: string;
};

export type KardexDailyTotal = {
  day: string;
  entrada: number;
  salida: number;
  balance: number;
};
