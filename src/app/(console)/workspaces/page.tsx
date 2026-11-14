"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DataTable, FilterTabs, formatDate, PageBody, Pager, SearchInput, StatusBadge, Toolbar, useDebounced, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";
import { fetchWorkspaces, type WorkspaceRow } from "@/lib/api/staff";

const COLUMNS: Column<WorkspaceRow>[] = [
  {
    key: "name",
    header: "Workspace",
    render: (w) => (
      <div>
        <p className="font-medium">{w.name}</p>
        <p className="text-xs text-ink-faint">{w.subdomain ?? w.website ?? "—"}</p>
      </div>
    ),
  },
  { key: "owner", header: "Owner", render: (w) => (w.owner ? <span className="text-ink-muted">{w.owner.email}</span> : <span className="text-ink-faint">—</span>) },
  { key: "members", header: "Members", render: (w) => <span className="tabular-nums">{w.memberCount}</span>, className: "text-right" },
  { key: "incidents", header: "Incidents", render: (w) => <span className="tabular-nums">{w.incidentCount}</span>, className: "text-right" },
  { key: "plan", header: "Plan", render: (w) => (w.subscription ? `${w.subscription.plan} · ${w.subscription.status.toLowerCase()}` : <span className="text-ink-faint">No subscription</span>) },
  {
    key: "status",
    header: "Status",
    render: (w) =>
      w.suspendedAt ? <StatusBadge status="SUSPENDED" /> : w.isSetupComplete ? <StatusBadge status="ACTIVE" /> : <Badge tone="draft">Setting up</Badge>,
  },
  { key: "created", header: "Created", render: (w) => <span className="text-ink-muted">{formatDate(w.createdAt)}</span> },
];

export default function WorkspacesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "active" | "suspended">("");
  const [page, setPage] = useState(1);
  const query = useDebounced(q);

  const list = useQuery({
    queryKey: ["workspaces", query, status, page],
    queryFn: () => fetchWorkspaces({ q: query, status, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Workspaces" description="Every customer workspace on Scrubbe. Open one to see its members, usage and commercial records, or to suspend it." />
      <PageBody>
        <Card>
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, domain or member email" />
            <FilterTabs
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "", label: "All" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
          </Toolbar>
          <DataTable
            columns={COLUMNS}
            rows={list.data?.items}
            isLoading={list.isLoading}
            error={list.error}
            onRetry={() => list.refetch()}
            rowHref={(w) => `/workspaces/${w.id}`}
            empty={{ title: query || status ? "No workspaces match" : "No workspaces yet", body: query ? "Try a different search." : "Workspaces appear here as customers sign up." }}
          />
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>
    </>
  );
}
