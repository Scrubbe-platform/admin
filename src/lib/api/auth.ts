import type { AxiosRequestConfig } from "axios";

import { clearTokens, request, setTokens } from "@/lib/api/client";
import { CONFIRMED } from "@/lib/api/endpoints";
import type { CurrentUser } from "@/types/user";

/**
 * Login and MFA verification answer with the same session payload. The main
 * Scrubbe app reads the tokens from `tokens.accessToken`; the flat
 * `token`/`accessToken` fields the brief suggested are still accepted. Anything
 * carrying neither a token nor an MFA challenge is reported as an unrecognised
 * response rather than guessed at.
 */
interface RawSessionData {
  tokens?: { accessToken?: string; refreshToken?: string };
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: CurrentUser;
}

interface RawLoginData extends RawSessionData {
  mfaRequired?: boolean;
  requiresMfa?: boolean;
  mfaToken?: string;
  challengeId?: string;
  mfaSetup?: MfaSetup;
}

/** Sent instead of a plain challenge when the account has no authenticator enrolled yet. */
export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
}

export interface MfaChallenge {
  /** Short-lived credential that ties the code back to this login. Never shown. */
  mfaToken: string;
  setup: MfaSetup | null;
}

export type LoginResult =
  | { kind: "authenticated"; user: CurrentUser | null }
  | ({ kind: "mfa-required" } & MfaChallenge);

/** Stores the session tokens. False when the payload carried no access token. */
function storeSession(data: RawSessionData): boolean {
  const token = data.tokens?.accessToken ?? data.token ?? data.accessToken;
  if (!token) return false;
  setTokens(token, data.tokens?.refreshToken ?? data.refreshToken);
  return true;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const data = await request<RawLoginData>({
    method: "POST",
    url: CONFIRMED.auth.login,
    data: { email, password },
    _skipRefresh: true,
  } as AxiosRequestConfig);

  if (data.mfaRequired === true || data.requiresMfa === true) {
    const mfaToken = data.mfaToken ?? data.challengeId;
    if (!mfaToken) {
      throw new Error("The API asked for a second factor but sent no MFA token to verify the code against.");
    }
    return { kind: "mfa-required", mfaToken, setup: data.mfaSetup?.secret ? data.mfaSetup : null };
  }

  if (storeSession(data)) {
    return { kind: "authenticated", user: data.user ?? null };
  }

  throw new Error("Sign-in didn't complete. Please try again.");
}

export async function verifyMfa(mfaToken: string, code: string): Promise<CurrentUser | null> {
  const data = await request<RawSessionData>({
    method: "POST",
    url: CONFIRMED.auth.mfaVerify,
    data: { mfaToken, code },
    _skipRefresh: true,
  } as AxiosRequestConfig);

  if (!storeSession(data)) {
    throw new Error("Sign-in didn't complete. Please try again.");
  }
  return data.user ?? null;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const data = await request<CurrentUser & { _id?: string }>({
    method: "GET",
    url: CONFIRMED.auth.me,
  });
  return { ...data, id: data.id ?? data._id ?? "" };
}

export function logout(): void {
  clearTokens();
}
