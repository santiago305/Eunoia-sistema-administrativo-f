export type Session = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ip?: string;
  userAgent?: string;
  lastActive: string;
  isCurrent?: boolean;
  createdAt: string;
  expiresAt: string;
};
