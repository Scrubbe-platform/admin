# Scrubbe Admin Console

Editorial console for the Scrubbe marketing site: blog posts and job postings.
It drives the existing Scrubbe backend — there is no API in this repo.

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` — passes clean |
| `npm run lint` | ESLint |
| `./scripts/probe-api.sh` | Probe the API for the unconfirmed write endpoints |

Sign-in needs a Scrubbe account carrying `WORKSPACE_OWNER`, `ADMIN` or
`SUPER_ADMIN`.

## Current state: read-only

Reads work. **Writes do not** — no create, update, delete, publish or upload
endpoint has been confirmed to exist, so none is called. Thirteen operations
throw `NotWiredError` at the point the network request would happen, and the
interface says so rather than hiding it.

Everything up to that point is real: validation, slug generation, optimistic
updates, previews, confirmations. Wiring the backend in is a change to two
files. See **[HANDOFF.md](./HANDOFF.md)** for what was verified, what was not,
and how to finish it.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind · TanStack Query ·
react-hook-form + zod · axios · `@uiw/react-md-editor` + `rehype-sanitize` ·
lucide-react · react-hot-toast. IBM Plex Sans for UI, IBM Plex Serif for display
headings, IBM Plex Mono for slugs and paths.

## Architecture

**`src/lib/api/endpoints.ts` is the only file that names a backend path.**
Confirmed paths live in `CONFIRMED`; guessed ones live in
`CANDIDATE_PATHS_UNVERIFIED`, which nothing imports. **`src/lib/upload/uploadImage.ts`
is the only file that touches image upload.**

Other things worth knowing before changing them:

- **Envelope handling.** Every response is `{ success, message, data }`.
  `request()` in `lib/api/client.ts` unwraps `data` and treats `success: false`
  as a failure even on HTTP 200.
- **Token refresh is single-flight.** Concurrent 401s queue behind one refresh
  rather than firing several and racing. One retry, then back to sign-in.
- **Error toasts carry the server's own `message`.** Generic strings appear only
  when the request never reached the server.
- **Create is not optimistic.** Update, publish, close and delete are, with
  rollback. Create is not, because the server owns the id, slug collisions and
  timestamps — an optimistic row would be invented data.
- **Derived fields are never stored.** Reading time comes from the word count,
  author initials and avatar colour from the author's name. See
  `lib/reading-time.ts` and `lib/author.ts`.
- **Dates are ISO 8601 throughout.** The `mm/dd/yy` adapters in `lib/date.ts`
  exist for a backend that demands the old format and are currently unused.
- **`@next/next/no-img-element` is off.** Cover images come from a host nobody
  has confirmed yet, so `next/image` cannot be configured for it. Switch to
  `next/image` once the media endpoint is known.

## Known gaps

- No write endpoint confirmed. See HANDOFF.md §1.
- MFA: sign-in detects the challenge and stops. The verify endpoint is
  undocumented, so the code-entry step is deliberately unbuilt.
- Drafts and closed roles are unreadable — the public endpoints only serve
  published posts and open roles.
- `/blog` on the marketing site still renders a hardcoded `mockBlogPosts` array
  and ignores the API. Until that is switched over, publishing from here will
  appear to do nothing. Out of scope for this repo; see HANDOFF.md §5.
