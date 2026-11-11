"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/comms/parts";
import { Button, Card } from "@/components/ui/primitives";
import { useResetComms } from "@/hooks/useComms";
import { toastSuccess } from "@/lib/toast";

export function ResetDemoCard({ description }: { description: ReactNode }) {
  const reset = useResetComms();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink">Demonstration data</h2>
      <p className="mb-3 mt-1 text-sm text-ink-muted">{description}</p>
      <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirming(true)}>
        Reset demonstration data
      </Button>
      {confirming ? (
        <ConfirmDialog
          title="Reset all demonstration data?"
          body="Every template, trigger, preference, workspace, team member and setting goes back to its original value."
          confirmLabel="Reset data"
          danger
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            if (!reset()) return;
            toastSuccess("Demonstration data reset.");
            router.push("/communications");
          }}
        />
      ) : null}
    </Card>
  );
}
