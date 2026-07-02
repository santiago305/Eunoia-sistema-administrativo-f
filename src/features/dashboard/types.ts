import type { SaleOrderSearchRule } from "@/features/sale-orders/types/saleOrder";

export type DashboardSaleOrdersUbigeoQuery = {
  month?: string;
  filters?: SaleOrderSearchRule[];
  cancelBool?: boolean;
};

export type DashboardSaleOrdersUbigeoGroup = {
  id: string;
  label: string;
  orders: number;
  total: number;
  deliveryCostSum: number;
  collected: number;
  pending: number;
};

export type DashboardSaleOrdersUbigeoResponse = {
  groups: DashboardSaleOrdersUbigeoGroup[];
  totals: {
    orders: number;
    total: number;
    deliveryCostSum: number;
    collected: number;
    pending: number;
  };
};

export type DashboardUbigeoLevel = "department" | "province" | "district";
