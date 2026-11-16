// POST /api/plan-request
// "Questions about a plan?" contact form, and the Legion request form (more
// sites than Centurion, price agreed by contact). Every request is kept as its own
// row (INSERT, not upsert), so a second message from the same person is not
// lost. plan_requests has RLS on and no policies: only the service role
// writes or reads it.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import { clientIp, rateLimit } from '@/lib/security/rateLimit';
import { CUSTOM_PLAN, isPaidTier, PAID_PLANS } from '@/lib/entitlements';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('plan-request');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(v: unknown, max: number): string | null {
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t ? t.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
	const limit = await rateLimit(`plan-request:${clientIp(req)}`, 5, 10 * 60_000);
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many requests. Please try again later.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	const body = await req.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}

	const email = text(body.email, 254)?.toLowerCase() ?? null;
	const plan = body.plan;
	const websites = Number(body.websites);

	if (!email || !EMAIL_RE.test(email)) {
		return NextResponse.json(
			{ error: 'Please enter a valid email address.' },
			{ status: 400 },
		);
	}
	const isCustom = plan === CUSTOM_PLAN.key;
	if (!isCustom && !isPaidTier(plan)) {
		return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
	}
	const [minSites, maxSites] = isCustom
		? [CUSTOM_PLAN.minWebsites, CUSTOM_PLAN.maxWebsites]
		: [1, PAID_PLANS[plan as keyof typeof PAID_PLANS].websites];
	if (!Number.isInteger(websites) || websites < minSites || websites > maxSites) {
		return NextResponse.json(
			{ error: 'Invalid number of websites.' },
			{ status: 400 },
		);
	}

	try {
		const { error } = await supabaseAriClearAdmin()
			.from('plan_requests')
			.insert({
				email,
				phone: text(body.phone, 40),
				plan,
				websites,
				url: text(body.url, 500),
				notes: text(body.notes, 2000),
				source_url: text(body.sourceUrl, 500),
			});

		if (error) {
			log.error('insert failed', { code: error.code ?? 'unknown' });
			return NextResponse.json(
				{ error: 'Failed to save request' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true }, { status: 201 });
	} catch (err) {
		log.error('unexpected failure', { code: errorCode(err) });
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
