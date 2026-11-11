"use client";

import { useState } from "react";

import { AddRecordModal, ModuleTable, TEAM_MODULE } from "@/components/comms/ModuleTable";
import { CommsHeader, Notice, StatusBadge } from "@/components/comms/parts";
import { Button, Card } from "@/components/ui/primitives";
import { ROLE_PERMISSIONS } from "@/lib/comms/catalog";

const PERMISSIONS = ["Edit drafts", "Approve or reject", "Publish", "Monitor delivery", "Read audit"];

export default function TeamPage() {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <CommsHeader
        title="Team & Access"
        description="Internal Scrubbe personnel who can administer the Communications Centre. Tenants have no access."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add staff member
          </Button>
        }
      />
      <ModuleTable config={TEAM_MODULE} />

      <h2 className="mb-3 mt-8 text-base font-semibold text-ink">Internal roles and permissions</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              <th className="px-3 py-2.5 font-normal">Role</th>
              {PERMISSIONS.map((permission) => (
                <th key={permission} className="px-3 py-2.5 font-normal">
                  {permission}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ROLE_PERMISSIONS.map(([role, ...allowed]) => (
              <tr key={role}>
                <td className="px-3 py-2.5 font-medium text-ink">{role}</td>
                {allowed.map((yes, i) => (
                  <td key={PERMISSIONS[i]} className="px-3 py-2.5">
                    {yes ? <StatusBadge status="Allowed" /> : <span className="text-ink-faint">Not allowed</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Notice className="mt-3">Indicative only. Backend authorisation services are authoritative.</Notice>

      {adding ? <AddRecordModal config={TEAM_MODULE} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
