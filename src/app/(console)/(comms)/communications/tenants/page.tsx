"use client";

import { useState } from "react";

import { AddRecordModal, ModuleTable, WORKSPACES_MODULE } from "@/components/comms/ModuleTable";
import { CommsHeader, Notice } from "@/components/comms/parts";
import { Button } from "@/components/ui/primitives";

export default function TenantProfilesPage() {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <CommsHeader
        title="Tenant Profiles"
        description="Centrally managed communication settings for each tenant, administered by authorised Scrubbe personnel. Tenants cannot edit templates, policies or provider settings."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Register tenant
          </Button>
        }
      />
      <Notice className="mb-4">
        Tenant profiles configure recipients, routing, escalation and permitted categories. They never contain template
        overrides or provider credentials.
      </Notice>
      <ModuleTable config={WORKSPACES_MODULE} />
      {adding ? <AddRecordModal config={WORKSPACES_MODULE} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
