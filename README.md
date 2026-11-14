# Scrubbe Admin Console

Internal console for the people who run Scrubbe: moderate workspaces and users,
review activity and incidents, manage commercial billing, publish blog posts and
job openings, run the communications library, work the inbox and waitlist, and
manage staff. Live at **https://admin.internal.scrubbe.com**.

It has no API of its own. Everything goes through the Scrubbe API under
`/api/v1/admin/*` (server: `server/src/modules/platform-admin/`), which is the
authority for every permission check and writes the staff audit log.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL, defaults to https://api.scrubbe.com
npm install
npm run dev                  # http://localhost:3000
npm run typecheck
npm run build
```

## Access model

Staff accounts are separate from workspace accounts. A workspace user, even a
workspace owner, cannot sign in here or call any `/admin` endpoint.

| Role | Can |
|---|---|
| Owner | Everything, including staff accounts and console security |
| Administrator | Moderation, content and commercial records; not staff management |
| Support | Read workspaces and users, suspend users, inbox and waitlist |
| Finance | Commercial records and subscriptions; workspaces read-only |
| Editor | Blog, careers and the communications library |

The sidebar and pages hide what a role can't use (`src/types/user.ts` mirrors the
server's capability map), but the server enforces it regardless.

- **Two-factor authentication is mandatory.** First sign-in enrols an
  authenticator app (QR code); every later sign-in asks for a code.
- **Sessions** are server-side (`AdminSession`): refresh tokens rotate, idle and
  absolute timeouts come from console settings, and any session can be ended
  from Account. Deactivating a staff member ends all of theirs immediately.
- **Lockout**: 5 failed sign-ins lock the account for 15 minutes.
- **Optional IP allowlist** in Settings.
- **New staff** are invited from Team. The invite link sets a password once and
  expires; nobody else ever sees it.
- **Every staff action** (suspensions, role changes, publishes, billing changes,
  sign-ins) is recorded with who, what, when, from where, and why where a reason
  is required. See Audit.

### First owner

On an empty staff table the API creates the first owner at startup when
`STAFF_BOOTSTRAP_EMAIL` is set (`server/scripts/seed-waitlist-admin.cjs`). That
owner sets a password through "Forgot password", then enrols two-factor.

## Moderation

Suspending a user or a whole workspace takes effect at once everywhere: API
requests, sign-in, token refresh, sockets and API keys all refuse it, and the
workspace app signs the person out with an explanation. Lifting a suspension
restores access; "Sign out everywhere" ends a user's sessions without suspending them.

## Deployment

AWS Amplify (app `scrubbe-admin`, `us-east-1`), built from `main` of this
repository with `amplify.yml`. Environment: `NEXT_PUBLIC_API_BASE_URL=https://api.scrubbe.com`.
Custom domain `admin.internal.scrubbe.com`. Pushing to `main` deploys.

Responses carry a strict CSP, `X-Frame-Options: DENY`, HSTS and
`X-Robots-Tag: noindex` (`next.config.mjs`).

## Code map

- `src/lib/api/endpoints.ts`: every backend path the console calls.
- `src/lib/api/client.ts`: envelope unwrapping (`{ success, message, data }`),
  single-flight token refresh, server error messages surfaced verbatim.
- `src/app/(console)/`: one folder per page; `(comms)` is the communications library.
- `src/components/console/kit.tsx`: shared tables, filters and confirm-with-reason dialogs.
- `src/hooks/useComms.ts`, `src/hooks/useAcquisition.ts`: server-backed stores
  with optimistic concurrency (a stale save gets a 409 and asks you to reload).
