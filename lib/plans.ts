// lib/plans.ts
// Single source of truth for plan (tier) names and badge colours.
// DB tier keys stay stable (`starter`, `pro`); only the display names change.

export const PLANS = {
	starter: {
		label: 'Gladiator',
		priceUsd: 39,
		termMonths: 6,
		websites: 1,
		badge: 'bg-green-100 text-green-700 ring-green-300',
	},
	pro: {
		label: 'Centurion',
		priceUsd: 99,
		termMonths: 6,
		websites: 3,
		badge: 'bg-purple-100 text-purple-700 ring-purple-300',
	},
} as const;

export type PaidTier = keyof typeof PLANS;

// Non-paid / transitional states that can exist in user_subscriptions
const OTHER_TIERS: Record<string, { label: string; badge: string }> = {
	free: { label: 'No plan', badge: 'bg-gray-100 text-gray-700 ring-gray-300' },
	trial: { label: 'Trial', badge: 'bg-blue-100 text-blue-700 ring-blue-300' },
	trial_expired: {
		label: 'Trial ended',
		badge: 'bg-amber-100 text-amber-700 ring-amber-300',
	},
};

const FALLBACK_BADGE = 'bg-gray-100 text-gray-700 ring-gray-300';

export function getTierLabel(tier?: string | null): string {
	if (!tier) return OTHER_TIERS.free.label;
	const key = tier.toLowerCase();
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
