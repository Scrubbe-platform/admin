import { DEMO_NOW } from "@/lib/comms/catalog";
import type { CommsState, DeliveryLog } from "@/types/comms";

const STATUSES = ["Delivered", "Delivered", "Delivered", "Sent", "Delivered", "Queued", "Processing", "Deferred", "Bounced", "Failed", "Suppressed", "Delivered"];
const RECIPIENTS = ["sarah.mitchell", "dev.patel", "priya.raman", "tom.okafor", "ana.silva", "li.wei"];
const REASONS: Record<string, string> = {
  Bounced: "550 5.1.1 Mailbox does not exist",
  Failed: "Provider timeout after 3 attempts",
  Deferred: "451 4.7.1 Greylisted; retry scheduled",
};
const SUPPRESSIONS = ["Invalid recipient", "Hard bounce", "Policy restriction", "Duplicate notification", "Rate limit", "Unresolved recipient"];

export const DELIVERY_STATUSES = ["Queued", "Processing", "Sent", "Delivered", "Deferred", "Bounced", "Failed", "Suppressed"];

/**
 * 72 mock deliveries, every 37 minutes back from the demo morning, spread across
 * templates and tenants. Each records the policy decision separately from the
 * delivery status.
 */
export function deliveryLogs(state: CommsState): DeliveryLog[] {
  const { templates, triggers, workspaces } = state;
  if (!templates.length) return [];

  return Array.from({ length: 72 }, (_, i) => {
    const template = templates[(i * 11) % templates.length] ?? templates[0]!;
    const status = STATUSES[(i * 5 + (i % 7)) % 12] ?? "Delivered";
    const mapping = triggers.find((t) => t.templateId === template.id);
    const tenant = workspaces.length ? workspaces[i % workspaces.length] : undefined;
    const suppression = SUPPRESSIONS[i % 6] ?? "Policy restriction";
    const suppressed = status === "Suppressed";

    return {
      id: `EML-${90210 - i}`,
      tenant: tenant?.name ?? "—",
      eventId: `evt_${(0x9a3f00 + i * 77).toString(16)}`,
      event: template.event,
      useCase: mapping?.useCase ?? "Notify stakeholders",
      templateId: template.id,
      version: template.version,
      recipient: `${RECIPIENTS[i % 6]}@${tenant?.domain ?? "example.com"}`,
      provider: "Central provider (mock)",
      status,
      policyDecision: suppressed ? `Suppressed: ${suppression}` : `Allowed: ${mapping?.policy ?? "Default policy"}`,
      ts: new Date(DEMO_NOW - i * 37 * 60_000).toISOString().slice(0, 16),
      attempts: status === "Failed" || status === "Bounced" ? 3 : status === "Deferred" ? 2 : 1,
      reason: suppressed ? suppression : REASONS[status] ?? "",
      correlation: `corr-${(7000 + i * 13).toString(16)}`,
    };
  });
}
