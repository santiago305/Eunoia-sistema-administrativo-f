export type SessionApiDto = {
  id: string;
  userId: string;
  isCurrent: boolean;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  ip: string | null;
  userAgent: string | null;
  deviceName: string | null;
};

export type SessionMessageResponse = {
  message: string;
};
