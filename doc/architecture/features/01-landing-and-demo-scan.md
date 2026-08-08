# Landing Page, Public Demo Scan, Email Waitlist / Plan Requests

## Purpose
Public marketing entry point (`/`). It (1) lets an anonymous visitor run a free, teaser-level clarity scan of any URL, (2) gates the full report behind sign-up (AuthModal), (3) collects leads through two separate paths: a waitlist/trial email form (hero) and paid-plan request forms (pricing + navbar). There is no payment processing; plans are sold by manual follow-up ("We'll reach out within 24 hours", `PreorderForm.tsx:19`).

## User flow
1. `app/page.tsx:11-27` renders Navbar, then `<main>`: `HomePageClient` (DemoScanSection + AuthModal), `HeroSection`, `HowItWorksSection`, `WhoItsForSection`, `PricingSection`, then `SiteFooter`.
2. `app/layout.tsx:29-46` wraps everything in `AuthProvider` > `PreorderProvider`, mounts react-hot-toast `Toaster`, and GoogleAnalytics only if `NEXT_PUBLIC_GA_ID` is set.
3. First visit: `PreorderProvider` waits 600 ms, opens a modal containing `PreorderForm`, and immediately writes `localStorage.ariclear_preorder_popup_seen=true` (`PreorderProvider.tsx:17-23`). It never shows again on that browser, even if dismissed without submitting.
4. Demo scan (`DemoScanSection.tsx:297-579`): user types a URL; client prepends `https://` if it doesn't start with `http` (`:30-33`), checks hostname contains a dot (`:21-28`), POSTs `/api/demo-scan`. Button disabled when empty/loading. Enter key also submits (`:357`).
5. Result card (`TeaserResult`, `:112-293`): shows domain, Overall ring, Clarity ring (humanScore), "AI-SEO" ring rendered blurred/empty (`blurred` prop, `:169-174`), verdict, 2 real issues, a hard-coded fake blurred issue plus "+N more issues hidden" (`:210-233`), a blurred placeholder block, and CTA "Get the Full Report - Free" which calls `onSignUpClick` -> opens `AuthModal` (`HomePageClient.tsx:11-12`).
6. Hero form (`HeroSection.tsx:98-144`): email (required) + optional URL, "Reserve my spot". Calls `preorderRequest` -> `POST /api/preorder`. After success an artificial 800 ms delay, then toast + inline confirmation. `EMAIL_EXISTS` shows an info toast (`:33-34`).
7. Pricing (`PricingSection.tsx`): two cards, Gladiator (`tier: starter`, $39 / 6 months, 1 site) and Centurion (`tier: pro`, $99 / 6 months, 3 sites, uptime, brand awareness, 1x30-min expert session/month). CTA sets `selectedTier` and opens an inline overlay with `PreorderForm tier=...` (`:115-118`, `:316-335`). The form POSTs `/api/plan-request` (outside this feature's file list; read for context, `app/api/plan-request/route.ts`).
8. Navbar (`Navbar.tsx`): "How it works"/"Who it's for" anchor links (`:231-238`), "Try demo" (anon: opens AuthModal; logged in: `/scan`, `:140-146`), "Request Trial" -> `usePreorder().open()` (`:161-164`, `:253-257`), Calendly link. Note: no nav link to `#pricing`.

## Files & responsibilities
| path | role | size (lines) |
|---|---|---|
| app/page.tsx | Server component, composes landing sections | 27 |
| app/HomePageClient.tsx | Client wrapper: demo section + AuthModal state | 15 |
| app/layout.tsx | Root layout, metadata, providers, Toaster, GA | 50 |
| app/components/DemoScanSection/DemoScanSection.tsx | Demo UI, client validation, teaser result | 579 |
| app/components/DemoScanSection/index.ts | Barrel export | 1 |
| app/components/section/HeroSection.tsx | Hero copy, waitlist email form -> /api/preorder | 153 |
| app/components/section/HeroPreviewCard.tsx | Static mock report card (hard-coded 68/100) | 78 |
| app/components/section/HowItWorksSection.tsx | 4 static step cards | 88 |
| app/components/section/WhoItsForSection.tsx | Static persona cards | 81 |
| app/components/section/PricingSection.tsx | Plan data, cards, inline modal with PreorderForm | 338 |
| app/components/Froms/PreorderForm.tsx | Plan request form -> /api/plan-request, Calendly alt | 274 |
| app/components/providers/PreorderProvider.tsx | Context + auto-open first-visit modal | 39 |
| app/components/layout/Navbar.tsx | Nav, auth, Request Trial trigger (landing-relevant parts only) | 702 |
| app/components/layout/SiteFooter.tsx | Footer | 37 |
| app/api/demo-scan/route.ts | Rate limit, fetch page, GPT-4o-mini analysis | 220 |
| app/api/preorder/route.ts | Insert email into `mailcollection` | 51 |
| lib/supabase/mail/server.ts | Service-role Supabase client for the "mail" project | 15 |
| helpers/preorderRequest.ts, helpers/index.ts | Client fetch wrapper for /api/preorder (index re-exports it) | 33 / 1 |

Path alias `@ariclear/components` -> `app/components` (`tsconfig.json:21`); `@/helpers` is used by HeroSection.

## Data flow & API
**POST /api/demo-scan** (`route.ts`)
- Req: `{ url: string }`. Errors: 429 `{error, errorCode:'RATE_LIMIT'}`, 400 `INVALID_URL`, 422 `FETCH_ERROR`, 500 `AI_ERROR`.
- Steps: IP rate limit (`:75-87`) -> `new URL(url)` validation (`:89-101`) -> server-side `fetch` with 10 s abort and a bot User-Agent (`:108-118`) -> strip script/style/comments/tags via regex, collapse whitespace, truncate to 4000 chars (`:28-37`), reject if < 50 chars (`:139`) -> OpenAI `chat.completions` `gpt-4o-mini`, temp 0.15, max_tokens 400 (`:160-171`) -> strip code fences, `JSON.parse`, shape check (`:173-185`) -> clamp scores 0-100, overall = mean (`:193-199`).
- Res 200: `{ domain, overallScore, humanScore, aiScore, verdict, topIssues[<=2], hiddenIssueCount(2-5) }`. `hiddenIssueCount` is an LLM-asserted number, not a count of real stored issues.
- No DB writes, no auth, nothing persisted. External: target website, OpenAI (`OPENAI_API_KEY`).

**POST /api/preorder**: Req `{ email, url?, sourceURL }` (sourceURL = `window.location.href`, `preorderRequest.ts:7-18`). Inserts `{email(lowercased), url|null, sourceURL}` into `mailcollection` via service role (`:22-26`). 201 `{ok:true,row}`; 409 `EMAIL_EXISTS` on PG code 23505; 500 `DATABASE_ERROR`; 400 `Invalid email`.

**POST /api/plan-request** (context): fields `email, phone, plan('starter'|'pro'), websites, url, notes, sourceUrl`; `upsert` on `(email,plan)` into `plan_requests` using the second Supabase project (`NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL` + service role). Returns 201 `{success:true}`.

Env: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_MAIL_URL`, `SUPABASE_MAIL_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GA_ID`, plus ARI_CLEAR vars above.

## Data model (inferred; schema not in repo)
- `mailcollection` (mail Supabase project): `email` (text, UNIQUE - inferred from 23505 handling, `preorder/route.ts:30`), `url` (text null), `sourceURL` (camelCase column - inferred from insert key, `:24`), plus id/created_at presumably (returned by `.select()`).
- `plan_requests` (ARI_CLEAR project): `email, phone, plan, websites, url, notes, source_url`; unique constraint on `(email, plan)` required by `onConflict` (inferred).
- Demo scan touches no tables.

## Business rules & limits
- Demo scan: anonymous, 3 requests / 60 s per IP, in-memory (`route.ts:7-9`). Free; one OpenAI call (<=400 output tokens, 4000 chars input) each.
- Teaser gating is UI-only: AI score hidden by blur, 2 of N issues shown, "full report" requires sign-up (AuthModal).
- Plans: Gladiator $39 / 6 mo (1 site), Centurion $99 / 6 mo (3 sites, expert session, uptime, brand awareness). Prices and features are hard-coded in `PricingSection.tsx:6-109`; `PreorderForm` re-hard-codes tier labels/site caps (`:11-30`). No enforcement, no checkout.
- Hero form promises a "60-day trial" (`HeroSection.tsx:104`); no code defines or enforces a trial.
- Waitlist dedupe by email (DB unique); plan requests dedupe by email+plan.

## Error handling & edge cases
- Client maps 429 / `FETCH_ERROR` / other to three inline messages (`DemoScanSection.tsx:335-346`); network failure message at `:351-353`. `INVALID_URL` and `AI_ERROR` both fall into the generic message.
- Non-OK upstream fetch, timeout, <50 chars text (JS-rendered SPAs return little HTML) all become `FETCH_ERROR`.
- Malformed/odd LLM output -> `AI_ERROR` 500; `topIssues` non-strings are not validated.
- Hero submit: `loading` stays true during the fake 800 ms delay; success clears fields. Generic errors give a vague toast.
- PreorderForm: 409 branch (`:89`) treated as duplicate, but the API upserts so it never returns 409 (see risks).
- localStorage access in PreorderProvider has no try/catch.

## Known issues / risks
Security
1. SSRF: `/api/demo-scan` fetches any user URL server-side with redirects followed and no scheme/host allow-list or private-IP/metadata block (`route.ts:95,111`). Localhost, 169.254.169.254, internal hosts are reachable (response is only summarized, but timing/error oracle and blind access remain). Also no response-size cap before `.text()` (`:129`).
2. Rate limit is per-process in-memory and keyed on spoofable `x-forwarded-for` first hop (`:77-80`); on serverless/multi-instance it is effectively absent; unbounded Map growth (no eviction, `:7`). Cost exposure on OpenAI key.
3. Gating is cosmetic: `aiScore` and the real `hiddenIssueCount` are returned in the JSON (`route.ts:201-217`) and visible in the network tab; the "AI-SEO" ring is only blurred client-side.
4. `/api/preorder`: no email format validation, no rate limit/captcha, user-controlled `sourceURL` stored unvalidated (`:8,24`), raw `err.message` returned to client (`:48-49`), full inserted row echoed back (`:44`). Service-role key used for a public insert. `lib/supabase/mail/server.ts:6-8` throws at import if env missing, taking the route down.
5. Prompt injection: scraped page text is placed in the user message with no delimiting (`route.ts:168`); a page can steer scores/issues.
Correctness / UX
6. Two disjoint lead paths: hero -> `mailcollection` ("waitlist"), modal/pricing -> `plan_requests`. Navbar "Request Trial" and the first-visit popup render `PreorderForm` with no tier, which defaults to Centurion/pro (`PreorderForm.tsx:54-55`; `PreorderProvider.tsx:35`), so a trial request is recorded as a paid Centurion request.
7. `plan-request` uses upsert with `ignoreDuplicates:false` (plan-request/route.ts:40-54): a repeat submission silently overwrites the earlier one and returns 201; the "already requested" toast is dead code. (Working-tree diff to that file is uncommitted.)
8. Copy contradicts pricing: demo CTA says "Get the Full Report - Free / Sign up free" (`DemoScanSection.tsx:261,281`) while pricing sells paid plans and the footer says "Early access is invite-only" (`SiteFooter.tsx:32`) and hero says "limited alpha". Hero says "Request a 60-day trial" with no trial implemented.
9. Two `<h1>` on the page (`HeroSection.tsx:52`, `DemoScanSection.tsx:414`) and duplicate `id='email'` in hero and in PreorderForm modal (`HeroSection.tsx:102,108` vs `PreorderForm.tsx:140`); duplicate `normalizeUrl`/`DemoResult`/verdict logic across client and server (`DemoScanSection.tsx:7,30,126`, `route.ts:41,206`).
10. Unverified/inconsistent claims: "under 10 seconds" (HowItWorks:48) vs "~20 seconds" (DemoScan); stat pills (55%, 70%+, 8s) unsourced except Nielsen link; hero preview card is a static mock (68/100).
11. Pricing overlay is hand-rolled (no Esc handling, focus trap, aria-modal) and differs from the shared `Modal` used by PreorderProvider (`PricingSection.tsx:316-335`). Fake 800 ms `setTimeout` after success (`HeroSection.tsx:23`, `PreorderForm.tsx:97`) can leave a stale state if the component unmounts.
12. First-visit popup flag is set before the user interacts (`PreorderProvider.tsx:19-21`), so dismissal permanently suppresses it; popup may also cover the demo on first load (conversion/UX).
13. No tests; no analytics events for scan/submit (GA loaded with no consent banner; GDPR/ePrivacy risk). Layout metadata lacks Open Graph/Twitter tags and canonical (`layout.tsx:8-17`).
14. Directory is named `Froms` (typo) and is part of the import surface.

## Improvement opportunities
1. (High) Add SSRF protection to demo-scan: http/https only, resolve DNS and block private/link-local/loopback ranges, limit redirects, cap bytes read, set a hard `max` on URL length.
2. (High) Replace in-memory limiter with Upstash/Vercel KV (or Supabase), key on trusted IP header, add a global daily cap and a spend alarm on OpenAI.
3. (High) Stop returning `aiScore` and real `hiddenIssueCount` to anonymous users, or accept it as a deliberate trade-off; return only what the teaser renders.
4. (High) Fix the lead split: make hero/Navbar/popup post to one endpoint with an explicit `source`/`intent` field; do not default an untiered form to `pro`. Return 409 from `plan-request` on duplicates (or drop the dead branch).
5. (Med) Reconcile copy with the current business model (paid plans, no checkout): update demo CTA, footer, "60-day trial", "limited alpha"; add a `#pricing` nav link.
6. (Med) Validate inputs with zod on both preorder routes (email format, URL, lengths), add rate limit/honeypot, stop echoing DB rows and raw error messages.
7. (Med) Wrap prompt content in delimiters and use OpenAI JSON mode / structured output with schema validation instead of fence stripping.
8. (Low) Centralize plan config (prices, site caps, tiers) in one module shared by PricingSection, PreorderForm and plan-request; share `DemoResult` type between route and client; reuse `Modal` in PricingSection; fix duplicate ids/h1; remove artificial delays; try/catch localStorage; add OG metadata, consent-gated GA; add tests for the route (validation, rate limit, LLM-shape failures).

## Open questions
- Exact Supabase schemas, unique constraints and RLS for `mailcollection` / `plan_requests`; whether `sourceURL` is really a camelCase column.
- Whether anything notifies the team of new leads (no email/webhook in code) and how requests are fulfilled.
- Production hosting (serverless vs long-lived Node) which determines how broken the in-memory rate limit is; any edge/WAF rate limiting in front.
- Whether AuthModal sign-up actually unlocks a full report for the scanned URL (the demo result is not passed to /scan; the user must rescan) - not verifiable from these files.
- Whether the 60-day trial and "free full report" promises are still intended given the new paid plans.
- `HeroSection` form id `preorder` anchor: no links in the read files target `#preorder`; unknown if used elsewhere.
