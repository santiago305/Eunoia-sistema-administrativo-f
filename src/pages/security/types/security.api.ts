export type SecurityTopIpItem = {
  ip: string;
  violations: number;
  lastViolationAt: string | null;
};

export type SecurityBanLevel = "TEMPORARY" | "PERMANENT" | number | string;

export type SecurityActiveBanItem = {
  id?: string;
  ip: string;
  banLevel: SecurityBanLevel;
  bannedUntil: string | null;
  manualPermanentBan: boolean;
  notes?: string | null;
  lastReason?: string | null;
  createdBy?: string | null;
  reviewedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdAtLocal?: string;
  updatedAtLocal?: string;
  bannedUntilLocal?: string;
  timeZone?: string;
};

export type SecurityPaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type SecurityPaginatedMeta = {
  total: number;
  page: number;
  limit: number;
};

export type SecurityListResponse<T> = {
  data: T[];
  pagination: SecurityPaginatedMeta | null;
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

export type SecuritySeriesGroupBy = "5min" | "15min" | "30min" | "hour" | "day";

export type SecurityActivitySeriesItem = {
  label: string;
  violations: number;
  bans: number;
  uniqueIps: number;
  bucketStart?: string;
  bucketStartLocal?: string;
  bucketLabel?: string;
};

export type SecurityActivitySeriesResponse = SecurityWindowResponse & {
  groupBy: SecuritySeriesGroupBy;
  timeZone?: string;
  bucketSize?: string;
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

export type SecurityReasonCatalogItem = {
  key: string;
  label: string;
  count: number;
  active: boolean;
};

export type SecurityReasonCatalogResponse = {
  data: SecurityReasonCatalogItem[];
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

export type SecurityRiskScoreByIpResponse = {
  ip: string;
  score: number;
  level: SecurityRiskLevel;
  label: string;
  windowHours?: number;
  generatedAt?: string;
  details?: {
    from?: string;
    to?: string;
    timeZone?: string;
    metrics?: {
      violations?: number;
      distinctReasons?: number;
      hasActiveBan?: boolean;
      isManualPermanentBan?: boolean;
    };
    components?: {
      fromViolations?: number;
      fromReasons?: number;
      fromActiveBan?: number;
      fromManualBan?: number;
    };
  };
};
