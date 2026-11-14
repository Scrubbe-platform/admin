"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DataTable, FilterTabs, formatDate, money, PageBody, Pager, StatusBadge, Toolbar, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/primitives";
import { fetchSubscriptions, type SubscriptionRow } from "@/lib/api/staff";

const COLUMNS: Column<SubscriptionRow>[] = [
  { key: "ws", header: "Workspace", render: (s) => <Link href={`/workspaces/${s.workspace.id}`} className="text-signal-strong hover:underline">{s.workspace.name}</Link> },
  { key: "plan", header: "Plan", render: (s) => `${s.plan} · ${money(s.price, s.currency)}/${s.interval}` },
  { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
  {
    key: "period",
    header: "Current period",
    render: (s) => (
      <span className="text-ink-muted">
        {s.currentPeriodEnd ? `Ends ${formatDate(s.currentPeriodEnd)}` : "—"}
        {s.cancelAtPeriodEnd ? " · cancelling" : ""}
        {s.gracePeriodEndsAt ? ` · grace until ${formatDate(s.gracePeriodEndsAt)}` : ""}
      </span>
    ),
  },
  { key: "stripe", header: "Stripe customer", render: (s) => <span className="font-mono text-xs text-ink-muted">{s.stripeCustomerId ?? "—"}</span> },
  { key: "created", header: "Started", render: (s) => <span className="text-ink-muted">{formatDate(s.createdAt)}</span> },
];

export default function SubscriptionsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ["subscriptions", status, page], queryFn: () => fetchSubscriptions({ status, page, limit: 25 }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader title="Subscriptions" description="Self-service plans billed through Stripe. Enterprise commercials are under Billing." />
      <PageBody>
        <Card>
          <Toolbar>
            <FilterTabs
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "", label: "All" },
                { value: "ACTIVE", label: "Active" },
                { value: "TRIALING", label: "Trialing" },
                { value: "PAST_DUE", label: "Past due" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
            />
          </Toolbar>
          <DataTable columns={COLUMNS} rows={list.data?.items} isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} empty={{ title: "No subscriptions", body: "Nothing in this view." }} />
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>
    </>
  );
}
