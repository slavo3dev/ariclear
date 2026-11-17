// lib/brand/alignment.ts
// Brand alignment check: do the social profiles say the same thing as the
// website? Shared by the API route (app/api/brand-awareness/analyze) and the
// page (app/brand-awareness), so both agree on the platforms, limits and the
// result shape. Pure: no server-only imports.
//
// The website is the source of truth. The user pastes each profile's bio
// (most social networks block automated fetching, so we never pretend to
// have read a profile we were not given). A platform with only a handle is
// checked for the name alone.

export const PLATFORMS = [
	{ key: 'instagram', label: 'Instagram', bioLabel: 'Bio', bioMax: 150, hint: 'Profile → the text under your name' },
	{ key: 'linkedin', label: 'LinkedIn', bioLabel: 'Tagline / headline', bioMax: 220, hint: 'Company page tagline, or your headline' },
	{ key: 'facebook', label: 'Facebook', bioLabel: 'Intro', bioMax: 100, hint: 'Page → Intro' },
	{ key: 'twitter', label: 'X (Twitter)', bioLabel: 'Bio', bioMax: 160, hint: 'Profile → bio' },
	{ key: 'tiktok', label: 'TikTok', bioLabel: 'Bio', bioMax: 80, hint: 'Profile → bio' },
	{ key: 'youtube', label: 'YouTube', bioLabel: 'Channel description', bioMax: 1000, hint: 'Channel → About' },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]['key'];
export const PLATFORM_KEYS = PLATFORMS.map((p) => p.key) as PlatformKey[];

/** Input limits (server-enforced). */
export const MAX_HANDLE = 100;
/** Pasted text may be longer than the platform's own limit (an About page). */
export const MAX_BIO = 2000;

export type PlatformInput = { handle?: string; bio?: string };

export type BrandCheckRequest = {
	websiteUrl: string;
	businessName?: string;
	platforms: Partial<Record<PlatformKey, PlatformInput>>;
};

export type PlatformResult = {
	platform: PlatformKey;
	/** 'checked' = a bio was given; 'handle_only' = only the name was checked. */
	status: 'checked' | 'handle_only';
	/** 0-100 alignment with the website. */
	score: number;
	whatItSays: string;
	matches: string[];
	gaps: string[];
	/** A rewritten bio that matches the website, within the platform's limit. */
	suggestedBio: string;
};

export type BrandCheckResult = {
	/** 0-100, the average of the checked platforms (computed in code). */
	alignmentScore: number;
	verdict: string;
	website: { oneLiner: string; audience: string; offer: string; tone: string };
	nameConsistency: { consistent: boolean; note: string };
	platforms: PlatformResult[];
	topFixes: Array<{ title: string; details: string; platform: string }>;
};

/** JSON schema of the model's reply, for structured outputs. */
export const BRAND_SCHEMA: { [key: string]: unknown } = {
	type: 'object',
	additionalProperties: false,
	required: ['verdict', 'website', 'nameConsistency', 'platforms', 'topFixes'],
	properties: {
		verdict: { type: 'string' },
		website: {
			type: 'object',
			additionalProperties: false,
			required: ['oneLiner', 'audience', 'offer', 'tone'],
			properties: {
				oneLiner: { type: 'string' },
				audience: { type: 'string' },
				offer: { type: 'string' },
				tone: { type: 'string' },
			},
		},
		nameConsistency: {
			type: 'object',
			additionalProperties: false,
			required: ['consistent', 'note'],
			properties: { consistent: { type: 'boolean' }, note: { type: 'string' } },
		},
		platforms: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['platform', 'score', 'whatItSays', 'matches', 'gaps', 'suggestedBio'],
				properties: {
					platform: { type: 'string', enum: [...PLATFORM_KEYS] },
					score: { type: 'integer' },
					whatItSays: { type: 'string' },
					matches: { type: 'array', items: { type: 'string' } },
					gaps: { type: 'array', items: { type: 'string' } },
					suggestedBio: { type: 'string' },
				},
			},
		},
		topFixes: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'details', 'platform'],
				properties: {
					title: { type: 'string' },
					details: { type: 'string' },
					platform: { type: 'string' },
				},
			},
		},
	},
};

// ─── Cleaning the model's reply ─────────────────────────────────────────────

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: unknown, items: number, max: number) =>
	Array.isArray(v)
		? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, items).map((x) => x.trim().slice(0, max))
		: [];
const clamp = (n: unknown) =>
	Math.min(100, Math.max(0, Math.round(typeof n === 'number' && Number.isFinite(n) ? n : 0)));

/**
 * Turn the model's reply into the result the user sees. Only platforms the
 * user actually gave are kept, each once; the status comes from the input,
 * not the model; the overall score is the average of the checked platforms.
 * Returns null when the reply is unusable.
 */
export function cleanBrandResult(
	raw: unknown,
	given: Partial<Record<PlatformKey, PlatformInput>>,
): BrandCheckResult | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
	if (!Array.isArray(r.platforms)) return null;

	const seen = new Set<PlatformKey>();
	const platforms: PlatformResult[] = [];
	for (const p of r.platforms) {
		const key = p?.platform as PlatformKey;
		if (!PLATFORM_KEYS.includes(key) || seen.has(key) || !given[key]) continue;
		seen.add(key);
		const def = PLATFORMS.find((d) => d.key === key)!;
		platforms.push({
			platform: key,
			status: given[key]?.bio?.trim() ? 'checked' : 'handle_only',
			score: clamp(p.score),
			whatItSays: str(p.whatItSays, 600),
			matches: strList(p.matches, 5, 300),
			gaps: strList(p.gaps, 5, 300),
			suggestedBio: str(p.suggestedBio, def.bioMax),
		});
	}
	if (platforms.length === 0) return null;
	// Keep the page's platform order.
	platforms.sort((a, b) => PLATFORM_KEYS.indexOf(a.platform) - PLATFORM_KEYS.indexOf(b.platform));

	const checked = platforms.filter((p) => p.status === 'checked');
	const scored = checked.length ? checked : platforms;
	const alignmentScore = Math.round(scored.reduce((n, p) => n + p.score, 0) / scored.length);

	const fixes = Array.isArray(r.topFixes) ? r.topFixes : [];
	return {
		alignmentScore,
		verdict: str(r.verdict, 600),
		website: {
			oneLiner: str(r.website?.oneLiner, 400),
			audience: str(r.website?.audience, 300),
			offer: str(r.website?.offer, 300),
			tone: str(r.website?.tone, 200),
		},
		nameConsistency: {
			consistent: r.nameConsistency?.consistent === true,
			note: str(r.nameConsistency?.note, 400),
		},
		platforms,
		topFixes: fixes
			.filter((f: unknown) => f && typeof f === 'object')
			.slice(0, 3)
			.map((f: Record<string, unknown>) => ({
				title: str(f.title, 200),
				details: str(f.details, 600),
				platform: str(f.platform, 40),
			}))
			.filter((f: { title: string }) => f.title),
	};
}
