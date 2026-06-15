# InsForge environment variables for Nexus Insights

Nexus uses **InsForge Cloud** (hosted `*.insforge.app`) — not a self-hosted InsForge server. You do **not** need the large self-hosted `.env` from the [InsForge repo](https://github.com/InsForge/InsForge/blob/main/.env.example) (`JWT_SECRET`, `POSTGRES_USER`, `DENO_PORT`, etc.). Those apply only if you run the InsForge platform yourself.

## Where to get values (InsForge dashboard)

Open your project in the [InsForge dashboard](https://insforge.dev/dashboard) (or the `dashboardUrl` from CLI signup).

| Dashboard / CLI field | Your `.env` variable | Used for |
|----------------------|----------------------|----------|
| **Project URL** / `projectUrl` | `NEXT_PUBLIC_INSFORGE_URL` | SDK `baseUrl` — auth, storage, API |
| **Anon / Public API key** | `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Browser-safe SDK key (`anonKey`) |
| **Service role / Admin API key** (`ik_…`) | `INSFORGE_SERVICE_ROLE_KEY` | Server-only admin (optional today) |
| **Postgres connection string** | `INSFORGE_DATABASE_URL` + `DATABASE_URL` | Prisma (`npm run db:push`) — must start with `postgresql://`. If the CLI adds `?sslmode=require`, leave it; `src/lib/pg-connection.ts` rewrites it to `sslmode=verify-full` so pg does not emit SSL deprecation warnings. |
| **Postgres direct URL** (if shown) | `DIRECT_URL` | Prisma push (optional) |
| **S3 endpoint** | `INSFORGE_S3_ENDPOINT` | S3 clients (rclone, AWS CLI, `@aws-sdk/client-s3`) |
| **S3 region** | `INSFORGE_S3_REGION` | SigV4 signing — use dashboard value exactly (`us-east-2`) |
| **S3 access key ID** | `INSFORGE_S3_ACCESS_KEY_ID` | From Storage → Access Keys (shown once) |
| **S3 secret access key** | `INSFORGE_S3_SECRET_ACCESS_KEY` | Save at creation — not shown again |

### CLI link (recommended)

```bash
npx @insforge/cli login
npx @insforge/cli link --project-id 8646aa87-1881-4f76-8201-70c264b5d746
```

Creates [`.insforge/project.json`](../.insforge/project.json) (gitignored):

| Field in `project.json` | Maps to `.env` |
|-------------------------|----------------|
| `oss_host` | `NEXT_PUBLIC_INSFORGE_URL` (no trailing slash) |
| `api_key` (`ik_…`) | `INSFORGE_SERVICE_ROLE_KEY` — **server only** |
| `appkey` + `region` | Host is `{appkey}.{region}.insforge.app` |

Then pull the Postgres URL (do not use the S3 endpoint for this):

```bash
npx @insforge/cli db connection-string
# → paste into DATABASE_URL and INSFORGE_DATABASE_URL
```

Other useful commands:

```bash
npx @insforge/cli current          # confirm link
npx @insforge/cli metadata         # auth, buckets, tables
npx @insforge/cli storage create-bucket reports -y
npx @insforge/cli db push          # if using InsForge migrations (optional; Nexus uses prisma db push)
```

`NEXT_PUBLIC_INSFORGE_ANON_KEY` is **not** in `project.json`. It is **not** the `ik_…` admin key.

**Easiest (CLI):**

```bash
npx @insforge/cli secrets get ANON_KEY
# → paste value into NEXT_PUBLIC_INSFORGE_ANON_KEY
```

Or list reserved secrets: `npx @insforge/cli secrets list` (look for `ANON_KEY`).

Dashboard: some projects only show Base URL + service key at creation; if there is no “Anon key” panel, use the CLI command above.

### CLI alternative (API URL + key)

```bash
npx @insforge/cli link --api-base-url https://YOUR_APP.insforge.app --api-key ik_YOUR_ACCESS_KEY
```

- The `ik_…` **access API key** is **admin** — never put it in `NEXT_PUBLIC_*`.

### Agent trial signup (API)

`POST https://api.insforge.dev/agents/v1/signup` returns:

- `projectUrl` → `NEXT_PUBLIC_INSFORGE_URL`
- `accessApiKey` → CLI / server admin only (not `NEXT_PUBLIC_*`)
- `appkey` + `region` → embedded in hostname (`https://{appkey}.{region}.insforge.app`)

## Required for Nexus to run

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_INSFORGE_URL` | **Yes** | No trailing path; e.g. `https://45xcbd63.us-west.insforge.app` |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | **Yes** | Public anon key from dashboard |
| `DATABASE_URL` | **Yes** | InsForge Postgres URL (same as below) |
| `INSFORGE_DATABASE_URL` | **Yes** | Preferred name; Prisma reads this first |
| `ENCRYPTION_KEY` | **Yes** | 32-byte hex for OAuth token encryption (`openssl rand -hex 32`) |
| `GROQ_API_KEY` | **Yes** | Scan pipeline (Llama 3) |
| `GEMINI_API_KEY` | **Yes** | Comment embeddings (semantic cache) |
| `INNGEST_EVENT_KEY` | **Yes** | Background scans |
| `INNGEST_SIGNING_KEY` | **Yes** | Inngest webhook verification |
| `INNGEST_DEV` | Local only | Set `1` when running `npx inngest-cli@latest dev` — disables signature checks on `/api/inngest`. **Unset in production.** |

## Required for full product features

| Variable | Feature |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube OAuth + auto-reply |
| `YOUTUBE_API_KEY` | Comment ingestion (non-Apify) |
| `APIFY_API_TOKEN` | Competitor / large comment threads |
| `RAZORPAY_*` | India checkout |
| `DODO_*` | International checkout |
| `NEXT_PUBLIC_SITE_URL` | OAuth + checkout redirects |

## Dev tools (local only — remove before production)

| Variable | Purpose |
|----------|---------|
| `DEV_TIER_SWITCHER_ENABLED` | Set `true` to show **Test tier** on Settings (blocked when `NODE_ENV=production`) |
| `DEV_ADMIN_EMAILS` | Comma-separated InsForge login emails allowed to switch tiers and open `/dev/usage` |

- **Settings → Your usage** — product quotas only (scans/month, auto-replies/month) for all users.
- **Settings → Test tier** — temporary; changes `User.tier` in Postgres for testing FREE/CREATOR/GROWTH/AGENCY.
- **`/dev/usage`** — internal dashboard for Groq, Gemini, YouTube, Apify, Inngest, InsForge, Redis (dev admins only).
- CLI: `node scripts/usage-report.mjs --month=2026-05`

## Optional

| Variable | Feature |
|----------|---------|
| `INSFORGE_SERVICE_ROLE_KEY` | Future server admin calls; not wired everywhere yet |
| `DIRECT_URL` | Prisma direct connection if pooler needs it |
| `UPSTASH_REDIS_REST_*` | Distributed rate limits (falls back to in-memory) |
| `OPENAI_API_KEY` | Only if switching embeddings off Gemini |
| `BRAVE_SEARCH_API_KEY` | Agency newsroom |
| `RESEND_API_KEY` | Transactional email |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring |

## Storage (S3-compatible)

From **InsForge dashboard → Storage → S3 access**:

| Setting | Example (your project) |
|---------|-------------------------|
| Endpoint | `https://45xcbd63.us-west.insforge.app/storage/v1/s3` |
| Region | `us-east-2` |
| Path style | **Required** — `forcePathStyle: true` |

`.env`:

```env
INSFORGE_S3_ENDPOINT=https://45xcbd63.us-west.insforge.app/storage/v1/s3
INSFORGE_S3_REGION=us-east-2
INSFORGE_S3_ACCESS_KEY_ID=<from dashboard>
INSFORGE_S3_SECRET_ACCESS_KEY=<save when created>
INSFORGE_STORAGE_BUCKET=reports
```

**Common mistake:** do not put the S3 endpoint in `DATABASE_URL` or `INSFORGE_DATABASE_URL`. Database uses a `postgresql://…` connection string from **Database**, not Storage.

### Two ways Nexus uses storage

1. **InsForge SDK** (PDF upload in code) — uses `NEXT_PUBLIC_INSFORGE_URL` + logged-in session / service key and bucket `reports` via `client.storage.from('reports').upload()`.
2. **Raw S3 API** — use the endpoint/region/keys above with AWS CLI, rclone, or `@aws-sdk/client-s3` with `forcePathStyle: true`.

### AWS SDK v3 example

```typescript
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.INSFORGE_S3_ENDPOINT,
  region: process.env.INSFORGE_S3_REGION,
  credentials: {
    accessKeyId: process.env.INSFORGE_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.INSFORGE_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});
```

## Troubleshooting: Prisma `P1001` / `DatabaseNotReachable`

If Inngest or API routes log **“Can’t reach database server”** for `*.database.insforge.app`:

1. **Confirm `.env` is loaded** — `DATABASE_URL` / `INSFORGE_DATABASE_URL` must be the InsForge `postgresql://…` string (not the S3 URL). From the project root, a quick check:  
   `node -e "require('dotenv').config(); const { Client } = require('pg'); new Client({ connectionString: process.env.DATABASE_URL }).connect().then(c => c.end()).then(() => console.log('ok')).catch(e => console.error(e.message))"`
2. **Network** — VPN, corporate firewall, or ISP blocks on outbound **5432** can cause intermittent `ECONNREFUSED` / timeouts. Try another network or disable VPN briefly.
3. **Hosted limits** — Many concurrent Inngest steps + dev hot reload can open many connections. The app caps the pool with `DATABASE_POOL_MAX` (default **8** in `src/lib/db.ts`). Lower it (e.g. `4`) if InsForge reports connection limit errors.
4. **Restart** — After changing DB URLs, restart `npm run dev` so the `pg` pool is recreated.

## Database setup (no migration files)

1. Run SQL once in InsForge SQL editor: [`scripts/insforge-schema.sql`](../scripts/insforge-schema.sql) (pgvector).
2. Sync Prisma schema:

```bash
npm run db:push
```

## InsForge dashboard checklist

- [ ] **Auth** — Email provider enabled; add `http://localhost:3000` (and production URL) to allowed redirect URLs.
- [ ] **Auth** — Google OAuth (optional): use same `GOOGLE_CLIENT_ID` / `SECRET` as YouTube if desired.
- [ ] **Storage** — Create bucket `reports`; create S3 access keys; copy endpoint, region, keys into `.env`.
- [ ] **Database** — Copy **Postgres** connection string (`postgresql://…`) into `DATABASE_URL` — not the S3 URL.
- [ ] **API keys** — Copy anon key + service role key.

## What NOT to copy from self-hosted InsForge `.env.example`

These are for running InsForge itself, **not** this Next.js app:

- `JWT_SECRET`, `ACCESS_API_KEY`, `ADMIN_EMAIL`, `POSTGRES_*`, `APP_PORT`, `AUTH_PORT`
- `AWS_*`, `S3_*`, `OPENROUTER_API_KEY`, `STRIPE_*`, `DENO_SUBHOSTING_*`, `FLY_*`

Nexus billing uses **Razorpay + Dodo**, not InsForge Stripe.
