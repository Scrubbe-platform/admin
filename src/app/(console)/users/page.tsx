"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DataTable, FilterTabs, formatDate, PageBody, Pager, relative, SearchInput, StatusBadge, Toolbar, useDebounced, type Column } from "@/components/console/kit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";
import { fetchUsers, type UserRow } from "@/lib/api/staff";

type Status = "" | "active" | "suspended" | "deactivated" | "unverified";

const COLUMNS: Column<UserRow>[] = [
  {
    key: "name",
    header: "User",
    render: (u) => (
      <div>
        <p className="font-medium">{u.name}</p>
        <p className="text-xs text-ink-faint">{u.email}</p>
      </div>
    ),
  },
  { key: "ws", header: "Workspace", render: (u) => u.business?.name ?? <span className="text-ink-faint">None</span> },
  { key: "role", header: "Role", render: (u) => <span className="text-ink-muted">{u.roles.map((r) => r.replace(/_/g, " ").toLowerCase()).join(", ")}</span> },
  {
    key: "status",
    header: "Status",
    render: (u) =>
      u.suspendedAt ? (
        <StatusBadge status="SUSPENDED" />
      ) : u.business?.suspendedAt ? (
        // Their own account is fine, but the workspace suspension locks them out.
        <Badge tone="danger">Workspace suspended</Badge>
      ) : !u.isActive ? (
        <Badge>Deactivated</Badge>
      ) : !u.isVerified ? (
        <Badge tone="draft">Unverified</Badge>
      ) : (
        <StatusBadge status="ACTIVE" />
      ),
  },
  { key: "mfa", header: "2FA", render: (u) => (u.mfaEnabled ? "On" : <span className="text-caution">Off</span>) },
  { key: "last", header: "Last sign-in", render: (u) => <span className="text-ink-muted">{relative(u.lastLogin)}</span> },
  { key: "joined", header: "Joined", render: (u) => <span className="text-ink-muted">{formatDate(u.createdAt)}</span> },
];

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("");
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const list = useQuery({
    queryKey: ["users", query, status, page],
    queryFn: () => fetchUsers({ q: query, status, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Users" description="Everyone with a Scrubbe account, across all workspaces." />
      <PageBody>
        <Card>
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or email" />
            <FilterTabs
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "", label: "All" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "deactivated", label: "Deactivated" },
                { value: "unverified", label: "Unverified" },
              ]}
            />
          </Toolbar>
          <DataTable
            columns={COLUMNS}
            rows={list.data?.items}
            isLoading={list.isLoading}
            error={list.error}
            onRetry={() => list.refetch()}
            rowHref={(u) => `/users/${u.id}`}
            empty={{ title: "No users match", body: "Try a different search or filter." }}
          />
          {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
        </Card>
      </PageBody>
    </>
  );
}
