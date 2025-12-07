## Purpose
Provide condensed, repo-specific guidance so AI coding agents are productive immediately.

## Quick start
- Run development: `pnpm dev` (README also mentions `bun dev`).
- Build: `pnpm build` → `pnpm start` for production.
- Lint: `pnpm lint` (uses `eslint`).

## Architecture (big picture)
- Next.js (app router) with server & client components in `app/`.
- `app` is the codebase root for TS resolution (`baseUrl: ./app` in `tsconfig.json`), so imports like `@ariclear/components` map to files under `app/components`.
- Server-side integrations are centralized under `app/lib/` (e.g. `app/lib/supabaseServer.ts`).
- API routes use the Next.js app-router handlers in `app/api/*` (see `app/api/preorder/route.ts`).

## Key integration points & data flow examples
- Preorder flow: `app/components/Froms/PreorderForm.tsx` (client) → POST `/api/preorder` (`app/api/preorder/route.ts`) → `supabaseServer` helper (`app/lib/supabaseServer.ts`) → `mailcollection` table.
- Supabase server helper expects env vars: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and uses `createClient(url, serviceRoleKey)`.

## File & import conventions
- Path alias: `@ariclear/*` resolves to `app/*`. Example: `import { PreorderProvider } from "@ariclear/components"` → `app/components/index.ts`.
- Component folders often export via `index.ts` (see `app/components/index.ts`).
- Client components are marked with `"use client"` (e.g. `PreorderProvider`, `PreorderForm`). Leave server components without the directive.

## API & server patterns
- Use `NextRequest` / `NextResponse` inside `app/api/*` handlers.
- Server helpers (Supabase) are used directly in API routes; they throw when env vars missing—watch for runtime exceptions during local dev.
- Error handling pattern: return JSON with `{ error: string }` and proper HTTP status codes (see `route.ts`).

## Styling & assets
- Uses Tailwind CSS (`tailwind.config.ts`, `postcss.config.mjs`) and global styles in `app/globals.css`.

## Repository conventions & gotchas
- `tsconfig.json` sets `baseUrl: ./app`; treat `app/` as the source root for relative imports.
- There is a folder named `Froms` (likely a typo for `Forms`) exporting `PreorderForm`. Be careful when adding new imports—follow existing folder names.
- UI atoms live in `app/components/ui/`, layout parts in `app/components/layout/`, and `section/` contains composed sections.

## Environment & secrets
- Required env vars for Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Do not commit service role keys; prefer local `.env` or your preferred secret manager.

## Typical change examples for agents
- Add a new API endpoint: create `app/api/your-endpoint/route.ts`, use `NextRequest`/`NextResponse`, import `supabaseServer` from `app/lib/supabaseServer.ts`.
- Add a new component: place it under `app/components/<area>/`, export from `app/components/index.ts` to keep `@ariclear/components` surface area consistent.
- For client behavior requiring state or effects, add `"use client"` at the top of the file.

## Where to look next (quick links)
- `app/layout.tsx` — global layout & `PreorderProvider` usage.
- `app/components/providers/PreorderProvider.tsx` — modal + localStorage-based auto-open behavior.
- `app/api/preorder/route.ts` — server-side insertion to Supabase table `mailcollection`.
- `tsconfig.json` — baseUrl and path alias explanation.

If anything here is unclear or you'd like more examples (tests, CI, deploy config), tell me which area to expand.
