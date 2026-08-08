# Scan History, Dashboard, Saved Scan Detail and Scan CRUD

## Purpose
Lets a signed-in user revisit past website scans, see aggregate stats, open a saved scan, and delete scans. Deleting the last scan for a domain also frees that domain's "website slot", which is the unit the subscription tier limits (`user_websites` vs `user_subscriptions.websites_limit`). Scan creation (POST) is documented elsewhere.

## User flow
1. `/dashboard` (`app/dashboard/page.tsx`): client-side auth guard (`router.push("/")` if no user, :34-38). Fetches `/api/subscription` and `/api/scans?limit=5` (:48,:55). Shows a tier badge, a website-usage bar, a "can scan" indicator and a "Recent Scans" list, plus links to `/scan` and `/history`. The Settings tile only does `console.log` (:327-330). Recent scan rows are not links.
2. `/history` (`app/history/page.tsx`): auth guard (:71-74). On mount it fires `GET /api/scans`, `GET /api/scans/stats` and `GET /api/scans/limit` (:79). Changing the filter (`all`/`recent`/`low-score`) or sort (`date`/`score`) re-fetches `/api/scans` (:83-86). Scans are grouped client-side by `domain` (`groupByDomain`, :49). Each domain card shows the first scan in the array as "latest", a score pill with a letter grade, a bar, and the scan count. Actions: "Remove site", expand/collapse the scan list, and "View latest" linking to `/history/{id}`. Per-scan rows offer "Details" and "Delete".
3. Delete one scan: `confirm()`, then `DELETE /api/scans/{id}`. The row is removed locally. If `websiteSlotFreed` is true, the limit status is re-fetched (:128-156). Stats are re-fetched.
4. Remove site: `confirm()`, then a sequential `DELETE` for every scan of the domain (:170-172), then a local filter and a refresh of stats and limit (:159-185).
5. `/history/[id]` (`app/history/[id]/page.tsx`): client page. Reads `params` via `use(params)` (:23). Fetches `/api/scans/{id}` and, on any failure, toasts and redirects to `/history` (:48-60). It maps the DB row into the `ScanResultsEnhanced` prop shape (:134-186) and renders that shared component. This is the "legacy" detail view.
6. `/scan/[id]` (`app/scan/[id]/page.tsx`): server component. It builds a Supabase SSR client from cookies, calls `auth.getUser()` and redirects to `/` if there is no user (:64-67). It then loads the scan (`user_id`-scoped) and the latest `video_jobs` row, and renders `ScanResultsClient`. This is the page `/scan` redirects to after a scan (`app/scan/page.tsx:474`). `ScanResultsClient` shows the video player, three score rings, human clarity, AI comprehension, suggested copy, the action plan, a copyable AI prompt and `VideoCreatorPanel`. The "back" button goes to `/scan`, not history.

Note: the history list links only to `/history/[id]`, not `/scan/[id]`, so two different detail UIs exist for the same record.

## Files & responsibilities
| path | role | size |
|---|---|---|
| app/history/page.tsx | History list, grouping by domain, filters/sort, delete/remove-site, slot meter, stats tiles | 518 lines |
| app/history/[id]/page.tsx | Client detail view; adapts scan row to `ScanResultsEnhanced` | 203 lines |
| app/dashboard/page.tsx | Subscription card, usage, recent scans, quick links | 344 lines |
| app/scan/[id]/page.tsx | Server component detail page; scan and video_job fetch; exports `Scan`/`ActionStep` types | 113 lines |
| app/scan/[id]/ScanResultsClient.tsx | Presentational client UI for a scan plus video components | 356 lines |
| app/api/scans/[id]/route.ts | GET one, PATCH checklist, DELETE (with slot-free logic) | 210 lines |
| app/api/scans/stats/route.ts | Aggregate stats over all of the user's scans | 84 lines |
| app/api/scans/route.ts (GET, :5-72) | List scans with filter/sort | 363 lines total (POST is out of scope) |

Related (read for context): `app/api/scans/limit/route.ts`, `app/api/subscription/route.ts`, `app/components/ScanResultsEnhanced/scan-results-enhanced.tsx`.

## Data flow & API
All handlers use `supabaseAriClearServer()` (cookie session) and `auth.getUser()`. Unauthenticated requests get 401. Every query is scoped with `.eq('user_id', user.id)` in addition to whatever RLS exists.
- `GET /api/scans?filter=recent|low-score&sortBy=date|score` returns `{scans: Scan[]}` with `select('*')` and no pagination or limit (route.ts:33-64). `recent` means `created_at >= now-7d`. `low-score` means `overall_score < 70`. `sortBy=score` sorts descending; the default sorts by `created_at` descending. The `limit` param sent by the dashboard is ignored.
- `GET /api/scans/stats` returns `{stats:{totalScans, averageScore, uniqueDomains, totalIssues, recentScans, scoreDistribution{excellent>=90, good 70-89, needsImprovement<70}}}`. It loads all rows with `select('*')` and aggregates in JS (stats/route.ts:23-75). `recentScans` and `scoreDistribution` are returned but `/history` does not render them.
- `GET /api/scans/[id]` returns `{scan}`, or 404 / 401 (route.ts:5-58).
- `PATCH /api/scans/[id]` takes body `{checklist}` and runs `update({checklist})`, returning `{scan}` (:61-116). A missing checklist returns 400.
- `DELETE /api/scans/[id]` (:119-210): select `id, domain` to verify ownership (404 if missing), delete the scan, then count the remaining scans for that domain. If the count is 0, it deletes the `user_websites` row for `(user_id, domain)`. It returns `{success, websiteSlotFreed, domain}`.
- Dashboard also uses `/api/subscription` (returns `tier, websites_limit, websites_used, websites_remaining, trial_expires_at, is_trial_expired, can_scan`). History uses `/api/scans/limit` (`tier, limit, current, limitReached, trialExpired`).
- External: Supabase only. Favicons come from `https://www.google.com/s2/favicons` (history:394), a third-party request leaking the domains users scan.

## Data model (inferred; schema not in repo)
- `scans`: `id, user_id, domain, url, overall_score, human_score, ai_score, human_clarity_description, human_value_prop, human_audience, human_confusions[], ai_comprehension, ai_indexer_read, ai_missing_keywords[], suggested_headline, suggested_subheadline, suggested_cta, action_plan (jsonb: title/impact/effort/details), ai_prompt, issues (jsonb: id/issue/whyItHurts/fix), checklist (jsonb: id/label/checked), suggestions, created_at, updated_at`. Written in the POST at route.ts:290-327. `updated_at` is used by the history UI type only.
- `user_websites`: `id, user_id, domain, url, last_scanned_at`.
- `user_subscriptions`: `user_id, tier, websites_limit, trial_expires_at, trial_websites_requested`.
- `video_jobs`: `id, scan_id, user_id, status, cloudinary_url, error_message, created_at`.
- `scans.status` and `scans.issues_found` are used by the dashboard but are not written anywhere in POST, so they probably do not exist (see risks).

## Business rules & limits
- No page or API in this feature checks tier. Any authenticated user (free, trial, expired trial) can list, view and delete scans. The tier only drives display: the usage meters on `/dashboard` and `/history`, and the `can_scan` / `limitReached` flags.
- Website slot = one row in `user_websites` per distinct domain. It is freed when the domain's last scan is deleted (DELETE route :170-196) or via "Remove site".
- Scan limit enforcement lives in POST (out of scope). The `/api/scans/limit` and `/api/subscription` endpoints compute the same limits independently.
- No rate limits on any of these endpoints.
- Score bands are inconsistent: history uses 80/60 colours and A-F grades at 90/80/70/60 (history:195-207); stats uses 90/70; `/scan/[id]` uses 75/50 (ScanResultsClient:14-20); the low-score filter uses `<70`.

## Error handling & edge cases
- API errors return generic 500s. The `GET /api/scans` 500 includes `details: error.message`, which leaks DB error text (route.ts:59).
- A history fetch failure shows a toast and an empty list. A stats or limit failure is silently ignored.
- `removeSite` has no per-request check: `fetch(DELETE)` results are never checked for `res.ok` (history:170-172), so partial failure still shows "removed - slot freed" and removes all rows from local state.
- `/history/[id]` redirects to `/history` on any fetch error, including a transient network error, and logs debug output to the console (:46).
- `/scan/[id]` renders an inline "not found or no access" message (no redirect) when the query fails.
- After a delete, the last-scan check is a separate count query, so concurrent deletes can leave a stale slot or free it twice (benign). If the `user_websites` delete fails, the slot stays used and the response says `websiteSlotFreed:false`, so the UI shows only "Scan deleted".
- The domain "latest" scan on `/history` is `domainScans[0]`. That is correct only when sorting by date; with `sortBy=score` it is the highest-scoring scan, mislabelled as latest.
- Filtering by `low-score`/`recent` removes scans from groups, so counts and the "latest" shown are of the filtered subset.

## Known issues / risks
1. Trend/progress tracking does not exist. There is no comparison between scans of a domain: no deltas, no charts, no previous-score logic (greps for trend/previous/delta find nothing). The history subtitle "Track your website improvements over time" (history:247) is a claim without a feature. Aggregates in stats are global averages, not per-domain over time.
2. Checklist progress is not persisted. `PATCH /api/scans/[id]` exists, but no code calls it (grep of `app/` finds no `api/scans` PATCH caller). The checklist is `useState` initialised from `issue.fixed` (always `false`, history/[id]:152) in `scan-results-enhanced.tsx:88-108`, so progress is lost on reload. The `/scan/[id]` page does not show a checklist at all. The `checklist` column is created in POST (route.ts:319-325) but never read back.
3. Dashboard contract mismatch (dashboard:19-25, 54-58, 249-276). It expects `status`, `issues_found`, `url` and calls `/api/scans?limit=5`. The API ignores `limit` (downloads every scan with all text columns, then the client shows all of them, not 5), and `status` / `issues_found` are not in the returned data, so no status badge is shown. Recent items are not clickable.
4. Dashboard loading gate: `if (loading || loadingData)` (:117) with `loadingData` initially true. If the user is unauthenticated, `fetchDashboardData` never runs, so the screen sits on "Loading dashboard..." until the redirect completes. `getUsagePercentage` divides by `websites_limit` and gives NaN/Infinity if 0 (:105-108).
5. PATCH validation (route.ts:82-98): `checklist` is not schema-validated, accepts any JSON of any size, and a not-found row returns 500 rather than 404. `request.json()` failures fall into the generic 500.
6. Next 16 params handling is correct. `app/api/scans/[id]/route.ts` types `params: Promise<{id:string}>` and awaits it in all three handlers (:7,:13; :63,:67; :121,:125). `app/scan/[id]/page.tsx:59-61` awaits it in an async server component. `app/history/[id]/page.tsx:20-23` uses React `use(params)` in a client component, which is also valid. Only the stale comment "In Next.js 15" (:16) is off (package.json: next 16.0.7).
7. Auth is client-side only on pages. `/history`, `/history/[id]` and `/dashboard` render a loading state, then redirect in `useEffect`; the real protection is the per-API 401 and `user_id` filters. No `middleware.ts`/`proxy.ts` exists in the repo root, so there is no edge guard. Only `/scan/[id]` guards server-side.
8. Server-side Supabase client in `/scan/[id]/page.tsx:47-51` supplies only `cookies.get`, so session token refresh cookies cannot be written. A stale access token in a server component can cause an unexpected redirect to `/` (inference).
9. Cost and performance: `select('*')` on all scans in `/api/scans` and in `/api/scans/stats` (heavy: `ai_prompt`, `action_plan`, etc.), no pagination, and stats computed in JS. History fires the stats query on every delete, and `/api/scans` twice on first load (initial effect plus filter/sort effect, history:77-86).
10. Verbose server logging of user IDs, auth errors and scan IDs in `GET /api/scans` and `[id]` (route.ts:10-24, 40-41; [id]:10-24) leaks PII into logs.
11. `removeSite` is N sequential requests (history:170), non-atomic, and uses native `confirm()`.
12. Issue severity in `/history/[id]` is positional (index 0 = critical, 1 = high ...) and unrelated to the data (:146-148). The `categorizeIssue` keyword heuristic defaults to "accessibility" (:115-132). The `/scan/[id]` and `/history/[id]` views of the same scan therefore differ.
13. Tests: none exist, and the schema/RLS are not in the repo.

## Improvement opportunities
1. (High) Persist checklist: wire the toggle in `ScanResultsEnhanced` to `PATCH /api/scans/[id]`, hydrate from `scan.checklist`, validate the body (array of `{id,label,checked}`), return 404 when the row is missing.
2. (High) Implement real progress tracking: per-domain score history (sparkline or delta vs the previous scan) in `/history`, computed from `created_at`-ordered scans or a SQL view. Otherwise remove the "Track your improvements" copy.
3. (High) Fix the dashboard contract: add `limit` support (and a column projection, e.g. `id,url,domain,overall_score,created_at,issues`) to `GET /api/scans`, derive `issues_found` from `issues.length`, drop `status`, link rows to the detail page.
4. (Medium) Consolidate the detail pages: make `/history/[id]` redirect to `/scan/[id]` (or share one view) so scores, bands and severity are consistent.
5. (Medium) Move auth guards to a proxy/middleware or server components, and fix `removeSite` (single `DELETE /api/scans?domain=` endpoint, check `res.ok`, perform delete plus slot-free in one transaction/RPC).
6. (Medium) Compute stats in SQL (aggregate or RPC) and select only needed columns; add pagination.
7. (Low) Centralise score thresholds, label "latest" correctly regardless of sort, remove debug logging and `details: error.message`, replace the Google favicon service with a self-hosted fallback, add tests for the DELETE slot logic and the filters.

## Open questions
- Does Supabase RLS exist on `scans`, `user_websites`, `video_jobs`? Only the code-level `user_id` filters could be verified.
- Is there a `scans.updated_at` column, and do `status` / `issues_found` exist (history type and dashboard assume them)?
- Is `trial_websites_requested` or any DB trigger involved in slot accounting, for example does a DB cascade delete `user_websites` when scans are deleted?
- Is `/history/[id]` or `ScanResultsEnhanced` intended to be retired in favour of `/scan/[id]`? The `checklist` column suggests persistence was planned.
- Are `/api/scans/limit` and `/api/subscription` meant to stay duplicate sources of the same limit logic?
