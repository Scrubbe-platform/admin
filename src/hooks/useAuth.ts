"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { fetchCurrentUser, login, logout, verifyMfa, type LoginResult, type MfaChallenge } from "@/lib/api/auth";
import { getToken } from "@/lib/api/client";
import { toastError } from "@/lib/toast";
import { can, type Capability, type CurrentUser } from "@/types/user";

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
    hasToken: typeof window !== "undefined" && Boolean(getToken()),
    can: (capability: Capability) => can(query.data, capability),
  };
}

/** After a session is stored: load the staff profile and go where the user was heading. */
function useEnterConsole() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();

  return async (user: CurrentUser) => {
    queryClient.setQueryData(authKeys.me, user);
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  };
}

export function useSignIn(onMfaChallenge: (challenge: MfaChallenge) => void) {
  const enterConsole = useEnterConsole();

  return useMutation<LoginResult, unknown, { email: string; password: string }>({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: async (result) => {
      if (result.kind === "mfa-required") {
        onMfaChallenge({ mfaToken: result.mfaToken, setup: result.setup });
        return;
      }
      await enterConsole(result.user);
    },
    onError: (error) => toastError(error, "Could not sign you in."),
  });
}

export function useVerifyMfa() {
  const enterConsole = useEnterConsole();

  return useMutation<CurrentUser, unknown, { mfaToken: string; code: string }>({
    mutationFn: ({ mfaToken, code }) => verifyMfa(mfaToken, code),
    onSuccess: (user) => enterConsole(user),
    onError: (error) => toastError(error, "That code didn't work."),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    await logout();
    queryClient.clear();
    router.replace("/sign-in");
  };
}
