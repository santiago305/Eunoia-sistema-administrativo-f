export type SecurityTopIpItem = {
  ip: string;
  violations: number;
  lastViolationAt: string | null;
};

export type SecurityBanLevel = "TEMPORARY" | "PERMANENT" | string;

export type SecurityActiveBanItem = {
  ip: string;
  banLevel: SecurityBanLevel;
  bannedUntil: string | null;
  manualPermanentBan: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SecurityViolationItem = {
  reason: string;
  path: string;
  method: string;
  userAgent: string | null;
  createdAt: string;
};

export type SecurityIpBanStatus = {
  ip: string;
  banLevel: SecurityBanLevel;
  bannedUntil: string | null;
  manualPermanentBan: boolean;
  notes?: string | null;
};

export type SecurityHistoryByIpResponse = {
  ban: SecurityIpBanStatus | null;
  violations: SecurityViolationItem[];
};

export type SecurityBlacklistPayload = {
  ip: string;
  notes?: string;
};

export type SecurityMutationResponse = {
  message: string;
};

export type SecurityWindowResponse = {
  from: string;
  to: string;
  generatedAt: string;
};

export type SecuritySeriesGroupBy = "hour" | "day";

export type SecurityActivitySeriesItem = {
  label: string;
  violations: number;
  bans: number;
  uniqueIps: number;
};

export type SecurityActivitySeriesResponse = SecurityWindowResponse & {
  groupBy: SecuritySeriesGroupBy;
  data: SecurityActivitySeriesItem[];
};

export type SecurityReasonDistributionItem = {
  key: string;
  name: string;
  label: string;
  value: number;
};

export type SecurityReasonDistributionResponse = SecurityWindowResponse & {
  data: SecurityReasonDistributionItem[];
};

export type SecurityMethodDistributionItem = {
  method: string;
  count: number;
};

export type SecurityMethodDistributionResponse = SecurityWindowResponse & {
  data: SecurityMethodDistributionItem[];
};

export type SecurityTopRouteItem = {
  path: string;
  count: number;
};

export type SecurityTopRoutesResponse = SecurityWindowResponse & {
  data: SecurityTopRouteItem[];
};

export type SecurityRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type SecurityRiskScoreResponse = SecurityWindowResponse & {
  data: {
    score: number;
    level: SecurityRiskLevel;
    label: string;
  };
  extra: {
    metrics: {
      violations: number;
      uniqueIps: number;
      activeBans: number;
      manualPermanentBans: number;
    };
  };
};
