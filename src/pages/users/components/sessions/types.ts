export type Session = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  location?: string;
  ip?: string;
  lastActive: string;
  isCurrent: boolean;
};
