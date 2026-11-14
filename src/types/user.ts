export const STAFF_ROLES = ["OWNER", "ADMIN", "SUPPORT", "FINANCE", "EDITOR"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  SUPPORT: "Support",
  FINANCE: "Finance",
  EDITOR: "Editor",
};

export const STAFF_ROLE_DESCRIPTION: Record<StaffRole, string> = {
  OWNER: "Everything, including staff accounts and console security.",
  ADMIN: "Moderation, content and commercial records. Not staff management.",
  SUPPORT: "Read workspaces and users, suspend users, inbox and waitlist.",
  FINANCE: "Commercial records and subscriptions, read-only workspaces.",
  EDITOR: "Blog, careers and the communications library.",
};

/** Mirrors server/src/modules/platform-admin/guard.ts. The server is the authority. */
export type Capability =
  | "overview.read"
  | "workspace.read"
  | "workspace.moderate"
  | "user.read"
  | "user.moderate"
  | "incident.read"
  | "activity.read"
  | "audit.read"
  | "billing.read"
  | "billing.write"
  | "content.write"
  | "comms.read"
  | "comms.write"
  | "inbox.manage"
  | "waitlist.manage"
  | "acquisition.manage"
  | "staff.read"
  | "staff.manage"
  | "console.settings";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  capabilities: Capability[];
  mfaEnabled: boolean;
  lastLogin: string | null;
  passwordChangedAt: string | null;
  sessionExpiresAt?: string | null;
}

export function can(user: Pick<CurrentUser, "capabilities"> | null | undefined, capability: Capability): boolean {
  return Boolean(user?.capabilities?.includes(capability));
}

export function displayName(user: Pick<CurrentUser, "firstName" | "lastName" | "email">): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : user.email;
}
