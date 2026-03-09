import axiosInstance from "@/common/utils/axios";
import { API_SECURITY_GROUP } from "@/services/APIs";
import {
  securityBlacklistSchema,
  securityHoursQuerySchema,
  securityHistoryQuerySchema,
  securitySeriesQuerySchema,
  securityTopIpsQuerySchema,
  securityTopRoutesQuerySchema,
} from "@/schemas/securitySchemas";
import type {
  SecurityActivitySeriesResponse,
  SecurityActiveBanItem,
  SecurityBlacklistPayload,
  SecurityHistoryByIpResponse,
  SecurityMethodDistributionResponse,
  SecurityMutationResponse,
  SecurityReasonDistributionResponse,
  SecurityRiskScoreResponse,
  SecuritySeriesGroupBy,
  SecurityTopIpItem,
  SecurityTopRoutesResponse,
} from "@/pages/security/types/security.api";

export type SecurityTopIpsParams = {
  hours?: number;
  limit?: number;
};

export type SecurityHistoryParams = {
  limit?: number;
};

export type SecuritySeriesParams = {
  hours?: number;
  groupBy?: SecuritySeriesGroupBy;
};

export type SecurityHoursParams = {
  hours?: number;
};

export type SecurityTopRoutesParams = {
  hours?: number;
  limit?: number;
};

export const getSecurityTopIps = async (params?: SecurityTopIpsParams) => {
  const query = securityTopIpsQuerySchema.parse(params ?? {});
  const response = await axiosInstance.get<SecurityTopIpItem[]>(API_SECURITY_GROUP.topIps, {
    params: query,
  });
  return response.data;
};

export const getSecurityActiveBans = async () => {
  const response = await axiosInstance.get<SecurityActiveBanItem[]>(API_SECURITY_GROUP.activeBans);
  return response.data;
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

export const getSecurityMethodDistribution = async (params?: SecurityHoursParams) => {
  const query = securityHoursQuerySchema.parse(params ?? {});
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
