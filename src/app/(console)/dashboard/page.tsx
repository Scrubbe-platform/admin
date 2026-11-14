"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { BarSeries, money, PageBody, relative, Section, StatCard } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { fetchOverview } from "@/lib/api/staff";
import { displayName } from "@/types/user";

export default function OverviewPage() {
  const { user, can } = useCurrentUser();
  const overview = useQuery({ queryKey: ["overview"], queryFn: fetchOverview, refetchInterval: 60_000 });
  const o = overview.data;

  return (
    <>
      <PageHeader
        title={user ? `Good to see you, ${displayName(user).split(" ")[0]}` : "Overview"}
        description="Live figures from the Scrubbe platform. Every number is computed from stored records; nothing here is sampled or estimated."
      />
      <PageBody>
        {overview.isError ? (
          <Card>
            <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
          </Card>
        ) : !o ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Workspaces"
                value={o.totals.workspaces}
                hint={o.totals.suspendedWorkspaces ? `${o.totals.suspendedWorkspaces} suspended` : "None suspended"}
                href={can("workspace.read") ? "/workspaces" : undefined}
              />
              <StatCard
                label="Users"
                value={o.totals.users}
                hint={`${o.totals.activeUsers7d} signed in this week${o.totals.suspendedUsers ? ` · ${o.totals.suspendedUsers} suspended` : ""}`}
                href={can("user.read") ? "/users" : undefined}
              />
              <StatCard label="Open incidents" value={o.totals.openIncidents} hint={`${o.totals.incidents30d} raised in 30 days`} href={can("incident.read") ? "/incidents" : undefined} />
              <StatCard
                label="Active subscriptions"
                value={(o.subscriptions.ACTIVE ?? 0) + (o.subscriptions.TRIALING ?? 0)}
                hint={`${o.subscriptions.TRIALING ?? 0} trialing · ${o.subscriptions.PAST_DUE ?? 0} past due`}
                tone={o.subscriptions.PAST_DUE ? "caution" : undefined}
                href={can("billing.read") ? "/subscriptions" : undefined}
              />
              <StatCard label="Waitlist to review" value={o.queues.waitlistPending} href={can("waitlist.manage") ? "/waitlist" : undefined} tone={o.queues.waitlistPending ? "caution" : undefined} />
              <StatCard label="New inbox messages" value={o.queues.inboxNew} href={can("inbox.manage") ? "/inbox" : undefined} tone={o.queues.inboxNew ? "caution" : undefined} />
              {o.receivables.length === 0 ? (
                <StatCard label="Outstanding invoices" value="—" hint="No issued, unpaid invoices" href={can("billing.read") ? "/billing" : undefined} />
              ) : (
                o.receivables.map((r) => (
                  <StatCard
                    key={r.currency}
                    label={`Outstanding (${r.currency})`}
                    value={money(r.outstanding, r.currency)}
                    hint={r.overdueCount ? `${money(r.overdue, r.currency)} overdue on ${r.overdueCount} invoice${r.overdueCount === 1 ? "" : "s"}` : "Nothing overdue"}
                    tone={r.overdueCount ? "danger" : undefined}
                    href={can("billing.read") ? "/billing" : undefined}
                  />
                ))
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <Card className="p-4">
                <BarSeries points={o.series.signups} label="New users, last 30 days" />
              </Card>
              <Card className="p-4">
                <BarSeries points={o.series.workspaces} label="New workspaces, last 30 days" />
              </Card>
              <Card className="p-4">
                <BarSeries points={o.series.incidents} label="Incidents raised, last 30 days" />
              </Card>
            </div>

            <Section title="Recent staff actions" description="The latest changes made from this console." actions={can("audit.read") ? <Link href="/audit" className="text-xs text-signal-strong hover:underline">Full audit log</Link> : undefined}>
              {o.recentStaffActions.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-muted">No staff actions yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {o.recentStaffActions.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="text-ink">{a.summary}</p>
                        <p className="text-xs text-ink-faint">
                          {a.adminEmail}
                          {a.reason ? ` · “${a.reason}”` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-ink-faint">{relative(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </PageBody>
    </>
  );
}
