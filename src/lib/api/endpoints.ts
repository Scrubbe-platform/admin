import { NotWiredError } from "@/types/api";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONLY FILE THAT NAMES A BACKEND PATH.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  CONFIRMED  — documented in the brief as verified, or observed live.
 *  UNWIRED    — no confirmed endpoint. Calling one throws NotWiredError, which
 *               the UI surfaces as a visible "not wired" state. Nothing here
 *               guesses a path and calls it.
 *
 *  Live probe, 2026-10-08: GET https://api.scrubbe.com/ -> 200
 *    { status: "ok", service: "scrubbe-server", version: "1.0.0",
 *      docs: "/api/docs", health: "/health",
 *      operations: "/api/v1/operations/status",
 *      database: { status: "connected", ready: true } }
 *  The service advertises an OpenAPI document at /api/docs. It has not been
 *  read yet. When it is, fill in the UNWIRED block below and delete the
 *  matching `notWired()` calls — no other file changes.
 */

export const CONFIRMED = {
  auth: {
    /** POST — email + password. May return an MFA challenge instead of a token. */
    login: "/auth/login",
    /**
     * POST — { mfaToken, code }. Completes a login that answered mfaRequired.
     * The same call the main Scrubbe app's sign-in makes (scrubbe-frontend
     * auth.store.ts `verifyMfa`), returning the same session payload as login.
     */
    mfaVerify: "/auth/mfa/verify",
    /** POST — { refreshToken }. */
    refresh: "/auth/refresh-token",
    /** GET — current user, including roles[]. */
    me: "/auth/me",
  },
  publicRead: {
    /** GET — no auth. Currently returns data: []. */
    blogs: "/admin/public/blogs",
    /** GET — no auth. Currently returns data: []. */
    jobs: "/admin/public/jobs",
  },
} as const;

/**
 * Paths the naming convention implies but which nobody has verified. Listed so
 * the probe has a checklist, and so nothing in this app imports them by
 * accident. NOT used by any request. Do not move one into CONFIRMED without a
 * real response to point at.
 */
export const CANDIDATE_PATHS_UNVERIFIED = [
  "/admin/blogs",
  "/admin/blogs/:id",
  "/admin/blogs/:id/publish",
  "/admin/jobs",
  "/admin/jobs/:id",
  "/admin/jobs/:id/close",
  "/admin/media/presign",
] as const;

type UnwiredOperation =
  | "blogs.create"
  | "blogs.update"
  | "blogs.delete"
  | "blogs.publish"
  | "blogs.unpublish"
  | "blogs.slugAvailable"
  | "blogs.listAdmin"
  | "jobs.create"
  | "jobs.update"
  | "jobs.delete"
  | "jobs.setStatus"
  | "jobs.listAdmin"
  | "media.upload";

/** What the user is told when an unwired operation is attempted. */
const UNWIRED_MESSAGE: Record<UnwiredOperation, string> = {
  "blogs.create": "Couldn't save the post.",
  "blogs.update": "Couldn't save your changes.",
  "blogs.delete": "Couldn't delete the post.",
  "blogs.publish": "Couldn't publish the post.",
  "blogs.unpublish": "Couldn't return the post to draft.",
  "blogs.slugAvailable": "Couldn't check whether that slug is free.",
  "blogs.listAdmin": "Couldn't load posts.",
  "jobs.create": "Couldn't create the role.",
  "jobs.update": "Couldn't save your changes.",
  "jobs.delete": "Couldn't delete the role.",
  "jobs.setStatus": "Couldn't change the role's status.",
  "jobs.listAdmin": "Couldn't load roles.",
  "media.upload": "Couldn't upload the image. Paste an image URL instead.",
};

/**
 * Fails where a mutation would go, so nothing pretends to succeed. To wire an
 * operation, read https://api.scrubbe.com/api/docs, add its path to CONFIRMED
 * and replace the matching `notWired()` call.
 */
export function notWired(operation: UnwiredOperation): never {
  throw new NotWiredError(operation, UNWIRED_MESSAGE[operation]);
}
