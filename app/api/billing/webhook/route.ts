// POST /api/billing/webhook
// Stripe webhook. The only place a paid plan is granted.
//
// Handled events:
//   checkout.session.completed             (card payments: paid immediately)
//   checkout.session.async_payment_succeeded (delayed methods, e.g. bank debits)
//   checkout.session.async_payment_failed  (logged; nothing to undo)
//   charge.refunded                        (full refund ends the plan)
//
// Idempotent: apply_purchase()/revoke_purchase() record the event id (and the
// session id), so Stripe retries and the completed + async_succeeded pair
// apply only once.
// Returns 500 on database errors so Stripe retries.

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/billing/stripe';
import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import { isPaidTier, PAID_PLANS, PLAN_TERM_MONTHS } from '@/lib/entitlements';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('billing/webhook');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idOf(ref: string | { id: string } | null | undefined): string | null {
	if (!ref) return null;
	return typeof ref === 'string' ? ref : ref.id;
}

async function applyCheckoutSession(
	event: Stripe.Event,
	session: Stripe.Checkout.Session,
): Promise<NextResponse> {
	if (session.mode !== 'payment' || session.payment_status !== 'paid') {
		// Not paid yet (delayed payment method). Wait for async_payment_succeeded.
		return NextResponse.json({ received: true });
	}

	const userId = session.metadata?.user_id ?? session.client_reference_id;
	const tier = session.metadata?.tier;

	if (!userId || !UUID_RE.test(userId) || !isPaidTier(tier)) {
		// Not one of ours (or created by hand in the dashboard). Do not retry.
		log.warn('session without valid metadata', { event: event.id });
		return NextResponse.json({ received: true });
	}

	const { data, error } = await supabaseAriClearAdmin().rpc('apply_purchase', {
		p_event_id: event.id,
		p_event_type: event.type,
		p_user_id: userId,
		p_tier: tier,
		p_websites: PAID_PLANS[tier].websites,
		p_term_months: PLAN_TERM_MONTHS,
		p_session_id: session.id,
		p_payment_intent_id: idOf(session.payment_intent),
		p_customer_id: idOf(session.customer),
		p_amount_total: session.amount_total,
		p_currency: session.currency,
	});

	if (error) {
		log.error('apply_purchase failed', { code: error.code ?? 'unknown', event: event.id });
		return NextResponse.json({ error: 'Temporary failure' }, { status: 500 });
	}

	if (data === 'needs_review') {
		log.warn('purchase needs manual review', { event: event.id });
	}

	return NextResponse.json({ received: true, result: data });
}

async function revokeRefundedCharge(
	event: Stripe.Event,
	charge: Stripe.Charge,
): Promise<NextResponse> {
	const paymentIntentId = idOf(charge.payment_intent);
	if (!paymentIntentId) return NextResponse.json({ received: true });

	if (!charge.refunded) {
		// Partial refund: the plan stays. Handle by hand if needed.
		log.warn('partial refund, plan unchanged', { event: event.id });
		return NextResponse.json({ received: true });
	}

	const { data, error } = await supabaseAriClearAdmin().rpc('revoke_purchase', {
		p_event_id: event.id,
		p_event_type: event.type,
		p_payment_intent_id: paymentIntentId,
	});

	if (error) {
		log.error('revoke_purchase failed', { code: error.code ?? 'unknown', event: event.id });
		return NextResponse.json({ error: 'Temporary failure' }, { status: 500 });
	}
	if (data === 'needs_review') {
		log.warn('refund needs manual review', { event: event.id });
	}
	return NextResponse.json({ received: true, result: data });
}

export async function POST(req: NextRequest) {
	const secret = process.env.STRIPE_WEBHOOK_SECRET;
	const signature = req.headers.get('stripe-signature');
	if (!secret || !signature) {
		return NextResponse.json({ error: 'Bad request' }, { status: 400 });
	}

	// Signature verification needs the raw body, byte for byte.
	const payload = await req.text();

	let event: Stripe.Event;
	try {
		event = stripe().webhooks.constructEvent(payload, signature, secret);
	} catch {
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed':
			case 'checkout.session.async_payment_succeeded':
				return await applyCheckoutSession(
					event,
					event.data.object as Stripe.Checkout.Session,
				);
			case 'checkout.session.async_payment_failed':
				log.warn('async payment failed', { event: event.id });
				return NextResponse.json({ received: true });
			case 'charge.refunded':
				return await revokeRefundedCharge(
					event,
					event.data.object as Stripe.Charge,
				);
			default:
				return NextResponse.json({ received: true });
		}
	} catch (err) {
		log.error('unexpected failure', { code: errorCode(err), event: event.id });
		return NextResponse.json({ error: 'Temporary failure' }, { status: 500 });
	}
}
