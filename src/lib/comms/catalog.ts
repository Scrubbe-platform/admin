import type { Category, CategoryId, EmailTemplate, FontKey } from "@/types/comms";

/**
 * The demonstration is pinned to one morning so its seeded dates, "modified
 * today" filters and delivery timestamps always line up.
 */
export const DEMO_TODAY = "2026-11-10";
export const DEMO_NOW = Date.parse("2026-11-10T09:00:00Z");

/** The signed-in person in the demonstration. Every audited action is attributed to them. */
export const DEMO_ACTOR = "Sarah Mitchell";

export function daysAgo(days: number): string {
  return new Date(DEMO_NOW - days * 86_400_000).toISOString().slice(0, 10);
}

/** "2026-11-10T08:15" -> "2026-11-10 08:15 UTC". */
export function formatTimestamp(iso: string): string {
  return `${iso.replace("T", " ").slice(0, 16)} UTC`;
}

export function nowStamp(): string {
  return new Date().toISOString().slice(0, 16);
}

const RAW: [CategoryId, string, string, string, string, string][] = [
  [
    "auth",
    "Authentication & Security",
    "AUTH",
    "account",
    "Sign-in, account and credential security messages.",
    "Welcome to Scrubbe|Verify Email Address|Password Reset Request|Password Changed Successfully|New Login Detected|New Device Sign-in|Multi-Factor Authentication Enabled|Multi-Factor Authentication Disabled|Account Invitation|Account Suspended|Account Reactivated|API Key Created|API Key Revoked|Suspicious Account Activity",
  ],
  [
    "org",
    "Organisation & Workspace",
    "ORG",
    "organisation",
    "Membership, roles and workspace changes.",
    "Organisation Created|Workspace Created|Member Invitation|Invitation Accepted|New Member Joined|Member Removed|Role Changed|Administrator Privileges Granted|Administrator Privileges Revoked|Organisation Settings Changed",
  ],
  [
    "inc",
    "Incident Management",
    "INC",
    "incident",
    "Lifecycle updates from detection to post-incident review.",
    "Incident Detected|Incident Declared|Critical Incident Declared|Investigation Started|Agent Assigned to Incident|Investigation Findings Available|Remediation Proposed|Remediation Approval Required|Remediation Approved|Remediation Rejected|Remediation Execution Started|Remediation Executed Successfully|Remediation Execution Failed|Verification Started|Incident Resolved|Incident Reopened|Incident Escalated|Incident Ownership Transferred|Post-Incident Report Available|Incident Update",
  ],
  [
    "gov",
    "Governance & Audit",
    "GOV",
    "governance",
    "Policy, approval and agent oversight notices.",
    "Policy Violation Detected|Action Blocked by Governance Policy|Approval Required|Approval Reminder|Approval Expired|Policy Updated|Playbook Updated|Agent Permission Changed|Agent Activity Flagged|Audit Report Available|Governance Configuration Changed|Unauthorised Action Attempt",
  ],
  [
    "int",
    "Integrations & Infrastructure",
    "INT",
    "integration",
    "Connection health for repositories, clusters and monitors.",
    "Integration Connected|Integration Authentication Failed|Integration Disconnected|Integration Credentials Expiring|Webhook Delivery Failed|Webhook Recovered|Repository Connected|Repository Access Changed|Kubernetes Cluster Connected|Monitoring Integration Connected|Integration Sync Completed|Infrastructure Service Unavailable",
  ],
  [
    "prod",
    "Product & Engagement",
    "PROD",
    "product",
    "Onboarding, reports, maintenance and release communication.",
    "Welcome and Getting Started|Organisation Onboarding|First Agent Deployed|First Incident Investigated|Integration Recommendation|Weekly Operational Intelligence Brief|Monthly Platform Report|Feature Announcement|Scheduled Maintenance|Platform Service Disruption|Platform Service Restored|Product Release Notes|Customer Feedback Request",
  ],
  [
    "bill",
    "Billing & Subscription",
    "BILL",
    "billing",
    "Payments, invoices, renewals and usage thresholds.",
    "Subscription Activated|Payment Successful|Payment Failed|Invoice Available|Subscription Renewal Reminder|Subscription Upgraded|Subscription Downgraded|Subscription Cancelled|Usage Threshold Reached|Payment Method Expiring|Trial Ending Soon|Trial Expired",
  ],
  [
    "mkt",
    "Marketing & Corporate",
    "MKT",
    "marketing",
    "Announcements, research, events and company updates.",
    "Scrubbe Product Announcement|Operational Intelligence Brief|Research Publication|Webinar Invitation|Event Invitation|Event Follow-up|Partnership Announcement|Company Update|Customer Story|Investor Update|Product Demonstration Invitation|Newsletter",
  ],
];

export const CATEGORIES: Category[] = RAW.map(([id, name, prefix, eventPrefix, description, names]) => ({
  id,
  name,
  prefix,
  eventPrefix,
  description,
  templateNames: names.split("|"),
}));

export function findCategory(id: string): Category | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export function categoryName(id: string): string {
  return findCategory(id)?.name ?? id;
}

/** Security, account and operational mail can't carry an unsubscribe link or be switched off. */
export function isMandatoryCategory(id: string): boolean {
  return id !== "prod" && id !== "mkt";
}

/** P0–P3 with the badge colour and the word shown beside it, so colour is never the only signal. */
export const SEVERITY_INFO: Record<string, { color: string; label: string }> = {
  P0: { color: "#a8261b", label: "Critical" },
  P1: { color: "#b45309", label: "High" },
  P2: { color: "#1d4ed8", label: "Medium" },
  P3: { color: "#4b5563", label: "Low" },
};

/** Email-safe stacks. Single quotes, because these go inside style="…" attributes. */
export const FONT_STACKS: Record<FontKey, string> = {
  Helvetica: "'Helvetica Neue',Helvetica,Arial,sans-serif",
  Georgia: "Georgia,'Times New Roman',serif",
  Verdana: "Verdana,Geneva,sans-serif",
};

export type Classification = "Critical" | "Action Required" | "Operational" | "Administrative" | "Product";

const CATEGORY_CLASSIFICATION: Record<CategoryId, Classification> = {
  auth: "Administrative",
  org: "Administrative",
  inc: "Operational",
  gov: "Action Required",
  int: "Operational",
  prod: "Product",
  bill: "Administrative",
  mkt: "Product",
};

export function templateClassification(template: Pick<EmailTemplate, "id" | "priority" | "category">): Classification {
  if (template.id === "INC-02" || template.priority === "Critical") return "Critical";
  return CATEGORY_CLASSIFICATION[template.category];
}

/** High-risk templates need a reviewer who isn't their author. */
export function isHighRisk(template: Pick<EmailTemplate, "id" | "priority" | "category">): boolean {
  const classification = templateClassification(template);
  return classification === "Critical" || classification === "Action Required";
}

export const POLICY_CLASSIFICATIONS = ["Critical", "Action Required", "Operational", "Informational", "Administrative", "Product"];

/** Scrubbe staff roles. Tenants have no access to the Communications Centre. */
export const INTERNAL_ROLES = [
  "Communications Administrator",
  "Template Author",
  "Template Reviewer",
  "Communications Operator",
  "Platform Administrator",
  "Auditor",
];

/** Which permission each internal role carries, as shown on Team & Access. */
export const ROLE_PERMISSIONS: [role: string, editDrafts: boolean, approve: boolean, publish: boolean, monitor: boolean, readAudit: boolean][] = [
  ["Communications Administrator", true, false, false, true, true],
  ["Template Author", true, false, false, false, false],
  ["Template Reviewer", false, true, false, false, false],
  ["Communications Operator", false, false, false, true, false],
  ["Platform Administrator", false, false, true, true, true],
  ["Auditor", false, false, false, false, true],
];

/** The tenant contacts a category of notification can be routed to. */
export const RESPONSIBILITY_TARGETS = [
  "Incident escalation contact",
  "Engineering and operational contacts",
  "Security and governance contacts",
  "Primary administrative contact",
];

export const TIMEZONES = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Singapore"];
export const LOCALES = ["en-GB", "en-US", "de-DE", "fr-FR"];

/** Why a delivery can be suppressed, with demonstration record counts. Locked reasons can't be overridden. */
export const SUPPRESSION_REASONS: [reason: string, records: number, locked: boolean][] = [
  ["Invalid recipient", 38, false],
  ["Hard bounce", 61, true],
  ["Complaint", 9, true],
  ["Unsubscribe (optional communications only)", 214, false],
  ["Duplicate notification", 127, false],
  ["Policy restriction", 302, false],
  ["Rate limit", 45, false],
  ["Inactive tenant", 12, false],
  ["Unresolved recipient", 19, false],
];

export const RECIPIENT_RULES = [
  "Incident commander + service owners",
  "Incident commander + approvers",
  "Designated approvers (policy-resolved)",
  "Incident subscribers",
  "Governance officers",
  "Organisation administrators",
  "Integration owners + org administrators",
  "Invitee",
  "Account holder",
];
