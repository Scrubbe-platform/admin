"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DataTable, formatDate, PageBody, Pager, SearchInput, Toolbar, useDebounced, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/primitives";
import { fetchActivity, type ActivityRow } from "@/lib/api/staff";

const COLUMNS: Column<ActivityRow>[] = [
  {
    key: "action",
    header: "Action",
    render: (a) => (
      <div>
        <p className="font-mono text-xs text-ink">{a.action}</p>
        <p className="text-xs text-ink-faint">
          {a.resource}
          {a.resourceId ? ` · ${a.resourceId}` : ""}
        </p>
      </div>
    ),
  },
  { key: "user", header: "User", render: (a) => (a.user ? <Link href={`/users/${a.user.id}`} className="text-signal-strong hover:underline">{a.user.email}</Link> : <span className="text-ink-faint">System</span>) },
  { key: "ws", header: "Workspace", render: (a) => (a.workspace ? <Link href={`/workspaces/${a.workspace.id}`} className="hover:underline">{a.workspace.name}</Link> : "—") },
  { key: "ip", header: "IP", render: (a) => <span className="font-mono text-xs text-ink-muted">{a.ipAddress ?? "—"}</span> },
  { key: "at", header: "When", render: (a) => <span className="text-ink-muted">{formatDate(a.createdAt, true)}</span> },
];

export default function ActivityPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(action);
  const list = useQuery({ queryKey: ["activity", q, page], queryFn: () => fetchActivity({ action: q, page, limit: 50 }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader title="Platform activity" description="What users are doing inside Scrubbe, from every workspace's audit trail, newest first." />
      <PageBody>
        <Card>
          <Toolbar>
            <SearchInput value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Filter by action, e.g. incident" />
          </Toolbar>
          <DataTable columns={COLUMNS} rows={list.data?.items} isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} empty={{ title: "No activity", body: "Nothing recorded yet." }} />
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>
    </>
  );
}
