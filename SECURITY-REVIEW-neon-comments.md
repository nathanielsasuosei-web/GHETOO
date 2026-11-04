# Security Review — Neon Server Action + Public Data API Endpoint

**Date:** 2026-11-04
**Scope:** `https://ep-wispy-tree-zaedf6co.apirest.c-2.eu-west-2.aws.neon.tech/neondb/rest/v1` and the accompanying Next.js Server Action that inserts `comment`.

---

## 1. The Code Under Review

```tsx
// File: app/page.tsx
import { neon } from '@neondatabase/serverless';

export default function Page() {
  async function create(formData: FormData) {
    'use server';
    const sql = neon(`${process.env.DATABASE_URL}`);
    const comment = formData.get('comment');
    await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
  }

  return (
    <form action={create}>
      <input type="text" placeholder="write a comment" name="comment" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Public endpoint referenced:** `https://ep-wispy-tree-zaedf6co.apirest.c-2.eu-west-2.aws.neon.tech/neondb/rest/v1`

This is the Neon **Data API** (PostgREST-compatible HTTP API on top of Postgres, path `/rest/v1`). It is *not* the `@neondatabase/serverless` SQL-over-HTTP driver — it is a separate REST surface that exposes tables directly over HTTP.

---

## 2. Verdict at a Glance

| Area | Status | Severity |
|------|--------|----------|
| **SQL injection** via `$1` placeholder | **SAFE** — parameterized | — |
| **Public Data API exposure** | **CRITICAL** — endpoint is reachable without browsing the app; hostname/region/db name leaked; if JWT/RLS not enforced, anonymous read/write to any exposed table | **P0** |
| Input validation | **MISSING** | High |
| XSS (stored) | **VULNERABLE** when comments are rendered | High |
| Authentication / Authorization | **NONE** | High |
| Rate limiting / abuse | **NONE** | High |
| Error handling / info disclosure | **WEAK** | Medium |
| CSRF / Replay | Partially mitigated by Server Actions | Low |

---

## 3. Detailed Findings

### 3.1 SQL Injection — Not Vulnerable (with caveat)

`await sql('INSERT INTO comments (comment) VALUES ($1)', [comment])` uses the **tagged-template / parameterised** form of `@neondatabase/serverless`. The driver sends the query and parameters separately; Postgres does not interpolate `$1` as SQL.

This is **correct**. Contrast with the vulnerable variant:

```ts
// VULNERABLE — never do this:
await sql(`INSERT INTO comments (comment) VALUES ('${comment}')`);
```

**Caveat from the Neon docs:** `@neondatabase/serverless` also supports `sql\`INSERT ... VALUES (${comment})\`` (template literal tagging). That form is *also* safe because the tag extracts parameters. The *untagged* string concatenation above is the only dangerous pattern.

> **Recommendation:** Keep the parameterised form exactly as written. Add a comment explaining why string interpolation is banned, and add a lint rule or CodeQL check for `neon(` + template string without tag.

### 3.2 Critical: Public Data API Endpoint is Discoverable

`ep-wispy-tree-zaedf6co.apirest.c-2.eu-west-2.aws.neon.tech` reveals:

* Neon project endpoint ID (`ep-wispy-tree-…`)
* AWS region (`eu-west-2`)
* Database name (`neondb`)
* Technology stack (Neon/Postgres) and that Data API is enabled

**Threat:** The Data API exposes `GET /rest/v1/<table>`, `POST`, `PATCH`, `DELETE` directly to Postgres. If the API is enabled with a permissive role or without Row-Level Security (RLS), an attacker does not need your app — they can `curl` the endpoint.

The `neon.ts` in this repo currently:

```ts
export default defineConfig({ auth: true, branch: (...) => ... })
```

It does **not** configure `dataApi`. By default the Data API is *disabled*, but the URL you pasted indicates it was at some point enabled for `neondb` on this project. An enabled Data API with no further config is often deployed with:

* `role: anon` JWT not required
* No RLS on `comments`
* Full `SELECT/INSERT/UPDATE/DELETE` via HTTP

That is equivalent to leaving Postgres on the public internet.

**Evidence you should check right now (do not run in production without review):**

```bash
# 1. Does the endpoint respond anonymously?
curl -i https://ep-wispy-tree-zaedf6co.apirest.c-2.eu-west-2.aws.neon.tech/neondb/rest/v1/comments

# 2. What tables are exposed? (if OpenAPI is on)
curl -i https://ep-wispy-tree-zaedf6co.apirest.c-2.eu-west-2.aws.neon.tech/neondb/rest/v1/

# 3. Neon project check — should return 404/401 if Data API is off:
neon api get /projects/{projectId}/data_api  # or check Neon console → Data API
```

In this sandboxed environment outbound egress to `*.neon.tech` is blocked, so I could not probe the endpoint directly — the assessment is based on the URL pattern and Neon documentation.

**Fix — choose one:**

1. **Disable the Data API entirely** (recommended if the app only uses `@neondatabase/serverless`):

   ```ts
   // neon.ts
   export default defineConfig({
     auth: true,
     dataApi: false,          // explicit — no REST surface
     branch: (branch) => ...
   });
   ```

   Then redeploy and confirm `GET /rest/v1/` returns `404` or `403`.

2. **If you need the Data API** (e.g. for Supabase clients), lock it down:

   ```sql
   -- Postgres: enable RLS and deny anon
   ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
   CREATE POLICY comments_select ON comments FOR SELECT USING (is_approved = true);
   CREATE POLICY comments_insert_own ON comments FOR INSERT WITH CHECK (author_id = auth.uid());
   -- No UPDATE/DELETE for anon/authenticated unless explicitly needed
   ```

   And in `neon.ts`:

   ```ts
   export default defineConfig({
     dataApi: {
       enabled: true,
       jwtSecret: process.env.DATA_API_JWT_SECRET, // never the DATABASE_URL
       roles: { anon: 'anon', authenticated: 'authenticated' },
     }
   });
   ```

   Never issue a long-lived anon key and ship it to the browser unless RLS restricts every table.

### 3.3 Missing Input Validation

```ts
const comment = formData.get('comment');
```

`FormData.get()` returns `FormDataEntryValue | null` — i.e. `string | File | null`. Issues:

* `null` → `INSERT NULL` (or error if `NOT NULL`)
* `File` → `INSERT '[object File]'` or driver error
* `""` → empty comments spam
* 10 MB string → DoS / bloat, exceeds column limit silently truncated

**Hardened replacement:**

```ts
'use server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

const CommentSchema = z.object({
  comment: z.string().trim().min(1, 'Write something').max(2000, 'Max 2000 characters'),
});

export async function create(formData: FormData) {
  const raw = formData.get('comment');
  if (typeof raw !== 'string') throw new Error('Invalid comment');
  const { comment } = CommentSchema.parse({ comment: raw });
  const sql = neon(process.env.DATABASE_URL!);
  await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
}
```

Add at DB level too:

```sql
ALTER TABLE comments ADD CONSTRAINT comment_len
  CHECK (char_length(comment) BETWEEN 1 AND 2000);
```

### 3.4 Stored XSS

Even though SQL injection is blocked, **XSS is not**. If comments are later rendered with:

```tsx
<div dangerouslySetInnerHTML={{ __html: comment }} />
// or server-side without escaping in some template engines
```

an attacker can store `<script>`, `<img onerror>`, or `javascript:` payloads.

**Fix:**

* Never use `dangerouslySetInnerHTML` for user content.
* In React, `{comment}` is **auto-escaped** — keep it that way.
* If you need markdown/rich text, sanitize with `DOMPurify` or `sanitize-html` on write *and* on read.
* Set `Content-Security-Policy: default-src 'self'` and consider `Trusted Types`.

### 3.5 No Auth / No Authorization

Anyone can post anonymously, unlimited times. This enables spam, impersonation, and harassment.

The repo already has `@neon/auth` / managed Better-Auth scaffolded (`auth: true`). Use it:

```ts
import { auth } from '@neon/auth';

export async function create(formData: FormData) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error('Sign in to comment');
  // optionally check roles, ban list, verified email
}
```

If anonymous comments are intentional, at least add a honeypot or Turnstile/Captcha and require email verification.

### 3.6 No Rate Limiting

No throttle → single IP can flood `comments`.

**Fix options:**

* Neon + Upstash Redis (recommended by Neon docs): `@neon/env` + `upstash-redis` with a sliding window.
* Postgres-native: `pg_rate_limit` table + advisory locks, or a simple per-IP insert count:

```sql
-- reject if >5 comments / minute per IP (store IP in column)
SELECT count(*) FROM comments WHERE ip = $1 AND created_at > now() - interval '1 minute';
```

* At the edge: Vercel WAF / Cloudflare rate limit on `POST /rest/v1/comments` and on the Server Action.

For GHETOO this project already uses an in-memory `rateBuckets` map for `/api/orders` and `/api/messages` — apply the same pattern (and note it is per-instance; for multi-instance use Redis).

### 3.7 Error Handling & Info Disclosure

The snippet has no `try/catch`. A Postgres error (e.g. column violation) will bubble as a 500 with stack trace in development.

```ts
try {
  await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
} catch (err) {
  console.error('comment insert failed', err); // server log only
  throw new Error('Could not save your comment — try again later.');
}
revalidatePath('/'); // or redirect
```

Never echo `err.message` containing `DATABASE_URL`, host, or statement details to the client.

### 3.8 DATABASE_URL Handling

`neon(process.env.DATABASE_URL)` inside a `'use server'` function stays server-side — correct.

* Ensure `DATABASE_URL` is **never** prefixed with `NEXT_PUBLIC_` and never returned in JSON.
* Use the **pooled** (`-pooler`) host for `@neondatabase/serverless` and the **direct** host for migrations.
* In this repo `DATA_DIR` is filesystem-based; `DATABASE_URL` would be additive (not a replacement) if you migrate to Neon Postgres. Keep secrets in `.env` (gitignored) and in Vercel/Render env vars — never in `neon.ts`.

---

## 4. Hardened Server Action (Production-Ready)

```tsx
// app/page.tsx
import { neon } from '@neondatabase/serverless';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  comment: z.string().trim().min(1).max(2000),
});

function getClientIp(): string {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// simple in-memory — replace with Upstash Redis in production
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count += 1;
  buckets.set(key, b);
  return b.count <= limit;
}

export default function Page() {
  async function create(formData: FormData) {
    'use server';
    const ip = getClientIp();
    if (!rateLimit(`comment:${ip}`, 5, 60_000)) {
      throw new Error('Too many comments — slow down.');
    }
    const raw = formData.get('comment');
    if (typeof raw !== 'string') throw new Error('Invalid input');
    const { comment } = schema.parse({ comment: raw });

    // optional: require auth
    // const session = await auth.api.getSession({ headers: headers() });
    // if (!session) throw new Error('Please sign in');

    const sql = neon(process.env.DATABASE_URL!);
    try {
      await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
    } catch {
      throw new Error('Could not save your comment.');
    }
    revalidatePath('/');
  }

  return (
    <form action={create}>
      <input type="text" name="comment" placeholder="write a comment" maxLength={2000} required />
      <button type="submit">Submit</button>
    </form>
  );
}
```

```sql
-- recommended table hardening
CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment     text NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 2000),
  author_id   text,                           -- FK to auth.users when using Neon Auth
  ip_hash     text,                           -- hash of IP, not raw IP (privacy)
  is_approved boolean NOT NULL DEFAULT false,  -- moderation queue
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON comments (created_at DESC);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
```

---

## 5. Action Items for This Repository (GHETOO)

This app currently stores data in `data/db.json` (JSON file), not Postgres. The Neon scaffolding (`neon.ts`, `@neon/config`, `@neon/env`) is present but no `DATABASE_URL` is yet used.

1. **Decide on data plane:** Keep `data/db.json` for now (current GHETOO design) or migrate `comments` (and optionally `tracks`, `orders`, etc.) to Neon Lakebase Postgres. Do not run both for the same table.
2. **If you keep the Data API idea:** Set `dataApi: false` explicitly until you have RLS + JWT ready. The mere existence of `https://.../rest/v1` is a disclosure; rotate the endpoint if it was shared publicly.
3. **If you add comments to GHETOO:** Mirror existing patterns in `server/index.js` — clamp input (`clampText(v, 280)`), `rateLimit()` per IP, `express.json({limit})`, `X-Content-Type-Options: nosniff`, and moderation (pending vs paid). Reuse those helpers rather than inventing new ones.
4. **XSS:** GHETOO already renders user content (`wall` messages, `supporterName`, etc.) via React text interpolation — keep it that way, never `dangerouslySetInnerHTML`.
5. **Secrets:** `.gitignore` correctly ignores `.env` and `data/`. Never commit `DATABASE_URL` or paste the Data API URL in public issues — the URL you shared should be considered compromised and rotated.

---

## 6. References

* Neon Data API: https://neon.com/docs/data-api/overview
* Neon Serverless Driver (`@neondatabase/serverless`): https://neon.com/docs/serverless/serverless-driver
* Neon Auth / Better Auth: https://neon.com/docs/auth/overview
* PostgREST / RLS locking: https://neon.com/docs/data-api/security

---

*Report generated in-repo at `SECURITY-REVIEW-neon-comments.md`. No probes were sent to the live Data API endpoint due to sandbox egress restrictions — verify manually with `curl` and the Neon console.*
