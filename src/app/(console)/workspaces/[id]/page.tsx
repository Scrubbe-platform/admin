"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { WorkspaceCommercial } from "@/components/console/WorkspaceCommercial";
import { DataTable, FilterTabs, formatDate, KeyValues, money, PageBody, ReasonDialog, relative, Section, StatCard, StatusBadge, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { ErrorState, TableSkeleton } from "@/components/ui/states";
import { useCurrentUser } from "@/hooks/useAuth";
import { fetchWorkspace, setWorkspaceSuspended, type WorkspaceMember } from "@/lib/api/staff";
import { toastError, toastSuccess } from "@/lib/toast";

type Tab = "overview" | "commercial" | "history";

const MEMBER_COLUMNS: Column<WorkspaceMember>[] = [
  {
    key: "name",
    header: "Member",
    render: (m) => (
      <div>
        <p className="font-medium">{m.name}</p>
        <p className="text-xs text-ink-faint">{m.email}</p>
      </div>
    ),
  },
  { key: "role", header: "Role", render: (m) => <span className="text-ink-muted">{m.roles.map((r) => r.replace(/_/g, " ").toLowerCase()).join(", ")}</span> },
  {
    key: "status",
    header: "Status",
    render: (m) =>
      m.suspendedAt ? <StatusBadge status="SUSPENDED" /> : !m.isActive ? <Badge>Deactivated</Badge> : !m.isVerified ? <Badge tone="draft">Unverified</Badge> : <StatusBadge status="ACTIVE" />,
  },
  { key: "mfa", header: "2FA", render: (m) => (m.mfaEnabled ? "On" : <span className="text-caution">Off</span>) },
  { key: "last", header: "Last sign-in", render: (m) => <span className="text-ink-muted">{relative(m.lastLogin)}</span> },
];

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useCurrentUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [dialog, setDialog] = useState<"suspend" | "reactivate" | null>(null);
  const ws = useQuery({ queryKey: ["workspace", id], queryFn: () => fetchWorkspace(id) });

  const suspension = useMutation({
    mutationFn: ({ suspend, reason }: { suspend: boolean; reason: string }) => setWorkspaceSuspended(id, suspend, reason),
    onSuccess: (_d, v) => {
      toastSuccess(v.suspend ? "Workspace suspended. Its admins have been emailed." : "Workspace reactivated.");
      setDialog(null);
      void qc.invalidateQueries({ queryKey: ["workspace", id] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => toastError(e, "Couldn't change the workspace's status."),
  });

  const w = ws.data;

  return (
    <>
      <PageHeader
        title={w?.name ?? "Workspace"}
        description={w ? `${w.subdomain ?? "No subdomain"} · created ${formatDate(w.createdAt)}` : undefined}
        actions={
          w && can("workspace.moderate") ? (
            w.suspendedAt ? (
              <Button onClick={() => setDialog("reactivate")}>
                <RotateCcw className="h-4 w-4" /> Reactivate
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setDialog("suspend")}>
                <Ban className="h-4 w-4" /> Suspend workspace
              </Button>
            )
          ) : null
        }
      />
      <PageBody>
        <Link href="/workspaces" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> All workspaces
        </Link>

        {ws.isError ? (
          <Card>
            <ErrorState error={ws.error} onRetry={() => ws.refetch()} />
          </Card>
        ) : !w ? (
          <Card>
            <TableSkeleton rows={6} />
          </Card>
        ) : (
          <>
            {w.suspendedAt ? (
              <Card className="border-danger/40 bg-danger-soft p-4 text-sm text-danger">
                Suspended {relative(w.suspendedAt)}. No member can sign in, use a session or an API key. Reason: {w.suspendedReason ?? "—"}
              </Card>
            ) : null}

            <FilterTabs
              value={tab}
              onChange={setTab}
              options={[
                { value: "overview", label: "Overview" },
                ...(can("billing.read") ? [{ value: "commercial" as Tab, label: "Commercial" }] : []),
                { value: "history", label: "Activity & history" },
              ]}
            />

            {tab === "overview" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Members" value={w.members.length} hint={`${w.members.filter((m) => m.mfaEnabled).length} with 2FA`} />
                  <StatCard label="Open incidents" value={w.usage.incidentsOpen} hint={`${w.usage.incidents30d} in 30 days · ${w.usage.incidentsTotal} total`} />
                  <StatCard label="Integrations" value={w.usage.integrations} hint={`${w.usage.apiKeys} active API keys`} />
                  <StatCard
                    label="Outstanding"
                    value={w.commercial.invoiceCount ? money(w.commercial.outstanding, w.commercial.currency) : "—"}
                    hint={`${w.commercial.invoiceCount} invoice${w.commercial.invoiceCount === 1 ? "" : "s"} issued`}
                  />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <Section title="Profile">
                    <KeyValues
                      rows={[
                        ["Workspace ID", <span key="id" className="font-mono text-xs">{w.id}</span>],
                        ["Subdomain", w.subdomain ?? "—"],
                        ["Website", w.website ?? "—"],
                        ["Industry", w.industry ?? "—"],
                        ["Company size", w.companySize ?? "—"],
                        ["Incident prefix", w.incidentPrefix ?? "Default (SI-)"],
                        ["Setup", w.isSetupComplete ? "Complete" : "Not finished"],
                      ]}
                    />
                  </Section>
                  <Section title="Subscriptions" description="Self-service plans billed through Stripe.">
                    {w.subscriptions.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-ink-muted">This workspace has never had a subscription.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {w.subscriptions.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <div>
                              <p className="text-ink">
                                {s.plan} · {money(s.price, s.currency)}/{s.interval}
                              </p>
                              <p className="text-xs text-ink-faint">
                                {s.currentPeriodEnd ? `Period ends ${formatDate(s.currentPeriodEnd)}` : "No billing period"}
                                {s.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                              </p>
                            </div>
                            <StatusBadge status={s.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </div>

                <Section title="Members" description="Open a member to suspend them, sign them out everywhere or reset their two-factor authentication.">
                  <DataTable
                    columns={MEMBER_COLUMNS}
                    rows={w.members}
                    isLoading={false}
                    error={null}
                    rowHref={can("user.read") ? (m) => `/users/${m.id}` : undefined}
                    empty={{ title: "No members", body: "This workspace has no members." }}
                  />
                </Section>
              </>
            ) : null}

            {tab === "commercial" ? <WorkspaceCommercial businessId={w.id} /> : null}

            {tab === "history" ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <Section title="Recent member activity" description="From the workspace's own audit log.">
                  {w.recentActivity.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-ink-muted">No recorded activity.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {w.recentActivity.map((a) => (
                        <li key={a.id} className="px-4 py-2.5 text-sm">
                          <p className="text-ink">
                            <span className="font-mono text-xs">{a.action}</span> · {a.resource}
                            {a.resourceId ? ` ${a.resourceId}` : ""}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {a.actor ?? "System"} · {relative(a.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
                <Section title="Staff actions on this workspace">
                  {w.staffActions.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-ink-muted">No staff actions yet.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {w.staffActions.map((a) => (
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
            ) : null}
          </>
        )}
      </PageBody>

      <ReasonDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        title={`Suspend ${w?.name ?? "workspace"}?`}
        danger
        confirmLabel="Suspend workspace"
        loading={suspension.isPending}
        body={
          <>
            Every member is signed out and can&apos;t sign in, use the API or receive real-time updates until you reactivate it. Its admins get an email with
            your reason. Data is kept.
          </>
        }
        onConfirm={(reason) => suspension.mutate({ suspend: true, reason })}
      />
      <ReasonDialog
        open={dialog === "reactivate"}
        onClose={() => setDialog(null)}
        title={`Reactivate ${w?.name ?? "workspace"}?`}
        confirmLabel="Reactivate"
        loading={suspension.isPending}
        body="Members can sign in again straight away. Their admins are emailed."
        onConfirm={(reason) => suspension.mutate({ suspend: false, reason })}
      />
    </>
  );
}
