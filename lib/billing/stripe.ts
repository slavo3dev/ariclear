// lib/billing/stripe.ts
// SERVER ONLY. Stripe client and the env-driven price map.
// Plans are one-time payments (Checkout mode "payment"), not subscriptions.

import Stripe from 'stripe';
import type { PaidTier } from '@/lib/entitlements';

let cached: Stripe | null = null;

export function stripe(): Stripe {
	if (cached) return cached;
	const key = process.env.STRIPE_SECRET_KEY;
	if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
	cached = new Stripe(key);
	return cached;
}

const PRICE_ENV: Record<PaidTier, string> = {
	starter: 'STRIPE_PRICE_GLADIATOR',
	pro: 'STRIPE_PRICE_CENTURION',
};

export function priceIdFor(tier: PaidTier): string {
	const id = process.env[PRICE_ENV[tier]];
	if (!id) throw new Error(`Missing ${PRICE_ENV[tier]}`);
	return id;
}

/** Public base URL, used for Checkout success/cancel redirects. */
export function appUrl(): string {
	const url = process.env.NEXT_PUBLIC_APP_URL;
	if (!url) throw new Error('Missing NEXT_PUBLIC_APP_URL');
	return url.replace(/\/$/, '');
}
