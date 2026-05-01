# AriClear

## Overview

AriClear is a **Next.js 16** web application built as a monorepo. It analyzes websites for human clarity and AI-SEO (GEO) visibility, giving founders and agencies a combined score with specific, actionable feedback.

## Tech Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Framework       | Next.js 16 (App Router)   |
| Language        | TypeScript                |
| Styling         | Tailwind CSS              |
| Auth & Database | Supabase                  |
| Payments        | Stripe                    |
| Deployment      | Vercel                    |
| Package manager | pnpm (workspace monorepo) |

## Monorepo Structure

```
ariclear/
├── apps/
│   └── web/                        # Main Next.js application
│       ├── src/
│       │   ├── app/                # App Router pages & API routes
│       │   │   ├── api/
│       │   │   │   ├── analyze/    # Core scan logic
│       │   │   │   ├── scans/      # Scan CRUD (+ /[id] route)
│       │   │   │   └── subscription/
│       │   │   ├── scan/           # Scan page
│       │   │   ├── history/        # Scan history page
│       │   │   └── pricing/        # Pricing page
│       │   └── lib/
│       │       └── supabase/
│       │           ├── client.ts   # Browser Supabase client
│       │           └── auth/
│       │               └── server.ts  # Server-side Supabase client
│       └── package.json
│
└── packages/
    ├── components/                 # Shared UI components (@ariclear/components)
    │   ├── Navbar
    │   ├── SiteFooter
    │   ├── Button
    │   ├── AuthModal
    │   ├── ScanResultsEnhanced
    │   └── ...
    └── lib/                        # Shared utilities (@ariclear/lib)
        └── supabase/
            └── auth/
                └── server.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Supabase project
- Stripe account (for payments)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/ariclear.git
cd ariclear

# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env.local` file inside `apps/web/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Anthropic (AI analysis)
ANTHROPIC_API_KEY=sk-ant-...
```

### Running Locally

```bash
# From the repo root
pnpm dev
```

App will be available at `http://localhost:3000`.

## Key Architectural Decisions

### Next.js 16 — params handling

In Next.js 16, route params are **synchronous** (they reverted the async change from v15). Always access them directly:

```typescript
// ✅ Correct — Next.js 16
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	const { id } = params; // direct access, no await needed
}
```

### Supabase clients — two separate instances

There are two Supabase clients in the codebase. Use the right one for the right context:

```typescript
// Browser / client components
import { supabaseAriClear } from '@/lib/supabase/client';

// Server / API routes
import { supabaseAriClearServer } from '@ariclear/lib/supabase/auth/server';
const supabase = await supabaseAriClearServer();
```

Never use the browser client inside API routes — it won't have the correct auth session on the server.

### Auth pattern

Authentication is checked at the API layer using `supabase.auth.getUser()`. Every protected API route follows this pattern:

```typescript
const {
	data: { user },
	error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Database (Supabase)

### Core Tables

**`scans`**

| Column          | Type        | Notes                           |
| --------------- | ----------- | ------------------------------- |
| `id`            | uuid        | Primary key                     |
| `user_id`       | uuid        | Foreign key → auth.users        |
| `url`           | text        | Scanned website URL             |
| `overall_score` | int         | Combined clarity + AI-SEO score |
| `human_score`   | int         | 5-second clarity score          |
| `ai_seo_score`  | int         | GEO / AI visibility score       |
| `result`        | jsonb       | Full analysis payload           |
| `created_at`    | timestamptz | Auto-set                        |

**Row Level Security (RLS)** is enabled — users can only read and write their own scans.

## API Routes

| Method | Route               | Description                          |
| ------ | ------------------- | ------------------------------------ |
| `POST` | `/api/analyze`      | Run a website scan                   |
| `GET`  | `/api/scans`        | List all scans for current user      |
| `POST` | `/api/scans`        | Save a completed scan                |
| `GET`  | `/api/scans/[id]`   | Get a single scan by ID              |
| `GET`  | `/api/subscription` | Get current user's subscription info |

## Subscription Tiers

Tier gates are enforced via the `/api/subscription` endpoint and checked on the frontend. Current tiers:

| Tier                   | Websites | Scans           | PDF Reports   |
| ---------------------- | -------- | --------------- | ------------- |
| Free                   | 1        | Limited / month | ✗             |
| Starter (~$99/yr)      | 3        | Unlimited       | ✓             |
| Agency (~$399–$699/yr) | Many     | Unlimited       | ✓ White-label |

Tier badge colors are set in `Navbar` component based on the `tier` field returned from `/api/subscription`:

```typescript
// free → gray | trial → blue | starter → green
// pro → purple | business → orange | agency → red
```

---

## Deployment

The app is deployed on **Vercel** and auto-deploys from the main branch.

### Vercel Setup

- Set all environment variables from `.env.local` in the Vercel dashboard
- Build command: `pnpm build`
- Output directory: `.next` (auto-detected)

### Stripe Webhook

After deployment, register the webhook endpoint in the Stripe dashboard:

```
https://yourdomain.com/api/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` to the signing secret Stripe provides.

## Shared Component Library (`@ariclear/components`)

Components are shared across the monorepo via the `packages/components` package. Import like this:

```typescript
import {
	Navbar,
	SiteFooter,
	Button,
	AuthModal,
	ScanResultsEnhanced,
	usePreorder,
	useAuth,
} from '@ariclear/components';
```

When adding a new shared component, export it from `packages/components/index.ts`.

## Scan Analysis Flow

```
User enters URL
      ↓
POST /api/analyze
      ↓
Fetch website HTML
      ↓
Send to Claude (Anthropic API)
      ↓
Returns structured JSON:
  - human.clarityScore
  - human.topIssues[]
  - ai.aiSeoScore
  - ai.missingKeywords[]
  - copy.suggestedHeadline
  - plan.nextSteps[]
      ↓
Display in ScanResultsEnhanced
      ↓
POST /api/scans (save to Supabase)
```

Target scan time: **under 10 seconds**.

## Common Issues & Fixes

**`params.id` is `undefined` in API route**
You're likely on Next.js 16 but using the async params pattern from v15. Access `params.id` directly without `await`.

**Supabase returns 401 in API routes**
Make sure you're using `supabaseAriClearServer()` (not the browser client) in all `app/api/` routes.

**Scan not found after save**
Check that `user_id` in the `scans` table matches the logged-in user's ID. RLS will silently block mismatched IDs.

**Stripe webhook 400 error**
The raw request body must not be parsed before signature verification. Ensure you're using `request.text()` (not `request.json()`) in the webhook handler.

## Scripts

```bash
pnpm dev          # Start local dev server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript checks
```
