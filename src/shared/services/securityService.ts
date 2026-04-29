import axiosInstance from "@/shared/common/utils/axios";
import { API_SECURITY_GROUP } from "@/shared/services/APIs";
import {
  securityBlacklistSchema,
  securityHoursAndReasonQuerySchema,
  securityHoursQuerySchema,
  securityHistoryQuerySchema,
  securityReasonsQuerySchema,
  securitySeriesQuerySchema,
  securityTopIpsQuerySchema,
  securityTopRoutesQuerySchema,
} from "@/shared/schemas/securitySchemas";
import type {
  SecurityActivitySeriesResponse,
  SecurityActiveBanItem,
  SecurityBlacklistPayload,
  SecurityHistoryByIpResponse,
  SecurityListResponse,
  SecurityMethodDistributionResponse,
  SecurityMutationResponse,
  SecurityPaginatedResponse,
  SecurityReasonCatalogResponse,
  SecurityReasonDistributionResponse,
  SecurityRiskScoreByIpResponse,
  SecurityRiskScoreResponse,
  SecuritySeriesGroupBy,
  SecurityTopIpItem,
  SecurityTopRoutesResponse,
} from "@/features/security/types/security.api";

export type SecurityTopIpsParams = {
  hours?: number;
  limit?: number;
  reason?: string;
};

export type SecurityHistoryParams = {
  limit?: number;
};

export type SecurityActiveBansParams = {
  page?: number;
  limit?: number;
};

export type SecuritySeriesParams = {
  hours?: number;
  groupBy?: SecuritySeriesGroupBy;
  reason?: string;
};

export type SecurityHoursParams = {
  hours?: number;
};

export type SecurityTopRoutesParams = {
  hours?: number;
  limit?: number;
  reason?: string;
};

export type SecurityHoursAndReasonParams = {
  hours?: number;
  reason?: string;
};

export type SecurityAuditExportParams = {
  hours?: number;
  reason?: string;
};

export type SecurityReasonsParams = {
  hours?: number;
  activeOnly?: boolean;
};

export const getSecurityTopIps = async (params?: SecurityTopIpsParams) => {
  const query = securityTopIpsQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<
    SecurityTopIpItem[] | SecurityPaginatedResponse<SecurityTopIpItem>
  >(API_SECURITY_GROUP.topIps, {
    params: query,
  });

  const items = Array.isArray(response.data) ? response.data : response.data.data ?? [];

  return items.map((item) => ({
    ...item,
    violations: Number(item.violations) || 0,
  }));
};

export const getSecuritySummary = async (params?: SecurityHoursAndReasonParams) => {
  const query = securityHoursAndReasonQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<{
    from: string;
    to: string;
    generatedAt: string;
    timeZone?: string;
    data: {
      topViolations: number;
      activeBans: number;
      temporaryBans: number;
      permanentBans: number;
    };
  }>(API_SECURITY_GROUP.summary, {
    params: query,
  });
  return response.data;
};

export const getSecurityActiveBans = async (
  params?: SecurityActiveBansParams,
): Promise<SecurityListResponse<SecurityActiveBanItem>> => {
  const response = await axiosInstance.get<
    SecurityActiveBanItem[] | SecurityPaginatedResponse<SecurityActiveBanItem>
  >(API_SECURITY_GROUP.activeBans, {
    params: params
      ? {
          ...(params.page ? { page: params.page } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        }
      : undefined,
  });

  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      pagination: null,
    };
  }

  return {
    data: response.data.data ?? [],
    pagination: {
      total: Number(response.data.total) || 0,
      page: Number(response.data.page) || 1,
      limit: Number(response.data.limit) || 10,
    },
  };
};

export const getSecurityActivitySeries = async (params?: SecuritySeriesParams) => {
  const query = securitySeriesQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityActivitySeriesResponse>(
    API_SECURITY_GROUP.activitySeries,
    { params: query }
  );
  return response.data;
};

export const getSecurityReasonDistribution = async (params?: SecurityHoursParams) => {
  const query = securityHoursQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityReasonDistributionResponse>(
    API_SECURITY_GROUP.reasonDistribution,
    { params: query }
  );
  return response.data;
};

export const getSecurityMethodDistribution = async (params?: SecurityHoursAndReasonParams) => {
  const query = securityHoursAndReasonQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityMethodDistributionResponse>(
    API_SECURITY_GROUP.methodDistribution,
    { params: query }
  );
  return response.data;
};

export const getSecurityTopRoutes = async (params?: SecurityTopRoutesParams) => {
  const query = securityTopRoutesQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityTopRoutesResponse>(
    API_SECURITY_GROUP.topRoutes,
    { params: query }
  );
  return response.data;
};

export const getSecurityRiskScore = async (params?: SecurityHoursParams) => {
  const query = securityHoursQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityRiskScoreResponse>(
    API_SECURITY_GROUP.riskScore,
    { params: query }
  );
  return response.data;
};

export const getSecurityHistoryByIp = async (ip: string, params?: SecurityHistoryParams) => {
  const query = securityHistoryQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityHistoryByIpResponse>(
    API_SECURITY_GROUP.historyByIp(ip),
    { params: query }
  );
  return response.data;
};

export const blacklistSecurityIp = async (payload: SecurityBlacklistPayload) => {
  const body = securityBlacklistSchema.parse(payload);
  const response = await axiosInstance.patch<SecurityMutationResponse>(
    API_SECURITY_GROUP.blacklist,
    body
  );
  return response.data;
};

export const removeSecurityBlacklistIp = async (ip: string) => {
  const response = await axiosInstance.patch<SecurityMutationResponse>(
    API_SECURITY_GROUP.removeBlacklist(ip)
  );
  return response.data;
};

export const getSecurityReasons = async (params?: SecurityReasonsParams) => {
  const query = securityReasonsQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityReasonCatalogResponse>(
    API_SECURITY_GROUP.reasons,
    { params: query }
  );
  return response.data.data;
};

export const exportSecurityAudit = async (params?: SecurityAuditExportParams) => {
  const query = securityHoursAndReasonQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<Blob>(API_SECURITY_GROUP.auditExport, {
    params: query,
    responseType: "blob",
  });
  return response.data;
};

export const getSecurityRiskScoreByIp = async (ip: string, params?: SecurityHoursParams) => {
  const query = securityHoursQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityRiskScoreByIpResponse>(
    API_SECURITY_GROUP.riskScoreByIp,
    {
      params: {
        ...query,
        ip: ip.trim(),
      },
    }
  );
  return response.data;
};
