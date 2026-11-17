// POST /api/brand-awareness/analyze
// Brand alignment check (beta): does each social profile say the same thing
// as the website? The check itself is lib/brand/check; this route adds:
// * signed-in users only (proxy.ts guards it too);
// * 5 per minute and 20 per day per user (one cheap model call, ~$0.002);
// * nothing is stored on the server.

import { NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { rateLimitAll } from '@/lib/security/rateLimit';
import {
	BrandCheckError,
	parseBrandRequest,
	runBrandCheck,
	type BrandCheckBody,
} from '@/lib/brand/check';
import { createLogger, errorCode } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

const log = createLogger('brand-awareness');

export async function POST(req: Request) {
	try {
		const supabase = await supabaseAriClearServer();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const limit = await rateLimitAll([
			[`brand:${user.id}`, 5, 60_000],
			[`brand-day:${user.id}`, 20, 86_400_000],
		]);
		if (!limit.ok) {
			return NextResponse.json(
				{ error: 'You have reached the brand check limit for now. Please try again later.' },
				{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
			);
		}

		const parsed = parseBrandRequest(((await req.json().catch(() => null)) ?? {}) as BrandCheckBody);
		if (typeof parsed === 'string') {
			return NextResponse.json({ error: parsed }, { status: 400 });
		}

		const result = await runBrandCheck(parsed);
		return NextResponse.json({ result, checkedAt: new Date().toISOString() });
	} catch (err) {
		if (err instanceof BrandCheckError) {
			return NextResponse.json({ error: err.message }, { status: err.status });
		}
		log.error('failed', { code: errorCode(err) });
		return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
	}
}
