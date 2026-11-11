import { daysAgo, formatTimestamp } from "@/lib/comms/catalog";
import type { CommsState } from "@/types/comms";

export interface AuditRow {
  id: string;
  time: string;
  actor: string;
  action: string;
  resource: string;
  previous: string;
  next: string;
  reason: string;
  correlation: string;
  outcome: string;
}

/** Older changes that predate this browser's records, so the log shows before/after values from the start. */
const HISTORICAL: [actor: string, action: string, resource: string, previous: string, next: string, reason: string][] = [
  ["Priya Raman", "approved template version", "INC-02", "Pending Approval", "Approved", "Wording reviewed, variables validated"],
  ["Sarah Mitchell", "published template version", "INC-02", "Approved v3.2", "Published v3.2", "Scheduled release"],
  ["Li Wei", "updated notification policy", "NP-01", "Escalate after 15 min", "Escalate after 10 min", "Faster engagement of incident commander"],
  ["Sarah Mitchell", "updated tenant profile", "WS-01", "Minimum severity P2", "Minimum severity P1", "Tenant request via support ticket"],
  ["Tom Okafor", "rolled back template", "GOV-03", "v1.4", "v1.3", "Rendering defect in v1.4"],
];

export const AUDIT_OUTCOMES = ["Success", "Pending", "Draft", "Rejected", "Archived"];

export function auditRows(state: CommsState): AuditRow[] {
  const recorded = state.audit.map((entry, i) => ({
    id: `AUD-${5200 - i}`,
    time: formatTimestamp(entry.ts),
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource || "Platform",
    previous: entry.previous || "-",
    next: entry.next || "-",
    reason: entry.reason || "Administrative action",
    correlation: `corr-${(5200 - i).toString(16)}`,
    outcome: entry.status,
  }));
  const historical = HISTORICAL.map(([actor, action, resource, previous, next, reason], i) => ({
    id: `AUD-${4100 - i}`,
    time: `${daysAgo(i + 2)} 11:0${i} UTC`,
    actor,
    action,
    resource,
    previous,
    next,
    reason,
    correlation: `corr-${(4100 - i).toString(16)}`,
    outcome: "Success",
  }));
  return [...recorded, ...historical];
}

/** id, time, actor, action, resource, outcome — every value quoted. */
export function auditCsv(rows: AuditRow[]): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    "id,time,actor,action,resource,outcome",
    ...rows.map((r) => [r.id, r.time, r.actor, r.action, r.resource, r.outcome].map(quote).join(",")),
  ].join("\n");
}
