// lib/brand/check.ts
// SERVER ONLY. Runs one brand alignment check (see lib/brand/alignment):
// validates the request, fetches the website like a scan does, asks Claude
// (Haiku 5.5 by default) with structured outputs, and cleans the reply.
// The API route (app/api/brand-awareness/analyze) adds sign-in and limits.

import Anthropic from '@anthropic-ai/sdk';
import { extractPageContent, pageAsText } from '@/lib/analysis/extractPage';
import { fetchPage, ScanError } from '@/lib/analysis/runScan';
import { fence, UNTRUSTED_RULE } from '@/lib/analysis/untrusted';
import {
	BRAND_SCHEMA,
	cleanBrandResult,
	MAX_BIO,
	MAX_HANDLE,
	PLATFORMS,
	type BrandCheckRequest,
	type BrandCheckResult,
	type PlatformInput,
	type PlatformKey,
} from '@/lib/brand/alignment';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('brand-check');

/** A failure with a message that is safe to show the user. */
export class BrandCheckError extends Error {
	readonly status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'BrandCheckError';
		this.status = status;
	}
}

const BRAND_MODEL = process.env.ANTHROPIC_BRAND_MODEL || 'claude-haiku-5-5';
const MODEL_TIMEOUT_MS = 45_000;

let anthropic: Anthropic | null = null;
function client(): Anthropic {
	anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });
	return anthropic;
}

const SYSTEM = `
You are AriClear's brand alignment checker. A business's website is the source of truth for what it does, who it is for and what it offers. Check whether each of its social profiles says the same thing.

For every platform in the request:
- score (0-100): how well the profile matches the website.
  90-100 same offer, audience and name, consistent tone, points people to the site.
  70-89 mostly aligned, small gaps (missing audience, weaker wording, no link mention).
  40-69 noticeably different: vaguer, a different focus, or an outdated offer.
  0-39 contradicts the website, or could belong to a different business.
  When only a handle was given (no bio), judge only whether the handle matches the brand name, and say in whatItSays that the bio was not provided.
- whatItSays: one or two sentences on what a visitor to that profile would understand.
- matches: what lines up with the website (quote the bio).
- gaps: what is missing or contradicts the website (quote both sides when you can).
- suggestedBio: a rewrite of the bio that matches the website, in that platform's style, at most the character limit given for it. Concrete: what the business does, for whom, and a reason to visit the site. No hashtag spam, no emojis unless the current bio uses them.

Also give:
- website: what the website says (oneLiner, audience, offer, tone), in plain words.
- nameConsistency: is the business name the same everywhere (handles, bios, website)? Note any differences.
- verdict: one or two sentences, the biggest alignment problem first.
- topFixes: the 3 changes that would align the brand most, most important first, each naming its platform (or "all" / "website").

Be specific and honest; quote real text. Do not invent profile content that was not provided.

${UNTRUSTED_RULE}
`.trim();

export type BrandCheckBody = {
	websiteUrl?: unknown;
	businessName?: unknown;
	platforms?: unknown;
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Validated request, or an error message for the user. */
export function parseBrandRequest(body: BrandCheckBody): BrandCheckRequest | string {
	let websiteUrl = text(body.websiteUrl, 2000);
	if (!websiteUrl) return 'Enter your website address.';
	// Add https:// to a bare domain, but refuse any other scheme (ftp://, ...).
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(websiteUrl)) {
		if (!/^https?:\/\//i.test(websiteUrl)) return 'That website address is not valid.';
	} else {
		websiteUrl = `https://${websiteUrl}`;
	}
	try {
		const u = new URL(websiteUrl);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
	} catch {
		return 'That website address is not valid.';
	}

	const raw = (body.platforms && typeof body.platforms === 'object' ? body.platforms : {}) as Record<
		string,
		unknown
	>;
	const platforms: Partial<Record<PlatformKey, PlatformInput>> = {};
	for (const p of PLATFORMS) {
		const v = raw[p.key] as { handle?: unknown; bio?: unknown } | undefined;
		if (!v || typeof v !== 'object') continue;
		const handle = text(v.handle, MAX_HANDLE);
		const bio = text(v.bio, MAX_BIO);
		if (handle || bio) platforms[p.key] = { handle, bio };
	}
	if (Object.keys(platforms).length === 0) {
		return 'Add at least one social profile: paste its bio (and handle).';
	}

	return { websiteUrl, businessName: text(body.businessName, 200), platforms };
}

function userMessage(req: BrandCheckRequest, websiteText: string): string {
	const profiles = PLATFORMS.filter((p) => req.platforms[p.key]).map((p) => {
		const v = req.platforms[p.key]!;
		return [
			`PLATFORM: ${p.key} (${p.label}), suggestedBio limit ${p.bioMax} characters`,
			`HANDLE: ${v.handle || '(not given)'}`,
			`BIO: ${v.bio || '(not given — check the handle only)'}`,
		].join('\n');
	});
	return [
		`WEBSITE: ${req.websiteUrl}`,
		req.businessName ? `BUSINESS NAME (as the user typed it): ${req.businessName}` : '',
		fence('website', websiteText),
		fence('profiles', profiles.join('\n\n')),
	]
		.filter(Boolean)
		.join('\n\n');
}

/** Run the check. Throws BrandCheckError with a user-safe message. */
export async function runBrandCheck(req: BrandCheckRequest): Promise<BrandCheckResult> {
	if (!process.env.ANTHROPIC_API_KEY) {
		log.error('anthropic key missing');
		throw new BrandCheckError('Brand check is not available right now.', 503);
	}

	// Same fetch as a scan: SSRF-safe, refuses bot checks and empty pages
	// with a message the user can act on.
	let websiteText: string;
	try {
		const html = await fetchPage(req.websiteUrl);
		websiteText = pageAsText(extractPageContent(html, { maxBodyChars: 4000 }));
	} catch (err) {
		if (err instanceof ScanError) throw new BrandCheckError(err.message, err.status);
		throw err;
	}

	let res: Anthropic.Message;
	try {
		res = await client().messages.create(
			{
				model: BRAND_MODEL,
				max_tokens: 8000,
				system: SYSTEM,
				messages: [{ role: 'user', content: userMessage(req, websiteText) }],
				output_config: {
					effort: 'medium',
					format: { type: 'json_schema', schema: BRAND_SCHEMA },
				},
			},
			{ timeout: MODEL_TIMEOUT_MS },
		);
	} catch (err) {
		if (err instanceof Anthropic.RateLimitError) {
			throw new BrandCheckError('Busy right now. Please try again in a minute.', 429);
		}
		log.error('model call failed', { code: errorCode(err) });
		throw new BrandCheckError('The brand check failed. Please try again.', 502);
	}

	if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') {
		log.warn('model stopped early', { reason: res.stop_reason });
		throw new BrandCheckError('The brand check could not finish. Please try again.', 502);
	}

	const out = res.content
		.filter((b): b is Anthropic.TextBlock => b.type === 'text')
		.map((b) => b.text)
		.join('')
		.trim();

	let json: unknown;
	try {
		json = JSON.parse(out);
	} catch {
		log.error('model returned invalid JSON');
		throw new BrandCheckError('The brand check failed. Please try again.', 502);
	}

	const result = cleanBrandResult(json, req.platforms);
	if (!result) {
		log.error('model returned an unusable result');
		throw new BrandCheckError('The brand check failed. Please try again.', 502);
	}
	return result;
}
