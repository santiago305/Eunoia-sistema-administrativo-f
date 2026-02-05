export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    retryAfterSeconds?: number;
    lockedUntil?: string;
    status?: number;
  };
}
