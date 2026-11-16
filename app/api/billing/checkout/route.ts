// POST /api/billing/checkout  { plan: 'starter' | 'pro' }
// Creates a one-time Stripe Checkout Session for a 6-month plan and returns
// its URL. Nothing is granted here: the plan is applied only by the webhook
// after Stripe confirms the payment.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { rateLimit } from '@/lib/security/rateLimit';
import { isPaidTier, PAID_PLANS, type PaidTier } from '@/lib/entitlements';
import { getEntitlements } from '@/lib/entitlements.server';
import { appUrl, priceIdFor, stripe } from '@/lib/billing/stripe';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('billing/checkout');

export const runtime = 'nodejs';

const RANK: Record<PaidTier, number> = { starter: 1, pro: 2 };

export async function POST(req: NextRequest) {
	const supabase = await supabaseAriClearServer();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return NextResponse.json(
			{ error: 'Please sign in first.', errorCode: 'AUTH_REQUIRED' },
			{ status: 401 },
		);
	}

	const limit = await rateLimit(`checkout:${user.id}`, 5, 60_000);
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many attempts. Please wait a moment.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	const body = await req.json().catch(() => null);
	const plan = body?.plan;
	if (!isPaidTier(plan)) {
		return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
	}

	try {
		const ent = await getEntitlements(user.id);

		// An active higher plan buying a lower one would lose sites. Block it.
		if (ent.isPaid && ent.tier !== 'free' && RANK[ent.tier] > RANK[plan]) {
			const until = ent.expiresAt
				? ` until ${new Date(ent.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
				: '';
			return NextResponse.json(
				{
					error: `You already have ${PAID_PLANS[ent.tier].label}${until}. ${PAID_PLANS[plan].label} would be a downgrade.`,
					errorCode: 'DOWNGRADE_BLOCKED',
				},
				{ status: 409 },
			);
		}

		const base = appUrl();
		const session = await stripe().checkout.sessions.create({
			mode: 'payment',
			line_items: [{ price: priceIdFor(plan), quantity: 1 }],
			client_reference_id: user.id,
			customer_email: user.email ?? undefined,
			customer_creation: 'always',
			metadata: { user_id: user.id, tier: plan },
			payment_intent_data: { metadata: { user_id: user.id, tier: plan } },
			success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${base}/billing/cancel?plan=${plan}`,
		});

		if (!session.url) {
			return NextResponse.json(
				{ error: 'Could not start checkout. Please try again.' },
				{ status: 502 },
			);
		}
		return NextResponse.json({ url: session.url });
	} catch (err) {
		log.error('failed', { code: errorCode(err) });
		return NextResponse.json(
			{ error: 'Could not start checkout. Please try again.' },
			{ status: 500 },
		);
	}
}
