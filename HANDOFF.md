# Scrubbe Admin Console — handoff

A standalone Next.js console for the Scrubbe blog and careers content. Every
screen is built. **No write endpoint is confirmed, so nothing it writes reaches
the backend yet.** That gap is deliberate, visible in the UI, and confined to two
files.

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit, passes clean
npm run build
```

---

## 1. What was verified, and what was not

### Confirmed

`GET https://api.scrubbe.com/` → 200

```json
{ "status": "ok", "service": "scrubbe-server", "version": "1.0.0",
  "docs": "/api/docs", "health": "/health",
  "operations": "/api/v1/operations/status",
  "database": { "status": "connected", "ready": true } }
```

The service advertises an OpenAPI document at **`/api/docs`**. That is the single
thing standing between this console and a working write path.

### Not confirmed — zero write endpoints

Nothing else could be probed from the build environment: it has no egress to
`api.scrubbe.com`, and no admin token was available. An unauthenticated probe
distinguishes 404 from 401 but cannot establish a request or response contract,
so guessing was not an option.

**Thirteen operations are unwired.** Each one throws `NotWiredError` at the point
the network call would happen:

| Operation | Needed for |
|---|---|
| `blogs.create` / `update` / `delete` | Blog editor |
| `blogs.publish` / `unpublish` | Publish flow |
| `blogs.listAdmin` | Reading drafts |
| `blogs.slugAvailable` | Real uniqueness check |
| `jobs.create` / `update` / `delete` | Career editor |
| `jobs.setStatus` | Close / reopen |
| `jobs.listAdmin` | Reading closed roles |
| `media.upload` | Cover images |

### Probe script

Run with a real admin token and the results fill in everything above:

```bash
TOKEN="paste-jwt-here"
BASE="https://api.scrubbe.com/api/v1"

for p in admin/blogs admin/jobs admin/blog admin/job blogs jobs \
         admin/media/presign admin/public/blogs admin/public/jobs; do
  for m in GET POST; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X $m \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      $( [ $m = POST ] && echo '-d {}' ) "$BASE/$p")
    echo "$m $p -> $code"
  done
done
```

Read it as: **404** route absent · **401/403** route exists · **400/422** route
exists *and validated the empty body* — the error body usually names the required
fields · **405** path exists under another method.

---

## 2. Wiring it up

Two files, and nothing else changes.

**`src/lib/api/endpoints.ts`** — the only file that names a backend path.
Confirmed paths sit in `CONFIRMED`. Guessed ones sit in
`CANDIDATE_PATHS_UNVERIFIED`, which nothing imports. For each endpoint you
confirm: add it to `CONFIRMED`, then replace the matching `notWired(...)` call in
`src/lib/api/blogs.ts` or `jobs.ts` with a real `request(...)`. Set
`WRITES_ARE_UNWIRED = false` to drop the read-only banner.

**`src/lib/upload/uploadImage.ts`** — the only file that touches uploads. One
`UploadDriver` type, an active driver that throws, and a commented presign sketch.
Implement `presignDriver`, point `ACTIVE_DRIVER` at it, flip
`IMAGE_UPLOAD_IS_WIRED`.

---

## 3. The blog model

The two shapes in the old frontend were not really in conflict: (a) was the
public card projection, (b) was the authoring input. The model is their union
**minus everything derivable**, because a stored derived value goes stale the
moment someone edits the post.

| Old field | Now | Why |
|---|---|---|
| `readingTime: "4 min read"` | `wordCount: number` | Computed at render. A stored string drifts on every edit. |
| `author.initials` | derived from `author.name` | Pure function of the name. |
| `author.avatarColor` | derived from `author.name` | Stable hash against a fixed palette. Nobody should pick an avatar colour. |
| `publishedAt: "April 21, 2026"` | ISO 8601 \| null | The list sorts on this. |
| `blogContent` | `content` | |
| `seoSlug` | `slug` | |
| `coverImage: File` | `coverImageUrl: string \| null` | |

`category` and `tags` are both kept: category drives the card badge and the list
filter, tags are free-form. Full model in `src/types/blog.ts`.

### Still needs your call

1. **`"Customer story"`** is sentence case where `"Deep Dive"`, `"Tutorial"` and
   `"Release"` are title case. Typo that became load-bearing in the public badge,
   or intentional?
2. **Does the backend have a `status` field**, or does `/admin/public/blogs`
   filter on `publishedAt != null`? Changes the dashboard's draft count.
3. **Is `slug` or `seoSlug` the wire name?** The backend owns this.

---

## 4. The two job decisions

**Deadline → ISO 8601.** The old `mm/dd/yy` is ambiguous across locales,
unsortable as a string, and century-less — and the careers list has to sort on it
and flag expiry. The admin collects and emits `YYYY-MM-DD`.

*Migration:* any existing `mm/dd/yy` record needs converting. `fromLegacyMmDdYy`
in `src/lib/date.ts` does it on read and assumes `20xx`, which is exactly the
flaw. If the backend insists on the old format, `toLegacyMmDdYy` is the boundary
adapter — call it in `lib/api/jobs.ts` and nowhere else.

**Bullet fields → `string[]`.** `responsibilities`, `requirements` and `benefits`
are arrays. The public page already accepts arrays, the bullet editor is natively
an array, and newline-joining is lossy in the other direction. `toBullets()` in
`lib/api/jobs.ts` reads the newline form if the backend turns out to store `TEXT`.

---

## 5. Out of scope — needs doing elsewhere

**`/blog` on the marketing site renders a hardcoded `mockBlogPosts` array and
ignores `GET /admin/public/blogs` entirely.** Until that page is switched to the
API, publishing from this console will appear to do nothing: the post will be
live in the backend and invisible on the site. Not fixed from this repo, as
agreed, but it is a blocker for the first real publish.

The **MFA verify endpoint** is undocumented. Sign-in detects the challenge and
says so; the code-entry step is deliberately unbuilt rather than guessed at.

---

## 6. Layout

```
src/
  app/
    sign-in/                  email + password, MFA challenge detection
    (console)/
      layout.tsx              role gate + sidebar
      dashboard/              counts, recent edits
      blogs/ new/ [id]/       list, editor
      careers/ new/ [id]/     list, editor, duplicate
  lib/
    api/client.ts             axios, envelope unwrap, single-flight refresh
    api/endpoints.ts          ← the only file naming a path
    api/{auth,blogs,jobs}.ts
    upload/uploadImage.ts     ← the only file touching uploads
    {author,date,reading-time,slug,toast,cn}.ts
  components/{ui,layout,blogs,careers}/
  hooks/{useAuth,useBlogs,useJobs}.ts
  schemas/{auth,blog,job}.ts
  types/{api,blog,job,user}.ts
```

**Notes on behaviour.** The 401 refresh is single-flight: concurrent 401s queue
behind one refresh rather than firing several and racing. Mutations are
optimistic with rollback *except* create — the server owns the id, slug
collisions and timestamps, so an optimistic row would be fabricated data. Error
toasts carry the server's own `message`; generic strings appear only when the
request never reached the server.
