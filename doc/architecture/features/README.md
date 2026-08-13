# AriClear — Feature Docs

One doc per feature. Each follows the same template: purpose, user flow, files, data flow/API, data model, business rules, error handling, known issues, improvements, open questions. Written from the code at commit `6e02431`; nothing was run, and the Supabase schema/RLS is not in the repo, so table details are inferred.

| # | Feature | Doc | State | Top issue |
|---|---|---|---|---|
| 1 | Landing page, demo scan, waitlist | [01](01-landing-and-demo-scan.md) | Works | Demo returns the "gated" AI score and real hidden-issue count in JSON; SSRF; spoofable in-memory rate limit; leads split across two tables |
| 2 | Core website scan + results + PDF | [02](02-website-scan-core.md) | Works | `/api/analyze` unauthenticated, no SSRF guard, quota checked *after* the OpenAI call; server trusts client-sent report; severity/category are invented in the UI |
| 3 | History, dashboard, saved scans | [03](03-history-dashboard-saved-scans.md) | Partly | No trend tracking exists; checklist progress is never saved; dashboard expects fields the API doesn't return |
| 4 | Auth, accounts, tiers, plan requests | [04](04-auth-accounts-plans.md) | Partly | No code maps a tier to limits or grants a paid tier; open redirect in `/api/auth/confirm`; login returns tokens in JSON |
| 5 | Website monitor | [05](archive/05-website-monitor.md) | **Removed** | One-shot manual check, nothing stored or scheduled; not gated; open proxy |
| 6 | Brand awareness | [06](06-brand-awareness.md) | **Parked** (hidden, login required) | No auth or rate limit (spends Anthropic credits); `max_tokens` 2500 risks truncated JSON; results not saved; not gated |
| 7 | Ask Ari expert Q&A | [07](archive/07-ask-ari-expert-qa.md) | **Removed** | Imports `supabaseAriClear` from `@/lib/video` (not exported) and the admin toggle calls a route that doesn't exist; no quota for "expert sessions" |
| 8 | AI recap video | [08](archive/08-ai-recap-video.md) | **Removed** | Gemini returns 5 scenes, image step requires exactly 4; composition ignores images and style; render not viable on serverless; no gating or quota |

## Cross-cutting findings

1. **Nothing is tier-gated server-side.** Brand awareness, monitoring, PDF, video and Ask Ari are all reachable by anyone, including logged-out users. The pricing page promises them to Centurion.
2. **No billing path.** No Stripe, no code that sets a paid tier, and tier names disagree across files (free/trial/starter/pro/business/agency/expert vs Gladiator/Centurion).
3. **Every server-side fetch is SSRF-exposed** (features 1, 2, 5, 6).
4. **Three paid-AI endpoints are open** (`analyze`, `demo-scan`, `brand-awareness/analyze`).
5. **Features that look finished but aren't:** trend tracking (3), monitoring (5), recap video (8), Ask Ari admin toggle (7).

## Bugs fixed (Oct 2026)
- `app/ask-ari/page.tsx` — now imports `supabaseAriClear` from `@/lib/supabase/auth/browser`; admin toggle now calls the existing `/api/admin/status`.
- `app/api/auth/confirm/route.ts` — `next` redirect restricted to same-site relative paths.
- `app/api/video/render/route.ts` — removed the Replicate image step (the composition never used the images and the step failed on 5 scenes vs 4 prompts). Also removes the ~11s-per-image delay and the image spend. `lib/video/generateImages.ts` is now unused.
- `app/api/scans/route.ts` GET — honours `?limit=` (max 100) and returns `status` and `issues_found` for the dashboard.

Not fixed (out of scope for the bug pass): everything under "Cross-cutting findings".

## Security hardening + copy/tier cleanup (Oct 2026)
- New `lib/security/safeFetch.ts`: SSRF-safe fetch (http/https on 80/443 only, public IPs only incl. IPv4-mapped IPv6, redirects re-validated, 10s timeout, 1–2 MB cap). Now used by `analyze`, `demo-scan`, `check-site` and the brand-awareness scraper. Residual risk: DNS rebinding race (documented in the file).
- New `lib/security/rateLimit.ts`: best-effort in-memory limiter (per instance; only slows abuse on serverless). Real protection is auth; move to Upstash/Supabase when traffic grows.
- `analyze`, `brand-awareness/analyze`, `check-site` now **require a signed-in user** and are rate limited per user. Brand and monitor pages show a sign-in/limit message instead of a silent failure. `demo-scan` stays public (3/min, 15/day per IP).
- New `lib/plans.ts`: one place for tier labels/badges (`starter` = Gladiator $39, `pro` = Centurion $99, per 6 months). Navbar and dashboard use it.
- Stale copy removed: "60-day trial", "invite-only", "free full report", "Request Trial", "Upgrade to Pro" (UI + API messages).
- Still true after this pass: no plan limits are enforced server-side and there is no billing (see cross-cutting findings above). Signed-in users still get the legacy 1-website free tier in the backend.

## Cleanup executed (Oct 2026)
Per [feature-audit.md](../../business/feature-audit.md):
- **Removed:** AI recap video (`app/api/video`, `lib/video`, `remotion/`, video UI in `scan/[id]`, auto-render in `scan/page.tsx`), Ask Ari (`app/ask-ari`, `app/api/ask-ari`, `app/api/admin`), Website monitor (`app/website-monitor`, `app/api/check-site`). Navbar now links to a paid "Expert review" booking link instead.
- **Dependencies dropped (8):** `remotion`, `@remotion/{bundler,cli,renderer}`, `replicate`, `cloudinary`, `@google-cloud/text-to-speech`, `@google/generative-ai`. Lockfile regenerated (-2,479 lines). `next.config.ts` no longer needs `serverExternalPackages`.
- **Env vars no longer needed:** `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, `CLOUDINARY_*`, Google TTS credentials.
- **Parked:** Brand Awareness (hidden from nav/pricing).
- **Pricing copy:** removed uptime monitoring, Brand Awareness, expert-sessions-per-month; added "Add-on: 30-min expert review" and "Early access: AI visibility check (coming soon)" on Centurion.
- **Config fix:** removed invalid `ignoreDeprecations: "6.0"` from `tsconfig.json` (broke `next build` on TypeScript 5.9).
- **Verified:** `tsc --noEmit` clean and `next build` succeeds (28 routes).
- **Not done (still in DB):** tables `video_jobs`, `questions`, `comments`, `admin_users` — export/check for real data, then drop. `/dashboard` kept for plan/usage info (merge into history later).
