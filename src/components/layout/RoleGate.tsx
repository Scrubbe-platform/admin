"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/primitives";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { ADMIN_ROLES } from "@/types/user";

/**
 * TEMPORARY: lets anyone open the console without signing in or holding an
 * admin role. Set back to false to restore the check before this ships.
 */
const ROLE_GATE_DISABLED = true;

/** Gates the whole console on WORKSPACE_OWNER / ADMIN / SUPER_ADMIN. */
export function RoleGate({ children }: { children: ReactNode }) {
  if (ROLE_GATE_DISABLED) return <>{children}</>;
  return <EnforcedRoleGate>{children}</EnforcedRoleGate>;
}

function EnforcedRoleGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const signOut = useSignOut();
  const { user, isAdmin, isLoading, isError, hasToken } = useCurrentUser();

  useEffect(() => {
    if (!hasToken) router.replace("/sign-in");
  }, [hasToken, router]);

  if (!hasToken || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-faint" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <Blocked
        title="We couldn't confirm who you are"
        body="The session check failed. Sign in again to continue."
        action={<Button onClick={signOut}>Back to sign-in</Button>}
      />
    );
  }

  if (!isAdmin) {
    return (
      <Blocked
        title="This console is admin-only"
        body={`Your account carries ${user.roles.join(", ") || "no roles"}. Access needs one of ${ADMIN_ROLES.join(", ")}.`}
        action={<Button onClick={signOut}>Sign out</Button>}
      />
    );
  }

  return <>{children}</>;
}

function Blocked({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm space-y-3 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-caution" aria-hidden />
        <h1 className="font-semibold text-xl text-ink">{title}</h1>
        <p className="text-sm leading-6 text-ink-muted">{body}</p>
        <div className="pt-1">{action}</div>
      </div>
    </div>
  );
}
