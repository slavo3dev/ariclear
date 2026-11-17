// lib/analytics.ts
// CLIENT ONLY. Google Analytics 4 events for the funnel:
//   demo scan → sign up → full scan → begin checkout → purchase
// plus feature use (PDF, rewrite test, brand check, plan request).
//
// One typed list of events, so names never drift between components and GA
// reports. GA4 recommended names (sign_up, login, begin_checkout, purchase,
// generate_lead) are used where they exist, so GA's built-in reports work.
//
// Privacy: never send emails, user IDs, tokens or the scanned URL. Only plan
// names, scores, counts and short reason codes. Safe to call anywhere: it is
// a no-op when GA is not loaded (no NEXT_PUBLIC_GA_ID, ad blocker, SSR).

import { PAID_PLANS, type PaidTier } from '@/lib/entitlements';

type Item = { item_id: string; item_name: string; price: number; quantity: number };
type Ecommerce = { currency: 'USD'; value: number; items: Item[] };

export type AnalyticsEvents = {
	// Homepage demo scan (signed out).
	demo_scan_start: Record<string, never>;
	demo_scan_complete: { score: number };
	demo_scan_error: { reason: string };
	// Account.
	sign_up: { method: 'email' };
	login: { method: 'email' };
	// Full scan (/scan).
	scan_start: { plan: string; two_model: boolean };
	scan_complete: { plan: string; two_model: boolean; clarity_score?: number; ai_seo_score?: number };
	scan_error: { plan: string; reason: string };
	// Money.
	begin_checkout: Ecommerce;
	purchase: Ecommerce & { transaction_id: string };
	generate_lead: { lead_source: 'plan_request'; plan: string; websites: number };
	// Features.
	pdf_download: Record<string, never>;
	rewrite_test: { before_score: number; after_score: number };
	brand_check_start: { platforms: number };
	brand_check_complete: { platforms: number; score: number };
	brand_check_error: { reason: string };
};

export type AnalyticsEvent = keyof AnalyticsEvents;

type Gtag = (command: 'event', name: string, params?: Record<string, unknown>) => void;

export function track<E extends AnalyticsEvent>(name: E, params: AnalyticsEvents[E]): void {
	if (typeof window === 'undefined') return;
	try {
		const gtag = (window as unknown as { gtag?: Gtag }).gtag;
		if (typeof gtag === 'function') gtag('event', name, params);
		else if (process.env.NODE_ENV !== 'production') console.debug('[analytics]', name, params);
	} catch {
		// Analytics must never break the page.
	}
}

/** Ecommerce fields for a one-time plan, priced from the same constants as checkout. */
export function planEcommerce(tier: PaidTier): Ecommerce {
	const p = PAID_PLANS[tier];
	return {
		currency: 'USD',
		value: p.priceUsd,
		items: [{ item_id: tier, item_name: p.label, price: p.priceUsd, quantity: 1 }],
	};
}

/** A short reason code from an HTTP status, for *_error events. */
export function httpReason(status: number): string {
	if (status === 429) return 'rate_limited';
	if (status === 401) return 'signed_out';
	if (status === 403) return 'limit_reached';
	if (status >= 500) return 'server_error';
	return `http_${status}`;
}

/**
 * The purchase event, sent once per Stripe Checkout session. The session id
 * is hashed so the raw id never reaches GA; GA also de-duplicates purchases
 * by transaction_id, and sessionStorage stops a refresh from re-sending it.
 */
export async function trackPurchaseOnce(tier: PaidTier, checkoutSessionId: string): Promise<void> {
	if (typeof window === 'undefined' || !checkoutSessionId) return;
	try {
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(checkoutSessionId));
		const transactionId = Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
		const key = `ariclear.ga.purchase.${transactionId}`;
		try {
			if (window.sessionStorage.getItem(key)) return;
			window.sessionStorage.setItem(key, '1');
		} catch {
			// Storage blocked: GA's transaction_id de-duplication still applies.
		}
		track('purchase', { ...planEcommerce(tier), transaction_id: transactionId });
	} catch {
		// ignore
	}
}
