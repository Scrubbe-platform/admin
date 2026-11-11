import { CATEGORIES, daysAgo } from "@/lib/comms/catalog";
import type {
  BlockProps,
  BlockType,
  Category,
  CommsState,
  DesignSystem,
  EmailBlock,
  EmailTemplate,
  ModuleRow,
  Priority,
  SummaryRow,
  TemplateStatus,
  TemplateVariable,
  TemplateVersion,
  Trigger,
  TriggerType,
  VariableType,
} from "@/types/comms";

/** Builds the demonstration data the Communications Centre starts from. */

export function newBlockId(): string {
  return `b${Math.random().toString(36).slice(2, 8)}`;
}

export function makeBlock(type: BlockType, name: string, required: boolean, props: BlockProps): EmailBlock {
  return { id: newBlockId(), type, name, required, visible: true, props };
}

export function row(label: string, value: string): SummaryRow {
  return { label, value, on: true };
}

function variable(
  key: string,
  type: VariableType,
  required: boolean,
  description: string,
  example: string,
  fallback = "",
  options?: string[],
): TemplateVariable {
  return { key, type, required, description, example, fallback, ...(options ? { options } : {}) };
}

function incidentVariables(): TemplateVariable[] {
  return [
    variable("incident.id", "String", true, "Unique incident identifier", "INC-2048"),
    variable("incident.title", "String", true, "Short incident title", "Payment Processing Failure"),
    variable("incident.severity", "Enum", true, "Severity P0–P3", "P1", "", ["P0", "P1", "P2", "P3"]),
    variable("incident.status", "Enum", true, "Lifecycle status", "Declared", "", ["Declared", "Investigating", "Mitigated", "Resolved"]),
    variable("incident.service", "String", true, "Primary affected service", "Payments API"),
    variable("incident.environment", "String", true, "Deployment environment", "Production"),
    variable("incident.summary", "String", true, "One-line summary", "Payment requests failing intermittently"),
    variable("incident.declared_at", "DateTime", true, "Declaration timestamp (UTC)", "10 November 2026, 08:15 UTC"),
    variable("incident.commander", "String", false, "Assigned incident commander", "Sarah Mitchell", "Unassigned"),
    variable("incident.impact", "String", false, "Customer or system impact", "Some payment requests are failing."),
    variable("incident.affected_services", "Array", false, "All affected services", "Payments API, Checkout"),
    variable("incident.url", "URL", true, "Authenticated incident workspace link (validated by backend)", "https://app.scrubbe.com/incidents/INC-2048"),
    variable("organisation.name", "String", true, "Organisation display name", "Acme Technologies"),
    variable("recipient.name", "String", false, "Recipient first name", "Dev Patel", "there"),
    variable("recipient.email", "Email", true, "Recipient address", "dev.patel@acme.example"),
  ];
}

export function genericVariables(): TemplateVariable[] {
  return [
    variable("recipient.name", "String", false, "Recipient first name", "Dev Patel", "there"),
    variable("recipient.email", "Email", true, "Recipient address", "dev.patel@acme.example"),
    variable("organisation.name", "String", true, "Organisation display name", "Acme Technologies"),
    variable("event.summary", "String", true, "Event summary text", "Your workspace has a new update."),
    variable("event.url", "URL", true, "Authenticated destination (validated by backend)", "https://app.scrubbe.com/notifications"),
  ];
}

const headerBlock = () =>
  makeBlock("header", "Brand Header", true, { logo: "Scrubbe Inc.", align: "left", bg: "#ffffff", pad: 24 });

const footerBlock = () =>
  makeBlock("footer", "Footer", true, {
    company: "Scrubbe Inc.",
    legal: "Operational intelligence and governed incident orchestration.",
    prefs: true,
    unsub: false,
  });

export function genericBlocks(name: string, category: Category): EmailBlock[] {
  return [
    headerBlock(),
    makeBlock("eyebrow", "Email Eyebrow", false, { text: category.name.toUpperCase(), color: "#62666c", size: 12 }),
    makeBlock("heading", "Main Heading", true, { text: name, size: 26, weight: "600", align: "left", color: "#1c1d1f" }),
    makeBlock("text", "Introduction", false, { text: "Hello {{recipient.name}}, {{event.summary}}", size: 15, color: "#33363a" }),
    makeBlock("cta", "Primary Action", true, { label: "Open in Scrubbe", url: "event.url", align: "left", width: "auto" }),
    footerBlock(),
  ];
}

function incidentBlocks(): EmailBlock[] {
  return [
    headerBlock(),
    makeBlock("eyebrow", "Email Eyebrow", false, { text: "INCIDENT MANAGEMENT", color: "#62666c", size: 12 }),
    makeBlock("heading", "Main Heading", true, {
      text: "A new incident has been declared.",
      size: 26,
      weight: "600",
      align: "left",
      color: "#1c1d1f",
    }),
    makeBlock("text", "Introduction", false, {
      text: "An incident has been formally declared in your Scrubbe workspace. The incident team is coordinating investigation, operational assessment and next steps.",
      size: 15,
      color: "#33363a",
    }),
    makeBlock("severity", "Severity Indicator", true, { pre: "Severity", v: "incident.severity" }),
    makeBlock("summary", "Incident Summary", true, {
      rows: [
        row("Incident ID", "{{incident.id}}"),
        row("Title", "{{incident.title}}"),
        row("Severity", "{{incident.severity}}"),
        row("Status", "{{incident.status}}"),
        row("Affected service", "{{incident.service}}"),
        row("Environment", "{{incident.environment}}"),
      ],
    }),
    makeBlock("impact", "Impact Assessment", false, { text: "{{incident.impact}}", cond: "when present", fb: "" }),
    makeBlock("details", "Declaration Details", false, {
      rows: [
        row("Declared at", "{{incident.declared_at}}"),
        row("Incident commander", "{{incident.commander}}"),
        row("Organisation", "{{organisation.name}}"),
      ],
    }),
    makeBlock("cta", "Primary Action", true, { label: "View Incident in Scrubbe", url: "incident.url", align: "left", width: "auto" }),
    footerBlock(),
  ];
}

const KNOWN_EVENTS: Record<string, string> = {
  "INC-02": "incident.declared",
  "INC-07": "incident.remediation.proposed",
  "INC-08": "incident.remediation.approval_required",
  "INC-15": "incident.resolved",
  "GOV-09": "agent.activity.flagged",
  "INT-02": "integration.authentication_failed",
  "ORG-03": "organisation.member_invited",
  "AUTH-03": "account.password_reset_requested",
};

const PEOPLE = ["Sarah Mitchell", "Priya Raman", "Tom Okafor"];
const STATUS_CYCLE: TemplateStatus[] = ["Published", "Published", "Published", "Draft", "Published", "Pending Approval", "Approved", "Published", "Archived"];
const PRIORITY_CYCLE: Priority[] = ["Normal", "High", "Normal", "Low", "Normal", "High", "Normal", "Low", "Normal"];
const CRITICAL_IDS = ["INC-03", "AUTH-14", "GOV-01", "GOV-12", "INC-13", "INT-12", "INC-08"];

function previousVersion(version: string): string {
  const [major = 1, minor = 0] = version.slice(1).split(".").map(Number);
  return minor > 0 ? `v${major}.${minor - 1}` : `v${major - 1}.0`;
}

/** One template, with its fields spread deterministically across statuses, priorities and dates. */
export function buildTemplate(category: Category, index: number, name: string): EmailTemplate {
  const id = `${category.prefix}-${String(index + 1).padStart(2, "0")}`;
  const h = (index * 7 + name.length * 3) % 9;
  const isIncident = id === "INC-02";
  const version = isIncident ? "v3.2" : `v${1 + (h % 3)}.${h % 4}`;
  const status: TemplateStatus = isIncident ? "Published" : STATUS_CYCLE[h] ?? "Draft";
  const priority: Priority = CRITICAL_IDS.includes(id) ? "Critical" : isIncident ? "High" : PRIORITY_CYCLE[h] ?? "Normal";
  const triggerType: TriggerType =
    category.id === "mkt"
      ? "Manual"
      : /PROD-0[67]|BILL-05|BILL-11/.test(id)
        ? "Scheduled"
        : category.id === "auth" && h % 3 === 0
          ? "System-generated"
          : "Event-based";
  const updatedDaysAgo = isIncident ? 2 : (h * 4 + index) % 40;
  const by = PEOPLE[h % 3] ?? "Sarah Mitchell";
  const created = daysAgo(120 + h * 9);
  const updated = daysAgo(updatedDaysAgo);

  const versions: TemplateVersion[] =
    version === "v1.0"
      ? [{ version, by, date: created, note: "Initial version", status: status === "Draft" ? "Draft" : "Published", changes: [] }]
      : [
          {
            version,
            by,
            date: updated,
            note: isIncident ? "Added affected-service summary and conditional impact block" : "Copy and layout refinements",
            status,
            changes: isIncident
              ? [
                  { area: "Content", from: "Impact block always visible", to: "Impact block shown only when incident.impact is present" },
                  { area: "Variable", from: "(none)", to: "incident.affected_services (Array, optional)" },
                  { area: "Layout", from: "Single-column summary", to: "Two-column incident summary table" },
                ]
              : [{ area: "Content", from: "Previous heading copy", to: "Updated heading and introduction" }],
          },
          {
            version: previousVersion(version),
            by: "Priya Raman",
            date: daysAgo(updatedDaysAgo + 40),
            note: "Previous published version",
            status: "Superseded",
            changes: isIncident
              ? [
                  { area: "Subject", from: "Incident declared: {{incident.title}}", to: "[{{incident.severity}}] Incident declared: {{incident.title}}" },
                  { area: "Trigger", from: "incident.created", to: "incident.declared" },
                  { area: "Recipients", from: "All workspace members", to: "Incident commander + service owners" },
                ]
              : [{ area: "Subject", from: "—", to: `${name} – {{organisation.name}}` }],
          },
        ];

  return {
    id,
    category: category.id,
    name,
    event:
      KNOWN_EVENTS[id] ??
      `${category.eventPrefix}.${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
    description: isIncident
      ? "Notifies relevant engineering stakeholders when an incident has been formally declared in Scrubbe."
      : `Notifies recipients about “${name}” events in ${category.name}.`,
    subject: isIncident ? "[{{incident.severity}}] Incident declared: {{incident.title}}" : `${name} – {{organisation.name}}`,
    preview: isIncident
      ? "A new incident has been declared in {{organisation.name}}. View incident details and operational updates in Scrubbe."
      : "{{event.summary}}",
    status,
    priority,
    triggerType,
    version,
    updated,
    created,
    by,
    owner: isIncident ? "Incident Management Team" : "Platform Engineering",
    audience: isIncident ? "Incident commanders, engineering leads, service owners" : "Organisation administrators",
    variables: isIncident ? incidentVariables() : genericVariables(),
    blocks: isIncident ? incidentBlocks() : genericBlocks(name, category),
    sample: {},
    approval:
      status === "Pending Approval" || status === "Approved"
        ? {
            by,
            at: `${updated}T10:30`,
            reviewer: "Priya Raman (Governance Officer)",
            status: status === "Approved" ? "Approved" : "Pending",
            comment: status === "Approved" ? "Copy reviewed; variables validated." : "",
            decided: status === "Approved" ? `${updated}T14:05` : "",
          }
        : null,
    condition: isIncident ? "incident.severity in [P0, P1, P2]" : "",
    recipientRule: isIncident ? "Incident commander + service owners" : "Organisation administrators",
    versions,
  };
}

/** name, event, use case, template, policy, recipient rule, condition */
const TRIGGERS: [string, string, string, string, string, string, string][] = [
  ["Incident declared", "incident.declared", "Notify incident stakeholders", "INC-02", "Critical incident notification", "Incident commander + service owners", "severity in [P0, P1, P2]"],
  ["Remediation proposed", "incident.remediation.proposed", "Notify stakeholders of proposed remediation", "INC-07", "Operational incident updates", "Incident commander + approvers", ""],
  ["Remediation approval required", "incident.remediation.approval_required", "Request remediation approval", "GOV-03", "Remediation approval required", "Designated approvers (policy-resolved)", ""],
  ["Incident resolved", "incident.resolved", "Notify stakeholders of resolution", "INC-15", "Operational incident updates", "Incident subscribers", ""],
  ["Agent activity flagged", "agent.activity.flagged", "Notify governance officers of flagged agent activity", "GOV-09", "Agent activity oversight", "Governance officers", "risk_score ≥ 70"],
  ["Integration authentication failed", "integration.authentication_failed", "Notify integration owners", "INT-02", "Integration health", "Integration owners + org administrators", ""],
  ["Member invited", "organisation.member_invited", "Invite new member", "ORG-03", "Account and membership", "Invitee", ""],
  ["Password reset requested", "account.password_reset_requested", "Deliver password reset link", "AUTH-03", "Account and membership", "Account holder", ""],
];

const TRIGGER_TIMES = ["08:15", "07:42", "06:58", "09:01"];

const POLICY_FIELDS = ["id", "name", "class", "pri", "events", "timing", "ver", "status", "cond", "recip", "esc", "sup"];

const POLICIES: string[][] = [
  ["NP-01", "Critical incident notification", "Critical", "Critical", "incident.declared", "Immediate", "v2.1", "Active", "severity in [P0, P1]", "Incident commander and escalation contacts", "Escalate after 10 minutes unacknowledged", "Duplicate window 5 minutes; P0 is never suppressed"],
  ["NP-02", "Remediation approval required", "Action Required", "Critical", "incident.remediation.approval_required", "Immediate", "v1.4", "Active", "Approval pending", "Designated approvers", "Reminder at 30 minutes; expires after 4 hours", "None until a decision is recorded"],
  ["NP-03", "Operational incident updates", "Operational", "Normal", "incident.remediation.proposed, incident.resolved", "Policy-controlled (batched 5 min)", "v1.2", "Active", "Status change or severity P2-P3", "Incident subscribers", "None", "Rate limit 10 per hour per incident"],
  ["NP-04", "Agent activity oversight", "Operational", "High", "agent.activity.flagged", "Policy-controlled", "v1.0", "Active", "risk_score >= 70", "Governance officers", "Escalate to security officer after 1 hour", "Suppress repeats for the same agent for 30 minutes"],
  ["NP-05", "Integration health", "Informational", "Low", "integration.authentication_failed", "Daily digest, 08:00", "v1.1", "Active", "Failure persists over 15 minutes", "Integration owners", "None", "Collapse repeated failures"],
  ["NP-06", "Account and membership", "Administrative", "Normal", "organisation.member_invited, account.password_reset_requested", "Event-based", "v3.0", "Active", "User-initiated action", "Invitee or account holder", "None", "Rate limit 5 per hour per recipient"],
  ["NP-07", "Product communications", "Product", "Low", "Centrally scheduled campaigns", "Centrally scheduled", "v1.3", "Draft", "Scheduled by Scrubbe", "Opted-in recipients", "None", "Unsubscribes always respected"],
];

export const DEFAULT_DESIGN: DesignSystem = {
  company: "Scrubbe Inc.",
  accent: "#202327",
  background: "#ffffff",
  contentBackground: "#ffffff",
  width: 600,
  padding: 32,
  radius: 6,
  font: "Helvetica",
};

const ROLE_NAMES = [
  "Organisation administrators",
  "Incident commanders",
  "Engineering leads",
  "Security officers",
  "Governance officers",
  "Workspace members",
  "Billing administrators",
];

const SEED_ACTIVITY: [string, string, string, string][] = [
  ["Priya Raman", "published", "INC-02", "Success"],
  ["Sarah Mitchell", "submitted for approval", "GOV-03", "Pending"],
  ["Tom Okafor", "updated", "BILL-03", "Success"],
  ["Priya Raman", "approved", "INT-02", "Success"],
  ["Sarah Mitchell", "created", "PROD-13", "Draft"],
  ["Tom Okafor", "archived", "MKT-10", "Archived"],
];

function rows(fields: string[], values: string[][]): ModuleRow[] {
  return values.map((entry) => {
    const record: ModuleRow = { id: "" };
    fields.forEach((field, i) => {
      record[field] = entry[i] ?? "";
    });
    return record;
  });
}

export function seedComms(): CommsState {
  const templates: EmailTemplate[] = [];
  CATEGORIES.forEach((category) =>
    category.templateNames.forEach((name, index) => templates.push(buildTemplate(category, index, name))),
  );

  const triggers: Trigger[] = TRIGGERS.map(([name, event, useCase, templateId, policy, rule, condition], i) => ({
    id: `TRG-${i + 1}`,
    name,
    event,
    useCase,
    templateId,
    policy,
    rule,
    condition,
    enabled: true,
    last: `${daysAgo(i % 3)} ${TRIGGER_TIMES[i % 4] ?? "08:00"} UTC`,
  }));
  // One event can feed several use cases: lower-severity declarations go to service owners only.
  triggers.push({
    id: "TRG-9",
    name: "Incident declared: service owners",
    event: "incident.declared",
    useCase: "Notify service owners",
    templateId: "INC-02",
    policy: "Operational incident updates",
    rule: "Incident commander + service owners",
    condition: "severity in [P2, P3]",
    enabled: true,
    last: `${daysAgo(1)} 06:40 UTC`,
  });

  return {
    templates,
    triggers,
    policies: rows(POLICY_FIELDS, POLICIES),
    recipients: {
      roles: ROLE_NAMES.map((name, i) => ({
        name,
        subscriptions: {
          Incident: i === 0 || i === 1 || i === 2,
          Governance: i === 0 || i === 4,
          Security: i === 0 || i === 3,
          Billing: i === 6,
          Product: i !== 3,
        },
      })),
      severities: { P0: true, P1: true, P2: true, P3: false },
      digest: "Daily at 08:00",
      product: true,
      marketing: false,
    },
    design: { ...DEFAULT_DESIGN },
    audit: SEED_ACTIVITY.map(([actor, action, resource, status], i) => ({
      ts: `${daysAgo(i)}T${10 + i}:20`,
      actor,
      action,
      resource,
      status,
    })),
    workspaces: rows(
      ["id", "name", "domain", "plan", "status", "members", "cfg"],
      [
        ["WS-01", "Acme Technologies", "acme.example", "Enterprise", "Active", "24", "Custom"],
        ["WS-02", "Northwind Labs", "northwind.example", "Business", "Active", "18", "Default"],
        ["WS-03", "Globex Payments", "globex.example", "Enterprise", "Active", "42", "Default"],
        ["WS-04", "Initech Systems", "initech.example", "Business", "Trial", "6", "Default"],
        ["WS-05", "Umbrella Cloud", "umbrella.example", "Starter", "Suspended", "3", "Default"],
      ],
    ),
    team: rows(
      ["id", "name", "email", "role", "status", "mfa"],
      [
        ["USR-01", "Sarah Mitchell", "sarah.mitchell@scrubbe.example", "Platform Administrator", "Active", "Enabled"],
        ["USR-02", "Priya Raman", "priya.raman@scrubbe.example", "Template Reviewer", "Active", "Enabled"],
        ["USR-03", "Tom Okafor", "tom.okafor@scrubbe.example", "Template Author", "Active", "Enabled"],
        ["USR-04", "Dev Patel", "dev.patel@scrubbe.example", "Communications Operator", "Active", "Enabled"],
        ["USR-05", "Ana Silva", "ana.silva@scrubbe.example", "Auditor", "Invited", "Disabled"],
        ["USR-06", "Li Wei", "li.wei@scrubbe.example", "Communications Administrator", "Active", "Enabled"],
      ],
    ),
    organisation: { name: "Scrubbe Inc.", domain: "scrubbe.example", region: "EU (Frankfurt)", plan: "Internal" },
    settings: { mfa: true, sso: false, ipAllowlist: false, session: "1 hour", retention: "3 years", digest: true },
    tenantProfiles: {},
  };
}
