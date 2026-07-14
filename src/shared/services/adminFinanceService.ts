import axiosInstance from "@/shared/common/utils/axios";
import { API_ADMIN_FINANCE_GROUP } from "@/shared/services/APIs";
import type {
  AdminFinanceMovementResponse,
  AdminFinanceQuery,
  AdminFinanceSummary,
} from "@/features/admin-finance/types/adminFinance.types";

export async function getAdminFinanceSummary(query?: AdminFinanceQuery) {
  const response = await axiosInstance.get<AdminFinanceSummary>(
    API_ADMIN_FINANCE_GROUP.summary,
    { params: query },
  );
  return response.data;
}

export async function listAdminFinanceMovements(query?: AdminFinanceQuery) {
  const response = await axiosInstance.get<AdminFinanceMovementResponse>(
    API_ADMIN_FINANCE_GROUP.movements,
    { params: query },
  );
  return response.data;
}
