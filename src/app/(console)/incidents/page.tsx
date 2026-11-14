"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DataTable, FilterTabs, formatDate, humanise, PageBody, Pager, SearchInput, StatusBadge, Toolbar, useDebounced, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";
import { fetchIncidents, type IncidentRow } from "@/lib/api/staff";

const COLUMNS: Column<IncidentRow>[] = [
  {
    key: "id",
    header: "Incident",
    render: (i) => (
      <div>
        <p className="font-mono text-xs text-ink">{i.ticketId}</p>
        <p className="text-ink">{i.summary}</p>
      </div>
    ),
  },
  { key: "ws", header: "Workspace", render: (i) => <Link href={`/workspaces/${i.business.id}`} className="text-signal-strong hover:underline">{i.business.name}</Link> },
  { key: "prio", header: "Priority", render: (i) => <Badge tone={i.priority === "CRITICAL" || i.priority === "HIGH" ? "danger" : "neutral"}>{humanise(i.priority)}</Badge> },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
  { key: "source", header: "Source", render: (i) => <span className="text-ink-muted">{humanise(i.source)}</span> },
  { key: "created", header: "Raised", render: (i) => <span className="text-ink-muted">{formatDate(i.createdAt, true)}</span> },
];

export default function IncidentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "open" | "RESOLVED" | "CLOSED">("open");
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const list = useQuery({
    queryKey: ["incidents", query, status, page],
    queryFn: () => fetchIncidents({ q: query, status, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Incident metadata across every workspace, for oversight and support. Incident content stays in the customer's workspace."
      />
      <PageBody>
        <Card>
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search ID or title" />
            <FilterTabs
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "open", label: "Open" },
                { value: "RESOLVED", label: "Resolved" },
                { value: "CLOSED", label: "Closed" },
                { value: "", label: "All" },
              ]}
            />
          </Toolbar>
          <DataTable columns={COLUMNS} rows={list.data?.items} isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} empty={{ title: "No incidents match", body: "Nothing in this view." }} />
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>
    </>
  );
}
