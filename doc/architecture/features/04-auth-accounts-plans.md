# Authentication, Accounts & Plans (tiers, limits, trial, plan requests)

## Purpose
- Identify users (Supabase Auth, email+password, email verification, password reset) so scans, history, video, ask-ari are per-user.
- Gate usage by website count per subscription tier (free = 1 site, 60-day trial, paid tiers) via `user_subscriptions` / `user_websites`.
- Sell paid plans without payment infrastructure: pricing section -> "request access" form -> row in `plan_requests` for manual follow-up (no Stripe).

## User flow
1. Visitor clicks Login / "Try demo" in `Navbar.tsx` -> `AuthModal` (modes login/signup/reset) (`Navbar.tsx:141-151`, `AuthModal.tsx:8`). "Try demo" for logged-out users opens the modal instead of `/scan` (`Navbar.tsx:141-144`).
2. Signup: `POST /api/auth/signup` -> Supabase `signUp` with `emailRedirectTo=${NEXT_PUBLIC_SITE_URL}/verify-email`; modal shows "Check your email" (`AuthModal.tsx:124-131`). Link opens `/verify-email`, which only checks `getSession()` client-side and shows success/failure (`verify-email/page.tsx:18-27`). "Go to login" returns to `/`.
3. Login: `POST /api/auth/login` (sets session cookies via `@supabase/ssr`), then `refreshUser()` -> `GET /api/auth/user`, modal closes (`AuthModal.tsx:118-122`).
4. Reset: modal -> `POST /api/auth/reset` -> email link `${SITE_URL}/confirm?next=/reset-password` -> `/confirm` server page redirects to `/api/auth/confirm?code&next` -> `exchangeCodeForSession` -> redirect `/reset-password` -> `POST /api/auth/update-password` (`updateUser({password})`) -> redirect `/` after 2s.
5. Logged-in Navbar fetches `/api/subscription` and shows tier badge, "websites_used / websites_limit" bar, scan-ready dot (`Navbar.tsx:109-132, 296-345`). Logout: `POST /api/auth/logout`, then `router.push('/')` (`Navbar.tsx:153-159`).
6. Plan request: Pricing cards (Gladiator `starter` $39 / Centurion `pro` $99 per 6 months) -> `handleSelect` opens modal with `PreorderForm tier=...` (`PricingSection.tsx:115-118, 329`) -> `POST /api/plan-request` -> toast "We'll reach out within 24 hours". Alternative: Calendly link (`PreorderForm.tsx:9, 248`).
7. A global `PreorderProvider` auto-opens `PreorderForm` with NO tier on first visit (localStorage flag) and from Navbar "early access"; no tier defaults to `pro`/Centurion (`PreorderProvider.tsx:17-35`, `PreorderForm.tsx:54-55`).
8. At limit, `/scan` shows upgrade UI (copy refers to "Centurion", mailto) (`app/scan/page.tsx:244-283`); nothing links the request form to actually changing a user's tier.

## Files & responsibilities
| path | role | size |
|---|---|---|
| app/components/Auth/AuthModal.tsx | Login/signup/reset modal, friendly error mapping, 5.5s error auto-dismiss | 262 L |
| app/components/Auth/index.ts | Empty file (0 L); exports come from `@ariclear/components` barrel | 0 |
| app/components/providers/AuthProvider.tsx | Context: `user`, `loading`, `refreshUser`, `signOut`; user from `GET /api/auth/user` | 57 L |
| app/api/auth/login/route.ts | `signInWithPassword`; returns user + tokens | 24 |
| app/api/auth/signup/route.ts | Duplicate check + `signUp` | 49 |
| app/api/auth/logout/route.ts | `signOut` | 9 |
| app/api/auth/user/route.ts | `getUser` -> `{user\|null}` | 9 |
| app/api/auth/reset/route.ts | `resetPasswordForEmail` | 21 |
| app/api/auth/update-password/route.ts | `updateUser({password})` | 17 |
| app/api/auth/confirm/route.ts | PKCE `exchangeCodeForSession`, redirect to `next` | 27 |
| app/confirm/page.tsx | Server page forwarding query to `/api/auth/confirm` | 16 |
| app/verify-email/page.tsx | Post-signup landing; client `getSession` check | 77 |
| app/reset-password/page.tsx | New-password form (min 6) | 106 |
| lib/supabase/auth/browser.ts | Anon-key `createClient` singleton; throws at import if env missing | 10 |
| lib/supabase/auth/server.ts | Cookie-bound `createServerClient` (anon key) | 23 |
| app/api/subscription/route.ts | Tier, limit, usage, trial status for current user; lazy-creates free row | 86 |
| app/api/scans/limit/route.ts | Same data shaped for scan/history UI (`limit,current,limitReached,trialExpired`) | 67 |
| app/api/plan-request/route.ts | Service-role upsert into `plan_requests` | 72 |
| app/components/Froms/PreorderForm.tsx | Request form + `TIER_CONFIG` (starter/pro) | 274 |
| app/components/section/PricingSection.tsx | Two plan cards + request modal | 338 |
| app/components/layout/Navbar.tsx | Auth menu, tier badge, usage bar (702 L total) | 702 |
| (related, outside scope) app/api/scans/route.ts:130-260 | The real limit enforcement on save; app/dashboard/page.tsx:70-94 duplicate badge logic; lib/api/axios.ts | - |

## Data flow & API
- Client uses axios `api` (`baseURL /api`, `withCredentials`) for auth; plain `fetch` for subscription/plan-request.
- `POST /api/auth/login` `{email,password}` -> 200 `{success,user,access_token,refresh_token}` | 400 `{error}`. Tokens are returned in the body even though cookies carry the session (`login/route.ts:18-23`).
- `POST /api/auth/signup` `{email,password}` (client also sends `redirectTo`, ignored) -> 200 `{success}` | 409/400 `{message}` (note: `message`, other routes use `error`).
- `POST /api/auth/reset` `{email}` -> `{success,message}` | 400 `{error}`; client `redirectTo` ignored, server hardcodes `NEXT_PUBLIC_SITE_URL/confirm?next=/reset-password`.
- `GET /api/auth/user` -> `{user}`; `POST /api/auth/logout` -> `{success}`.
- `GET /api/auth/confirm?code&next` -> 302 `/error?reason=missing_code|invalid_code` or `next`.
- `GET /api/subscription` -> `{tier, websites_limit, websites_used, websites_remaining, trial_expires_at, trial_websites_requested, is_trial_expired, can_scan}`; 401/500.
- `GET /api/scans/limit` -> `{tier (or 'trial_expired'), limit, current, limitReached, trialExpired}`; 401/500.
- `POST /api/plan-request` `{email, phone?, plan:'starter'|'pro', websites, url?, notes?, sourceUrl?}` -> 201 `{success}` | 400 | 500. Uses `SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY` (bypasses RLS), `upsert onConflict 'email,plan'`.
- External: Supabase Auth + Postgres; Calendly link; no Stripe, no email provider (confirmation/reset emails come from Supabase).
- Env: `NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL`, `NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY`.

## Data model (all inferred; schema not in repo)
- `auth.users` (Supabase managed).
- `user_subscriptions`: `user_id`, `tier` (text), `websites_limit` (int), `trial_expires_at` (timestamptz, null), `trial_websites_requested` (read only in `subscription/route.ts:24`).
- `user_websites`: `id`, `user_id`, `domain`, `url`, `last_scanned_at`; count of rows per user = "websites used".
- `plan_requests`: `email, phone, plan, websites, url, notes, source_url`; unique constraint on `(email, plan)` must exist for the upsert to work (inferred). Not read anywhere in the app (no admin UI).
- RLS policies are unknown; routes rely on user-scoped anon client (rows must be filtered by RLS or the explicit `.eq('user_id')`).

### Tier names in code
| tier | where |
|---|---|
| free | default row `tier:'free', websites_limit:1` (`subscription/route.ts:31-35`, `scans/route.ts:167-171`); Navbar/dashboard badge grey; scan page copy (`scan/page.tsx:250-253`); Navbar default label "Free" (`Navbar.tsx:189`) |
| trial | `tier==='trial'` + `trial_expires_at` expiry check (`subscription:59`, `scans/limit:49`, `scans/route.ts:199`); badge blue; HeroSection "Request a 60-day trial" (`HeroSection.tsx:104`); nothing in repo ever sets `trial` or `trial_expires_at` (manual DB edit, inferred) |
| trial_expired | synthetic value returned by `/api/scans/limit:57` and `scans/route.ts:213`; not stored |
| starter | plan-request key (`plan-request:31`), pricing `tier:'starter'` = Gladiator ($39, 1 site) (`PricingSection.tsx:8-54`), Navbar badge green (`Navbar.tsx:175`) |
| pro | plan-request key, pricing = Centurion ($99, 3 sites, expert session) (`PricingSection.tsx:56-107`), badge purple; also default form tier |
| business | Navbar badge orange only (`Navbar.tsx:179`); no plan, no limit defined |
| agency | Navbar + dashboard badge red only (`Navbar.tsx:181`, `dashboard/page.tsx:84`); no plan |
| expert | not a tier; "expert session" feature text only (`PricingSection.tsx:100`) and ask-ari `is_expert` comments |
| Gladiator / Centurion | marketing names only, in `PricingSection`, `PreorderForm.tsx:11-30`, `scan/page.tsx:249-253`. The badge shows the raw key capitalised ("Starter"/"Pro"), so users never see their purchased name (`Navbar.tsx:188-191`) |

## Business rules & limits
- Free: 1 website (domain). Starter: 1, Pro: 3 per pricing copy (but actual `websites_limit` is whatever the DB row says; no code maps tier -> limit). Pricing says "unlimited scans": limits count distinct domains, not scans.
- Enforced only in `POST /api/scans` (`scans/route.ts:136-255`): existing domain always allowed (re-scan); new domain blocked with 403 `SCAN_LIMIT_REACHED` / `TRIAL_EXPIRED`. Trial expiry is checked only for NEW domains, so an expired trial can still re-scan its existing site (`scans/route.ts:197,262`).
- Trial = 60 days (copy only; duration lives in DB data). Trial expiry is not enforced for `can_scan` on tiers other than `trial`.
- Paid plans: 6-month period, price copy only; no expiry/renewal field is read for starter/pro.
- Password min length 6 (HTML `minLength` only, plus Supabase setting).
- No rate limiting on any auth or plan-request route (relies on Supabase's own limits).
- Free-tier "demo" in pricing copy refers to the free scan.

## Error handling & edge cases
- `AuthModal.getFriendlyError` maps status->message by mode; falls back to offline/5xx/generic (`AuthModal.tsx:10-59`). Signup 400 always shows "password must be at least 6 characters" even for other errors (`:43-44`) unless server `message` is human-readable.
- Login/reset/update-password return `{error}` but the modal reads `data.message`, so Supabase's messages are discarded for those modes (`AuthModal.tsx:19`; routes return `error`).
- `AuthProvider` swallows fetch errors -> logged-out state (`:24-26`). 401 only console.warns (`axios.ts`).
- Subscription lookup failure (any error, not only not-found) triggers an insert of a free row (`subscription/route.ts:29-35`); insert result is not checked.
- `reset-password` page: `if (error) throw error` reads stale state (always null); axios errors surface as generic "Request failed with status code 400" (`reset-password/page.tsx:27,35-37`).
- `PreorderForm` handles 409 / "duplicate" (`:89`) but the API upserts, so duplicate never returns 409: repeat requests silently overwrite the previous row and show success.
- `/error` page is the redirect target of `/api/auth/confirm`; existence not verified in this review.

## Known issues / risks
1. Signup duplicate check queries `.from('auth.users')` via PostgREST with the anon client (`signup/route.ts:10-14`): the `auth` schema is not exposed, this always returns null/error; the real guard is the `identities.length===0` check (`:38`). Dead/misleading code.
2. Open redirect: `/api/auth/confirm` redirects to attacker-controlled `next` resolved with `new URL(next, req.url)` (`confirm/route.ts:8,26`); `//evil.com` or absolute URLs are honored. Validate `next` starts with a single `/`.
3. Tokens leaked in JSON: `login/route.ts:20-22` returns access and refresh tokens to JS; unnecessary given cookie session, enlarges XSS impact.
4. No rate limiting / CAPTCHA on `/api/auth/*` and unauthenticated `/api/plan-request` (service-role write, spam/DB-fill; no length caps; `Number(websites)` not validated, could be NaN/negative/huge; email format not validated server-side) (`plan-request/route.ts:22-47`).
5. `plan-request` upsert overwrites previous request on same email+plan (notes/phone lost) and hides duplicates (see above); anyone can overwrite another person's request by email (no verification).
6. `verify-email` relies on `getSession()` of the browser client; with the server-cookie flow and a PKCE `?code` link arriving at `/verify-email` (no code exchange there), verification likely shows "Invalid or expired" even when valid (`verify-email/page.tsx:19`); `emailRedirectTo` bypasses `/confirm`. Needs testing (unverified).
7. Limit enforcement is a non-atomic count-then-insert (race lets concurrent requests exceed limit), and website insert errors are ignored so scan proceeds (`scans/route.ts:262-277`). Expired trial can still re-scan existing domain.
8. Tier is never mapped to a limit in code: tier and `websites_limit` can disagree; Navbar badges `business`/`agency` and copy in `scans/route.ts:211,241` still say "Upgrade to Pro" while UI says Centurion (naming drift: starter/pro vs Gladiator/Centurion; scans route 211/241/`scan/page.tsx:249` messages).
9. Usage bar divides by `websites_limit` (`Navbar.tsx:194-196`): limit 0 -> NaN/Infinity.
10. `PreorderForm` shows "No credit card required" (`:270`) while pricing quotes $39/$99 per 6 months: no payment is ever taken; no way to grant tier from a request (manual DB work, no admin tool).
11. Auto-popup of PreorderForm with default tier `pro` on first visit (`PreorderProvider.tsx:17-35`) records requests as Centurion without the user choosing.
12. `browser.ts` throws at import if env missing and is a second, non-cookie-synced client; mixed import aliases (`@ariclear/lib`, `@/lib`, relative) increase breakage risk.
13. Duplicated tier-badge logic in `Navbar.tsx:168-191` and `dashboard/page.tsx:70-94`; `Auth/index.ts` empty.
14. Support email `slavo@slavo.io` hard-coded in pricing (`PricingSection.tsx:307`); Calendly URL duplicated in Navbar and form.
15. No tests; schema/RLS/migrations not in repo.

## Improvement opportunities
1. (P0) Sanitize `next` in `/api/auth/confirm`; stop returning tokens from login; add server-side validation (zod) and rate limiting/CAPTCHA to plan-request and auth routes.
2. (P0) Commit Supabase migrations (tables, unique `(email,plan)`, RLS, `plan_requests` policies) to the repo.
3. (P1) Single `lib/plans.ts` source of truth: tier key -> display name (Gladiator/Centurion), `websites_limit`, price, period, features; use in Pricing, Form, Navbar badge, dashboard, scan page, limit messages. Remove `business/agency/expert` or define them.
4. (P1) Fix verify-email flow (route through `/confirm` or handle `code`), fix error key mismatch (`error` vs `message`) across routes/modal.
5. (P1) Make limit check atomic (DB function/unique constraint + trigger), apply trial expiry to re-scans, and add `plan_expires_at` for 6-month plans.
6. (P2) Don't use upsert to hide duplicates: insert with status column (`new/contacted/converted`), return 409, send notification (email/Slack) to owner; add admin view.
7. (P2) Remove dead `auth.users` lookup; consolidate `subscription` and `scans/limit` into one helper; replace console.log noise in scans route.

## What is needed to wire Stripe
1. Stripe products/prices: Gladiator ($39) and Centurion ($99) as 6-month fixed-term (recurring `interval=month, interval_count=6`) or one-time payments with manual expiry; store price IDs in env (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`), plus `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
2. DB: add to `user_subscriptions` `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end` (or `plan_expires_at`), `cancel_at_period_end`; table `stripe_events` for idempotency.
3. `POST /api/billing/checkout` (auth required): create/reuse customer, Checkout Session with `client_reference_id=user.id`, metadata plan key; success/cancel URLs. `POST /api/billing/portal` for Billing Portal.
4. `POST /api/stripe/webhook` (raw body, signature verify, service-role client): handle `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted`; set `tier` ('starter'/'pro'), `websites_limit` (1/3 from the plan map), period end; on lapse set tier back to `free`/limit 1.
5. Replace PreorderForm CTA on `PricingSection` (`handleSelect`) with: logged-out -> AuthModal then checkout; logged-in -> checkout. Keep form as fallback/"contact us".
6. Make limit code read period expiry for paid tiers (`scans/route.ts`, `subscription`, `scans/limit`) and map tier -> limit centrally; add "manage billing" to Navbar dropdown; show purchased name.
7. Migrate existing `plan_requests` rows manually; reconcile users who were hand-granted tiers/trials.
8. Update copy ("No credit card required", "We'll reach out") and add tests for webhook idempotency.

## Open questions
- Who/what creates `trial` rows and sets `trial_expires_at` / `trial_websites_requested`? (No code does; trigger/manual?)
- Is there a DB trigger creating `user_subscriptions` on signup, and are RLS policies on `user_subscriptions`/`user_websites` restricting inserts (users can insert their own row with arbitrary `tier`/`websites_limit` if RLS allows: `subscription/route.ts:31`)?
- Is a unique constraint on `plan_requests(email,plan)` present; who reads that table and how are paid tiers granted today?
- Does `/error` page exist; is email confirmation required in Supabase settings; does Supabase redirect allow-list include `/verify-email` and `/confirm`?
- Does `PreorderProvider` first-visit popup and Navbar "early access" intentionally default to Centurion?
