import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import apiConfig from '../config/api';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUserJson,
  setAccessToken,
  setStoredUserJson,
} from './tokenStorage';

export const apiClient = axios.create({
  baseURL: apiConfig.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];
let sessionExpiredHandler: (() => void) | null = null;

function flushRefreshQueue(token: string | null) {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string; user?: unknown }>(
      apiConfig.ENDPOINTS.AUTH.REFRESH,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const newAccessToken = response.data.accessToken;
    await setAccessToken(newAccessToken);

    if (response.data.user) {
      await setStoredUserJson(JSON.stringify(response.data.user));
    }

    return newAccessToken;
  } catch (error) {
    console.warn('[apiClient] Falha ao renovar sessão:', error);
    await clearAuthSession();
    sessionExpiredHandler?.();
    return null;
  }
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      flushRefreshQueue(newToken);

      if (!newToken) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } finally {
      isRefreshing = false;
    }
  }
);

export async function restoreSessionOnStartup(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  const userJson = await getStoredUserJson();

  if (!refreshToken || !userJson) {
    return !!(await getAccessToken()) && !!userJson;
  }

  const token = await refreshAccessToken();
  return !!token;
}
