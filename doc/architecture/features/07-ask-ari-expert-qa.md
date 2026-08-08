# Ask Ari (expert Q&A board)

## Purpose (what user problem / business role)
Signed-in users post website/clarity-score questions (title, optional page URL, message) and receive a written answer from the founder/expert ("Ari"). It is an async, text-based support/consulting channel. The UI promises "Expert reply within 24-48 hours" and "no email needed" (`app/ask-ari/page.tsx:198-201, 555, 844`) and markets it as free ("Talk to an expert - it's free", line 967). It is linked from the Navbar (`app/components/layout/Navbar.tsx:427-440` desktop, `:588` mobile) with a "24-48h" chip. The same page doubles as the admin/expert inbox.

## User flow (step by step, as the code actually behaves, for user AND admin/expert)
User:
1. Visit `/ask-ari`. While `useAuth()` loads, skeleton is shown; if no user, a "Sign in to use Ask Ari" panel (no login button) (`page.tsx:771-814`).
2. Page fetches `GET /api/ask-ari/questions` (own questions with nested comments, sorted client-side by `created_at`) (`:612-640`).
3. Tabs All / Open / Answered with counts; "Open" = any status other than `answered` (`:753-769`). Search box is admin-only (`:884`).
4. "New question" opens a form; client requires title and message (`:459-468`), URL optional (`type='url'`). POST `/api/ask-ari/question`; the new thread is prepended and auto-expanded (`:746-751`).
5. Expanding a thread shows the question, the first expert reply (`ExpertReply`) or the "waiting" banner, and other comments (`:394-407`).
6. Realtime: a Supabase channel updates the list when questions/comments change (see Data flow). There is NO UI for a user to post a follow-up comment (see Known issues), although `/api/ask-ari/comment` exists.

Admin/expert:
1. On load, `GET /api/ask-ari/check-admin` sets `isAdmin` (`:55-64, 604-610`). Admins see an "Admin" toggle (`:850-860`).
2. Admin view fetches `GET /api/admin/ask-ari/questions` (all questions + `user_email`), with search by title/message/email.
3. Per thread: input "Reply as Ari" -> `POST /api/ask-ari/reply`; the reply is appended and status becomes `answered` (`:232-284, 717-733`).
4. "Mark as open / Mark as answered" button calls `PATCH /api/admin/ask-ari/status` (`:66-84, 419-432`) - this URL does not exist (see Known issues #1).

## Files & responsibilities (table: path | role | size)
| path | role | size |
|---|---|---|
| `app/ask-ari/page.tsx` | Whole client UI: list, form, thread cards, admin reply/toggle, realtime subscription | 1,047 lines |
| `app/api/ask-ari/question/route.ts` | POST create question (user JWT, RLS) | 85 |
| `app/api/ask-ari/questions/route.ts` | GET list; checks admin via service role, returns all (+emails) for admins else RLS-scoped own | 139 |
| `app/api/ask-ari/comment/route.ts` | POST user comment (RLS insert) then service-role reset status to `waiting` | 102 |
| `app/api/ask-ari/reply/route.ts` | POST expert reply (admin check, service-role insert, mark answered) | 109 |
| `app/api/ask-ari/status/route.ts` | PATCH status (admin only, service role). Not called by the UI | 89 |
| `app/api/ask-ari/check-admin/route.ts` | GET `{isAdmin}` via `admin_users` lookup | 45 |
| `app/api/admin/status/route.ts` | Duplicate of status PATCH; mounted at `/api/admin/status` though its header comment says `admin/ask-ari/status` | 81 |
| `app/api/admin/ask-ari/questions/route.ts` | GET all questions + emails (admin only, service role) | 89 |
| `lib/video/index.ts` | Re-exports 4 video modules only (4 lines). Does NOT export `supabaseAriClear` | 4 |
| `lib/supabase/auth/browser.ts` | The real `supabaseAriClear` (`createClient(url, anonKey)`, localStorage session) | 10 |

## Data flow & API (request/response shapes, external services, realtime channels)
All routes build a cookie-based `createServerClient` from `@supabase/ssr` with env `NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL` / `_ANON_KEY`, call `auth.getUser()`, and return 401 if absent. Service client uses `SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY`.
- `POST /api/ask-ari/question` `{title, url?, message}` -> 201 `{question}`; 400 if title/message blank. Inserts `{user_id, title, url|null, message, status:'waiting'}` with the user client.
- `GET /api/ask-ari/questions` -> `{questions:[{...q, comments:[...], user_email?}], isAdmin}`. Admin: service-role `select('*, comments(*)')` + `auth.admin.listUsers()` for emails. Non-admin: user client, relies on RLS to return own rows only (`questions/route.ts:122-126`). If admin fetch errors it falls through to the user path.
- `GET /api/admin/ask-ari/questions` -> `{questions}` with `user_email` ('Unknown' fallback). Admin check through user client on `admin_users`.
- `POST /api/ask-ari/comment` `{question_id, content, author_name?}` -> 201 `{comment}` (`is_expert:false`); then service role sets question `status='waiting'` (silently skipped if key missing).
- `POST /api/ask-ari/reply` `{question_id, content}` -> 201 `{comment}`. Author name = `Ari (<first word of admin_users.label or email local part>)` (`reply/route.ts:55-59`). Insert via service role with `is_expert:true`, then status -> `answered` (failure only warned).
- `PATCH /api/ask-ari/status` or `/api/admin/status` `{question_id, status:'waiting'|'answered'}` -> `{success}` / `{ok}`.
- `GET /api/ask-ari/check-admin` -> `{isAdmin}`; every failure returns false.
- Realtime (`page.tsx:650-707`): one channel `ask-ari-realtime` on the browser client, `postgres_changes` on `public.questions` INSERT (prepend), `questions` UPDATE (status only), `comments` INSERT (append, and sets status `answered` if `is_expert` else `waiting`). No row filter. Cleanup uses `unsubscribe()`.
- External services: Supabase only (auth, Postgres, Realtime). No email, no Slack, no queue.

## Data model (tables questions, comments, admin_users etc., inferred from code; say 'inferred')
All inferred; schema/RLS not in repo.
- `questions`: `id`, `user_id` (auth.users), `title`, `url` nullable, `message`, `status` ('waiting' | 'answered'), `created_at`.
- `comments`: `id`, `question_id` (FK, embedded as `comments(*)` so a FK exists), `author_id`, `author_name`, `content`, `is_expert` bool, `created_at`.
- `admin_users`: `id`, `user_id`, `is_active` bool, `label` (e.g. "Slavo - founder"), `email`.
- Presumed RLS (inferred from comments in code): users can select/insert their own `questions`; insert on `comments`; `admin_users` readable by the user for their own row; `questions`/`comments` tables published to `supabase_realtime`.

## Business rules & limits (who can post, tier gating, how this maps to the '1 expert session / month' plan promise)
- Who can post: any authenticated Supabase user. No subscription/tier check anywhere in these files. No rate limit, quota, max length, or URL validation server-side.
- Who is expert: any active row in `admin_users`; reply author label is derived from that row.
- Status machine: new = `waiting`; expert reply = `answered`; user comment = `waiting`; admin may toggle manually (intended).
- Plan mapping: `PricingSection.tsx:50` shows "Expert sessions" excluded for the starter plan; `:100` shows "1x 30-min expert session / month" for the Centurion/pro plan. Ask Ari does NOT implement or consume that entitlement: it is async text, ungated, free and unlimited, and has no booking/scheduling. The "session" promise is therefore unimplemented in code reviewed (the nav chip and page copy position Ask Ari as a free 24-48h reply instead).
- SLA "24-48 hours" is copy only; nothing tracks or alerts on it.

## Error handling & edge cases
- API routes wrap everything in try/catch and return 500 with the raw error message (user-facing routes leak Supabase error text; admin routes return a generic message).
- UI: form shows a generic failure string (`page.tsx:488`); admin reply, status toggle and list-fetch failures are only `console.error`/ignored (toggle returns `false` and nothing is shown).
- `check-admin` and the admin check in `questions` fail closed (treated as non-admin).
- Realtime and optimistic updates dedupe by id for comments and questions (`:660, 692-695, 724`), so own reply is not duplicated.
- Auth loading and logged-out states handled; logged-out user sees no sign-in CTA.
- `fetchQuestions` mutates comment arrays with `.sort` in place (harmless here).

## Known issues / risks (concrete, with file:line references; authz holes, service-role use, RLS reliance, cookie adapter issues, email notifications absent?, spam)
1. Broken status toggle: UI calls `/api/admin/ask-ari/status` (`page.tsx:72`) but only `/api/ask-ari/status` and `/api/admin/status` exist (`app/api/admin/ask-ari/` contains only `questions`). The request 404s; `res.ok` false; button silently does nothing.
2. Broken/fragile import: page imports `supabaseAriClear` from `@/lib/video` (`page.tsx:7`), but `lib/video/index.ts:1-4` does not export it; the real client is `lib/supabase/auth/browser.ts:10`. As read, this is a type/build error or `undefined` at runtime (`.channel` on undefined throws in the effect at `:652`). Possibly resolved by an unseen alias (`@/lib/video` could not be traced to another file; no `lib/video.ts` exists). Verify with `tsc`/build.
3. Realtime auth mismatch (inferred): the browser client is a plain `createClient` (localStorage session) while API routes read cookie sessions. If auth state is cookie-only, Realtime runs as anon and RLS would suppress events; if it is localStorage-based, server cookie reads may fail. Which holds depends on `useAuth` (not read).
4. Realtime has no filters and the handlers trust every event: a non-admin receiving other users' `questions` INSERTs (only if RLS/publication allow it) would show them; any non-expert comment event flips status to `waiting` for the matching thread (`:689-691`). In admin view, realtime-inserted questions lack `user_email`.
5. Cookie adapter: all routes use deprecated `cookies: { get }` only (e.g. `question/route.ts:19`, `reply/route.ts:14`), no `getAll/setAll`. Chunked auth cookies (`sb-*-auth-token.0/.1`) are not reassembled, and refreshed tokens are never written back, so sessions can intermittently 401. `lib/supabase/auth/server.ts:11-19` has the correct pattern but is unused here.
6. `comment/route.ts:87-94`: after the RLS insert, a service-role update sets `waiting` on any `question_id` with no ownership check; safe only if RLS blocks the insert for others' questions (unverified). `author_name` is client-supplied (`:54, 72`), enabling spoofed display names (e.g. "Ari (Slavo)"), though `is_expert` stays false.
7. Admin enumeration: `auth.admin.listUsers()` is unpaginated (default first page, ~50 users) in `questions/route.ts:96` and `admin/ask-ari/questions/route.ts:68`; emails become null/'Unknown' beyond that and each admin load calls the Auth admin API. No pagination/limit on question lists either.
8. Expert reply display: `ThreadCard` shows only the first `is_expert` comment and removes all `is_expert` comments from the thread (`page.tsx:308-309`), so a second expert reply is invisible to everyone; counts still include it.
9. No user follow-up UI: `/api/ask-ari/comment` is unused by the page, so "comments" are effectively expert-only despite the feature description; the follow-up->`waiting` logic is dead code.
10. Redundancy: `/api/ask-ari/status` and `/api/admin/status` are duplicates; `/api/ask-ari/questions` admin branch duplicates `/api/admin/ask-ari/questions`; the page does not need `check-admin` separately from `questions` (which returns `isAdmin`). Four copies of the Supabase client boilerplate.
11. Authz is application-level through the service role (reply, status, admin lists bypass RLS); `reply/route.ts` does not verify the question exists. `admin_users` is read with the user-scoped client in 4 routes (needs a self-read RLS policy) but with the service client in `questions`.
12. No email/notification on new question or on reply (page text "no email needed"); the expert must poll the admin view. No SLA tracking.
13. Spam/abuse: unlimited free submissions by any account, no length limits or sanitization, no captcha. User-provided `url` is rendered as an `<a href>` (`page.tsx:372-376`) with only client-side `type='url'`; a `javascript:` value would reach the admin's browser (React version behavior to be verified).
14. Minor: `userId` prop of `NewQuestionForm` unused; `RealtimeChannel` cleaned with `unsubscribe` not `removeChannel`; a `console.log` of user id/admin status in `questions/route.ts:72`; no tests.

## Improvement opportunities (prioritized, actionable)
1. Fix the toggle URL to `/api/ask-ari/status` (or move the route) and delete the duplicate; surface failures in the UI. (minutes)
2. Import the client from `@/lib/supabase/auth/browser` and verify build; consider moving to a shared `lib/supabase` module.
3. Replace cookie adapters with `getAll/setAll` via the existing `supabaseAriClearServer()`; extract shared `requireUser()/requireAdmin()` helpers and a service-client factory.
4. Add server validation: max lengths, URL scheme check (http/https), per-user rate limit (e.g. N open questions/day), ownership check on comments, ignore client `author_name`.
5. Decide the entitlement model: gate by subscription tier and/or monthly quota to match the "1x 30-min expert session / month" promise, or reword pricing/copy so Ask Ari is not confused with the session; add booking if the session is real.
6. Add notifications: email/Slack to the expert on new question; email to the user on reply (lib/supabase/mail exists - not reviewed).
7. Add the user follow-up comment UI and render all expert replies; paginate lists and `listUsers` (or store email on the question row / use a view).
8. Scope realtime with filters (`user_id=eq.<id>` for users) and reuse `removeChannel`; confirm RLS and publication.
9. Add RLS/schema migrations to the repo and basic API tests.

## Open questions (things you could not verify from the code)
- Actual Supabase schema, RLS policies, FKs, realtime publication, and whether `admin_users` has a self-select policy.
- How `@/lib/video` resolves `supabaseAriClear` (build status), and whether `useAuth` from `@ariclear/components` uses cookies or localStorage.
- Whether `/ask-ari` is protected by middleware, and whether the Navbar link is shown only to signed-in/paid users.
- Whether any gating by subscription tier happens elsewhere (webhooks/plan-request) or the expert session is booked outside the app.
- React version behavior for `javascript:` hrefs; whether `lib/supabase/mail` is meant for notifications.
