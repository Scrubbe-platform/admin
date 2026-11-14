"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/primitives";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { ApiError } from "@/types/api";

/**
 * Gates the whole console on a live staff session. The server checks the
 * session and the staff member's capability on every request; this only keeps
 * signed-out visitors from seeing an empty shell.
 */
export function RoleGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const signOut = useSignOut();
  const { user, isLoading, isError, error, hasToken } = useCurrentUser();

  useEffect(() => {
    if (!hasToken) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [hasToken, router, pathname]);

  if (!hasToken || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-faint" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !user) {
    const blockedNetwork = error instanceof ApiError && error.status === 403;
    return (
      <Blocked
        title={blockedNetwork ? "Not available from this network" : "We couldn't confirm who you are"}
        body={
          blockedNetwork
            ? (error as ApiError).message
            : "Your session couldn't be checked. Sign in again to continue."
        }
        action={<Button onClick={signOut}>Back to sign-in</Button>}
      />
    );
  }

  return <>{children}</>;
}

function Blocked({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-caution" aria-hidden />
        <h1 className="mt-3 font-semibold text-xl text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
        <div className="mt-5">{action}</div>
      </div>
    </div>
  );
}
