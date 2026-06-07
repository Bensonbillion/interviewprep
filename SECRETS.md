# SECRETS

Names and locations only. **Never** put values in this file.

When you rotate a secret, walk this whole table top-to-bottom and update every
location marked ✓. Missing a row is how E2E breaks after a rotation (we have
the receipts — see the universal-Insight-Interview launch session).

## How to add or rotate a secret

1. Generate or get the new value from its source of truth.
2. Update each `✓` location for that row.
3. If anything in `scripts/` references the secret, rerun it locally to confirm.
4. If GitHub Actions has it, push a no-op commit to trigger CI and confirm green.

## Locations

| Location | What lives there | Who reads |
|---|---|---|
| **`.env.local`** (repo root, gitignored) | Local dev + scripts | `next dev`, `npx tsx scripts/*`, Playwright when targeting `localhost` |
| **Vercel project env** (Project Settings → Environment Variables) | Production + Preview deploys | Production / Preview runtime |
| **GitHub Actions repo secrets** (Settings → Secrets and variables → Actions) | CI runs | `.github/workflows/ci.yml` |
| **Vercel Deployment Protection settings** | Preview SSO bypass header | Vercel preview routing |

## The matrix

Legend: ✓ = must hold a value, ✗ = should not exist there, — = irrelevant.

### Supabase

| Secret | `.env.local` | Vercel env | GitHub Actions | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✗ | Public; included in client bundle. CI doesn't need it (no live Supabase). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✓ | ✓ | ✗ | Public anon key; same logic as URL. |
| `SUPABASE_SECRET_KEY` | ✓ | ✓ | ✗ | Service-role JWT. Never expose to client. |
| `DATA_ENCRYPTION_KEY` | ✓ | ✓ | ✗ | AES-256-GCM key for `src/lib/security/encryption.ts`. Rotating means re-encrypting all existing rows — coordinate. |

### Anthropic + OpenAI

| Secret | `.env.local` | Vercel env | GitHub Actions | Notes |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✓ | ✓ | ✓ | CI uses it in `tests/evals/run-evals.ts` and any AI-touching integration test. |
| `OPENAI_API_KEY` | ✓ | ✓ | ✗ | Used by `tests/ai/*` and select Sonnet eval fallbacks. Audit before rotating which scripts actually need it. |

### Stripe

| Secret | `.env.local` | Vercel env | GitHub Actions | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✓ | ✓ | ✗ | Public. |
| `STRIPE_SECRET_KEY` | ✓ | ✓ | ✗ | Server-only. |
| `STRIPE_WEBHOOK_SECRET` | ✓ | ✓ | ✗ | Set per-environment — Stripe's webhook signing secret differs between local CLI tunnel, preview, and prod. |

### Upstash (rate-limit Redis)

| Secret | `.env.local` | Vercel env | GitHub Actions | Notes |
|---|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | ✓ | ✓ | ✗ | |
| `UPSTASH_REDIS_REST_TOKEN` | ✓ | ✓ | ✗ | |

### Third-party / marketing

| Secret | `.env.local` | Vercel env | GitHub Actions | Notes |
|---|---|---|---|---|
| `FIRECRAWL_API_KEY` | ✓ | ✓ | ✗ | Used by `src/lib/positioning/research.ts` for marketing-page scrapes. |
| `NEXT_PUBLIC_GTM_ID` | ✓ | ✓ | ✗ | Google Tag Manager. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ✓ | ✓ | ✗ | GA4. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | ✓ | ✓ | ✗ | Microsoft Clarity. |
| `NEXT_PUBLIC_LINKEDIN_PARTNER_ID` | ✓ | ✓ | ✗ | LinkedIn Insight Tag. |
| `META_PIXEL_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | ✓ | ✓ | ✗ | Pixel id for Meta Conversions API + client. |
| `META_CAPI_ACCESS_TOKEN` | ✓ | ✓ | ✗ | Server-side Meta CAPI. |

### Test + automation

| Secret | `.env.local` | Vercel env | GitHub Actions | Notes |
|---|---|---|---|---|
| `TEST_USER_EMAIL` | ✓ | ✗ | ✓ | Currently `paulhills566@gmail.com`. Default is hard-coded in scripts as a fallback. |
| `TEST_USER_PASSWORD` | ✓ | ✗ | ✓ | The Supabase auth password for the test user. **Rotating means resetting the user's DB password to match — see `scripts/rotate-test-user-password.ts`.** When you do that, also push the new value to GitHub Actions: `gh secret set TEST_USER_PASSWORD -R Bensonbillion/interviewprep`. The two must stay in sync — they pulled apart once during the launch session and broke E2E. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | ✗ | — (managed by Vercel Deployment Protection settings) | ✓ | Generated in Vercel project settings → Deployment Protection → "Protection Bypass for Automation". Mirrored to GitHub Actions for Playwright. Local Playwright targets `localhost` so doesn't need it. |

## Rotation recipes

### `TEST_USER_PASSWORD`

```sh
npx tsx scripts/rotate-test-user-password.ts
# updates .env.local + DB
gh secret set TEST_USER_PASSWORD -R Bensonbillion/interviewprep --body "$(grep ^TEST_USER_PASSWORD .env.local | cut -d= -f2-)"
# mirrors to GitHub Actions
```

### `VERCEL_AUTOMATION_BYPASS_SECRET`

Vercel rotates this for you when you click "Regenerate" in the Deployment Protection settings. Then:

```sh
gh secret set VERCEL_AUTOMATION_BYPASS_SECRET -R Bensonbillion/interviewprep
# paste the new value when prompted
```

### `SUPABASE_SECRET_KEY` or `DATA_ENCRYPTION_KEY`

Coordinate first — `DATA_ENCRYPTION_KEY` rotation invalidates every encrypted row (`src/lib/security/encryption.ts` supports key versioning; check `current_key_version` before rotating). For the service-role JWT, regenerate in Supabase project API settings, then update both Vercel env and `.env.local`.
