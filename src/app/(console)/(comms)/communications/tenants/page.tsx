"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CommsHeader, Notice } from "@/components/comms/parts";
import { TenantProfileModal } from "@/components/comms/TenantProfileModal";
import { DataTable, Pager, SearchInput, Toolbar, useDebounced, type Column } from "@/components/console/kit";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { fetchWorkspaces, type WorkspaceRow } from "@/lib/api/staff";
import type { ModuleRow } from "@/types/comms";

/** Notification profiles for real workspaces. A workspace without one uses the default profile. */
export default function TenantProfilesPage() {
  const { state } = useComms();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const query = useDebounced(q);
  const list = useQuery({ queryKey: ["workspaces", query, "", page], queryFn: () => fetchWorkspaces({ q: query, page, limit: 25 }), placeholderData: keepPreviousData });

  const toRow = (w: WorkspaceRow): ModuleRow => ({ id: w.id, name: w.name, domain: w.website ?? (w.subdomain ? `${w.subdomain}.scrubbe.com` : "example.com") });

  const columns: Column<WorkspaceRow>[] = [
    {
      key: "name",
      header: "Workspace",
      render: (w) => (
        <div>
          <p className="font-medium text-ink">{w.name}</p>
          <p className="text-xs text-ink-faint">{w.owner?.email ?? "No owner"}</p>
        </div>
      ),
    },
    { key: "profile", header: "Profile", render: (w) => (state.tenantProfiles[w.id] ? <Badge tone="signal">Custom</Badge> : <Badge>Default</Badge>) },
    { key: "status", header: "Workspace", render: (w) => (w.suspendedAt ? <Badge tone="danger">Suspended</Badge> : <Badge tone="live">Active</Badge>) },
    { key: "edit", header: "", render: (w) => <Button size="sm" onClick={() => setEditing(toRow(w))}>Edit profile</Button>, className: "text-right" },
  ];

  return (
    <div>
      <CommsHeader
        title="Tenant Profiles"
        description="How Scrubbe routes each workspace's notifications: contacts, escalation and permitted categories. Administered by Scrubbe staff; workspaces can't edit templates or providers."
      />
      <Notice className="mb-4">Profiles never contain template overrides or provider credentials. A workspace without a custom profile uses the default.</Notice>
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search workspaces" />
        </Toolbar>
        <DataTable columns={columns} rows={list.data?.items} isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()} empty={{ title: "No workspaces", body: "Workspaces appear here as customers sign up." }} />
        {list.data ? <Pager page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} /> : null}
      </Card>
      {editing ? <TenantProfileModal tenant={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
