# Core Website Scan (Human Clarity + AI-SEO, results UI, save, PDF export)

## Purpose
Core product loop. A logged-in user submits a homepage URL; the server fetches the page, an LLM scores it on two axes (Human Clarity, AI-SEO/AI Comprehension) and returns diagnosis, rewrite copy, an action plan and a paste-ready prompt. The result is rendered, persisted to Supabase (`scans`), counted against a per-user website quota, and the user is redirected to the saved scan page. A client-side PDF report, text checklist export and share link are offered from the results component. This is the main free-tier hook and the gate to upgrade (Centurion / preorder).

## User flow
1. `/scan` (client page, `app/scan/page.tsx`). If auth finished and no `user`, `AuthModal` opens; closing it without login redirects to `/` (page.tsx:404-415).
2. When a user exists, `GET /api/scans/limit` is called to show "x / y websites used" and block input if `limitReached` (page.tsx:389-411, 716-761). (Limit route is outside this feature's file list; read for context.)
3. URL is trimmed and validated client-side as http(s) (page.tsx:72-79). Analyze button disabled if invalid/loading/at limit/no user. Enter key triggers analyze.
4. `POST /api/analyze {url}` shows a full-screen fake-progress overlay (5 time-based steps, 2.2s each, not tied to real progress; page.tsx:99-231).
5. Non-OK handling: 429 -> RateLimitBanner; 403 + `requiresUpgrade` -> limit banner (analyze never returns this; dead path); other -> generic banner + toast (page.tsx:432-453).
6. On success, result is set, then `POST /api/scans {analyzeResult, url}` saves it. On 201: toast "Scan saved!", fire-and-forget `triggerVideoRender` (`/api/video/request` then `/api/video/render`, page.tsx:336-359), and `router.push('/scan/{id}')`. If save returns 403 + `requiresUpgrade`, the limit banner is shown and the result is hidden (`result && !isAtLimit`, page.tsx:766). Other save failures are only `console.error`'d (silent; the user sees the unsaved result).
7. Before redirect (or when save fails) `transformToEnhancedResult` maps the report to the `ScanResult` view-model and `ScanResultsEnhanced` renders it (header score, 4 category tiles, buttons, human/AI cards, hero copy, priority issues, action plan, checklist progress, tabs, prompt box, CTA tiles).
8. Buttons in results: "Download PDF Report" (jspdf, in-browser), "Export Checklist" (.txt blob), "Share Results" (Web Share API or copy `window.location.href`).

## Files & responsibilities
| path | role | size |
|---|---|---|
| app/scan/page.tsx | Page: auth gate, limit status, analyze + save orchestration, overlay, banners, report-to-view-model transform | 783 lines |
| app/api/analyze/route.ts | Fetch URL, extract text (cheerio), call OpenAI, validate shape, return report JSON | 261 lines |
| app/api/scans/route.ts | `GET` list user scans (filter/sort); `POST` enforce website limit, upsert `user_websites`, insert `scans` | 363 lines |
| app/components/ScanResultsEnhanced/scan-results-enhanced.tsx | Results UI, local checklist state, jsPDF report, checklist export, share | 1209 lines |
| app/components/ScanResultsEnhanced/index.tsx | Re-export (`export * from "./scan-results-enhanced"`); re-exported via `app/components/index.ts:8` and alias `@ariclear/components` (tsconfig.json:21) | 1 line (file is 39 bytes, no trailing newline) |
| lib/api/axios.ts | Axios instance (`baseURL /api`, `withCredentials`), 401 interceptor only logs. NOT used by the scan flow (which uses `fetch`); used by AuthModal, AuthProvider, reset-password | 17 lines |

## Data flow & API
**POST /api/analyze** (`runtime = "nodejs"`, analyze/route.ts:6)
- Request: `{ url: string }`. 400 if not http(s) URL.
- Server `fetch(url)` with UA `AriClearBot/0.1`, `Accept: text/html`, redirects followed, no timeout, no size cap (route.ts:83-89). Non-2xx -> 400 `Failed to fetch URL (status N)`.
- Extraction (cheerio, route.ts:19-39): `title`, meta description, first `h1`, first 6 `h2`, then removes script/style/noscript/svg/img and takes body text collapsed, truncated to 5000 chars (`bodySnippet`). Only the raw HTML is fetched (no JS rendering).
- LLM: OpenAI `chat.completions`, model `gpt-4o-mini`, `temperature 0.15`, `response_format json_object`; system prompt = rubric + schema; user message = `JSON.stringify({url, extracted})` (route.ts:190-201). `OPENAI_API_KEY` from env, client created at module load.
- Validation: `isReportShape` checks types of the fields below (not array element shapes, not 0-100 range; route.ts:41-67). Failure -> 500.
- Errors: OpenAI 429 -> 429 `{error, rateLimited:true}`; other OpenAI `err.status` -> same status with `OpenAI API error: <message>`; else 500.

**Rubric (system prompt, route.ts:103-130)**: strict/honest; "most sites score 20-55". Clarity: can a stranger answer what / who / next step in 5s. Bands 80-100 all three in hero; 60-79 need inference; 40-59 one or two missing; 20-39 vague/buzzwords; 0-19 unclear. Deductions: buzzwords, missing audience/offer/CTA, no proof. AI-SEO: can a crawler classify category and extract entities (product, industry, customer, location, pricing, use cases). Same bands (80+ explicit entities, strong headings, accurate meta, likely structured data; ... 0-19 unclassifiable). Deductions: missing/duplicate H1, mismatched meta, no category signal, no named product, no location for local business, generic claims. Output rules demand quoted page text, specific fixes, "where on the page" next steps. The model only sees title/meta/h1/h2/5000 chars of text, so claims about schema/OG/structured data are guesses ("likely present").

**Report JSON schema (exact, route.ts:147-187; no extra keys requested)**
```
{
 human: { clarityScore: number(0-100), whatItSeemsLike: string, oneSentenceValueProp: string,
          bestGuessAudience: string, confusions: string[](3-6),
          topIssues: [{ issue: string, whyItHurts: string, fix: string }](3-6, worst first) },
 ai:    { aiSeoScore: number(0-100), aiSummary: string, indexerRead: string,
          missingKeywords: string[](5-10), structuredDataSuggestions: string[](2-5) },
 copy:  { suggestedHeadline: string, suggestedSubheadline: string, suggestedCTA: string },
 plan:  { nextSteps: [{ title: string, impact: "high"|"medium"|"low",
          effort: "low"|"medium"|"high", details: string }](3-7) },
 prompts: { aiSeoPrompt: string }
}
```

**POST /api/scans** (scans/route.ts:75-363): Auth via Supabase server client `auth.getUser()` (401 otherwise). Body `{analyzeResult, url}`; 400 if missing/invalid URL. `overall_score = round((human+ai)/2)`, `domain = new URL(url).hostname`. Quota logic in "Business rules". Insert returns `{ scan: row }` with 201. Server trusts client-supplied `analyzeResult` (no re-validation).

**GET /api/scans**: `filter=recent` (last 7 days) | `low-score` (`overall_score < 70`); `sortBy=score` (desc) else `created_at` desc; returns `{ scans }`. No pagination.

**Client view-model** (`transformToEnhancedResult`, page.tsx:512-634): `score` = same average; `issues[]` from `topIssues`: `severity` assigned purely by index (0 critical, 1 high, 2 medium, 3+ low), `category` by keyword matching of text into security/privacy/performance/accessibility (default accessibility), `impact`=`fix`; `suggestions[]` from `nextSteps` (effort -> "1-2h/2-4h/4-8h") plus one per `structuredDataSuggestions` (truncated title at 50 chars, priority medium, "2-3 hours"); `rawData` carries the human/AI/copy/plan/prompt fields; `metadata.scannedAt = now`.

**PDF (jsPDF, client-side only)** (scan-results-enhanced.tsx:108-626): dynamic `import('jspdf')` and `import('jspdf-autotable')`; A4 portrait, text drawn with `doc.text` and manual `yPos` paging. Pages: (1) cover: overall score box, domain/url/date, human + AI score boxes, issue-severity table (autotable); (2) executive summary: human clarity then AI comprehension (page break when yPos>200/270); (3) suggested hero copy (headline/subheadline/CTA button graphic); (4+) detailed issues (title cut to 70 chars, severity colour, why/how, break at yPos>240); action plan with impact/effort badges; checklist table (autotable, label cut to 80, shows current checked state); final "Next Steps" page. Saved as `ariclear-report-<Date.now()>.pdf` via `doc.save`. Toasts show progress/success/failure.

## Data model (inferred; schema not in repo)
- `scans` (insert at scans/route.ts:290-327): `id`, `user_id`, `domain`, `url`, `overall_score`, `human_score`, `ai_score`, `human_clarity_description` (whatItSeemsLike), `human_value_prop`, `human_audience`, `human_confusions` (array/json), `ai_comprehension` (aiSummary), `ai_indexer_read`, `ai_missing_keywords` (array/json), `suggested_headline`, `suggested_subheadline`, `suggested_cta`, `action_plan` (json of nextSteps), `ai_prompt`, `issues` (json `[{id,issue,whyItHurts,fix}]`), `checklist` (json `[{id,label,checked:false}]`), `suggestions` (json of structuredDataSuggestions), `created_at` (read, ordering). Note `suggestions` column holds strings here, while the UI view-model "suggestions" is a different shape.
- `user_websites`: `id`, `user_id`, `domain`, `url`, `last_scanned_at`.
- `user_subscriptions`: `user_id`, `tier` (`free`|`trial`|other), `websites_limit`, `trial_expires_at`.
- RLS is presumed (queries rely on user-scoped client plus explicit `user_id` filters); unverified.

## Business rules & limits
- Auth required for `/api/scans` (401) but NOT for `/api/analyze` (no auth check in route; only the page UI gates it).
- Quota counts distinct `user_websites` rows (domains), not scans. Re-scanning an existing domain is unlimited and just updates `last_scanned_at`.
- New domain: no subscription row -> auto-insert `free`, limit 1; else `count >= websites_limit` -> 403 `SCAN_LIMIT_REACHED` with `requiresUpgrade`. `tier==='trial'` past `trial_expires_at` -> 403 `TRIAL_EXPIRED` ("60-day trial"). Trial expiry is only checked when adding a NEW domain; expired trial users can still re-scan existing domains.
- Tier names in code: `free` (1 site), `trial` (60 days, limit from DB), anything else uses `websites_limit` ("Contact us to expand"). UI calls the paid plan "Centurion"; upgrade buttons open the preorder modal, not checkout.
- PDF, checklist export and share are NOT tier-gated: available to every user who can see results (no tier check anywhere in ScanResultsEnhanced).
- Rate limiting: none in code. The "wait 60 seconds" banner only reflects OpenAI 429s.
- Checklist ticks are local React state, not persisted (the saved `checklist` column is never updated from this component).

## Error handling & edge cases
- Invalid URL: client message + 400s server-side. Fetch failure/non-2xx (bot-blocked sites): generic "Failed to fetch URL (status N)"; page warns about Cloudflare/e-commerce.
- Empty/invalid JSON/wrong shape from model -> 500 with specific message; no retry.
- Save failures other than 403 are swallowed (page.tsx:491-493); a failed `user_websites` insert is logged and ignored (scans/route.ts:270-273), so the quota can be bypassed if that insert fails.
- `existingWebsite` lookup uses `.single()` and ignores its error; a duplicate-row error is treated as "not existing".
- Auto-created subscription insert result is not checked (route.ts:167).
- Network error -> toast + generic banner.
- Empty `index.tsx` concern: it is only the one-line re-export, fine.

## Known issues / risks
1. SSRF (security, high): `/api/analyze` fetches any user-supplied http(s) URL server-side with no private-IP/localhost/metadata (169.254.169.254) block, no redirect restriction (analyze/route.ts:83-89). Also unauthenticated.
2. Unauthenticated, un-rate-limited LLM endpoint (cost/abuse): anyone can POST to `/api/analyze` and burn OpenAI credits; auth is enforced only on save (analyze/route.ts:69-231). Quota is checked AFTER the LLM call, so over-limit users still incur cost (page only pre-checks via limit endpoint client-side).
3. No fetch timeout/size cap/content-type check: `res.text()` of large or non-HTML responses can hang or exhaust memory (route.ts:98).
4. Prompt injection: page text is passed straight to the model; the output (incl. `aiSeoPrompt`) is stored and later displayed/pasted. Output rendered as text in React (no XSS), but the user-copied prompt could carry injected instructions.
5. `/api/scans` POST trusts client-supplied `analyzeResult` (scans/route.ts:96-97): users can save forged scores/content; scores aren't clamped 0-100; array fields unvalidated (jsonb size unbounded).
6. Quota race: count-then-insert is not atomic (route.ts:222-266); parallel requests can exceed the limit. Relies on missing DB unique constraint on (`user_id`,`domain`) (unknown).
7. Domain keyed on `hostname` so `www.x.com` vs `x.com` count as 2 websites (route.ts:125).
8. Fabricated severity/category in view-model: severity is by index only (page.tsx:559-561) and category by keyword guess (517-554), so "Critical/Security/Privacy" tiles and PDF counts are not real signals; defaults to "accessibility". Tiles for security/privacy are misleading for a clarity tool. Saved scan DB rows have no severity/category, so `/scan/[id]` rendering may differ (unverified).
9. Scoring reliability: single `gpt-4o-mini` call, no seed, based on 5000 chars of raw HTML text (SPAs render near-empty); schema/structured-data/meta-OG claims are not verified from JSON-LD/meta tags (not extracted). Scores not reproducible; rubric says "most sites 20-55", biasing output.
10. Verbose `console.log` of user IDs, subscription rows and full AI shapes in production (scans/route.ts:10-18, 87, 146-160; analyze route:80,101).
11. PDF: emoji glyphs (`⚠️ ✓ ☐ 🎉`) in jsPDF default Helvetica will not render correctly (scan-results-enhanced.tsx:189-192, 406, 560); `doc.rect(..., 0)` zero-height "borders" draw nothing meaningful (339, 425); long single-line text without `splitTextToSize` (e.g. audience at :256, CTA :384, step title :496) can overflow; issues loop page-breaks at fixed 240 so long descriptions can overflow the page; `@types/jspdf` is a deprecated stub alongside jspdf 4 (package.json:39); the `as any` cast and `autoTable` plugin side-effect import are fragile. `doc.autoTable` silently skipped if the plugin fails to attach (lines 195, 555).
12. Fake progress overlay (page.tsx:146-154) stalls on the last step and does not reflect real status; an LLM call may take longer than the whole animation. No `maxDuration` is set on the route, so Vercel default function timeout may kill long scans (unverified deployment).
13. Dead/inconsistent code: `lib/api/axios.ts` unused by scan flow; 403 `requiresUpgrade` handling after analyze (page.tsx:440) can never fire; share button shares `window.location.href` of `/scan` (not a shareable report URL) on the results-on-page view; `Resource` list never populated; comments in scan-results-enhanced.tsx:718-719 are leftover.
14. Result disappears when at limit: after a 403 on save the analysis result is hidden (`!isAtLimit`, page.tsx:766) so the user loses a scan they already paid LLM cost for.
15. `key={x}` for confusions/keywords (scan-results-enhanced.tsx:813, 850) breaks on duplicate strings. Checklist initial state is not synced if `results` prop changes.
16. No tests; `GET /api/scans` unpaginated `select('*')`.

## Improvement opportunities
1. (P0) Require auth + per-user/IP rate limit on `/api/analyze`; check quota BEFORE calling OpenAI (reuse limit logic as a shared helper).
2. (P0) SSRF guard: resolve DNS, reject private/loopback/link-local ranges, cap redirects, add `AbortSignal.timeout(~10s)`, `Content-Type` check and response size limit.
3. (P0) Move analyze+save into one server action/route: persist the server-generated report with its own validation (zod, clamp scores 0-100, cap array lengths) so clients cannot forge scans; return `scanId` directly.
4. (P1) Make quota atomic (DB function / unique index on `user_id,domain` + insert-then-check); normalise domain (strip `www.`); fail the request if `user_websites` insert fails.
5. (P1) Extract real signals (JSON-LD, OG tags, canonical, heading counts, lang, robots) deterministically and pass them to the model; compute severity from LLM-provided field instead of index; drop security/privacy/performance tiles or replace with clarity-relevant categories.
6. (P1) Handle save failure visibly (toast + retry); keep result visible on quota 403 with an upgrade CTA.
7. (P2) Fix PDF: embed a Unicode font or strip emojis, use `splitTextToSize` everywhere, page-break helper, brand colour tokens; consider server/streamed generation if tier-gating the PDF is desired (currently client-only, ungateable).
8. (P2) Decide tier policy for PDF/export and enforce server-side if it is a paid feature.
9. (P2) Replace fake overlay with streamed/real status; set `export const maxDuration`; use structured outputs (`json_schema`) instead of `json_object`; log sparingly with a logger; add tests for `isReportShape`, quota logic, `transformToEnhancedResult`.
10. (P3) Unify `fetch` vs axios; paginate `GET /api/scans`.

## Open questions
- Actual Supabase schema, RLS policies, constraints (unique on user_id+domain?), column types for jsonb arrays, and who creates `user_subscriptions`/trial rows (trial request flow not in scope files).
- How `/scan/[id]` (ScanResultsClient) renders saved scans and whether it reuses `ScanResultsEnhanced` or the same severity/category heuristics.
- Whether any middleware/proxy protects `/api/analyze` or applies rate limits (none seen in the files read).
- Deployment function timeout/region for the OpenAI call, and `/api/video/request|render` behaviour/cost (triggered automatically for every scan; not read).
- Whether paid tiers are intended to gate PDF export (no gating exists in code).
- Why `lib/api/axios.ts` is listed with this feature (not used by it).
