"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DataTable, FilterTabs, formatDate, PageBody, Pager, Toolbar, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/primitives";
import { fetchAudit, type StaffAuditEntry } from "@/lib/api/staff";

const COLUMNS: Column<StaffAuditEntry>[] = [
  {
    key: "summary",
    header: "What happened",
    render: (a) => (
      <div>
        <p className="text-ink">{a.summary}</p>
        {a.reason ? <p className="text-xs text-ink-muted">Reason: “{a.reason}”</p> : null}
        <p className="font-mono text-2xs text-ink-faint">{a.action}</p>
      </div>
    ),
  },
  { key: "who", header: "Staff member", render: (a) => <span className="text-ink-muted">{a.adminEmail}</span> },
  { key: "ip", header: "IP", render: (a) => <span className="font-mono text-xs text-ink-muted">{a.ipAddress ?? "—"}</span> },
  { key: "at", header: "When", render: (a) => <span className="whitespace-nowrap text-ink-muted">{formatDate(a.createdAt, true)}</span> },
];

type Scope = "" | "workspace" | "user" | "admin" | "billing" | "comms" | "auth.";

export default function AuditPage() {
  const [scope, setScope] = useState<Scope>("");
  const [page, setPage] = useState(1);
  const params = scope === "auth." ? { action: "auth." } : scope === "billing" ? { action: "billing." } : scope ? { targetType: scope } : {};
  const list = useQuery({ queryKey: ["audit", scope, page], queryFn: () => fetchAudit({ ...params, page, limit: 50 }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made through this console, written by the server with the signed-in staff member as the actor. Entries can't be edited or deleted."
      />
      <PageBody>
        <Card>
          <Toolbar>
            <FilterTabs
              value={scope}
              onChange={(v) => { setScope(v); setPage(1); }}
              options={[
                { value: "", label: "Everything" },
                { value: "workspace", label: "Workspaces" },
                { value: "user", label: "Users" },
                { value: "billing", label: "Billing" },
                { value: "comms", label: "Communications" },
                { value: "admin", label: "Staff" },
                { value: "auth.", label: "Sign-ins" },
              ]}
            />
          </Toolbar>
          <DataTable columns={COLUMNS} rows={list.data?.items} isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} empty={{ title: "Nothing recorded", body: "Staff actions will appear here." }} />
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>
    </>
  );
}
