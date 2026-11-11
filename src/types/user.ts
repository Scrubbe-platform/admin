export const ADMIN_ROLES = ["WORKSPACE_OWNER", "ADMIN", "SUPER_ADMIN"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface CurrentUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export function hasAdminRole(user: Pick<CurrentUser, "roles"> | null | undefined): boolean {
  if (!user) return false;
  return user.roles.some((role) => (ADMIN_ROLES as readonly string[]).includes(role));
}

export function displayName(user: CurrentUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : user.email;
}
