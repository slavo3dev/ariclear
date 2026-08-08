# AI Recap Video

## Purpose
Turns a saved website scan into a 15s vertical "emotional story" video (visitor arrives, is confused, leaves, sees the fixed headline, CTA) that the user can download and share on social. Business role: a shareable, AriClear-branded artifact that doubles as marketing (watermark "AriClear" in every scene, "Powered by AriClear / ariclear.com" in the last, `remotion/ScanRecapComposition.tsx:143-166,996-1005`). A second, separate surface (VideoCreatorPanel) lets users copy a text script for CapCut/Canva or "request" a render.

## User flow
1. User runs a scan on `/scan`. After the scan is saved, `triggerVideoRender(scanId, url)` fires without awaiting (`app/scan/page.tsx:336-358,473`): POST `/api/video/request` with hardcoded `style:'bold'`, `format:'reels'`, `script:[]`, then POST `/api/video/render` with the returned `job_id`. The user is redirected to `/scan/[id]` immediately (`page.tsx:473-474`).
2. `/scan/[id]` server page loads the latest `video_jobs` row for this scan+user (`app/scan/[id]/page.tsx:92-98`) and passes it to `ScanResultsClient`, which renders `VideoPlayer` (`ScanResultsClient.tsx:164`) and `VideoCreatorPanel` (`:353`).
3. `VideoPlayer` shows a status badge (Queued / Rendering / Ready / Failed). While `pending|rendering` it polls `GET /api/video/status/[jobId]` every 5s (`VideoPlayer.tsx:136-140`) and shows a skeleton ("this takes 2-3 minutes"). On `done` it shows a `<video controls autoPlay loop>` of the Cloudinary URL, a Download MP4 link and Copy link. On `failed` it shows `error_message` and tells the user to use the panel below.
4. `VideoCreatorPanel` (collapsed card): choose source (scan or custom prompt), style (bold/clean/warm/urgent), format (reels/story/square/landscape); a 4-scene text script is built client-side (`buildFromScan`/`buildFromPrompt`, `VideoCreatorPanel.tsx:105-340`); "Copy script" copies it to clipboard; "Request rendered video" POSTs `/api/video/request` (`:414-426`) and shows "Request received - we will deliver within 24h" (`:688`).
5. `ScanRecapVideo.tsx` (CSS-animated 4-slide, 12s preview with a WebM "download" via `MediaRecorder`) exists but is not imported anywhere (grep: only its own file matches). It is dead code; its download cannot work (see risks).

## Files & responsibilities
| path | role | size |
|---|---|---|
| `app/scan/[id]/VideoCreatorPanel.tsx` | Client UI: source/style/format pickers, client-side 4-scene script, copy, request job | 701 lines |
| `app/scan/[id]/VideoPlayer.tsx` | Client UI: status badge, 5s polling, MP4 player, download/copy link | 252 |
| `app/scan/[id]/ScanRecapVideo.tsx` | Unused Phase-A CSS preview + MediaRecorder download | 705 |
| `app/api/video/request/route.ts` | Auth, dedupe, insert `video_jobs` (status `pending`) | 84 |
| `app/api/video/render/route.ts` | Full pipeline orchestrator, runs Remotion CLI, uploads, updates job | 293 |
| `app/api/video/status/[jobId]/route.ts` | Auth'd job status read | 35 |
| `lib/video/generateScript.ts` | Gemini 2.5 Flash Lite 5-scene narration | 134 |
| `lib/video/generateVoiceover.ts` | Google Cloud TTS (Neural2) SSML to MP3 buffer | 79 |
| `lib/video/generateImages.ts` | Replicate SDXL, 4 sequential images | 125 |
| `lib/video/uploadToCloudinary.ts` | Upload MP3 + images to Cloudinary | 99 |
| `lib/video/index.ts` | Barrel export | 4 |
| `remotion/Root.tsx` | Registers composition `ScanRecap` (450f, 30fps, 1080x1920 defaults) | 40 |
| `remotion/ScanRecapComposition.tsx` | 5 scenes x 90 frames, props-driven | 1,066 |
| `remotion/index.ts`, `remotion/tsconfig.json` | `registerRoot`, TS config | 4 / 18 |
| `remotion.config.ts` | jpeg frames, overwrite output, passthrough webpack override | 5 |
| `next.config.ts` | `serverExternalPackages`: @remotion/bundler, renderer, cli, esbuild, webpack | 12 |

## Data flow & API
Auto-trigger path (the only path that actually renders):
1. `POST /api/video/request` body `{scan_id, url, style, format, script, [mode, custom_prompt]}`. Requires `url, style, format, script` truthy (`request/route.ts:26`; `[]` is truthy so the auto-trigger passes). Returns `201 {job:{id,status}}`, `401`, `400`, `409` (existing pending/rendering job for same user+scan, `:33-52`), `500`. `mode`/`custom_prompt` sent by the panel are ignored (not destructured, `:24`).
2. `POST /api/video/render` body `{job_id}`. Auth, load job by `id`+`user_id` (404 if missing). Sets `status='rendering'` (`render/route.ts:169-173`), then synchronously inside the request:
   - Load `scans` row (`select *`).
   - Gemini `gemini-2.5-flash-lite` (temp 0.7, JSON mime) returns 5 scenes `{id, narration (<=8 words), imagePrompt}`; retries 3x on 503/overloaded (`generateScript.ts:35-62`); throws if not exactly 5 scenes. Prompt says 15s, 5x3s. Needs `GEMINI_API_KEY`.
   - Google Cloud TTS: voice by style (en-US-Neural2-D/F/A, pitch/rate per style), SSML joins narrations with 1s breaks (200ms lead-in) into one MP3 (`generateVoiceover.ts:22-41`). Credentials from keyfile at `GOOGLE_TTS_CREDENTIALS_PATH` resolved against cwd.
   - Replicate `stability-ai/sdxl` (pinned version hash), 30 steps, one image per prompt, run sequentially with an 11s sleep between (`generateImages.ts:102-121`, comment says "parallel"). Needs `REPLICATE_API_TOKEN`. Requires exactly 4 prompts, but Gemini returns 5 (see risks).
   - Cloudinary: audio (`ariclear/voiceovers/scan-{jobId}`) and images (`ariclear/scene-images/...`) uploaded in parallel; note the param is named `scanId` but receives `job_id` (`render/route.ts:222-226`).
   - Build Remotion props (scan fields + `voiceoverUrl`, `sceneImages`, `style`; first action-plan item and first confusion only).
   - `execFile node_modules/.bin/remotion render remotion/index.ts ScanRecap <tmp>/<jobId>.mp4 --props=<file> --width --height --codec=h264 --log=verbose`, 5 min timeout, `NODE_ENV=production` (`:61-106`). Output in `os.tmpdir()/ariclear-*`.
   - Upload MP4 to Cloudinary `ariclear/rendered-videos/job-{jobId}` (`resource_type:'video'`), delete temp file and dir.
   - Update job `status='done', cloudinary_url, updated_at`; respond `{success, video_url, job_id}`. On any throw: `status='failed', error_message`, respond `500`.
3. `GET /api/video/status/[jobId]` returns `{job:{id,status,cloudinary_url,error_message}}`; `401`, `404`.

Job states: `pending` (request) -> `rendering` (render start) -> `done | failed`. No transition out of `rendering` other than the handler finishing.

Composition (`ScanRecapComposition.tsx`): 5 `Sequence`s of 90 frames (Arrival, Confusion, Problem, Clarity, CTA), fixed 450 frames at 30fps (duration is not format- or audio-dependent). Style is a prop but unused visually: grep of the file shows `props.style` is never read; palette `C` (dark choco) is constant for all styles. `sceneImages` is documented "not used" (`:31`), so the Replicate images are never rendered. Voiceover `<Audio>` plays from frame 0 (`:1023`). Format only changes width/height via CLI flags (`render/route.ts:52-57`); layouts use hard pixel positions (e.g. 860px cards, question marks at x up to 900) tuned for 1080 wide.

## Data model
Inferred `video_jobs` (schema not in repo): `id` (uuid), `user_id`, `scan_id` (nullable, `request:58`), `url`, `style`, `format`, `script` (json; inserted at `:57-62`), `status` (`pending|rendering|done|failed`), `cloudinary_url`, `error_message`, `created_at` (ordered on in `[id]/page.tsx:96`), `updated_at`. Whether `mode`/`custom_prompt` columns exist is unknown (not inserted). No RLS policies visible; code relies on `.eq('user_id', user.id)` plus (presumably) RLS. Inference: no DB unique constraint backs the dedupe.

## Business rules & limits
- Auth required on all three routes (Supabase session). Job ownership checked on render and status via `user_id`.
- UI copy says "Rendered .mp4 delivery requires Centurion" (`VideoCreatorPanel.tsx:693-696`) and "we will deliver within 24h" (`:652`, `:688`). Verified: NOT enforced anywhere. `request` and `render` do no tier check; no grep hit for tier/plan in `app/api/video` or `lib/video`. Every scan (including free tier) auto-triggers a full render (`scan/page.tsx:473`). Any authenticated user can call `/api/video/render` directly.
- Only limit: one pending/rendering job per user+scan (request route, race-prone, and ineffective for the render route: render can be called repeatedly on the same job id, and nothing checks the job's current status before running).
- Copy of script is free (client-only).
- Panel copy says "5-12s", player says "12s", composition is 15s, Gemini prompt says 15s, panel script has 4 scenes with durations to 12s, composition has 5.

## Error handling & edge cases
- Pipeline errors are caught and persisted as `failed` + message (raw `err.message`, including vendor error text, is exposed to the client via status route and render response, `render/route.ts:278-291`). Failures in the catch's own DB update are unhandled.
- Auto-trigger swallows all errors (`.catch(()=>{})`, `scan/page.tsx:350-358`); a failed request leaves no job and the player says "No video job found" (`VideoPlayer.tsx:143-154`).
- Failed jobs are not retried and the 409 guard only covers pending/rendering, so a user can create a new job, but only through the panel, which never calls render (see risks).
- Poll errors ignored; polling stops only on done/failed. If the render process dies (serverless timeout, deploy, crash) the job stays `rendering` forever and the client polls forever; the 409 guard then blocks new requests for that scan permanently.
- Gemini output is stripped of code fences and `JSON.parse`d; invalid JSON throws and fails the job.
- Narration is interpolated into SSML unescaped (`generateVoiceover.ts:38`); characters like `&`/`<` in Gemini output would make TTS reject the SSML.

## Known issues / risks
1. Panel requests never render: `VideoCreatorPanel.tsx:414` only POSTs `/request`; nothing calls `/render` for panel-created jobs (only `scan/page.tsx:352` does). Job stays `pending` indefinitely, UI promises 24h manual delivery that no code implements, and the 409 guard blocks the next request for that scan. The user's chosen style/format/custom prompt/script are stored but never used by the pipeline (render re-generates its own script via Gemini and ignores `job.script`, `custom_prompt`).
2. Remotion CLI inside a Next route (`render/route.ts:81-102`): requires the Remotion binary, Chromium/headless browser download, ffmpeg, writable tmp and several GB RAM/CPU. Not viable on Vercel/most serverless (function size, no browser, default 10-60s maxDuration; no `maxDuration`/`runtime` export found in `app/`). Total pipeline time = 11s x 3 sleeps + Gemini + TTS + 4 Replicate runs (tens of seconds each) + upload + 2-3 min render; the HTTP request is held open for the whole duration. Works only on a long-lived Node host/dev machine. Relative `remotion/index.ts` depends on `cwd`, and `node_modules/.bin/remotion` must exist in the deployed image.
3. Step/scene count mismatch: Gemini returns exactly 5 scenes (`generateScript.ts:127`) but `generateSceneImages` throws unless exactly 4 prompts (`generateImages.ts:90-92`). Step 3 will fail for every job with "requires exactly 4 prompts", so the pipeline cannot succeed as written (high confidence from code; not executed). Header comments also say "4-scene" (`generateVoiceover.ts:2`), "4 images" while UI/README numbers say 12s/4 scenes vs 15s/5.
2b. Wasted spend: even if fixed, images are never used by the composition (`ScanRecapComposition.tsx:31`), and `style` is ignored visually. 4 SDXL runs + 4 Cloudinary image uploads + 44s of sleep are pure cost/latency.
3. Voice/scene sync: one MP3 with fixed 1s breaks, played from frame 0; scene text is on a fixed 3s grid, so speech drift is possible (TTS speaking rate 0.9-1.15, <=8 words). Audio longer than 15s is cut.
4. In-flight job logic: dedupe is check-then-insert (race), `render` does not verify status is `pending` (double-click/double call renders twice, and Cloudinary `overwrite:true` with `job-{id}` public_id means they clobber each other); no stale-`rendering` timeout/reaper; no lock.
5. Temp files: cleanup only on the success path in `uploadRenderedVideo` (`render/route.ts:130-131`); if render or upload throws, `ariclear-*` dirs (props.json, partial mp4) are leaked. `fs.rmdir` is used. `--log=verbose` floods logs. Remotion also bundles the project into its own temp/cache dir each run (no cached bundle).
6. Secrets/config: `GOOGLE_TTS_CREDENTIALS_PATH` is a filesystem path to a service-account JSON (`generateVoiceover.ts:48-55`); `.gitignore:42` lists `google-tts-credentials.json` but a path-based secret does not work on serverless without bundling the file. `CLOUDINARY_*`, `REPLICATE_API_TOKEN`, `GEMINI_API_KEY` read from env; the render child process receives the whole `process.env` (`:97-100`) including all secrets. Cloudinary config is duplicated (route and lib). Import alias inconsistency: `@ariclear/lib/...` in render/status vs `@/lib/...` in request (works only if both aliases are configured; not checked).
7. Status/authz: status and render routes scope by `user_id` (good). `render` reads `scans` by id without `user_id` filter (`:177-181`); safe only because the job is owned and `scan_id` was set at insert time from client input: `request` does not verify the caller owns `scan_id`, so a user could create a job referencing another user's scan id and render a video of its data if RLS on `scans` does not block it (RLS unverifiable; `[id]/page.tsx` implies scans are filtered). Treat as potential data leak.
8. Request body is unvalidated: `style`/`format` are not checked against the enums; unknown `style` makes `VOICE_MAP[style]` undefined (TypeError) and unknown `format` makes `FORMAT_DIMS[format]` undefined, after money has been spent. `script` is stored unvalidated.
9. Cost per video (per render; prices not verified, check vendor pages): Gemini 2.5 Flash Lite (tiny, fraction of a cent), Google TTS Neural2 (about 100 chars, negligible), Replicate SDXL x4 (roughly cents each, billed by GPU seconds; useless output), Cloudinary storage/transform/bandwidth for 4 images + MP3 + MP4 (plan-dependent; no cleanup of old assets), plus own compute for 2-3 min of headless-Chromium rendering (dominant cost on a VM). No per-user quota, so each scan costs one render and a user can loop `/render` calls on new jobs.
10. `ScanRecapVideo.tsx` download is broken by design: `HTMLDivElement.captureStream` does not exist (only canvas/video), so it always shows the fallback error (`:487-503`). Dead code; also recording `video/webm;codecs=vp9` unchecked via `isTypeSupported`.
11. `VideoPlayer` hardcodes 9:16 and `autoPlay loop` for any format (`VideoPlayer.tsx:193`), so square/landscape jobs will be letterboxed/distorted; header says "12s" while video is 15s.
12. `fetch` in `pollStatus` does not check `res.ok`; 401 is swallowed and polling continues forever.
13. No tests, no `maxDuration`, no observability beyond `console.log`.

## Improvement opportunities
1. (P0) Fix the 5-vs-4 scene bug: either generate 5 images/drop images entirely. Since the composition ignores images, remove Replicate and the image upload (saves cost and ~44s+). Align copy (12s vs 15s, 4 vs 5 scenes).
2. (P0) Decouple rendering from the HTTP request: `/render` only enqueues (atomically set `pending -> queued`), a worker (separate Node service, or Remotion Lambda / Cloud Run via `@remotion/lambda`) does the work and writes the status; client keeps polling. Add a stale-`rendering` reaper (e.g. > 10 min -> `failed`).
3. (P0) Decide the panel's contract: either have `request` kick off rendering with the user's style/format/script/custom prompt (and use `job.script` instead of re-calling Gemini), or relabel it as a manual request and implement the 24h fulfillment path. Remove the permanent 409 lock for stuck jobs.
4. (P1) Enforce the tier server-side (Centurion/trial check) and add a quota (e.g. N videos per user per month; one auto-render only for paid or first scan). Gate the auto-trigger in `scan/page.tsx`.
5. (P1) Make `render` idempotent: require `status='pending'` with a conditional update (`update ... where status='pending' returning`), unique partial index on `(user_id, scan_id)` for in-flight statuses; validate `style`/`format` with an enum (zod); verify `scan_id` ownership.
6. (P1) Use `finally` for temp cleanup; drop `--log=verbose`; pre-bundle once (`@remotion/bundler`) or use `renderMedia` with a cached serve URL; pass only needed env to the child.
7. (P2) Use the style prop in the composition (palette/typography) and make layouts format-aware; compute composition duration from the audio length (`calculateMetadata`) instead of a fixed 450 frames; escape SSML; add `<Audio>` volume/fade.
8. (P2) Credentials via env JSON (`GOOGLE_APPLICATION_CREDENTIALS_JSON`) instead of a file path. Sanitize error messages shown to users.
9. (P2) Delete `ScanRecapVideo.tsx` or wire it as a pre-render preview using `@remotion/player` with the same composition. Handle `res.ok` in polling and use `<video>` aspect from `format`.
10. (P3) Optional watermark control for paid tiers; delete old Cloudinary assets by `public_id` after a retention window; add a smoke test of the pipeline with mocked vendors.

## Open questions
- Does a `video_jobs` migration/RLS policy exist in Supabase (columns, defaults, constraints, whether `script` is `jsonb`, whether RLS stops cross-user `scan_id`)?
- Where is this deployed (Vercel vs long-lived host)? Does the Remotion CLI render actually run there? Is `maxDuration` set via platform config?
- Is `@ariclear/lib` a real tsconfig path alias alongside `@/lib`? (not inspected)
- Has the 5-vs-4 scenes error actually been observed in production (code says every job fails at step 3; not run here)?
- Is there a manual fulfillment process behind "deliver within 24h"? No code found.
- Actual vendor pricing/plan limits (Replicate, Cloudinary, Google TTS, Gemini) are not in the repo.
