export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    retryAfterSeconds?: number;
    lockedUntil?: string;
    status?: number;
    backendType?: string;
    fieldErrors?: {
      email?: string;
      password?: string;
    };
  };
}
