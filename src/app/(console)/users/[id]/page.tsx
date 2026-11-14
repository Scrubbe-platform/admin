"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { formatDate, KeyValues, PageBody, ReasonDialog, relative, Section, StatusBadge } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { ErrorState, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { fetchUser, userAction, type UserAction } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

const ACTIONS: Record<UserAction, { title: string; confirm: string; body: string; done: string; danger?: boolean }> = {
  suspend: {
    title: "Suspend this user?",
    confirm: "Suspend user",
    danger: true,
    body: "They're signed out everywhere straight away and can't sign in, use API keys or connect until reactivated. They get an email with your reason.",
    done: "User suspended and notified",
  },
  reactivate: { title: "Reactivate this user?", confirm: "Reactivate", body: "They can sign in again. They get an email.", done: "User reactivated" },
  "revoke-sessions": {
    title: "Sign this user out everywhere?",
    confirm: "Sign out everywhere",
    body: "Every session and refresh token ends now, on every device. They can sign in again. Use this for a lost or shared device.",
    done: "Signed out everywhere",
  },
  "reset-mfa": {
    title: "Reset two-factor authentication?",
    confirm: "Reset 2FA",
    danger: true,
    body: "Only do this after verifying who you're talking to. Their authenticator is removed, they're signed out, and they set up a new one at next sign-in. They get an email.",
    done: "Two-factor authentication reset",
  },
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useCurrentUser();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<UserAction | null>(null);
  const user = useQuery({ queryKey: ["user", id], queryFn: () => fetchUser(id) });

  const action = useMutation({
    mutationFn: ({ kind, reason }: { kind: UserAction; reason: string }) => userAction(id, kind, reason),
    onSuccess: (_d, v) => {
      toastSuccess(ACTIONS[v.kind].done);
      setDialog(null);
      void qc.invalidateQueries({ queryKey: ["user", id] });
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toastError(e, "That didn't go through."),
  });

  const u = user.data;
  const moderate = can("user.moderate");

  return (
    <>
      <PageHeader
        title={u?.name ?? "User"}
        description={u?.email}
        actions={
          u && moderate ? (
            <>
              <Button size="sm" onClick={() => setDialog("revoke-sessions")}>Sign out everywhere</Button>
              {u.mfaEnabled ? <Button size="sm" onClick={() => setDialog("reset-mfa")}>Reset 2FA</Button> : null}
              {u.suspendedAt ? (
                <Button size="sm" variant="primary" onClick={() => setDialog("reactivate")}>Reactivate</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setDialog("suspend")}>Suspend</Button>
              )}
            </>
          ) : null
        }
      />
      <PageBody>
        <Link href="/users" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> All users
        </Link>
        {user.isError ? (
          <Card>
            <ErrorState error={user.error} onRetry={() => user.refetch()} />
          </Card>
        ) : !u ? (
          <Card>
            <TableSkeleton rows={6} />
          </Card>
        ) : (
          <>
            {u.suspendedAt ? (
              <Card className="border-danger/40 bg-danger-soft p-4 text-sm text-danger">
                Suspended {relative(u.suspendedAt)}. Reason: {u.suspendedReason ?? "—"}
              </Card>
            ) : null}
            {u.business?.suspendedAt ? (
              <Card className="border-caution/40 bg-caution-soft p-4 text-sm text-caution">Their workspace is suspended, so they can&apos;t sign in either way.</Card>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              <Section title="Account">
                <KeyValues
                  rows={[
                    ["Status", u.suspendedAt ? <StatusBadge key="s" status="SUSPENDED" /> : !u.isActive ? <Badge key="s">Deactivated by user</Badge> : <StatusBadge key="s" status="ACTIVE" />],
                    ["Workspace", u.business ? <Link key="w" href={`/workspaces/${u.business.id}`} className="text-signal-strong hover:underline">{u.business.name}</Link> : "None"],
                    ["Roles", u.roles.map((r) => r.replace(/_/g, " ").toLowerCase()).join(", ")],
                    ["Email verified", u.isVerified ? "Yes" : "No"],
                    ["Two-factor", u.mfaEnabled ? "Enabled" : "Not set up"],
                    ["Sign-in method", u.registerdWithOauth ? `SSO / OAuth (${u.oauthProvider ?? "provider"})` : "Email and password"],
                    ["Active sessions", String(u.activeSessions)],
                    ["API keys", String(u.apiKeys)],
                    ["Last sign-in", u.lastLogin ? formatDate(u.lastLogin, true) : "Never"],
                    ["Joined", formatDate(u.createdAt, true)],
                    ["Signed out everywhere", u.sessionsRevokedAt ? formatDate(u.sessionsRevokedAt, true) : "Never"],
                  ]}
                />
              </Section>
              <Section title="Staff actions on this user">
                {u.staffActions.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-ink-muted">None yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {u.staffActions.map((a) => (
                      <li key={a.id} className="px-4 py-2.5 text-sm">
                        <p className="text-ink">{a.summary}</p>
                        <p className="text-xs text-ink-faint">
                          {a.adminEmail} · {formatDate(a.createdAt, true)}
                          {a.reason ? ` · “${a.reason}”` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
            <Section title="Recent activity" description="From the user's own audit trail.">
              {u.recentActivity.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-muted">No recorded activity.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {u.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-ink">
                        <span className="font-mono text-xs">{a.action}</span> · {a.resource}
                        {a.resourceId ? ` ${a.resourceId}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {a.ipAddress ? `${a.ipAddress} · ` : ""}
                        {relative(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </PageBody>
      {dialog ? (
        <ReasonDialog
          open
          onClose={() => setDialog(null)}
          title={ACTIONS[dialog].title}
          body={ACTIONS[dialog].body}
          confirmLabel={ACTIONS[dialog].confirm}
          danger={ACTIONS[dialog].danger}
          loading={action.isPending}
          onConfirm={(reason) => action.mutate({ kind: dialog, reason })}
        />
      ) : null}
    </>
  );
}
