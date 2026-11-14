/**
 * Every backend path the console calls. All live under /api/v1/admin on the
 * Scrubbe API (modules/platform-admin) unless noted. Each one is
 * capability-checked on the server; hiding a link here is only a convenience.
 */
export const ENDPOINTS = {
  auth: {
    login: "/admin/auth/login",
    mfaVerify: "/admin/auth/mfa/verify",
    refresh: "/admin/auth/refresh",
    logout: "/admin/auth/logout",
    me: "/admin/auth/me",
    changePassword: "/admin/auth/change-password",
    sessions: "/admin/auth/sessions",
    forgotPassword: "/admin/auth/forgot-password",
    resetPassword: "/admin/auth/reset-password",
    acceptInvite: "/admin/auth/accept-invite",
  },
  overview: "/admin/overview",
  workspaces: "/admin/workspaces",
  users: "/admin/users",
  incidents: "/admin/incidents",
  activity: "/admin/activity",
  audit: "/admin/audit",
  subscriptions: "/admin/subscriptions",
  inbox: "/admin/inbox",
  /** Waitlist lives in its own module: /api/v1/waitlist (staff-only reads/writes). */
  waitlist: "/waitlist",
  blogs: "/admin/blogs",
  careers: "/admin/careers",
  media: "/admin/media",
  team: "/admin/team",
  settings: "/admin/settings",
  organisation: "/admin/organisation",
  acquisition: "/admin/acquisition",
  comms: "/admin/comms",
  billing: "/admin/billing",
} as const;
