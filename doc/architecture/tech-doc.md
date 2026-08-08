# AriClear — Technical Documentation

> Status: analysis of the repository at commit `6e02431` (Oct 2026). Everything here is derived from the code, not from the README. Where the two disagree, the code wins and the gap is called out in [§10](#10-docs-vs-reality-readme-drift).

---

## 1. What the system is

AriClear scores a website two ways and returns an action plan:

- **Human clarity score** — "can a stranger tell what this does, who it is for and what to do next in 5 seconds?"
- **AI-SEO / GEO score** — "can an LLM classify the business and extract entities without guessing?"

Around that core sit: scan history, uptime monitoring, a brand-awareness analyzer, a human "Ask Ari" expert Q&A board, and an AI-generated recap video of each scan.

It is a **single Next.js app** (not a monorepo — see §10) deployed on Vercel, with Supabase for auth/data and several third-party AI/media APIs.

## 2. Stack

| Concern | Choice | Where |
|---|---|---|
| Framework | Next.js 16.0.7 (App Router), React 19.2 | `app/` |
| Language / styling | TypeScript 5, Tailwind 4 | `tailwind.config.ts`, `app/globals.css` |
| Auth + DB + realtime | Supabase (`@supabase/ssr`, `supabase-js`) — **two separate projects** (app + mail list) | `lib/supabase/` |
| LLM — page scan | OpenAI `gpt-4o-mini`, JSON mode, temp 0.15 | `app/api/analyze`, `app/api/demo-scan` |
| LLM — brand analysis | Anthropic SDK (Claude) | `app/api/brand-awareness/analyze` |
| LLM — video script | Google Gemini `2.5-flash-lite` | `lib/video/generateScript.ts` |
| TTS | Google Cloud Text-to-Speech (Neural2 voices) | `lib/video/generateVoiceover.ts` |
| Images | Replicate (SDXL) | `lib/video/generateImages.ts` |
| Video render | Remotion 4 via CLI child process | `remotion/`, `app/api/video/render` |
| Media storage/CDN | Cloudinary | `lib/video/uploadToCloudinary.ts` |
| HTML parsing | cheerio (analyze) / regex (demo, brand) | |
| PDF | jspdf + jspdf-autotable (client side) | |
| Analytics | Google Analytics via `@next/third-parties` | `app/layout.tsx` |
| Payments | **None implemented** (no Stripe code exists) | — |

Five AI/media vendors for a product whose core loop is one LLM call is the main source of cost, fragility and operational surface (see §8).

## 3. High-level architecture

```
                      ┌────────────────────────────────────────────┐
 Browser (React 19)   │  Next.js on Vercel (App Router)            │
 ───────────────────  │                                            │
 Landing + demo scan ─┼─► /api/demo-scan ──► fetch(url) ─► OpenAI  │
 Auth modal ──────────┼─► /api/auth/*   ──► Supabase Auth          │
 /scan  ──────────────┼─► /api/analyze  ──► fetch(url) ─► OpenAI   │
        └─ save ──────┼─► /api/scans    ──► Supabase (scans,       │
 /history /dashboard  │                      user_websites,        │
 /scan/[id]           │                      user_subscriptions)   │
 /website-monitor ────┼─► /api/check-site ─► fetch(url)            │
 /brand-awareness ────┼─► /api/brand-awareness/analyze ─► Claude   │
 /ask-ari ────────────┼─► /api/ask-ari/* , /api/admin/*            │
                      │      └─► Supabase (+ Realtime channel)     │
 Video panel ─────────┼─► /api/video/request ─► video_jobs         │
                      │   /api/video/render  ─► Gemini → GCP TTS → │
                      │        Replicate → Cloudinary → Remotion   │
                      │        CLI → Cloudinary → video_jobs       │
 Pricing/preorder ────┼─► /api/preorder ─► Supabase "mail" project │
                      │   /api/plan-request ─► plan_requests       │
                      └────────────────────────────────────────────┘
```

## 4. Directory map

```
app/
  page.tsx, HomePageClient.tsx      landing (Hero, HowItWorks, WhoItsFor, DemoScan, Pricing)
  scan/                             authenticated scan flow (783-line page)
  scan/[id]/                        saved result + recap-video UI (VideoCreatorPanel, VideoPlayer, ScanRecapVideo)
  history/, dashboard/              scan list / stats
  website-monitor/                  manual uptime/latency checker
  brand-awareness/                  brand analysis UI
  ask-ari/                          expert Q&A board (1,047 lines, Supabase Realtime)
  confirm, verify-email, reset-password
  api/                              31 route handlers (see §5)
  components/                       Auth, Button, DemoScanSection, Forms(sic "Froms"), layout, providers, section, ui, ScanResultsEnhanced (1,209 lines)
lib/
  supabase/auth/{browser,server}.ts app client + SSR client
  supabase/mail/server.ts           service-role client for the email-list project (throws at import if env missing)
  video/*                           generateScript / Voiceover / Images / uploadToCloudinary
  api/axios.ts
remotion/                           ScanRecapComposition (1,066 lines), Root, index
helpers/preorderRequest.ts
```

Path aliases: `@/…` → project root, `@ariclear/…` → `app/…` (see `tsconfig.json`). Both are used inconsistently; `app/api/video/render` mixes `@ariclear/lib/...` and `@/lib/...`.

## 5. API surface

| Route | Auth | Purpose | Notes |
|---|---|---|---|
| `POST /api/analyze` | **none** | Full scan: fetch → cheerio extract → OpenAI → validated JSON | Core product. No rate limit. |
| `POST /api/demo-scan` | none | Teaser scan: 2 of N issues shown, rest "hidden" (gated) | In-memory per-IP limit, 3/min |
| `GET /api/check-site` | **none** | Fetch arbitrary URL, return status + latency | Open proxy (§7) |
| `POST /api/brand-awareness/analyze` | (verify) | 6-metric brand report via Claude, cross-checks scraped site | 624 lines, largest route |
| `GET/POST /api/scans` | user | List / create scan; enforces website limit | |
| `GET/PATCH/DELETE /api/scans/[id]`, `/limit`, `/stats` | user | Scan CRUD, limit check, aggregates | |
| `GET /api/subscription` | user | Tier + usage; creates default `free` row lazily | |
| `/api/auth/{signup,login,logout,confirm,reset,update-password,user}` | — | Supabase auth wrappers | |
| `POST /api/preorder` | none | Email capture → `mailcollection` (separate Supabase project) | 409 on duplicate |
| `POST /api/plan-request` | none | Pro/Expert interest → `plan_requests` (service role) | **This is the "checkout" today** |
| `/api/ask-ari/{question,questions,comment,reply,status,check-admin}` | user | Q&A board | |
| `/api/admin/{status,ask-ari/questions}` | admin (`admin_users` table) | Moderation | |
| `POST /api/video/request` | user | Create `video_jobs` row (pending); 409 if one is in flight | |
| `POST /api/video/render` | user | Runs the whole render pipeline **synchronously** | §6.3 |
| `GET /api/video/status/[jobId]` | user | Poll job | |

There is **no `middleware.ts`/`proxy.ts`**; every route does its own `supabase.auth.getUser()` check. Pages are not guarded server-side.

## 6. Key flows

### 6.1 Scan (the core loop)
1. `POST /api/analyze {url}` → validate http(s) → `fetch` with `AriClearBot` UA, **no timeout** → cheerio extracts `title`, meta description, first `h1`, 6 `h2`s, and 5,000 chars of body text.
2. One `chat.completions` call with a ~90-line system prompt. Strict scoring rubric ("most sites score 20–55"), required JSON shape, quote-the-page requirement.
3. Server validates shape with a hand-written `isReportShape` (no zod). Returns report to client.
4. Client shows `ScanResultsEnhanced`, then `POST /api/scans {analyzeResult, url}` persists it, **flattened into ~20 columns** of `scans` plus `issues`/`checklist`/`action_plan` JSON.
5. `/api/scans` upserts `user_websites` and enforces `websites_limit` from `user_subscriptions`.

Overall score = `round((human + ai) / 2)`, computed server-side at save time. The prompt asks for strictness, but nothing is calibrated or regression-tested — see §9.

### 6.2 Entitlements
`user_subscriptions(tier, websites_limit, trial_expires_at, trial_websites_requested)`. Tiers in code: `free | trial | starter | pro | business | agency | expert` (README, Navbar and pricing page each use a different set). Enforcement is **only the count of distinct domains**. Scan count, PDF, monitoring, brand-awareness and video are not gated server-side. A 60-day trial is encoded (`TRIAL_EXPIRED`). Tier is changed by hand in the DB — no billing webhook.

### 6.3 Recap video pipeline
`render` runs, inside one HTTP request: Gemini script (5 scenes ≤8 words) → Google TTS → Replicate SDXL images → Cloudinary upload → write props JSON to `os.tmpdir()` → `execFile node_modules/.bin/remotion render …` (5-minute timeout, H.264) → upload MP4 to Cloudinary → update `video_jobs`.

Consequences:
- Bundling Chromium + Remotion into a Vercel function and rendering for up to 5 minutes is unlikely to work on standard serverless limits (function duration, memory, ephemeral FS, binary size). `serverExternalPackages` in `next.config.ts` shows it was fought with locally. **Verify it works in production; if it only runs locally it should be a separate worker (Remotion Lambda, Cloud Run, or a queue + container).**
- Each video fans out to 4 paid vendors with no per-user quota, no cost cap and no idempotency beyond "one in-flight job per scan".
- Comments say "4 images" in some files and "5 scenes" in others; `imagePrompt` is documented "not used". Dead code from an earlier design.

### 6.4 Ask Ari
User posts a question (`questions`), experts reply (`comments`, `is_expert`), admins flip status. Client subscribes to Supabase Realtime. Admin = row in `admin_users` with `is_active`. This is the human-in-the-loop product that backs the "expert sessions" line in the paid tiers.

## 7. Security & reliability findings (ordered by severity)

| # | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|
| 1 | **SSRF** in every server-side fetch (`analyze`, `demo-scan`, `check-site`, brand scraper). Only protocol is checked; redirects followed. | `check-site/route.ts`, `analyze/route.ts:83` | Attacker can reach `169.254.169.254`, internal hosts, localhost; `check-site` returns status/latency = port-scan oracle. | Resolve DNS, reject private/link-local/loopback ranges, re-validate on each redirect, cap response size, use a fetch wrapper in `lib/`. |
| 2 | **Unauthenticated, unmetered LLM endpoint** `/api/analyze`; `check-site` also open. | no auth/limit in handler | Anyone can burn the OpenAI budget. | Require auth or per-IP + global quota; move to Upstash/Vercel KV. |
| 3 | Demo rate limiter is an **in-memory `Map`**. | `demo-scan/route.ts:7` | Useless on serverless (per-instance, resets on cold start); `x-forwarded-for` is spoofable. | Redis-backed limiter; key on Vercel-provided IP. |
| 4 | `POST /api/scans` **trusts the client-supplied `analyzeResult`**. | `scans/route.ts:97` | Users can save forged scores/content and generate videos/PDFs from them. | Save server-side inside `/api/analyze` and return a scan id; or HMAC-sign the result. |
| 5 | **Limit check is racy and soft**: website-insert failure is swallowed ("Continue anyway"); count-then-insert is not atomic; lazily creates default subscription in a GET. | `scans/route.ts:268-273` | Limit bypass under concurrency; silent drift between `user_websites` and `scans`. | DB constraint/trigger or RPC; unique `(user_id, domain)`. |
| 6 | **Video render has no entitlement or quota check** and spends money on 4 vendors. | `video/render/route.ts` | Cost abuse by any free user. | Gate by tier + monthly quota; queue; budget alarm. |
| 7 | **`plan-request` / `preorder` are open writes** with service-role clients, no email validation, no captcha, no rate limit. `plan_requests` upsert on `(email, plan)` lets anyone overwrite another person's lead. | `plan-request/route.ts` | Spam, data tampering, polluted sales pipeline. | Validate with zod, honeypot/Turnstile, insert-only (no upsert overwrite). |
| 8 | Signup checks existence via `supabase.from('auth.users')` — that schema is not exposed by PostgREST, so the pre-check never matches and falls through to the `identities.length === 0` check. | `auth/signup/route.ts:9` | Dead code; relies on fallback. | Remove the pre-check. |
| 9 | Debug logging of user IDs, auth errors, DB errors and full upstream error messages in API responses (`details: error.message`). | `scans/route.ts` | Information leak, log noise (PII). | Structured logger, redact, generic client errors. |
| 10 | No server-side route protection (no middleware) and no CSRF/Origin checks on cookie-authenticated POSTs. | repo | Defence relies on each handler. | Add `proxy.ts`/middleware for session refresh + guarded paths. |
| 11 | Ask-Ari routes use the deprecated `cookies: { get }` adapter and omit `set/remove`, so session refresh won't persist there. | `ask-ari/question/route.ts:17` | Intermittent 401s after token expiry. | Reuse `supabaseAriClearServer()`. |
| 12 | Admin check implemented 3 times (inline queries). | `admin/*`, `check-admin` | Drift risk. | One `requireAdmin()` helper; RLS policy on `admin_users`. |
| 13 | **Prompt injection**: page text is fed to the LLM unfenced; a hostile site can instruct the model to return high scores or malicious "suggested copy". Brand route interpolates user text straight into the system prompt. | `analyze`, `brand-awareness` | Score manipulation, wrong advice. | Put page content in a delimited user message, tell the model it is untrusted data, validate/clamp output. |
| 14 | `demo-scan` and `brand-awareness` strip HTML with regexes; `analyze` uses cheerio. 3 extractors, 3 behaviours. | | Inconsistent scores for same URL. | Single `extractPage()` in `lib/`. |
| 15 | JS-rendered sites (React/Next SPAs — i.e. many founders' own sites) return near-empty HTML to plain `fetch`. | `analyze` uses raw fetch | **Wrong scores on exactly the target audience.** AI crawlers also mostly don't execute JS, so a raw fetch is partially defensible for the AI score but not for the human score. | Add headless rendering for the human score (Browserless/Playwright), and show "rendered vs raw" as a *feature*. |

Missing entirely: tests (no test runner in `package.json`), CI, error tracking (Sentry), structured logs, `pnpm type-check` script (README mentions one that does not exist), DB migrations in the repo (schema lives only in the Supabase dashboard), RLS policy files, env validation.

## 8. Cost model (per scan, order-of-magnitude)

| Step | Approx. cost | Notes |
|---|---|---|
| `analyze` (gpt-4o-mini, ~2k in / ~1.5k out) | ~US$0.001–0.003 | Negligible. Cost is *not* the problem on the core loop. |
| `demo-scan` (4k chars in, 400 out) | <US$0.001 | |
| Brand-awareness (Claude, large JSON) | ~US$0.02–0.10 depending on model | Verify model id in file (not reviewed in detail). |
| Recap video | **~US$0.10–0.50+** (SDXL ×N, TTS, Cloudinary storage/bandwidth, compute for 5-min render) | Unmetered. Biggest variable cost. |

These are estimates from vendor list pricing at time of writing, not measured. Add per-call cost logging before trusting them.

Gross margin on the core scan is >95% even at free-tier volume; the video feature and the human "Expert sessions" are what can make unit economics negative.

## 9. Quality of the core product (the part that matters)

The moat is the **quality and trustworthiness of the score**, and it has no safety net:
- No golden set of URLs with expected score ranges; no regression tests on prompt changes.
- Temperature 0.15 gives *mostly* stable output but the same URL can still differ by ±5–10 points between runs; users who re-scan after fixing things will read noise as signal. Scan history ("track progress") is a headline feature, so this is a product risk, not a nit.
- `gpt-4o-mini` is the cheapest tier. Given costs of ~US$0.002/scan there is headroom to use a stronger model or a 2-pass (extract → judge) design.
- The AI-SEO score is **an LLM's opinion of "AI-readability", not a measurement** of whether ChatGPT/Perplexity actually mention or cite the brand. That is what paying competitors measure (see business doc). Marketing copy must not imply otherwise.
- Overall score is a plain average; no weighting rationale.

Recommended: deterministic features (title/meta/H1 presence, JSON-LD types found, `robots.txt` AI-bot rules, `llms.txt`, canonical, OG tags, headings structure) computed in code and used as *anchors* for the LLM, so ~40% of the AI score is reproducible and explainable.

## 10. Docs vs reality (README drift)

| README / Description says | Code says |
|---|---|
| pnpm **monorepo** (`apps/web`, `packages/*`, `@ariclear/components` workspace package) | Single app; `@ariclear/*` is just a tsconfig alias to `app/*` |
| Stripe payments + `/api/webhooks/stripe` | No Stripe dependency or route. Paid tiers are a lead form (`plan-request`). |
| Scan analysis "sent to Claude" | `analyze` + `demo-scan` use **OpenAI gpt-4o-mini**; Claude is used only for brand-awareness; Gemini for video scripts |
| Env `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL/_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_MAIL_URL`, `SUPABASE_MAIL_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, Google TTS creds, `CLOUDINARY_*`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID` |
| Tiers: Free / Starter ~$99 / Agency $399–699 | Pricing page: Starter (free) / **Pro $149 (3 sites)** / **Expert $499 (6 sites)**, plus monthly $17 / $55 |
| Free tier = "limited scans/month" | Pricing page: "unlimited clarity scans"; server limits **websites**, not scans |
| `params` is synchronous in Next 16 | **Wrong.** Next 16 route/page `params` are Promises; the `[id]` routes and pages correctly await or `use()` them (see feature doc 03). README rule should be removed. |
| `pnpm type-check` | script does not exist |
| `.github/copilot-instructions.md` mentions `app/lib/supabaseServer.ts`, `mailcollection` | files moved to `lib/supabase/...` |

The README should be rewritten from this document.

## 11. Recommended technical roadmap

**Now (≤2 weeks) — stop the bleeding**
1. SSRF-safe `safeFetch()` shared by all four fetchers; add timeouts and a 1–2 MB body cap.
2. Auth or quota on `/api/analyze` and `/api/check-site`; Redis rate limiter (Upstash) replacing the `Map`.
3. Persist scan **server-side** in `/api/analyze`; remove client-supplied `analyzeResult` trust.
4. Gate `/api/video/render` by tier and quota; confirm it actually runs in prod.
5. Commit the Supabase schema + RLS as SQL migrations (`supabase/migrations/`).
6. Zod validation on all request bodies; one shared `requireUser()` / `requireAdmin()`.

**Next (2–6 weeks) — make it a business**
7. Stripe Checkout + webhook → `user_subscriptions`; replace `plan-request` flow. Enforce limits in one place (`lib/entitlements.ts`).
8. Headless-rendered fetch for human score; deterministic technical checks for AI score (§9).
9. Golden-set eval harness (30–50 URLs) run in CI on every prompt/model change.
10. Sentry + structured logging + cost-per-scan metric.
11. Scheduled re-scans (Vercel Cron / Supabase pg_cron) + email digest — turns a one-off tool into retention.
12. Move video rendering to a queue + worker (or Remotion Lambda); make `render` async and poll `status`.

**Later**
13. Actual AI-visibility measurement (run a prompt set against ChatGPT/Perplexity/Gemini/Claude APIs and record mentions/citations) — the feature the market pays for.
14. Public API + CMS/Shopify/Webflow/WordPress plugin; white-label PDF.
15. Split `ScanResultsEnhanced`, `ask-ari/page`, `ScanRecapComposition`, `scan/page` (700–1,200 lines each).

## 11b. Per-feature docs

Detailed docs for each feature are in [features/](features/README.md). Findings that change this document: nothing is tier-gated server-side; the recap video pipeline fails as written (5 scenes vs 4 image prompts) ; Ask Ari imports a client that is not exported; trend tracking and monitoring are not implemented as described.

## 12. Scope & confidence

Read in full: `analyze`, `demo-scan`, `scans`, `scans/limit`, `subscription`, `plan-request`, `check-site`, `video/request`, `video/render`, `preorder`, `admin/status`, `ask-ari/question`, `generateScript`, `lib/supabase/*`, `layout.tsx`, `PricingSection`, README, Description. Read partially: `brand-awareness/analyze` (first half), `generateImages`, `generateVoiceover`, `website-monitor`. **Reviewed afterwards by the per-feature docs in `features/`:** `scans/[id]`, `scans/stats`, auth routes, ask-ari routes, UI pages, Remotion composition. **Still unverifiable:** Supabase schema/RLS (not in repo — policy-level claims such as "RLS enabled" in the README are unverified).
