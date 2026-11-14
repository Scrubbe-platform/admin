"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CommsHeader, Notice } from "@/components/comms/parts";
import { DataTable, FilterTabs, formatDate, Pager, SearchInput, StatusBadge, Toolbar, useDebounced, type Column } from "@/components/console/kit";
import { Card } from "@/components/ui/primitives";
import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { Page } from "@/lib/api/staff";

interface Delivery {
  id: string;
  recipients: string[];
  subject: string;
  category: string | null;
  provider: string;
  status: "SENT" | "FAILED";
  error: string | null;
  createdAt: string;
}

const COLUMNS: Column<Delivery>[] = [
  { key: "at", header: "When", render: (d) => <span className="whitespace-nowrap text-ink-muted">{formatDate(d.createdAt, true)}</span> },
  {
    key: "subject",
    header: "Email",
    render: (d) => (
      <div className="min-w-0">
        <p className="text-ink">{d.subject}</p>
        <p className="text-xs text-ink-faint">{d.recipients.join(", ")}</p>
      </div>
    ),
  },
  { key: "cat", header: "Category", render: (d) => <span className="text-ink-muted">{d.category ?? "—"}</span> },
  { key: "provider", header: "Provider", render: (d) => <span className="text-ink-muted">{d.provider}</span> },
  {
    key: "status",
    header: "Result",
    render: (d) => (
      <div>
        <StatusBadge status={d.status === "SENT" ? "Sent" : "Failed"} />
        {d.error ? <p className="mt-1 max-w-xs text-xs text-danger">{d.error}</p> : null}
      </div>
    ),
  },
];

export default function DeliveryLogsPage() {
  const [status, setStatus] = useState<"" | "SENT" | "FAILED">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const logs = useQuery({
    queryKey: ["delivery-logs", status, query, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: "50" });
      if (status) p.set("status", status);
      if (query) p.set("q", query);
      return request<Page<Delivery> & { last7Days: { sent: number; failed: number } }>({ method: "GET", url: `${ENDPOINTS.comms}/delivery-logs?${p}` });
    },
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <CommsHeader
        title="Delivery Logs"
        description="Every email the Scrubbe API tried to send, with the provider's result. Recorded at send time by the server."
      />
      <Notice className="mb-4">
        &ldquo;Sent&rdquo; means the provider accepted the message. Inbox delivery, bounces and opens are reported by the provider, not here.
        {logs.data ? ` Last 7 days: ${logs.data.last7Days.sent} sent, ${logs.data.last7Days.failed} failed.` : ""}
      </Notice>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search subject, category or exact recipient" />
          <FilterTabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: "", label: "All" },
              { value: "SENT", label: "Sent" },
              { value: "FAILED", label: "Failed" },
            ]}
          />
        </Toolbar>
        <DataTable columns={COLUMNS} rows={logs.data?.items} isLoading={logs.isLoading} error={logs.error} onRetry={() => logs.refetch()} empty={{ title: "No deliveries", body: "Emails appear here as the platform sends them." }} />
        {logs.data ? <Pager page={logs.data.page} limit={logs.data.limit} total={logs.data.total} onPage={setPage} /> : null}
      </Card>
    </div>
  );
}
