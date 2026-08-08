# Website Monitor

## Purpose
A lightweight "is my site up?" checker. The user pastes comma-separated domains and sees HTTP status, response time, summary stats, two charts and a CSV export. Pricing lists "Website uptime monitoring" as a Centurion (`pro`) feature (`app/components/section/PricingSection.tsx`, features list under `id: 'pro'`). The code is a one-shot manual check, not continuous monitoring (see Data model).

## User flow
1. User opens `/website-monitor` (linked from the logged-in user dropdown and mobile menu in `app/components/layout/Navbar.tsx:384`, `:548`). The page itself does no auth check.
2. Types URLs, comma-separated (`page.tsx:195`). Enter key or "Run Check" starts the run. Button is disabled while loading or when the input is empty (`page.tsx:293`).
3. `formatUrl` prefixes `https://` if no `http(s)://` prefix (`page.tsx:66-72`). Rows are created with status `CHECKING` (`page.tsx:199-209`).
4. For every URL the browser calls `GET /api/check-site?url=<encoded>` in parallel via `Promise.all` (`page.tsx:212-229`). Each row updates as its response arrives.
5. Status classification (`page.tsx:59-64`): 200 = UP, 404 = NOT FOUND, >=500 = SERVER ERROR, any other code (201, 301 not followed, 401, 403, 429...) = UNKNOWN. No code (null) = DOWN.
6. After all finish: summary tiles (Online / Issues / Avg Response), results table, a response-time bar chart, a status donut, and "Export CSV" appear (`page.tsx:320-433`). Charts and export only show when `done`.
7. Results live only in React state. Reloading the page loses them.

## Files & responsibilities
| path | role | size |
|---|---|---|
| `app/website-monitor/page.tsx` | Client page: input, parallel fetch, classification, stats, bar/donut charts (inline SVG), CSV export | 452 lines |
| `app/api/check-site/route.ts` | Server proxy: GET the target URL, return status code and elapsed seconds | 22 lines |
| `app/components/layout/Navbar.tsx` (imported as `@ariclear/components`) | Navigation entry; no tier gating on this link | n/a |

## Data flow & API
`GET /api/check-site?url=<url>` (`route.ts:5-23`, `force-dynamic`):
- 400 `{error:"Missing url"}` if the param is absent.
- Otherwise `fetch(url, {method:"GET", redirect:"follow", signal: AbortSignal.timeout(7000), headers:{User-Agent:"AriClear-Monitor/1.0"}})`.
- Success: `200 {statusCode:number, responseTime:number}` (seconds, 3 decimals; time to response headers only, body is never read).
- Network error/timeout: still HTTP 200 with `{statusCode:null, responseTime:null, error:msg}`. The client ignores `error` and shows DOWN.
- Any HTTP status (including 4xx/5xx) comes back as a normal 200 with `statusCode`.
- No external services, no AI model, no database.

## Data model
None. Nothing is written to Supabase or any store, and there is no scheduler or cron: no history, alerts or uptime percentage exist. CSV export is client-side only (`page.tsx:235-245`). (Inferred from the two files plus a repo grep: no other code references `/api/check-site`.)

## Business rules & limits
- Tier gating: not enforced anywhere. Neither the page nor the API reads the session or subscription. Anyone, including logged-out users, can load `/website-monitor` and call `/api/check-site` directly. The pricing claim (Centurion only) is unenforced. The Navbar link has no lock/badge.
- No rate limit, no cap on number of URLs per run, no per-user quota.
- Timeout fixed at 7 s per URL server-side; no client timeout.
- The "3 websites" plan limit is not applied here (any number of URLs allowed).

## Error handling & edge cases
- Fetch failure: API returns `statusCode:null` -> row DOWN with "—" time. Client `catch` also marks DOWN (`page.tsx:224-226`).
- 3xx: redirects are followed, so the final status is reported. A redirect to a 403/401/429 page shows UNKNOWN, which counts as an "Issue".
- "Issues" counter = every non-UP, non-CHECKING row (`page.tsx:248-250`), so UNKNOWN 2xx codes other than 200 (e.g. 204) are counted as issues.
- Response-time bar uses amber colour for non-UP; DOWN rows have no bar.
- Empty/whitespace tokens are filtered; invalid hostnames simply fail fetch -> DOWN.
- Charts hide until every check finishes, so one slow (7 s) site delays them.

## Known issues / risks
1. SSRF (high): `route.ts:6-15` fetches any user-supplied URL server-side with no scheme/host validation, no block on private ranges (127.0.0.1, 10/8, 172.16/12, 192.168/16, 169.254.169.254 cloud metadata, `localhost`, internal service names) and follows redirects (`redirect:"follow"`), so a public URL can redirect to an internal one. Only status code and timing are returned (blind SSRF), but that still enables internal port/host scanning and timing oracles. Non-http schemes are rejected by fetch, but `http://` to arbitrary ports is allowed.
2. Open, unauthenticated endpoint (`route.ts:5`): can be abused as a free proxy/DoS amplifier or to scan third parties from the app's IP; no rate limit.
3. Tier gating missing (`page.tsx`, `route.ts`): contradicts the Centurion-only pricing claim.
4. Error returned with HTTP 200 (`route.ts:21`): hides failures from monitoring and logs.
5. `GET` request downloads/starts the body (`route.ts:11`); a HEAD request (with GET fallback) would be cheaper. Response body is never consumed, which can hold connections open on some runtimes.
6. `displayHostname` uses `.replace("www.", "")` (`page.tsx:76`), which also strips "www." from the middle of a hostname.
7. CSV export does not quote/escape fields (`page.tsx:238`) and URLs with commas/quotes would corrupt it; CSV injection is possible if a URL starts with `=`/`+`/`@` (low risk since `https://` is prepended).
8. UI copy says "New Feature" and "instantly" while the marketing says "uptime monitoring"; a one-time check is not monitoring.

## Improvement opportunities
1. (P0) Add SSRF guard: allow only http/https, resolve DNS and reject private/loopback/link-local IPs, re-validate on each redirect (`redirect:"manual"` with a hop limit), restrict ports to 80/443.
2. (P0) Require an authenticated session and `subscription.tier === 'pro'` (and active/trial) in `/api/check-site`; show a lock/upsell on the page for others. Add per-user rate limit and a max URLs per run (e.g. 3 to match the plan).
3. (P1) Return real HTTP error codes for missing/invalid input and surface the `error` message in the UI (distinguish DNS error, timeout, TLS error).
4. (P1) Treat any 2xx as UP and 3xx as redirect info; show final URL.
5. (P2) If true monitoring is intended: persist monitored sites and check results in Supabase, run a scheduled job (Vercel cron), add email alerts and uptime % history.
6. (P2) Use HEAD with GET fallback, cancel the body, and escape CSV properly.

## Open questions
- Is "uptime monitoring" in the Centurion plan meant to be scheduled/alerting (not present in the code) or just this manual tool?
- Where is tier enforced for other features (e.g. `subscription.can_scan` in Navbar)? The same pattern was not applied here; the intent is unclear.
- Hosting platform (Vercel egress vs. self-hosted) determines how exploitable the SSRF is (internal network exposure). Not determinable from the code.
