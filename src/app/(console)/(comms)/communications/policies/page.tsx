"use client";

import { useState } from "react";

import { AddRecordModal, ModuleTable, POLICIES_MODULE } from "@/components/comms/ModuleTable";
import { CommsHeader } from "@/components/comms/parts";
import { Button } from "@/components/ui/primitives";

export default function NotificationPoliciesPage() {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <CommsHeader
        title="Notification Policies"
        description="Central governance controls that decide whether, when and to whom a notification may be sent. They keep notification volume down: not every event or agent action produces an email."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            Create policy
          </Button>
        }
      />
      <ModuleTable config={POLICIES_MODULE} />
      {adding ? <AddRecordModal config={POLICIES_MODULE} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
