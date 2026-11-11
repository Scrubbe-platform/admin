import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";

import { ApiError, type ApiEnvelope } from "@/types/api";

export const TOKEN_COOKIE = "TOKEN";
export const REFRESH_TOKEN_COOKIE = "REFRESH_TOKEN";

const SIGN_IN_PATH = "/sign-in";

/** Appends /api/v1 unless the configured base already ends with it. */
export function resolveBaseUrl(raw?: string): string {
  const base = (raw ?? "https://api.scrubbe.com").replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

export const API_BASE_URL = resolveBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_COOKIE);
}

export function setTokens(token: string, refreshToken?: string): void {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  Cookies.set(TOKEN_COOKIE, token, { sameSite: "lax", secure, path: "/" });
  if (refreshToken) {
    Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { sameSite: "lax", secure, path: "/" });
  }
}

export function clearTokens(): void {
  Cookies.remove(TOKEN_COOKIE, { path: "/" });
  Cookies.remove(REFRESH_TOKEN_COOKIE, { path: "/" });
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  /** Set on the refresh call itself so a failing refresh never recurses. */
  _isRefresh?: boolean;
  /** Set on sign-in calls, where a 401 means bad credentials, not an expired session. */
  _skipRefresh?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/** One refresh in flight at a time; concurrent 401s queue behind it. */
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError("Your session has expired. Sign in again.", 401, false);
  }

  const res = await api.post<ApiEnvelope<{ token?: string; accessToken?: string; refreshToken?: string }>>(
    "/auth/refresh-token",
    { refreshToken },
    { _isRefresh: true } as AxiosRequestConfig,
  );

  const body = res.data;
  const nextToken = body.data?.token ?? body.data?.accessToken;
  if (!body.success || !nextToken) {
    throw new ApiError(body.message || "Could not refresh your session.", res.status, Boolean(body.message));
  }

  setTokens(nextToken, body.data.refreshToken);
  return nextToken;
}

function bounceToSignIn(): void {
  clearTokens();
  if (typeof window === "undefined") return;
  if (window.location.pathname === SIGN_IN_PATH) return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${SIGN_IN_PATH}?next=${next}`);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RetriableConfig | undefined;

    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !config._isRefresh &&
      !config._skipRefresh
    ) {
      config._retried = true;
      try {
        refreshInFlight = refreshInFlight ?? refreshAccessToken();
        const token = await refreshInFlight;
        refreshInFlight = null;
        config.headers.set("Authorization", `Bearer ${token}`);
        return await api.request(config);
      } catch (refreshError) {
        refreshInFlight = null;
        bounceToSignIn();
        return Promise.reject(toApiError(refreshError));
      }
    }

    return Promise.reject(toApiError(error));
  },
);

/** Normalises anything thrown into an ApiError carrying the server's own message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown> | { message?: string }>;
    const status = axiosError.response?.status ?? null;
    const body = axiosError.response?.data;
    const serverMessage = typeof body?.message === "string" && body.message.trim() ? body.message : null;

    if (serverMessage) return new ApiError(serverMessage, status, true);
    if (axiosError.code === "ECONNABORTED") {
      return new ApiError("The request timed out before the server answered.", status, false);
    }
    if (!axiosError.response) {
      return new ApiError("Could not reach the Scrubbe API.", null, false);
    }
    return new ApiError(`Request failed with status ${status}.`, status, false);
  }

  if (error instanceof Error) return new ApiError(error.message, null, false);
  return new ApiError("Something went wrong.", null, false);
}

/**
 * Unwraps the envelope. `success === false` is a failure even on HTTP 200, and
 * the server's message is what propagates to the toast.
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await api.request<ApiEnvelope<T>>(config);
    const body = res.data;

    if (body === null || typeof body !== "object" || !("success" in body)) {
      throw new ApiError("The server returned a response in an unexpected shape.", res.status, false);
    }
    if (!body.success) {
      throw new ApiError(body.message || "The server rejected the request.", res.status, Boolean(body.message));
    }
    return body.data;
  } catch (error) {
    throw toApiError(error);
  }
}
