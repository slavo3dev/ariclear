# Brand Awareness Evaluator

## Purpose
A form-driven brand audit: the founder describes the business, target audience, website and social handles, and Claude returns a strict 6-metric scorecard (brand clarity, engagement quality, content consistency, human readability, AI readability, website match), a top-3 "killers" list and 3 quick wins. Pricing lists "Brand Awareness tool" under Centurion (`pro`) (`app/components/section/PricingSection.tsx`, features list). The Navbar labels it "One-time" (`Navbar.tsx:421-423`, `:572-574`), which is a different claim from the pricing page.

## User flow
1. User opens `/brand-awareness` (Navbar "Tools" section, `Navbar.tsx:409`). No auth or tier check on the page.
2. Fills: business name (required), website URL (optional, plain text input), description (required, textarea), target audience (required), six optional social handle fields (`page.tsx:332-425`). A live counter shows `n/2000 · min 30 characters`.
3. Submit button is disabled while loading or when the description is under 30 chars (`page.tsx:437`). The label says "this takes ~15 seconds".
4. `POST /api/brand-awareness/analyze` with the whole form (`page.tsx:262-266`). On non-OK it throws `result.error` and shows it in a red box above the button (`:270-278`, `:428-432`).
5. On success the form is replaced by results (`page.tsx:456+`): overall score ring and severity, executive summary, Top 3 Killers, Quick Wins, score breakdown bars, three `MetricCard`s, then custom cards for Human Readability, AI Readability (entity extraction grid), Website Match, per-platform risks, and "Run New Analysis" (resets form, `:283-288`).
6. Result exists only in React state. Reload/navigation loses it; there is no save, PDF or history.

## Files & responsibilities
| path | role | size |
|---|---|---|
| `app/brand-awareness/page.tsx` | Client form + results UI; duplicates the response types (comment "mirrors route exactly") | 773 lines |
| `app/api/brand-awareness/analyze/route.ts` | Validation, website scraper, prompt builder, Claude call, JSON parse/validate, score post-processing, error mapping | 624 lines |
| `app/components/layout/Navbar.tsx` | Navigation links only | n/a |

## Data flow & API
Request (`route.ts:11-26`): `{businessName, businessDescription, targetAudience, websiteUrl?, platforms:{instagram,facebook,twitter,linkedin,tiktok,youtube}}`.

Server steps (`POST`, `route.ts:441-624`, `runtime="nodejs"`):
1. `req.json()`, require three non-empty strings (400); description 30-2000 chars (400 with `errorCode` `DESCRIPTION_TOO_SHORT`/`DESCRIPTION_TOO_LONG`). Other fields are unvalidated.
2. Platform list: keys with non-empty values (`:477-483`). `platforms` is not null-checked (`Object.entries(undefined)` would throw -> falls into the generic 500).
3. If `websiteUrl`: `scrapeWebsite` (`:99-160`): prefix `https://` if it does not start with "http"; fetch with 8 s abort, UA `AriClear-BrandBot/1.0`, `Accept: text/html`, redirects followed. Non-OK -> null. Extracts `<title>`, meta description, og:description by regex; strips script/style/nav/footer/svg/tags; keeps first 3000 chars of text. Returns a text blob or null.
4. `buildSystemPrompt` (`:209-437`): injects business fields and the scraped content (or "could not be scraped"/"none provided") into the system prompt, with scoring bands (Critical <40 ... Excellent 90+), deduction rules, 6 metric definitions, and a strict JSON output spec (see below). Rules: no website => `websiteMatch.score = 20`; unscraped => 30 (`:325-327`).
5. Claude call (`:516-522`): `client.messages.create({model:"claude-sonnet-4-20250514", max_tokens:2500, temperature:0.1, system, messages:[{role:"user", content: JSON.stringify(inputs)}]})`. Client built at module load with `ANTHROPIC_API_KEY` (`:7`). No streaming.
6. Concatenate text blocks, strip ```json fences, `JSON.parse` (`:526-552`), then `isReportShape` (`:164-205`).
7. Post-processing: recompute the mean of the 6 component scores; if the model's `overallScore` differs by more than 5, replace it (`:564-577`). Severity is overwritten from the score: >=90 Excellent, >=80 Strong, >=70 Average, >=55 Weak, else Critical (`:579-586`). Returns the report JSON (200).

Output JSON spec (`:335-425`): `overallScore`, `severityLevel`, `executiveSummary`; `brandClarity|engagementQuality|contentConsistency` each `{score, rating, summary, insights[], recommendations, redFlags[]}`; `humanReadability {score, rating, fiveSecondTest, fifthGraderTest, jargonDetected[], valuePropositionClarity, emotionalResonance, summary, recommendations}`; `aiReadability {score, rating, entityExtraction{businessCategory, targetCustomer, coreService, differentiator, location, priceSignal}, structuredDataReadiness, searchIntentAlignment, llmIndexability, summary, recommendations}`; `websiteMatch {score, rating, websiteScraped, heroMessageMatch, audienceSignalMatch, brandVoiceConsistency, missingOnWebsite[], websiteRedFlags[], summary, recommendations}`; `platformSpecific{platform: risk}`; `topThreeKillers[3]`; `quickWins[3]`.

External services: Anthropic Messages API; arbitrary third-party website (scrape). No Supabase.

## Data model
None. Nothing is persisted (inferred: the route and page contain no Supabase/DB calls, no logging of results beyond `console.log`). Business inputs and the full report are lost on reload. The only server-side trace is console logs (business name, score).

## Business rules & limits
- Tier gating: not enforced. The route has no auth/session read and no subscription lookup; the page has no guard. Any anonymous visitor can POST and spend Anthropic credits. The Centurion-only claim is not backed by code. Navbar says "One-time", which conflicts with both.
- No usage quota, no rate limit, no caching/dedup.
- Input limits: description 30-2000 chars only. `businessName`, `targetAudience`, handles, `websiteUrl` have no length limit.
- Scrape: 8 s timeout, 3000 chars of text kept. Output: `max_tokens` 2500.
- Scoring policy lives entirely in the prompt (strict scoring, "80% of businesses score below 55").

## Error handling & edge cases
- 400 validation errors (above); `req.json()` failure (invalid body) falls to the catch -> generic 500 `SERVER_ERROR`.
- Empty model output -> 500; unparsable JSON -> 500 "malformed data"; wrong shape -> 500 "unexpected format" (`:533-561`). No automatic retry.
- Anthropic errors mapped (`:592-624`): 429 -> 429 `RATE_LIMITED`; 401 -> 500 `AUTH_ERROR`; 529 -> 503 `OVERLOADED` (`retryable`); other statuses pass through the upstream status with the upstream `err.message` in the body (`:615`); otherwise 500.
- Scrape failures (non-OK, timeout, DNS) are swallowed and become "could not be scraped" -> the model is told to score 30; the UI shows "Website could not be reached".
- JS-rendered (SPA) sites yield little text from raw HTML, so a working site can be penalised as unscraped/empty.
- If output is truncated at 2500 tokens the JSON is cut and the request fails with "malformed data".
- Client: `result.json()` throws if the server returns non-JSON (e.g. platform timeout page) and the generic message appears.
- UI renders `metric.insights.map` etc. assuming the validated shape. `isReportShape` does not check `humanReadability.rating`, `aiReadability.rating/recommendations`, `websiteMatch.rating` or the `platformSpecific` value types, so a missing field there would render `undefined` or crash UI pieces such as `.length` on missing arrays (`jargonDetected` and `websiteMatch` arrays are checked; `aiReadability.entityExtraction` is only checked for truthiness).

## Known issues / risks
1. Unauthenticated paid LLM endpoint (`route.ts:441`, no auth anywhere): cost-abuse / denial-of-wallet risk; no rate limit.
2. Pricing/enforcement mismatch: pricing says Centurion only (`PricingSection.tsx`), Navbar says "One-time" (`Navbar.tsx:421`), the code enforces nothing.
3. SSRF in the scraper (`route.ts:99-118`): user-controlled `websiteUrl`, redirects followed, no private-IP/loopback/metadata blocking. Unlike `/api/check-site`, the response body content (title, meta, 3000 chars of text) is passed to the model and its analysis is returned to the user, so internal HTML (e.g. cloud metadata or admin pages that return HTML) can be exfiltrated in paraphrase/quotes (the prompt asks the model to quote website text). Higher impact than a blind SSRF. The `startsWith("http")` check (`:102`) also treats `httpfoo.com` as a full URL.
4. Prompt injection: scraped site text and the user's description are interpolated directly into the system prompt (`:222`, `:244-253`); a hostile page can alter scores or the output.
5. Hard-coded dated model `claude-sonnet-4-20250514` (`:517`): will be deprecated; not configurable by env.
6. `max_tokens: 2500` is tight for the 6-section schema (many long strings); truncation causes a hard failure with no retry (`:546-552`).
7. Server overrides the model's `severityLevel` with its own bands (`:581-586`) that differ from the prompt's bands (prompt: 70-79 "Good", 40-54 "Weak"; code has no "Good" and uses Average for 70-79, Weak for 55-69, Critical <55). Prompt bands (<40 Critical, 40-54 Weak, 55-69 Average, 80+ Strong) disagree with the code (<55 Critical, 55-69 Weak, 70-79 Average). Users see a harsher label than the documented scoring philosophy, and the executive summary text may not match the label.
8. Score sanity: the prompt says websiteMatch "counts fully" in a weighted average, but the code uses a plain mean (`:572-574`), and the individual scores are never clamped to 0-100, so out-of-range values pass through (the UI bar uses `width: ${score}%`).
9. Error leakage: `Analysis service error (${err.status}): ${err.message}` returns upstream messages to the client (`:615`).
10. Prompt text says "no website in 2025" (`:326`) and hard-codes marketing claims ("paying user"); stale and may be shown in outputs.
11. UX: UI says "~15 seconds" but there is no server `maxDuration` export (`route.ts`); on serverless hosts with a short default timeout, scrape (up to 8 s) plus a 2500-token generation can exceed the limit and return a non-JSON error.
12. Types are duplicated in the page and route (`page.tsx:6-92`) and can drift.
13. `platformSpecific` is only generated for platforms in the prompt's active list, but the validator accepts any object (even empty).
14. `emoji console.log` of business name (`:474`, `:588`) logs user-provided data (privacy minor).

## Improvement opportunities
1. (P0) Require auth + active Centurion tier (or define a free-trial allowance if "One-time" is intended) and add a per-user rate limit and daily quota before calling Anthropic.
2. (P0) Share a safe-fetch helper with the monitor: scheme allow-list, DNS resolution with private/link-local IP denial, manual redirect validation, response size cap (e.g. 1 MB), content-type check.
3. (P1) Persist results (e.g. a `brand_analyses` table: user_id, inputs, report jsonb, scores, created_at) so users can revisit, compare over time and export PDF; ties into "scan history" promised in plans.
4. (P1) Raise `max_tokens` (e.g. 4000-6000), consider tool-use / JSON schema structured output or a prefilled `{` to remove fence/JSON parse fragility, and add one retry on parse/shape failure.
5. (P1) Reconcile severity bands between prompt and code; clamp scores to 0-100; fully validate the shape (e.g. with zod) and share types between route and page.
6. (P1) Move model name to env/config; set `export const maxDuration`.
7. (P2) Delimit untrusted content in the prompt (XML tags, "treat as data") and move user inputs out of the system prompt; consider rendering JS sites via a headless service or fetching `/sitemap`, JSON-LD (the AI-readability metric currently never looks at structured data despite scoring it).
8. (P2) Cache by (url, description hash) to reduce cost; add a loading skeleton with real progress.

## Open questions
- Intended gating: Centurion-only (pricing), "One-time" purchase (Navbar), or free? Nothing in the code decides.
- Is the page protected by a wrapper layout or middleware outside the listed files? No `middleware.ts` exists at the project root (checked), and `app/layout.tsx` was not part of this review.
- Deployment host and function timeout (affects the 15 s UX and SSRF exposure) are unknown.
- Whether Anthropic spend limits/alerts exist on the API key is not visible from the code.
