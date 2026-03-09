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
