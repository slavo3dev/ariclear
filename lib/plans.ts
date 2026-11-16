// lib/plans.ts
// Display helpers for plan (tier) names and badge colours.
// Prices, site limits and term length come from lib/entitlements.ts.
// DB tier keys stay stable (`starter`, `pro`); only the display names change.

import { CUSTOM_PLAN, isLegion, PAID_PLANS, PLAN_TERM_MONTHS, type PaidTier } from '@/lib/entitlements';

export const PLANS = {
	starter: {
		...PAID_PLANS.starter,
		termMonths: PLAN_TERM_MONTHS,
		badge: 'bg-green-100 text-green-700 ring-green-300',
	},
	pro: {
		...PAID_PLANS.pro,
		termMonths: PLAN_TERM_MONTHS,
		badge: 'bg-purple-100 text-purple-700 ring-purple-300',
	},
} as const;

export type { PaidTier };

// Non-paid states that can be shown in the UI
const OTHER_TIERS: Record<string, { label: string; badge: string }> = {
	free: { label: 'Free', badge: 'bg-gray-100 text-gray-700 ring-gray-300' },
	expired: {
		label: 'Plan ended',
		badge: 'bg-amber-100 text-amber-700 ring-amber-300',
	},
};

const FALLBACK_BADGE = 'bg-gray-100 text-gray-700 ring-gray-300';

/**
 * Display name of a plan. Pass the account's site limit so a Centurion
 * account with a custom, higher limit shows as Legion.
 */
export function getTierLabel(tier?: string | null, websitesLimit?: number | null): string {
	if (!tier) return OTHER_TIERS.free.label;
	const key = tier.toLowerCase();
	if (isLegion(key, websitesLimit)) return CUSTOM_PLAN.label;
	if (key in PLANS) return PLANS[key as PaidTier].label;
	if (OTHER_TIERS[key]) return OTHER_TIERS[key].label;
	// legacy / unknown tier names: show as-is rather than guess
	return key.charAt(0).toUpperCase() + key.slice(1);
}

export function getTierBadgeColor(tier?: string | null): string {
	if (!tier) return OTHER_TIERS.free.badge;
	const key = tier.toLowerCase();
	if (key in PLANS) return PLANS[key as PaidTier].badge;
	return OTHER_TIERS[key]?.badge ?? FALLBACK_BADGE;
}
