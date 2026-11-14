import type { AxiosRequestConfig } from "axios";

import { clearTokens, getToken, request, setTokens } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { CurrentUser } from "@/types/user";

/**
 * Staff sign-in. Two-factor authentication is mandatory: the first password
 * step never returns a session. Staff without an authenticator get a setup
 * challenge and enrol before their first session is issued.
 */
interface SessionData {
  tokens: { accessToken: string; refreshToken: string };
  admin: CurrentUser;
  sessionExpiresAt: string;
}

interface LoginData extends Partial<SessionData> {
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  mfaToken?: string;
  mfaSetup?: MfaSetup;
}

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
}

export interface MfaChallenge {
  /** Short-lived credential tying the code to this sign-in. Never shown. */
  mfaToken: string;
  /** Present when the account has no authenticator yet and must enrol now. */
  setup: MfaSetup | null;
}

export type LoginResult = { kind: "authenticated"; user: CurrentUser } | ({ kind: "mfa-required" } & MfaChallenge);

function storeSession(data: Partial<SessionData>): CurrentUser {
  if (!data.tokens?.accessToken || !data.admin) throw new Error("Sign-in didn't complete. Please try again.");
  setTokens(data.tokens.accessToken, data.tokens.refreshToken);
  return data.admin;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const data = await request<LoginData>({
    method: "POST",
    url: ENDPOINTS.auth.login,
    data: { email, password },
    _skipRefresh: true,
  } as AxiosRequestConfig);

  if (data.mfaRequired) {
    if (!data.mfaToken) throw new Error("The server asked for a second factor but sent no challenge.");
    return { kind: "mfa-required", mfaToken: data.mfaToken, setup: data.mfaSetup ?? null };
  }
  return { kind: "authenticated", user: storeSession(data) };
}

export async function verifyMfa(mfaToken: string, code: string): Promise<CurrentUser> {
  const data = await request<SessionData>({
    method: "POST",
    url: ENDPOINTS.auth.mfaVerify,
    data: { mfaToken, code: code.replace(/\s+/g, "") },
    _skipRefresh: true,
  } as AxiosRequestConfig);
  return storeSession(data);
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>({ method: "GET", url: ENDPOINTS.auth.me });
}

/** Ends the session on the server (so the token dies now, not at expiry), then forgets it locally. */
export async function logout(): Promise<void> {
  if (getToken()) {
    try {
      await request({ method: "POST", url: ENDPOINTS.auth.logout, _skipRefresh: true } as AxiosRequestConfig);
    } catch {
      // The local session is cleared regardless; a dead server session expires on its own.
    }
  }
  clearTokens();
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<void>({ method: "POST", url: ENDPOINTS.auth.changePassword, data: { currentPassword, newPassword } });
}

export interface StaffSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export function fetchSessions() {
  return request<StaffSession[]>({ method: "GET", url: ENDPOINTS.auth.sessions });
}

export function revokeSession(id: string) {
  return request<void>({ method: "DELETE", url: `${ENDPOINTS.auth.sessions}/${id}` });
}

export function requestPasswordReset(email: string) {
  return request<void>({ method: "POST", url: ENDPOINTS.auth.forgotPassword, data: { email }, _skipRefresh: true } as AxiosRequestConfig);
}

/** Completes a password reset or a staff invite; both use a single-use emailed token. */
export function setPasswordWithToken(kind: "reset" | "invite", token: string, password: string) {
  return request<{ email: string }>({
    method: "POST",
    url: kind === "invite" ? ENDPOINTS.auth.acceptInvite : ENDPOINTS.auth.resetPassword,
    data: { token, password },
    _skipRefresh: true,
  } as AxiosRequestConfig);
}

/** Mirrors the server's password rule so the form can say why before submitting. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[A-Za-z]/.test(password) || !/[^A-Za-z]/.test(password)) return "Mix letters with numbers or symbols.";
  return null;
}
