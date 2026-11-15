# AriClear — Full Status Update (Nov 2026)

> What we did, what we built, what we are focused on, and where the docs disagree with the code or with each other.
> Method: read every file in `doc/`, `README.md` and `Description.md`, then checked each claim against the code at `HEAD` (`1c2e0c9`). Nothing was run against production; the Supabase schema is still not in the repo.
> Evidence labels: `[code]` = checked in the repo today · `[doc]` = what a doc says · `[gap]` = doc and code (or two docs) disagree.

---

## 1. One-paragraph summary

AriClear is a single Next.js 16 app that scores a homepage two ways (human clarity + AI-SEO), rewrites the hero copy and gives an action plan. Since the docs baseline (`6e02431`), we did four things: **(1)** wrote the full documentation set (tech doc, 8 feature docs, startup doc, feature audit); **(2)** fixed the worst security problems (SSRF-safe fetch, login required on paid AI routes, rate limits, open redirect); **(3)** cut three side features (recap video, Ask Ari, website monitor), parked Brand Awareness and dropped 8 dependencies, removing **~8,600 lines**; **(4)** built two new features on the saved-scan page: **Test your rewrite** and **Technical readiness checks**. The codebase is now ~11,200 lines of TypeScript, type-checks cleanly, and has one AI vendor on the core path (OpenAI). **What has not moved:** there is still **no billing (Stripe)**, no plan limits enforced in one place, no retention loop (trend, re-scans, saved checklist), and no AI-visibility measurement. The current focus is: *wire Stripe → enforce entitlements → make re-scans and progress real → build the AI-visibility check.*

---

## 2. Timeline — what we did

| Period (commit dates) | What happened | Commits |
|---|---|---|
| Dec 2025 | Next.js app created; landing page; Supabase connected; pricing table; demo scan page; logo, nav | `20be1ad` … `554b13a` |
| Dec 2025 – Jan 2026 | Auth: sign-up, login, reset password, confirm page, AuthProvider refactor, duplicate-email handling (PRs #3–#6) | `2d96113` … `a081bfb` |
| Jan – Feb 2026 | Starter/Pro plans, pricing mobile fixes (PRs #7, #8), dashboard, nav bar improvements (PR #9), README | `050b4b8` … `47082d3` |
| Mar 2026 | Website monitor page, new version of the analyzer, CTA fixes, pricing update | `ab0d6d2` … `bdf56ce` |
| Apr 2026 | Auth UX fixes, analyzer improvements, new LLM (Claude), **Brand Awareness** feature, `Description.md`, Ask Ari page, admin, pricing iterations, README tech stack | `98b4d82` … `cb3a574` |
| May 2026 | Hyperlinks, admin rules, plan request route, hero rework, **AI recap video** (PR #10) and video fixes | `42d4d15` … `6e02431` |
| Aug 2026 `a1919ea` | **Docs created:** `tech-doc.md`, `startup-doc.md`, `doc/README.md` | 1 |
| Aug 2026 `141fa49` | **Pricing change:** monthly/yearly toggle removed, plans simplified | 1 |
| Aug 2026 `f00a8e0` | **8 feature docs** written; pricing/plan-request copy adjusted | 1 |
| Aug 2026 `da462d6` | **Bug pass:** open redirect in `/api/auth/confirm`, `GET /api/scans?limit=`, Ask Ari import bug, video render step | 1 |
| Aug 2026 `f38e370` | **Security hardening:** `lib/security/safeFetch.ts`, `lib/security/rateLimit.ts`, auth on `analyze` / `brand-awareness` / `check-site`, `lib/plans.ts`, stale copy removed | 1 |
| Aug 2026 `f3e55ed` | **Cleanup:** video, Ask Ari, monitor removed; Brand Awareness parked; `feature-audit.md`; 8 dependencies dropped (−8,600 lines) | 1 |
| Aug 2026 `1c2e0c9` | **New:** Test-your-rewrite + Technical readiness checks; shared `extractPage()`; feature doc 09 | 1 |

155 commits in total. The last 4 commits are all titled "fixing bugs" although two of them are large feature/cleanup changes — worth clearer commit messages from now on.

---

## 3. What exists today `[code]`

### 3.1 Live features

| # | Feature | Where | State |
|---|---|---|---|
| 1 | Landing page + public demo scan (2 issues shown, rest gated) + waitlist | `app/page.tsx`, `/api/demo-scan`, `/api/preorder` | Works. SSRF-safe; 3/min + 15/day per IP (in-memory) |
| 2 | Core scan: Human Clarity + AI-SEO score, rewrite, action plan, AI prompt | `/scan`, `/api/analyze` | Works. **Login required**, 10/min per user, SSRF-safe, uses shared `extractPage()` |
| 3 | Save scan, history (grouped by domain), saved-scan page, dashboard, stats | `/api/scans*`, `/history`, `/scan/[id]`, `/dashboard` | Works; no trend, checklist not saved |
| 4 | PDF report + checklist export (client-side) | `ScanResultsEnhanced` | Works; not gated |
| 5 | Auth (sign-up, login, verify, reset) | `/api/auth/*` | Works; open redirect fixed |
| 6 | Plans (Gladiator / Centurion) + plan-request form | `lib/plans.ts`, `PricingSection`, `/api/plan-request` | **Lead form only — no payment** |
| 7 | **Test your rewrite** (new) | `/api/scans/[id]/rewrite-test`, `RewriteTester.tsx` | Works; scores current vs candidate copy in one call, temp 0, stable scores in testing |
| 8 | **Technical readiness checks** (new) | `lib/analysis/technicalChecks.ts`, `/api/scans/[id]/technical`, `TechnicalChecks.tsx` | Works; 14 deterministic checks (no LLM) + copy-paste fixes |
| 9 | Expert review | Navbar Calendly link | Link only, not charged |

### 3.2 Parked / removed

| Feature | Status | Notes |
|---|---|---|
| Brand Awareness (Claude) | **Parked** — hidden from nav and pricing, route still live, login + 5/min limit | ~1,430 lines kept for the future AI-visibility check |
| AI recap video | **Removed** | Gemini, Google TTS, Replicate, Cloudinary, Remotion all gone |
| Ask Ari Q&A board + admin | **Removed** | Replaced by "Expert review" booking link |
| Website monitor | **Removed** | `/api/check-site` gone |

### 3.3 Stack today

Next.js 16.0.7 · React 19.2 · TypeScript 5 · Tailwind 4 · Supabase (2 projects: app + mail list) · OpenAI `gpt-4o-mini` (scan, demo, rewrite tester) · Anthropic (parked Brand Awareness only) · cheerio · jsPDF · Google Analytics. **No** Stripe, tests, CI, Sentry, middleware, or DB migrations in the repo.

### 3.4 Health check (run today)
- `tsc --noEmit`: **0 errors in source code.** The only errors come from stale generated files in `.next/` that still reference the deleted routes. Fix: `rm -rf .next` and rebuild.
- `.env` and `google-tts-credentials.json` sit in the project root but are **gitignored** (not committed). The Google TTS credential is no longer used: delete the file and revoke the key in Google Cloud.

---

## 4. Security and quality findings — then vs now

Status of every finding in [tech-doc §7](architecture/tech-doc.md) and the feature docs:

| # | Finding (from docs) | Status now `[code]` |
|---|---|---|
| 1 | SSRF in all server-side fetches | ✅ **Fixed** — `safeFetch` used by analyze, demo-scan, brand-awareness, rewrite-test, technical checks. Residual: DNS-rebinding race (documented) |
| 2 | `/api/analyze` and `/api/check-site` unauthenticated | ✅ **Fixed** — analyze requires login; check-site deleted |
| 3 | In-memory demo rate limiter | ⚠️ **Improved, not solved** — shared helper + daily cap, but still per-instance memory. Needs Upstash/Supabase |
| 4 | `POST /api/scans` trusts client-sent `analyzeResult` | ❌ **Open** — users can still save forged scores |
| 5 | Website-limit check is racy; insert failure swallowed | ❌ **Open** |
| 6 | Video render had no quota | ✅ **Gone** (feature removed) |
| 7 | `plan-request` upsert lets anyone overwrite a lead | ❌ **Open** — still `upsert` |
| 8 | Signup checks `auth.users` via PostgREST (dead code) | ❌ **Open** |
| 9 | Debug logging of user IDs / DB errors | ❌ **Open** — 45 `console.log` calls in `app/` + `lib/` |
| 10 | No middleware / server-side route guard | ❌ **Open** — no `middleware.ts` or `proxy.ts` |
| 11–12 | Ask Ari cookie adapter, triple admin check | ✅ **Gone** (feature removed) |
| 13 | Prompt injection (page text unfenced) | ⚠️ **Partly** — rewrite tester treats input as data; `analyze`, `demo-scan`, brand route still unfenced |
| 14 | Three different HTML extractors | ⚠️ **Partly** — `extractPage()` used by analyze + rewrite tester; demo-scan and brand still use regex |
| 15 | JS-rendered sites score wrong | ⚠️ **Flagged, not fixed** — technical checks now *detect* "content not readable without JS"; no headless rendering |
| — | Open redirect in `/api/auth/confirm` | ✅ **Fixed** |
| — | Login returns access/refresh tokens in JSON | ❌ **Open** |
| — | Demo returns gated `aiScore` + hidden-issue count in JSON | ❌ **Open** (cosmetic gating) |
| — | Quota checked *after* the OpenAI call in analyze | ❌ **Open** |
| — | No tier mapped to limits server-side | ❌ **Open** — `lib/plans.ts` holds labels/prices only; backend still auto-creates `free` with 1 website |
| — | Checklist progress never saved (PATCH has no caller) | ❌ **Open** |
| — | No trend / progress tracking | ❌ **Open** |
| — | History links to `/history/[id]`, scan redirects to `/scan/[id]` (two detail views) | ❌ **Open** — and the new features only live on `/scan/[id]`, so users coming from History never see them |
| — | Parked brand route hard-codes `claude-sonnet-4-20250514` | ❌ **Open** — dated model id; move to env before un-parking |
| — | Score quality: no eval set, no golden URLs | ⚠️ **Partly** — technical score is deterministic; core LLM score still has no eval set |

**Score:** of ~25 tracked issues, 7 are fixed or removed, 5 are partly addressed, 13 are open.

---

## 5. Docs comparison — where the docs disagree `[gap]`

### 5.1 Pricing — five different versions in the repo

| Source | What it says |
|---|---|
| **Code** (`PricingSection.tsx`, `lib/plans.ts`) — *the truth* | **Gladiator $39 / 6 months (1 site)**, **Centurion $99 / 6 months (3 sites)**; no free plan on the page |
| `feature-audit.md` §4 | Same as code ✅ |
| `startup-doc.md` §7.1 | Starter free / Pro $149/yr / Expert $499/yr — **outdated** |
| `startup-doc.md` §7.1b | Free $0 + Pro **$59 / 6 months** — **never matched the code** |
| `startup-doc.md` §10.3 (proposal) | Free / Founder $19/mo / Studio $79–99/mo / Agency+ $199+ — proposal, not decided |
| `Description.md` | Free / Starter ~$99/yr / Agency $399–699/yr — **outdated** |
| `README.md` | Starter ~$99/yr / Agency $399–699/yr — **outdated** |

Related copy conflicts in the app: the pricing page shows no free plan, but the demo says "Free demo, no credit card", `PreorderForm` says "No credit card required to get started", the hero says "Early access · limited alpha", and every signed-in user silently gets a free 1-website tier in the backend. **Decision needed:** is there a free plan after the demo, or not?

### 5.2 Feature strategy — the startup doc was never updated after the cleanup

| Topic | `startup-doc.md` says | Reality (`feature-audit.md` + code) |
|---|---|---|
| Product table §2 | Lists monitor, Ask Ari, recap video as working | Removed |
| §5.3 differentiators #5–6 | Ask Ari and recap video | Removed; new differentiators are the **rewrite tester** and **deterministic technical checks** (not mentioned anywhere in the startup doc) |
| §8.2 channel #2, §10.2 | "Keep recap video as growth engine (watermarked)" | Video cut; audit suggests a static shareable score image instead |
| §12 experiment #4 | Video share test | Obsolete |
| §10.2 | "Demote uptime monitor / Ask Ari" | Went further: cut |
| §1, §6 | "Working MVP across 8+ features" | 6 live features + 1 parked |

### 5.3 Technical docs

| Doc | Gap |
|---|---|
| `doc/README.md` | Says "8 features" incl. monitor, Ask Ari, video; says "Both documents" (there are 4 docs + feature folder); feature doc 09 and this update not listed |
| `tech-doc.md` §1–§6, §8, §10 | Still describes the pre-cleanup system (5 AI vendors, 31 routes, video pipeline, Ask Ari). Only a one-line note in §11b says so. Current route count: **19 API route files** |
| `tech-doc.md` §7, §11 | Roadmap items 1–2 done, 4 obsolete; not marked |
| `features/01` | Pricing lists uptime + brand awareness + expert session on Centurion (removed); SSRF / rate limit listed as open (fixed) |
| `features/02` | Describes `triggerVideoRender` after every scan, unauthenticated analyze, no SSRF guard — all outdated |
| `features/03` | `/scan/[id]` described with video player and `video_jobs` — removed; does not mention the new rewrite/technical panels |
| `features/04` | Lists open redirect as open (fixed); tier-name drift partly fixed by `lib/plans.ts` |
| `README.md` | Still says pnpm **monorepo**, `apps/web`, Stripe webhook, "sent to Claude", `pnpm type-check` — none true |
| `.github/copilot-instructions.md` | Old file paths (`app/lib/supabaseServer.ts`) |

### 5.4 Roadmap vs progress (startup-doc §11)

| Horizon | Planned | Done |
|---|---|---|
| 0–2 wks: "safe & chargeable" | SSRF / rate-limit fixes | ✅ mostly |
| | Stripe Checkout + webhook | ❌ not started |
| | Tier entitlements | ❌ not started (`lib/plans.ts` is labels only) |
| | Pricing page aligned with code | ✅ (page and `lib/plans.ts` agree) |
| 2–6 wks: "prove value & retention" | Scheduled re-scan + email | ❌ |
| | Score trend | ❌ |
| | Deterministic checks + eval set | ✅ checks built / ❌ eval set |
| | JS rendering | ❌ (detected only) |
| | Public scorecard + badge | ❌ |
| | Run AriClear on itself and fix homepage | ⚠️ ran it (technical score 69; fails JSON-LD, 2× H1, no OG, no canonical, no sitemap) — **fixes not done** |
| Beyond | Launch, agency pilots, AI-visibility check, white-label | ❌ |
| Not in plan | Rewrite tester | ✅ built (good addition — it is the "prove it improved" loop the startup doc asked for) |

Traction data (users, scans, plan requests, revenue) is still **TO FILL** in every doc.

---

## 6. What we are focused on now

The direction is consistent across `feature-audit.md` and the code: **one core loop (scan → score → fix → re-test → re-scan), sold as a 6-month plan.**

### Priority 1 — Get paid (blocks everything)
1. Stripe one-time Checkout for Gladiator ($39) and Centurion ($99), webhook sets `tier`, `websites_limit`, `expires_at = +6 months` (design already written in `feature-audit.md` §6).
2. `lib/entitlements.ts`: one place that maps tier → limits and checks expiry; enforce in `/api/scans`, `/api/analyze` (before the OpenAI call), rewrite tester, technical checks, PDF.
3. Terms, refund and privacy pages.
4. Decide the free plan question (§5.1) and align all copy.
5. After launch: remove `plan-request`, `PreorderForm`, `PreorderProvider`.

### Priority 2 — Make the product trustworthy
6. Save scans server-side inside `/api/analyze` (stop trusting the client).
7. Fix ariclear.com with our own technical-check fixes (JSON-LD, one H1, OG tags, canonical, sitemap) — the product must pass its own test.
8. Golden set of 30 URLs to measure score variance.
9. Fence page content in the `analyze` and `demo-scan` prompts.

### Priority 3 — Retention
10. Per-domain score trend in History; persist checklist ticks (wire the existing PATCH).
11. One detail page (redirect `/history/[id]` → `/scan/[id]`) so the new panels are reachable from History.
12. Scheduled re-scan + email digest (Vercel Cron / pg_cron).
13. Save rewrite-test attempts to feed the trend.

### Priority 4 — Differentiate
14. AI-visibility check (is the business named by ChatGPT/Perplexity/Gemini for its category, and who instead?) — reuse Brand Awareness entity extraction. Already promised as "coming soon" on Centurion.

### Housekeeping
- Drop DB tables `video_jobs`, `questions`, `comments`, `admin_users` after export.
- Delete `google-tts-credentials.json` and revoke the key; remove unused env vars.
- Commit Supabase schema + RLS as migrations.
- Replace `console.log` with a small logger; add Sentry.
- Rewrite `README.md` from the tech doc; refresh `Description.md` and `.github/copilot-instructions.md`.

---

## 7. Doc fixes recommended (to bring the docs in line)

| Doc | Change |
|---|---|
| `doc/README.md` | List all docs incl. feature 09 and this update; "8 features" → current list |
| `business/startup-doc.md` | Replace §7.1/§7.1b with the real $39/$99 per 6 months; update §2, §5.3, §8.2, §10.2, §12 for the cleanup and the two new features; mark roadmap progress |
| `architecture/tech-doc.md` | Rewrite §1–§5 for the current stack and 19 routes; mark §7 items fixed/open per §4 above |
| `features/01–04` | Add a "Status (Nov 2026)" box at the top listing what is fixed (SSRF, auth, open redirect, copy) and what was removed (video, monitor, Ask Ari references) |
| `README.md`, `Description.md` | Remove monorepo/Stripe/old pricing; point to `doc/` |

---

## 8. Open questions for the founder

1. Free plan after the demo — yes (1 site, limited) or no (demo only, then pay)?
2. One-time 6-month payment or true subscription? (Audit recommends one-time to start.)
3. Who are the first 10 agencies to pilot with?
4. How many rows are in `plan_requests` and `mailcollection`? That is the only demand data we own.
5. Does any real user have data in the removed features' tables?
