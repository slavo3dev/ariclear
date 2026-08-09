# AriClear — Feature Docs

One doc per feature. Each follows the same template: purpose, user flow, files, data flow/API, data model, business rules, error handling, known issues, improvements, open questions. Written from the code at commit `6e02431`; nothing was run, and the Supabase schema/RLS is not in the repo, so table details are inferred.

| # | Feature | Doc | State | Top issue |
|---|---|---|---|---|
| 1 | Landing page, demo scan, waitlist | [01](01-landing-and-demo-scan.md) | Works | Demo returns the "gated" AI score and real hidden-issue count in JSON; SSRF; spoofable in-memory rate limit; leads split across two tables |
| 2 | Core website scan + results + PDF | [02](02-website-scan-core.md) | Works | `/api/analyze` unauthenticated, no SSRF guard, quota checked *after* the OpenAI call; server trusts client-sent report; severity/category are invented in the UI |
| 3 | History, dashboard, saved scans | [03](03-history-dashboard-saved-scans.md) | Partly | No trend tracking exists; checklist progress is never saved; dashboard expects fields the API doesn't return |
| 4 | Auth, accounts, tiers, plan requests | [04](04-auth-accounts-plans.md) | Partly | No code maps a tier to limits or grants a paid tier; open redirect in `/api/auth/confirm`; login returns tokens in JSON |
| 5 | Website monitor | [05](05-website-monitor.md) | Thin | One-shot manual check, nothing stored or scheduled; not gated; open proxy |
| 6 | Brand awareness | [06](06-brand-awareness.md) | Works | No auth or rate limit (spends Anthropic credits); `max_tokens` 2500 risks truncated JSON; results not saved; not gated |
| 7 | Ask Ari expert Q&A | [07](07-ask-ari-expert-qa.md) | Likely broken | Imports `supabaseAriClear` from `@/lib/video` (not exported) and the admin toggle calls a route that doesn't exist; no quota for "expert sessions" |
| 8 | AI recap video | [08](08-ai-recap-video.md) | Broken as written | Gemini returns 5 scenes, image step requires exactly 4; composition ignores images and style; render not viable on serverless; no gating or quota |

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
