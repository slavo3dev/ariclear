// lib/entitlements.ts
// Single source of truth for what each plan may do. Every limit lives here.
// Pure module (no DB access) so it is safe to import from client components.
// Server code loads a user's entitlements with getEntitlements() in
// lib/entitlements.server.ts and enforces them with the helpers below.

export type PaidTier = 'starter' | 'pro';
export type EffectiveTier = 'free' | PaidTier;

/** Paid features. A free account gets none of them. */
export type Feature =
	| 'rescan' // a second scan of any site
	| 'rewriteTest' // "Test your rewrite" scoring
	| 'technicalChecks' // live technical readiness checks
	| 'pdf' // PDF report download
	| 'trend'; // score trend across scans

export const FEATURE_LABELS: Record<Feature, string> = {
	rescan: 'Re-scans',
	rewriteTest: 'Rewrite tester',
	technicalChecks: 'Technical checks',
	pdf: 'PDF report',
	trend: 'Score trend',
};

/** Length of one paid term. One-time payment, no subscription. */
export const PLAN_TERM_MONTHS = 6;

/** Free account: 1 site, 1 full scan for life (including the suggested rewrite). */
export const FREE_LIMITS = {
	websites: 1,
	lifetimeScans: 1,
} as const;

/** Paid plans. DB tier keys stay `starter` / `pro`. */
export const PAID_PLANS: Record<
	PaidTier,
	{ label: string; priceUsd: number; websites: number }
> = {
	starter: { label: 'Gladiator', priceUsd: 39, websites: 1 },
	pro: { label: 'Centurion', priceUsd: 99, websites: 3 },
};

/**
 * Legion: more sites than Centurion, price agreed by contact (the plan
 * request form). Not a separate DB tier: a Legion customer is a 'pro'
 * account with a higher user_subscriptions.websites_limit, set by hand.
 */
export const CUSTOM_PLAN = {
	key: 'legion',
	label: 'Legion',
	minWebsites: PAID_PLANS.pro.websites + 1,
	maxWebsites: 1000,
} as const;

/** A 'pro' account with more sites than Centurion includes is a Legion account. */
export function isLegion(tier: string | null | undefined, websitesLimit: number | null | undefined): boolean {
	return tier === 'pro' && (websitesLimit ?? 0) > PAID_PLANS.pro.websites;
}

const FREE_FEATURES: Record<Feature, boolean> = {
	rescan: false,
	rewriteTest: false,
	technicalChecks: false,
	pdf: false,
	trend: false,
};

const PAID_FEATURES: Record<Feature, boolean> = {
	rescan: true,
	rewriteTest: true,
	technicalChecks: true,
	pdf: true,
	trend: true,
};

export function isPaidTier(tier: unknown): tier is PaidTier {
	return tier === 'starter' || tier === 'pro';
}

/** The columns of user_subscriptions that entitlements depend on. */
export type SubscriptionRow = {
	tier: string;
	websites_limit: number | null;
	plan_expires_at: string | null;
	is_comp: boolean | null;
	scans_used_total: number | null;
};

export type Entitlements = {
	/** Tier the user actually gets right now (expired paid plans count as free). */
	tier: EffectiveTier;
	isPaid: boolean;
	isComp: boolean;
	/** Had a paid plan that has ended. Read access to old scans stays. */
	isExpired: boolean;
	expiresAt: string | null;
	websitesLimit: number;
	websitesUsed: number;
	domains: string[];
	/** null = unlimited */
	lifetimeScansLimit: number | null;
	scansUsed: number;
	/** At least one scan (of an existing or new site) is possible. */
	canScan: boolean;
	/** A scan of a site not tracked yet is possible. */
	canAddSite: boolean;
	features: Record<Feature, boolean>;
};

export function resolveEntitlements(
	row: SubscriptionRow | null,
	domains: string[],
	now: Date = new Date(),
): Entitlements {
	const storedTier = row?.tier ?? 'free';
	const isComp = Boolean(row?.is_comp);
	const expiresAt = row?.plan_expires_at ?? null;
	const scansUsed = Math.max(0, row?.scans_used_total ?? 0);

	const notExpired =
		expiresAt !== null
			? new Date(expiresAt).getTime() > now.getTime()
			: isComp; // comp with no end date never expires
	const isPaid = isPaidTier(storedTier) && notExpired;
	const isExpired = isPaidTier(storedTier) && !notExpired;

	const tier: EffectiveTier = isPaid ? (storedTier as PaidTier) : 'free';

	const websitesLimit = isPaid
		? Math.max(
				1,
				row?.websites_limit ?? PAID_PLANS[storedTier as PaidTier].websites,
			)
		: FREE_LIMITS.websites;

	const lifetimeScansLimit = isPaid ? null : FREE_LIMITS.lifetimeScans;
	const scansLeft =
		lifetimeScansLimit === null || scansUsed < lifetimeScansLimit;

	const websitesUsed = domains.length;
	const canAddSite = scansLeft && websitesUsed < websitesLimit;
	const canScan = scansLeft && (websitesUsed > 0 || canAddSite);

	return {
		tier,
		isPaid,
		isComp: isPaid && isComp,
		isExpired,
		expiresAt: isPaid || isExpired ? expiresAt : null,
		websitesLimit,
		websitesUsed,
		domains,
		lifetimeScansLimit,
		scansUsed,
		canScan,
		canAddSite,
		features: isPaid ? { ...PAID_FEATURES } : { ...FREE_FEATURES },
	};
}

// ─── Enforcement helpers ─────────────────────────────────────────────────────

export type ScanDeniedCode =
	| 'FREE_SCAN_USED'
	| 'PLAN_EXPIRED'
	| 'SCAN_LIMIT_REACHED';

export type UpgradeError = {
	error: string;
	errorCode: ScanDeniedCode | 'UPGRADE_REQUIRED';
	message: string;
	requiresUpgrade: true;
	tier: EffectiveTier;
	limit: number;
	current: number;
	feature?: Feature;
};

function plural(n: number, word: string) {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Can this user scan `domain` right now? Returns null when allowed. */
export function scanDenial(
	ent: Entitlements,
	domain: string,
): UpgradeError | null {
	const base = {
		requiresUpgrade: true as const,
		tier: ent.tier,
		limit: ent.websitesLimit,
		current: ent.websitesUsed,
	};

	if (
		ent.lifetimeScansLimit !== null &&
		ent.scansUsed >= ent.lifetimeScansLimit
	) {
		return ent.isExpired
			? {
					...base,
					error: 'Plan expired',
					errorCode: 'PLAN_EXPIRED',
					message:
						'Your plan has ended. Your saved scans are still here. Renew to scan again.',
				}
			: {
					...base,
					error: 'Free scan used',
					errorCode: 'FREE_SCAN_USED',
					message:
						'You have used your free scan. Choose Gladiator or Centurion to re-scan and track your site.',
				};
	}

	if (!ent.domains.includes(domain) && ent.websitesUsed >= ent.websitesLimit) {
		return {
			...base,
			error: 'Website limit reached',
			errorCode: 'SCAN_LIMIT_REACHED',
			message: `Your plan covers ${plural(ent.websitesLimit, 'website')} (${ent.domains.join(', ')}). ${
				ent.tier === 'pro'
					? `Delete a site’s scans to free its slot, or ask about ${CUSTOM_PLAN.label} for more sites.`
					: `Upgrade to Centurion for ${PAID_PLANS.pro.websites} websites.`
			}`,
		};
	}

	return null;
}

/** Is `feature` allowed? Returns null when allowed. */
export function featureDenial(
	ent: Entitlements,
	feature: Feature,
): UpgradeError | null {
	if (ent.features[feature]) return null;
	return {
		error: 'Upgrade required',
		errorCode: 'UPGRADE_REQUIRED',
		message: ent.isExpired
			? `Your plan has ended. Renew to use ${FEATURE_LABELS[feature]}.`
			: `${FEATURE_LABELS[feature]} is part of Gladiator and Centurion.`,
		requiresUpgrade: true,
		tier: ent.tier,
		limit: ent.websitesLimit,
		current: ent.websitesUsed,
		feature,
	};
}

/** Arguments for the claim_scan() database function. */
export function claimScanLimits(ent: Entitlements) {
	return {
		p_max_sites: ent.websitesLimit,
		p_max_lifetime_scans: ent.lifetimeScansLimit,
	};
}

/** Shape returned to the browser by /api/subscription and /api/scans/limit. */
export function publicEntitlements(ent: Entitlements) {
	return {
		tier: ent.tier,
		isPaid: ent.isPaid,
		isComp: ent.isComp,
		isExpired: ent.isExpired,
		expiresAt: ent.expiresAt,
		websitesLimit: ent.websitesLimit,
		websitesUsed: ent.websitesUsed,
		domains: ent.domains,
		lifetimeScansLimit: ent.lifetimeScansLimit,
		scansUsed: ent.scansUsed,
		canScan: ent.canScan,
		canAddSite: ent.canAddSite,
		features: ent.features,
	};
}

export type PublicEntitlements = ReturnType<typeof publicEntitlements>;
