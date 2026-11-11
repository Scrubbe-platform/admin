"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  fetchCurrentUser,
  login,
  logout,
  verifyMfa,
  type LoginResult,
  type MfaChallenge,
} from "@/lib/api/auth";
import { getToken } from "@/lib/api/client";
import { toastError } from "@/lib/toast";
import { hasAdminRole, type CurrentUser } from "@/types/user";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUser() {
  const query = useQuery<CurrentUser>({
    queryKey: authKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getToken()),
  });

  return {
    ...query,
    user: query.data ?? null,
    isAdmin: hasAdminRole(query.data),
    hasToken: typeof window !== "undefined" && Boolean(getToken()),
  };
}

/** Once a session token is stored: refetch the user and enter the console. */
function useEnterConsole() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: authKeys.me });
    router.replace("/dashboard");
  };
}

export function useSignIn(onMfaChallenge?: (challenge: MfaChallenge) => void) {
  const enterConsole = useEnterConsole();

  return useMutation<LoginResult, unknown, { email: string; password: string }>({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: async (result) => {
      if (result.kind === "mfa-required") {
        onMfaChallenge?.({ mfaToken: result.mfaToken, setup: result.setup });
        return;
      }
      await enterConsole();
    },
    onError: (error) => toastError(error, "Could not sign you in."),
  });
}

export function useVerifyMfa() {
  const enterConsole = useEnterConsole();

  return useMutation<CurrentUser | null, unknown, { mfaToken: string; code: string }>({
    mutationFn: ({ mfaToken, code }) => verifyMfa(mfaToken, code),
    onSuccess: () => enterConsole(),
    onError: (error) => toastError(error, "That code didn't work."),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    logout();
    queryClient.clear();
    router.replace("/sign-in");
  };
}
