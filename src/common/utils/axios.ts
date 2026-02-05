import { logoutUser, refresh_token } from '@/services/authService';
import axios, { type AxiosRequestConfig } from 'axios';
import { env } from '@/env'

const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
});

let isRefreshing = false;
type FailedQueueItem = {
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
};

let failedQueue: FailedQueueItem[] = [];

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return "";
  const item = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!item) return "";
  return decodeURIComponent(item.split("=")[1] ?? "");
};

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.request.use((config) => {
  const method = String(config.method ?? "get").toLowerCase();
  const needsCsrf = ["post", "put", "patch", "delete"].includes(method);
  const csrfToken = getCookieValue("csrf_token");
  if (needsCsrf && csrfToken) {
    config.headers = config.headers ?? {};
    config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const responseMessage = String(error.response?.data?.message ?? "");

    if (status === 429) {
      console.warn("Demasiados intentos. Intenta de nuevo en 1 minuto.");
    }

    if (status === 403 && responseMessage.toLowerCase().includes("csrf")) {
      console.warn("Tu sesion de seguridad expiro. Recarga la pagina e intenta de nuevo.");
    }

    const isAuthEndpoint = originalRequest.url?.includes('/auth/refresh') ?? false;
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axiosInstance(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refresh_token(); 

        processQueue(null, newToken);

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logoutUser();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
