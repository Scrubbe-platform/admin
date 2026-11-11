"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { ConfirmDialog, KeyValueList, Notice, StatusBadge } from "@/components/comms/parts";
import { TenantProfileModal } from "@/components/comms/TenantProfileModal";
import { Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/states";
import { INTERNAL_ROLES, POLICY_CLASSIFICATIONS } from "@/lib/comms/catalog";
import { logAudit, nextRowId } from "@/lib/comms/operations";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ModuleRow } from "@/types/comms";

export interface ModuleConfig {
  key: "workspaces" | "team" | "policies";
  prefix: string;
  addLabel: string;
  columns: [field: string, label: string, kind?: "mono" | "badge"][];
  /** Extra fields shown only in the details dialog. */
  details?: [field: string, label: string][];
  fields: [field: string, label: string, options?: string[]][];
  defaults: Record<string, string>;
  statuses: string[];
  actions: [label: string, changes: Record<string, string>][];
  deleteLabel: string;
}

export const WORKSPACES_MODULE: ModuleConfig = {
  key: "workspaces",
  prefix: "WS-",
  addLabel: "Register tenant",
  columns: [
    ["id", "ID", "mono"],
    ["name", "Business / tenant"],
    ["domain", "Domain"],
    ["plan", "Plan"],
    ["status", "Status", "badge"],
    ["members", "Members"],
    ["cfg", "Email settings", "badge"],
  ],
  fields: [
    ["name", "Business name"],
    ["domain", "Domain (e.g. company.com)"],
    ["plan", "Plan", ["Starter", "Business", "Enterprise"]],
  ],
  defaults: { status: "Trial", members: "1", cfg: "Default" },
  statuses: ["Active", "Trial", "Suspended"],
  actions: [
    ["Suspend", { status: "Suspended" }],
    ["Reactivate", { status: "Active" }],
  ],
  deleteLabel: "Deactivate tenant",
};

export const TEAM_MODULE: ModuleConfig = {
  key: "team",
  prefix: "USR-",
  addLabel: "Add staff member",
  columns: [
    ["id", "ID", "mono"],
    ["name", "Name"],
    ["email", "Email"],
    ["role", "Role"],
    ["status", "Status", "badge"],
    ["mfa", "MFA", "badge"],
  ],
  fields: [
    ["name", "Full name"],
    ["email", "Email"],
    ["role", "Role", INTERNAL_ROLES],
  ],
  defaults: { status: "Invited", mfa: "Disabled" },
  statuses: ["Active", "Invited", "Suspended"],
  actions: [
    ["Set role: Template Author", { role: "Template Author" }],
    ["Set role: Template Reviewer", { role: "Template Reviewer" }],
    ["Suspend", { status: "Suspended" }],
    ["Reactivate", { status: "Active" }],
  ],
  deleteLabel: "Remove staff member",
};

export const POLICIES_MODULE: ModuleConfig = {
  key: "policies",
  prefix: "NP-",
  addLabel: "Create policy",
  columns: [
    ["id", "ID", "mono"],
    ["name", "Policy"],
    ["class", "Classification", "badge"],
    ["pri", "Priority", "badge"],
    ["events", "Applicable events"],
    ["timing", "Delivery timing"],
    ["ver", "Version", "mono"],
    ["status", "Status", "badge"],
  ],
  details: [
    ["cond", "Trigger conditions"],
    ["recip", "Recipient requirements"],
    ["esc", "Escalation rules"],
    ["sup", "Suppression rules"],
  ],
  fields: [
    ["name", "Policy name"],
    ["class", "Classification", POLICY_CLASSIFICATIONS],
    ["events", "Applicable events"],
  ],
  defaults: {
    pri: "Normal",
    timing: "Policy-controlled",
    ver: "v0.1",
    status: "Draft",
    cond: "To be defined",
    recip: "To be defined",
    esc: "None",
    sup: "None",
  },
  statuses: ["Active", "Disabled", "Draft", "Pending Approval"],
  actions: [
    ["Activate", { status: "Active" }],
    ["Disable", { status: "Disabled" }],
    ["Submit new version for review", { status: "Pending Approval" }],
  ],
  deleteLabel: "Archive policy",
};

function cell(row: ModuleRow, field: string, kind?: "mono" | "badge") {
  const value = row[field] ?? "";
  if (kind === "badge") return <StatusBadge status={value} />;
  if (kind === "mono") return <span className="font-mono text-xs">{value}</span>;
  return value;
}

/** Searchable, filterable list of tenants, staff or policies. Rows open a details dialog. */
export function ModuleTable({ config }: { config: ModuleConfig }) {
  const { state } = useComms();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = state[config.key];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!q || Object.values(row).join(" ").toLowerCase().includes(q)) && (status === "All" || row.status === status),
    );
  }, [rows, query, status]);

  const open = openId ? rows.find((row) => row.id === openId) : undefined;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="w-auto">
          {["All", ...config.statuses].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>

      <p className="mb-2 text-sm text-ink-muted" role="status">
        {shown.length} result{shown.length === 1 ? "" : "s"}
      </p>

      {shown.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                {config.columns.map(([field, label]) => (
                  <th key={field} className="whitespace-nowrap px-3 py-2.5 font-normal">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setOpenId(row.id)}
                  className="cursor-pointer transition-colors hover:bg-raised/60"
                >
                  {config.columns.map(([field, , kind]) => (
                    <td key={field} className="px-3 py-2.5 text-ink">
                      {cell(row, field, kind)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="px-6 py-10 text-center text-sm text-ink-muted">Nothing matches. Clear the search or filter.</Card>
      )}

      {open ? <RecordModal key={open.id} config={config} row={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function RecordModal({ config, row, onClose }: { config: ModuleConfig; row: ModuleRow; onClose: () => void }) {
  const { update } = useComms();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  if (editingProfile) return <TenantProfileModal tenant={row} onClose={onClose} />;

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title={`${config.deleteLabel} ${row.id}?`}
        body="This removes the record from the demonstration data and is recorded in the audit log."
        confirmLabel={config.deleteLabel}
        danger
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          update((draft) => {
            draft[config.key] = draft[config.key].filter((r) => r.id !== row.id);
            logAudit(draft, `deleted ${row.id}`, row.id);
          });
          onClose();
          toastSuccess(`${row.id} deleted.`);
        }}
      />
    );
  }

  function apply(label: string, changes: Record<string, string>) {
    update((draft) => {
      const target = draft[config.key].find((r) => r.id === row.id);
      if (target) Object.assign(target, changes);
      logAudit(draft, `${label.toLowerCase()} ${row.id}`, row.id);
    });
    onClose();
    toastSuccess(`${label} applied to ${row.id} (demonstration).`);
  }

  const items: [string, ReactNode][] = [
    ...config.columns.map(([field, label, kind]): [string, ReactNode] => [label, cell(row, field, kind)]),
    ...(config.details ?? []).map(([field, label]): [string, ReactNode] => [label, row[field] ?? ""]),
  ];
  if (config.key === "policies") {
    items.push([
      "Audit history",
      <Link key="audit" href="/communications/audit" className="text-signal-strong hover:underline">
        Open audit log
      </Link>,
    ]);
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={row.name || row.id}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <KeyValueList items={items} />

      <h3 className="mb-2 mt-5 text-sm font-semibold text-ink">Actions</h3>
      <div className="flex flex-wrap gap-2">
        {config.key === "workspaces" ? (
          <Button variant="primary" size="sm" onClick={() => setEditingProfile(true)}>
            Edit tenant profile
          </Button>
        ) : null}
        {config.actions.map(([label, changes]) => (
          <Button
            key={label}
            size="sm"
            disabled={Object.entries(changes).every(([field, value]) => row[field] === value)}
            onClick={() => apply(label, changes)}
          >
            {label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmingDelete(true)}>
          {config.deleteLabel}
        </Button>
      </div>
      <Notice className="mt-4">
        Demonstration only. In production, actions are authorised and enforced by backend policy services and recorded in the
        audit log.
      </Notice>
    </Modal>
  );
}

export function AddRecordModal({ config, onClose }: { config: ModuleConfig; onClose: () => void }) {
  const { update } = useComms();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map(([field, , options]) => [field, options?.[0] ?? ""])),
  );

  function create() {
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    if (Object.values(trimmed).some((v) => !v)) return toastError(null, "Fill in every field to continue.");
    const id = update((draft) => {
      const rows = draft[config.key];
      const record: ModuleRow = { ...config.defaults, ...trimmed, id: nextRowId(rows, config.prefix) };
      rows.unshift(record);
      logAudit(draft, `created ${record.id}`, record.id);
      return record.id;
    });
    if (!id) return;
    onClose();
    toastSuccess(`${id} created (demonstration).`);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={config.addLabel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {config.fields.map(([field, label, options]) => (
          <Field key={field} label={label} htmlFor={`add-${field}`} required>
            {options ? (
              <Select
                id={`add-${field}`}
                value={values[field] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              >
                {options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            ) : (
              <Input
                id={`add-${field}`}
                value={values[field] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}
