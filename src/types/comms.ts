/**
 * The Communications Centre runs on demonstration data kept in this browser's
 * localStorage. Nothing here is sent anywhere: test sends, approvals and
 * publication are simulated and only change the stored state.
 */

export type CategoryId = "auth" | "org" | "inc" | "gov" | "int" | "prod" | "bill" | "mkt";

export interface Category {
  id: CategoryId;
  name: string;
  /** Template ID prefix, e.g. INC in INC-02. */
  prefix: string;
  /** First segment of generated event identifiers, e.g. incident in incident.declared. */
  eventPrefix: string;
  description: string;
  templateNames: string[];
}

export type TemplateStatus = "Published" | "Draft" | "Pending Approval" | "Approved" | "Archived";
export type Priority = "Critical" | "High" | "Normal" | "Low";
export type TriggerType = "Event-based" | "Scheduled" | "Manual" | "System-generated";
export type VariableType = "String" | "Enum" | "DateTime" | "Array" | "URL" | "Email";

export interface TemplateVariable {
  key: string;
  type: VariableType;
  required: boolean;
  description: string;
  example: string;
  /** Used when the value is empty. An empty fallback hides optional content instead. */
  fallback: string;
  options?: string[];
}

export interface SummaryRow {
  label: string;
  value: string;
  on: boolean;
}

export type BlockType =
  | "header"
  | "eyebrow"
  | "heading"
  | "text"
  | "severity"
  | "summary"
  | "impact"
  | "details"
  | "cta"
  | "footer";

/** Block settings vary by type; the editor reads and writes them by key. */
export interface BlockProps {
  [key: string]: string | number | boolean | SummaryRow[] | undefined;
  rows?: SummaryRow[];
}

export interface EmailBlock {
  id: string;
  type: BlockType;
  name: string;
  required: boolean;
  visible: boolean;
  props: BlockProps;
}

export interface VersionChange {
  area: string;
  from: string;
  to: string;
}

export interface TemplateVersion {
  version: string;
  by: string;
  date: string;
  note: string;
  status: string;
  changes: VersionChange[];
}

export interface Approval {
  by: string;
  at: string;
  reviewer: string;
  status: "Pending" | "Approved" | "Rejected";
  comment: string;
  decided: string;
}

export interface EmailTemplate {
  id: string;
  category: CategoryId;
  name: string;
  event: string;
  description: string;
  subject: string;
  preview: string;
  status: TemplateStatus;
  priority: Priority;
  triggerType: TriggerType;
  version: string;
  updated: string;
  created: string;
  by: string;
  owner: string;
  audience: string;
  variables: TemplateVariable[];
  blocks: EmailBlock[];
  /** Sample values entered in the editor, overriding each variable's example. */
  sample: Record<string, string>;
  approval: Approval | null;
  condition: string;
  recipientRule: string;
  versions: TemplateVersion[];
  /** The version future deliveries use after a rollback. Unset means the current version. */
  live?: string;
}

/** Maps a domain event, through a use case, to a master template and the policy that governs it. */
export interface Trigger {
  id: string;
  name: string;
  event: string;
  useCase: string;
  templateId: string;
  /** Name of the notification policy that decides whether, when and to whom it sends. */
  policy: string;
  rule: string;
  condition: string;
  enabled: boolean;
  last: string;
}

export const SUBSCRIPTION_KEYS = ["Incident", "Governance", "Security", "Billing", "Product"] as const;
export type SubscriptionKey = (typeof SUBSCRIPTION_KEYS)[number];

export const SEVERITIES = ["P0", "P1", "P2", "P3"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface RecipientRole {
  name: string;
  subscriptions: Record<SubscriptionKey, boolean>;
}

export interface RecipientSettings {
  roles: RecipientRole[];
  severities: Record<Severity, boolean>;
  digest: string;
  product: boolean;
  marketing: boolean;
}

export type FontKey = "Helvetica" | "Georgia" | "Verdana";

export interface DesignSystem {
  company: string;
  accent: string;
  background: string;
  contentBackground: string;
  width: number;
  padding: number;
  radius: number;
  font: FontKey;
}

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  /** What was acted on: a template, tenant or policy id, or empty for the platform. */
  resource: string;
  status: string;
  previous?: string;
  next?: string;
  reason?: string;
}

/** A row in the Tenant Profiles, Team or Notification Policies tables. Every value is display text. */
export interface ModuleRow {
  id: string;
  [field: string]: string;
}

export interface OrganisationProfile {
  name: string;
  domain: string;
  region: string;
  plan: string;
}

export interface OrganisationSettings {
  mfa: boolean;
  sso: boolean;
  ipAllowlist: boolean;
  session: string;
  retention: string;
  digest: boolean;
}

/** How Scrubbe routes a tenant's notifications. Never holds template overrides or provider credentials. */
export interface TenantProfile {
  tenantId: string;
  contacts: { admin: string; engineering: string; security: string; escalation: string };
  routing: { incident: string; governance: string; billing: string };
  timezone: string;
  locale: string;
  minSeverity: string;
  escalateAfter: string;
  digest: string;
  branding: string;
  categories: Record<CategoryId, boolean>;
}

export interface CommsState {
  templates: EmailTemplate[];
  triggers: Trigger[];
  policies: ModuleRow[];
  recipients: RecipientSettings;
  design: DesignSystem;
  audit: AuditEntry[];
  workspaces: ModuleRow[];
  team: ModuleRow[];
  organisation: OrganisationProfile;
  settings: OrganisationSettings;
  tenantProfiles: Record<string, TenantProfile>;
}

export interface DeliveryLog {
  id: string;
  tenant: string;
  eventId: string;
  event: string;
  useCase: string;
  templateId: string;
  version: string;
  recipient: string;
  provider: string;
  status: string;
  policyDecision: string;
  ts: string;
  attempts: number;
  reason: string;
  correlation: string;
}
