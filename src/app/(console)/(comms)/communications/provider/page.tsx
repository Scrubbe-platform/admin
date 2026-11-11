"use client";

import { CommsHeader, Notice, StatusBadge } from "@/components/comms/parts";
import { ResetDemoCard } from "@/components/comms/ResetDemoCard";
import { Button, Card } from "@/components/ui/primitives";
import { SUPPRESSION_REASONS } from "@/lib/comms/catalog";
import { toastSuccess } from "@/lib/toast";

type Row = [label: string, status?: string, detail?: string];

function ConfigCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-2 divide-y divide-line">
        {rows.map(([label, status, detail]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span className="text-ink-muted">{label}</span>
            <span className="flex items-center gap-2 text-ink">
              {status ? <StatusBadge status={status} /> : null}
              {detail}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProviderConfigurationPage() {
  return (
    <div>
      <CommsHeader
        title="Provider Configuration"
        description="One centrally managed email provider for all tenants. Mock values: a real connection requires backend integration."
        actions={
          <Button onClick={() => toastSuccess("Simulated: connection check passed. A real provider needs backend integration.")}>
            Test connection (simulated)
          </Button>
        }
      />
      <Notice className="mb-4">
        There are no per-tenant providers or credentials. Secrets live in a backend secret manager and are never shown in the
        browser.
      </Notice>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConfigCard
          title="Central provider"
          rows={[
            ["Provider", "Connected", "Provider A (mock)"],
            ["Provider health", "Connected", "Operational (mock)"],
            ["Sender identity", undefined, "Scrubbe Inc. <notifications@mail.scrubbe.example>"],
            ["Sending domain", "Verified", "mail.scrubbe.example"],
            ["SPF", "Verified"],
            ["DKIM", "Verified"],
            ["DMARC", "Verified", "policy: quarantine"],
          ]}
        />
        <ConfigCard
          title="Delivery and webhooks"
          rows={[
            ["Retry configuration", undefined, "3 attempts, exponential backoff"],
            ["Rate limit", undefined, "50 emails per second"],
            ["Delivery, bounce, complaint and failure webhooks", "Enabled"],
            ["Webhook signing", "Enabled", "Verified by backend"],
            ["Secret configuration", "Connected", "Stored server-side"],
          ]}
        />
      </div>

      <h2 className="mb-3 mt-7 text-base font-semibold text-ink">Suppression management</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              {["Reason", "Records", "Handling", ""].map((heading) => (
                <th key={heading} className="px-3 py-2.5 font-normal">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {SUPPRESSION_REASONS.map(([reason, records, locked]) => (
              <tr key={reason}>
                <td className="px-3 py-2.5 text-ink">{reason}</td>
                <td className="px-3 py-2.5 tabular-nums">{records}</td>
                <td className="px-3 py-2.5 text-ink-muted">
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={locked ? "Locked" : "Auto"} />
                    {locked
                      ? "No bypass: provider complaints and legal restrictions cannot be overridden"
                      : "Applied automatically; reviewed under policy"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {locked ? null : (
                    <Button size="sm" onClick={() => toastSuccess(`Review request submitted (simulated): ${reason}.`)}>
                      Request review
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4">
        <ResetDemoCard description="Reset all templates, mappings, policies, tenants and settings." />
      </div>
    </div>
  );
}
