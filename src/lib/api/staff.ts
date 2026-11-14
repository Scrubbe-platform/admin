import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { CurrentUser, StaffRole } from "@/types/user";

/** Paged list envelope used by every console list endpoint. */
export interface Page<T> {
  total: number;
  items: T[];
  page: number;
  limit: number;
}

type Query = Record<string, string | number | undefined | null>;

const qs = (q: Query = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

const get = <T>(url: string, q?: Query) => request<T>({ method: "GET", url: `${url}${qs(q)}` });
const post = <T>(url: string, data?: unknown) => request<T>({ method: "POST", url, data });
const put = <T>(url: string, data?: unknown) => request<T>({ method: "PUT", url, data });
const patch = <T>(url: string, data?: unknown) => request<T>({ method: "PATCH", url, data });
const del = <T>(url: string) => request<T>({ method: "DELETE", url });

// ── Audit ────────────────────────────────────────────────────────────────────
export interface StaffAuditEntry {
  id: string;
  adminId: string | null;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

// ── Overview ─────────────────────────────────────────────────────────────────
export interface Overview {
  totals: { workspaces: number; suspendedWorkspaces: number; users: number; suspendedUsers: number; activeUsers7d: number; incidents30d: number; openIncidents: number };
  queues: { waitlistPending: number; inboxNew: number };
  subscriptions: Record<string, number>;
  receivables: Array<{ currency: string; outstanding: number; overdue: number; overdueCount: number }>;
  series: { signups: SeriesPoint[]; workspaces: SeriesPoint[]; incidents: SeriesPoint[] };
  recentStaffActions: StaffAuditEntry[];
}
export interface SeriesPoint {
  date: string;
  count: number;
}
export const fetchOverview = () => get<Overview>(ENDPOINTS.overview);

// ── Workspaces ───────────────────────────────────────────────────────────────
export interface WorkspaceRow {
  id: string;
  name: string;
  subdomain: string | null;
  website: string | null;
  isSetupComplete: boolean;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  memberCount: number;
  incidentCount: number;
  owner: { id: string; email: string; name: string } | null;
  subscription: { status: string; plan: string; tier: string } | null;
}

export interface WorkspaceMember {
  id: string;
  email: string;
  name: string;
  roles: string[];
  lastLogin: string | null;
  isActive: boolean;
  isVerified: boolean;
  suspendedAt: string | null;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  subdomain: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  address: string | null;
  isSetupComplete: boolean;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  incidentPrefix: string | null;
  members: WorkspaceMember[];
  subscriptions: Array<{ id: string; status: string; plan: string; tier: string; price: number; currency: string; interval: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; stripeCustomerId: string | null; createdAt: string }>;
  usage: { incidentsTotal: number; incidentsOpen: number; incidents30d: number; integrations: number; apiKeys: number; assets: number; incidentTemplates: number; onCallSchedules: number };
  commercial: { invoiceCount: number; outstanding: number; currency: string | null };
  recentActivity: Array<{ id: string; action: string; resource: string; resourceId: string | null; actor: string | null; createdAt: string }>;
  staffActions: StaffAuditEntry[];
}

export const fetchWorkspaces = (q: Query) => get<Page<WorkspaceRow>>(ENDPOINTS.workspaces, q);
export const fetchWorkspace = (id: string) => get<WorkspaceDetail>(`${ENDPOINTS.workspaces}/${id}`);
export const setWorkspaceSuspended = (id: string, suspend: boolean, reason: string) =>
  post<{ id: string; suspendedAt: string | null }>(`${ENDPOINTS.workspaces}/${id}/${suspend ? "suspend" : "reactivate"}`, { reason });

// ── Users ────────────────────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  email: string;
  name: string;
  roles: string[];
  accountType: string | null;
  isVerified: boolean;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  registerdWithOauth: boolean;
  oauthProvider: string | null;
  business: { id: string; name: string; suspendedAt: string | null } | null;
}

export interface UserDetail extends UserRow {
  username: string | null;
  sessionsRevokedAt: string | null;
  experienceLevel: string | null;
  githubUsername: string | null;
  activeSessions: number;
  apiKeys: number;
  recentActivity: Array<{ id: string; action: string; resource: string; resourceId: string | null; ipAddress: string | null; createdAt: string }>;
  staffActions: StaffAuditEntry[];
  business: { id: string; name: string; subdomain: string | null; suspendedAt: string | null } | null;
}

export const fetchUsers = (q: Query) => get<Page<UserRow>>(ENDPOINTS.users, q);
export const fetchUser = (id: string) => get<UserDetail>(`${ENDPOINTS.users}/${id}`);
export type UserAction = "suspend" | "reactivate" | "revoke-sessions" | "reset-mfa";
export const userAction = (id: string, action: UserAction, reason: string) => post<unknown>(`${ENDPOINTS.users}/${id}/${action}`, { reason });

// ── Incidents, activity, audit, subscriptions ────────────────────────────────
export interface IncidentRow {
  id: string;
  ticketId: string;
  summary: string;
  priority: string;
  severity: string | null;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  business: { id: string; name: string };
}
export const fetchIncidents = (q: Query) => get<Page<IncidentRow>>(ENDPOINTS.incidents, q);

export interface ActivityRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string } | null;
  workspace: { id: string; name: string } | null;
}
export const fetchActivity = (q: Query) => get<Page<ActivityRow>>(ENDPOINTS.activity, q);
export const fetchAudit = (q: Query) => get<Page<StaffAuditEntry>>(ENDPOINTS.audit, q);

export interface SubscriptionRow {
  id: string;
  status: string;
  plan: string;
  tier: string;
  price: number;
  currency: string;
  interval: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  workspace: { id: string; name: string; suspendedAt: string | null };
}
export const fetchSubscriptions = (q: Query) => get<Page<SubscriptionRow>>(ENDPOINTS.subscriptions, q);

// ── Inbox ────────────────────────────────────────────────────────────────────
export type InboxStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "SPAM";
export interface InboxItem {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: InboxStatus;
  internalNote: string | null;
  handledById: string | null;
  handledAt: string | null;
  createdAt: string;
}
export const fetchInbox = (q: Query) => get<Page<InboxItem> & { counts: Partial<Record<InboxStatus, number>> }>(ENDPOINTS.inbox, q);
export const updateInboxItem = (id: string, data: { status?: InboxStatus; internalNote?: string | null }) => patch<InboxItem>(`${ENDPOINTS.inbox}/${id}`, data);

// ── Waitlist ─────────────────────────────────────────────────────────────────
export type WaitlistStatus = "PENDING" | "APPROVED" | "INVITED" | "REJECTED";
export interface WaitlistEntry {
  id: string;
  fullName: string;
  workEmail: string;
  jobTitle: string;
  company: string;
  companyWebsite: string;
  companySize: string;
  industry: string;
  country: string;
  cloudProvider: string;
  deploymentModel: string;
  primaryLanguage: string;
  observabilityStack: string;
  incidentPlatform: string;
  linkedin: string | null;
  challenges: string[];
  interests: string[];
  incidentsPerMonth: string | null;
  teamSize: string | null;
  additionalNotes: string | null;
  status: WaitlistStatus;
  notes: string | null;
  inviteSentAt: string | null;
  createdAt: string;
}
export const fetchWaitlist = (q: Query) =>
  get<{ entries: WaitlistEntry[]; total: number; page: number; limit: number; pages: number }>(ENDPOINTS.waitlist, q);
export const fetchWaitlistStats = () =>
  get<{ total: number; pending: number; approved: number; invited: number; rejected: number }>(`${ENDPOINTS.waitlist}/stats`);
export const waitlistAction = (id: string, action: "approve" | "invite" | "reject") => post<unknown>(`${ENDPOINTS.waitlist}/${id}/${action}`);
export const updateWaitlistNotes = (id: string, notes: string) => patch<WaitlistEntry>(`${ENDPOINTS.waitlist}/${id}`, { notes });

// ── Staff team ───────────────────────────────────────────────────────────────
export interface StaffMember extends CurrentUser {
  isActive: boolean;
  createdAt: string;
  invitePending: boolean;
  inviteExpired: boolean;
  locked: boolean;
}
export const fetchTeam = () => get<StaffMember[]>(ENDPOINTS.team);
export const inviteStaff = (data: { email: string; firstName: string; lastName: string; role: StaffRole }) => post<StaffMember>(ENDPOINTS.team, data);
export const setStaffRole = (id: string, role: StaffRole) => patch<StaffMember>(`${ENDPOINTS.team}/${id}/role`, { role });
export const staffAction = (id: string, action: "deactivate" | "reactivate" | "reset-mfa", reason: string) =>
  post<unknown>(`${ENDPOINTS.team}/${id}/${action}`, { reason });
export const resendStaffInvite = (id: string) => post<unknown>(`${ENDPOINTS.team}/${id}/resend-invite`);
export const unlockStaff = (id: string) => post<unknown>(`${ENDPOINTS.team}/${id}/unlock`);

// ── Console settings & organisation ──────────────────────────────────────────
export interface ConsoleSettings {
  requireMfa: boolean;
  sessionHours: number;
  idleMinutes: number;
  ipAllowlist: string[];
}
export const fetchConsoleSettings = () => get<ConsoleSettings>(ENDPOINTS.settings);
export const saveConsoleSettings = (data: ConsoleSettings) => put<ConsoleSettings>(ENDPOINTS.settings, data);

export interface Organisation {
  name: string;
  legalName: string;
  supportEmail: string;
  billingEmail: string;
  address: string;
  taxId: string;
}
export const fetchOrganisation = () => get<Organisation>(ENDPOINTS.organisation);
export const saveOrganisation = (data: Organisation) => put<Organisation>(ENDPOINTS.organisation, data);

// ── Commercial billing ───────────────────────────────────────────────────────
export interface LineItem {
  description: string;
  quantity: number;
  unitAmount: number;
}
export interface Agreement {
  id: string;
  reference: string;
  pricingModel: string;
  term: string | null;
  effectiveDate: string | null;
  expiresAt: string | null;
  status: "PENDING" | "ACTIVE" | "EXPIRED";
  notes: string | null;
}
export interface StaffQuotation {
  id: string;
  reference: string;
  issuedAt: string | null;
  validUntil: string | null;
  amount: number;
  currency: string;
  status: string;
  storedStatus: "DRAFT" | "ISSUED" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  documentUrl: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  decidedAt: string | null;
  notes: string | null;
  createdAt: string;
}
export interface StaffPayment {
  id: string;
  reference: string;
  receivedAt: string | null;
  invoiceId: string;
  invoiceReference: string | null;
  method: string;
  amount: number;
  currency: string;
  reconciled: boolean;
  notes: string | null;
}
export interface StaffInvoice {
  id: string;
  reference: string;
  invoiceDate: string | null;
  dueDate: string | null;
  amount: number;
  balanceDue: number;
  currency: string;
  status: string;
  storedStatus: "DRAFT" | "ISSUED" | "PART_PAID" | "PAID" | "VOID";
  documentUrl: string | null;
  quotationId: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  amountPaid: number;
  notes: string | null;
  createdAt: string;
  payments: StaffPayment[];
  workspace?: { id: string; name: string };
}
export interface WorkspaceBilling {
  workspace: { id: string; name: string; subdomain: string | null };
  details: Record<string, string | boolean | null>;
  contacts: {
    accountsPayable: { name: string | null; email: string | null; role: string | null } | null;
    commercialApprover: { name: string | null; email: string | null; role: string | null } | null;
  };
  preferences: Record<string, string | null>;
  agreements: Agreement[];
  quotations: StaffQuotation[];
  invoices: StaffInvoice[];
  payments: StaffPayment[];
}
export interface BillingOverview {
  receivables: Array<{ currency: string; outstanding: number; overdue: number; overdueCount: number }>;
  invoiceCounts: Record<string, number>;
  recentPayments: Array<StaffPayment & { workspace: { id: string; name: string } }>;
}

const B = ENDPOINTS.billing;
export const fetchBillingOverview = () => get<BillingOverview>(`${B}/overview`);
export const fetchStaffInvoices = (q: Query) => get<Page<StaffInvoice>>(`${B}/invoices`, q);
export const fetchWorkspaceBilling = (businessId: string) => get<WorkspaceBilling>(`${B}/workspaces/${businessId}`);
export interface AgreementInput {
  pricingModel: string;
  term: string | null;
  effectiveDate: string | null;
  expiresAt: string | null;
  status: Agreement["status"];
  notes: string | null;
}
export const createAgreement = (businessId: string, data: AgreementInput) => post<Agreement>(`${B}/workspaces/${businessId}/agreements`, data);
export const updateAgreement = (id: string, data: AgreementInput) => put<Agreement>(`${B}/agreements/${id}`, data);
export interface QuotationInput {
  currency: string;
  lineItems: LineItem[];
  taxRate: number;
  validUntil: string | null;
  notes: string | null;
}
export const createQuotation = (businessId: string, data: QuotationInput) => post<StaffQuotation>(`${B}/workspaces/${businessId}/quotations`, data);
export const updateQuotation = (id: string, data: QuotationInput) => put<StaffQuotation>(`${B}/quotations/${id}`, data);
export const issueQuotation = (id: string) => post<StaffQuotation>(`${B}/quotations/${id}/issue`);
export const decideQuotation = (id: string, status: "ACCEPTED" | "DECLINED" | "EXPIRED") => post<StaffQuotation>(`${B}/quotations/${id}/decision`, { status });
export const deleteQuotation = (id: string) => del<void>(`${B}/quotations/${id}`);
export interface InvoiceInput {
  currency: string;
  lineItems: LineItem[];
  taxRate: number;
  dueDate: string;
  quotationId: string | null;
  notes: string | null;
}
export const createInvoice = (businessId: string, data: InvoiceInput) => post<StaffInvoice>(`${B}/workspaces/${businessId}/invoices`, data);
export const updateInvoice = (id: string, data: InvoiceInput) => put<StaffInvoice>(`${B}/invoices/${id}`, data);
export const issueInvoice = (id: string) => post<StaffInvoice>(`${B}/invoices/${id}/issue`);
export const voidInvoice = (id: string, reason: string) => post<StaffInvoice>(`${B}/invoices/${id}/void`, { reason });
export const recordPayment = (invoiceId: string, data: { amount: number; method: string; receivedAt: string; reference?: string; notes: string | null }) =>
  post<StaffPayment>(`${B}/invoices/${invoiceId}/payments`, data);
export const reversePayment = (id: string, reason: string) => post<void>(`${B}/payments/${id}/reverse`, { reason });
export const fetchDocumentLink = (kind: "quotation" | "invoice", id: string) => get<{ url: string }>(`${B}/documents/${kind}/${id}`);
