// lib/analysis/technicalChecks.ts
// Deterministic (no LLM) technical checks for AI + search readiness.
// Same input -> same output, every time. Each check can carry a copy-paste fix.

import * as cheerio from 'cheerio';
import { safeFetch } from '@/lib/security/safeFetch';

export type CheckStatus = 'pass' | 'warn' | 'fail';
export type CheckImpact = 'high' | 'medium' | 'low';
export type CheckGroup =
	| 'Crawlability'
	| 'AI crawlers'
	| 'Structured data'
	| 'Page basics'
	| 'Sharing';

export type TechnicalCheck = {
	id: string;
	group: CheckGroup;
	label: string;
	status: CheckStatus;
	impact: CheckImpact;
	detail: string;
	fix?: { label: string; language: string; code: string };
};

export type TechnicalReport = {
	url: string;
	finalUrl: string;
	score: number; // 0-100, weighted by impact
	counts: { pass: number; warn: number; fail: number };
	checks: TechnicalCheck[];
};

const UA = 'AriClearBot/1.0 (+https://ariclear.com)';

// ─── robots.txt parsing ───────────────────────────────────────────────────────

type RobotsGroup = { agents: string[]; disallow: string[]; allow: string[] };

function parseRobots(text: string): { groups: RobotsGroup[]; sitemaps: string[] } {
	const groups: RobotsGroup[] = [];
	const sitemaps: string[] = [];
	let current: RobotsGroup | null = null;
	let lastWasAgent = false;

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.split('#')[0].trim();
		if (!line) continue;
		const idx = line.indexOf(':');
		if (idx < 0) continue;
		const key = line.slice(0, idx).trim().toLowerCase();
		const value = line.slice(idx + 1).trim();

		if (key === 'user-agent') {
			if (!current || !lastWasAgent) {
				current = { agents: [], disallow: [], allow: [] };
				groups.push(current);
			}
			current.agents.push(value.toLowerCase());
			lastWasAgent = true;
		} else {
			lastWasAgent = false;
			if (key === 'sitemap') sitemaps.push(value);
			else if (current && key === 'disallow') current.disallow.push(value);
			else if (current && key === 'allow') current.allow.push(value);
		}
	}
	return { groups, sitemaps };
}

/** true if this agent is blocked from the whole site ("Disallow: /") */
function blocksWholeSite(groups: RobotsGroup[], agent: string): boolean {
	const a = agent.toLowerCase();
	const specific = groups.filter((g) => g.agents.includes(a));
	const applicable = specific.length
		? specific
		: groups.filter((g) => g.agents.includes('*'));
	return applicable.some(
		(g) => g.disallow.includes('/') && !g.allow.includes('/'),
	);
}

// Bots that fetch pages to ANSWER users (blocking them hurts AI visibility)
const ANSWER_BOTS = [
	'OAI-SearchBot',
	'ChatGPT-User',
	'PerplexityBot',
	'Perplexity-User',
	'Claude-SearchBot',
	'Claude-User',
];
// Bots that collect TRAINING data (blocking is a legitimate choice)
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];

// ─── helpers ──────────────────────────────────────────────────────────────────

function collectJsonLdTypes(node: unknown, out: Set<string>) {
	if (Array.isArray(node)) {
		node.forEach((n) => collectJsonLdTypes(n, out));
		return;
	}
	if (node && typeof node === 'object') {
		const obj = node as Record<string, unknown>;
		const t = obj['@type'];
		if (typeof t === 'string') out.add(t);
		else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && out.add(x));
		if (obj['@graph']) collectJsonLdTypes(obj['@graph'], out);
	}
}

const BUSINESS_TYPES = new Set([
	'Organization',
	'Corporation',
	'LocalBusiness',
	'ProfessionalService',
	'Product',
	'SoftwareApplication',
	'WebApplication',
	'Service',
	'Person',
	'Store',
	'Restaurant',
]);

function siteName(origin: string, title: string, ogSiteName: string): string {
	if (ogSiteName) return ogSiteName;
	const part = title.split(/\s[|\-–—·:]\s/)[0]?.trim();
	return part || new URL(origin).hostname.replace(/^www\./, '');
}

// JSON string safe to embed inside <script type="application/ld+json">
const jsonEscape = (s: string) => JSON.stringify(s).replace(/</g, '\\u003c');
// HTML attribute value (double-quoted)
const attr = (s: string) =>
	`"${s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`;

function buildJsonLd(name: string, url: string, description: string): string {
	return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "${url}/#organization",
      "name": ${jsonEscape(name)},
      "url": "${url}"
    },
    {
      "@type": "WebSite",
      "@id": "${url}/#website",
      "url": "${url}",
      "name": ${jsonEscape(name)},
      "description": ${jsonEscape(description || 'Add a one-sentence description of what you do and who it is for')},
      "publisher": { "@id": "${url}/#organization" }
    }
  ]
}
</script>`;
}

function buildLlmsTxt(
	name: string,
	description: string,
	links: { text: string; href: string }[],
): string {
	const lines = [
		`# ${name}`,
		'',
		`> ${description || 'One-sentence summary: what you do and who it is for.'}`,
		'',
		'## Key pages',
	];
	for (const l of links) lines.push(`- [${l.text}](${l.href})`);
	if (!links.length) lines.push('- [Home](/): what this site is about');
	return lines.join('\n');
}

// ─── main ─────────────────────────────────────────────────────────────────────

export async function runTechnicalChecks(rawUrl: string): Promise<TechnicalReport> {
	const page = await safeFetch(rawUrl, {
		timeoutMs: 10_000,
		maxBytes: 1_500_000,
		headers: { 'User-Agent': UA, Accept: 'text/html' },
	});

	const finalUrl = new URL(page.finalUrl);
	const origin = finalUrl.origin;
	const $ = cheerio.load(page.body);

	const title = $('title').first().text().trim();
	const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? '';
	const ogSite = $('meta[property="og:site_name"]').attr('content')?.trim() ?? '';
	const name = siteName(origin, title, ogSite);

	// Fetch robots.txt, llms.txt (and sitemap.xml if robots has none) in parallel
	const sideFetch = async (path: string, readBody: boolean) => {
		try {
			return await safeFetch(origin + path, {
				timeoutMs: 6_000,
				maxBytes: 300_000,
				readBody,
				headers: { 'User-Agent': UA },
			});
		} catch {
			return null;
		}
	};
	const [robotsRes, llmsRes] = await Promise.all([
		sideFetch('/robots.txt', true),
		sideFetch('/llms.txt', true),
	]);
	const robotsOk =
		!!robotsRes &&
		robotsRes.ok &&
		!/<html[\s>]/i.test(robotsRes.body.slice(0, 500));
	const robots = robotsOk ? parseRobots(robotsRes!.body) : { groups: [], sitemaps: [] };

	let sitemapOk = robots.sitemaps.length > 0;
	if (!sitemapOk) {
		const sm = await sideFetch('/sitemap.xml', false);
		sitemapOk = !!sm && sm.ok;
	}

	const checks: TechnicalCheck[] = [];
	const add = (c: TechnicalCheck) => checks.push(c);

	// ── Crawlability ──
	const bodyText = (() => {
		const $b = cheerio.load(page.body);
		$b('script, style, noscript, svg').remove();
		return $b('body').text().replace(/\s+/g, ' ').trim();
	})();
	add({
		id: 'raw-html-content',
		group: 'Crawlability',
		label: 'Content is readable without JavaScript',
		impact: 'high',
		status: bodyText.length >= 600 ? 'pass' : bodyText.length >= 200 ? 'warn' : 'fail',
		detail:
			bodyText.length >= 600
				? `${bodyText.length} characters of text are in the raw HTML — crawlers that do not run JavaScript can read your page.`
				: `Only ${bodyText.length} characters of text are in the raw HTML. Many AI crawlers do not run JavaScript, so they may see an almost empty page. Use server-side rendering or pre-rendering for your key pages.`,
	});
	add({
		id: 'https',
		group: 'Crawlability',
		label: 'Served over HTTPS',
		impact: 'medium',
		status: finalUrl.protocol === 'https:' ? 'pass' : 'fail',
		detail:
			finalUrl.protocol === 'https:'
				? 'The page is served over HTTPS.'
				: 'The page is served over plain HTTP. Redirect to HTTPS.',
	});
	add({
		id: 'sitemap',
		group: 'Crawlability',
		label: 'Sitemap available',
		impact: 'medium',
		status: sitemapOk ? 'pass' : 'warn',
		detail: sitemapOk
			? 'A sitemap was found.'
			: 'No sitemap found at /sitemap.xml or in robots.txt. Add one so crawlers discover your pages.',
		fix: sitemapOk
			? undefined
			: {
					label: 'Add to robots.txt',
					language: 'text',
					code: `Sitemap: ${origin}/sitemap.xml`,
				},
	});

	// ── AI crawlers ──
	if (!robotsOk) {
		add({
			id: 'robots',
			group: 'AI crawlers',
			label: 'robots.txt does not block AI search bots',
			impact: 'high',
			status: 'pass',
			detail: 'No robots.txt found, so nothing is blocked. (Adding one is still good practice.)',
		});
	} else {
		const blockedAnswer = ANSWER_BOTS.filter((b) => blocksWholeSite(robots.groups, b));
		const blockedTraining = TRAINING_BOTS.filter((b) => blocksWholeSite(robots.groups, b));
		add({
			id: 'robots',
			group: 'AI crawlers',
			label: 'robots.txt does not block AI search bots',
			impact: 'high',
			status: blockedAnswer.length ? 'fail' : 'pass',
			detail: blockedAnswer.length
				? `robots.txt blocks ${blockedAnswer.join(', ')}. These bots fetch pages to answer users, so blocking them keeps you out of AI answers.${
						robots.groups.some((g) => g.agents.includes('*') && g.disallow.includes('/'))
							? ' Your "User-agent: *" rule disallows the whole site.'
							: ''
					}`
				: blockedTraining.length
					? `AI answer/search bots are allowed. Training bots blocked by choice: ${blockedTraining.join(', ')}.`
					: 'AI answer and search bots are allowed.',
			fix: blockedAnswer.length
				? {
						label: 'Allow AI search bots in robots.txt',
						language: 'text',
						code: ANSWER_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n'),
					}
				: undefined,
		});
	}

	const llmsOk = !!llmsRes && llmsRes.ok && !/<html[\s>]/i.test(llmsRes.body.slice(0, 500));
	const internalLinks: { text: string; href: string }[] = [];
	const seen = new Set<string>();
	$('nav a[href], header a[href]').each((_, el) => {
		const text = $(el).text().replace(/\s+/g, ' ').trim();
		const href = $(el).attr('href') ?? '';
		if (!text || text.length > 40 || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
		try {
			const abs = new URL(href, origin);
			if (abs.origin !== origin || seen.has(abs.pathname)) return;
			seen.add(abs.pathname);
			internalLinks.push({ text, href: abs.toString() });
		} catch {
			/* ignore */
		}
	});
	add({
		id: 'llms-txt',
		group: 'AI crawlers',
		label: 'llms.txt summary for AI assistants',
		impact: 'low',
		status: llmsOk ? 'pass' : 'warn',
		detail: llmsOk
			? 'An /llms.txt file was found.'
			: 'No /llms.txt. This is an emerging convention and not yet confirmed to be used by the major AI engines, so treat it as optional and low impact — but it is cheap to add.',
		fix: llmsOk
			? undefined
			: {
					label: 'Create /llms.txt',
					language: 'markdown',
					code: buildLlmsTxt(name, metaDesc, internalLinks.slice(0, 8)),
				},
	});

	// ── Structured data ──
	const types = new Set<string>();
	let jsonLdErrors = 0;
	$('script[type="application/ld+json"]').each((_, el) => {
		try {
			collectJsonLdTypes(JSON.parse($(el).contents().text()), types);
		} catch {
			jsonLdErrors++;
		}
	});
	const hasBusinessType = [...types].some((t) => BUSINESS_TYPES.has(t));
	const jsonLdFix = {
		label: 'Add to <head>',
		language: 'html',
		code: buildJsonLd(name, origin, metaDesc),
	};
	add({
		id: 'json-ld',
		group: 'Structured data',
		label: 'Schema.org JSON-LD describes the business',
		impact: 'high',
		status: hasBusinessType ? 'pass' : types.size ? 'warn' : 'fail',
		detail: hasBusinessType
			? `Found structured data: ${[...types].join(', ')}.`
			: types.size
				? `Found ${[...types].join(', ')} but no Organization/Product/Service type that says what the business is.`
				: 'No JSON-LD structured data found. It is the clearest way to tell machines who you are and what you offer.',
		fix: hasBusinessType ? undefined : jsonLdFix,
	});
	if (jsonLdErrors) {
		add({
			id: 'json-ld-valid',
			group: 'Structured data',
			label: 'JSON-LD is valid JSON',
			impact: 'medium',
			status: 'fail',
			detail: `${jsonLdErrors} JSON-LD block${jsonLdErrors > 1 ? 's' : ''} could not be parsed. Invalid JSON is ignored by crawlers.`,
		});
	}

	// ── Page basics ──
	const titleLen = title.length;
	add({
		id: 'title',
		group: 'Page basics',
		label: 'Title tag is present and descriptive',
		impact: 'high',
		status: !titleLen ? 'fail' : titleLen < 15 || titleLen > 65 ? 'warn' : 'pass',
		detail: !titleLen
			? 'No <title> found.'
			: `"${title}" (${titleLen} characters). ${titleLen < 15 ? 'Too short to say what you do.' : titleLen > 65 ? 'May be truncated in results (aim for 15–65).' : 'Good length.'}`,
	});
	add({
		id: 'meta-description',
		group: 'Page basics',
		label: 'Meta description explains the offer',
		impact: 'high',
		status: !metaDesc ? 'fail' : metaDesc.length < 70 || metaDesc.length > 170 ? 'warn' : 'pass',
		detail: !metaDesc
			? 'No meta description. AI and search engines will pick random text instead.'
			: `${metaDesc.length} characters. ${metaDesc.length < 70 ? 'Too short to be specific.' : metaDesc.length > 170 ? 'Likely truncated (aim for 70–170).' : 'Good length.'}`,
		fix: metaDesc
			? undefined
			: {
					label: 'Add to <head>',
					language: 'html',
					code: '<meta name="description" content="[What you do] for [who it is for] — [main result]. Keep it 70–160 characters.">',
				},
	});
	const h1Count = $('h1').length;
	add({
		id: 'h1',
		group: 'Page basics',
		label: 'Exactly one H1',
		impact: 'medium',
		status: h1Count === 1 ? 'pass' : 'fail',
		detail:
			h1Count === 1
				? `H1: "${$('h1').first().text().replace(/\s+/g, ' ').trim().slice(0, 100)}"`
				: h1Count === 0
					? 'No H1 found. Add one headline that states what you do.'
					: `${h1Count} H1 tags found. Use one H1 and H2s for sections.`,
	});
	add({
		id: 'h2',
		group: 'Page basics',
		label: 'Sections use H2 headings',
		impact: 'low',
		status: $('h2').length >= 2 ? 'pass' : 'warn',
		detail:
			$('h2').length >= 2
				? `${$('h2').length} H2 headings give the page structure.`
				: 'Fewer than 2 H2 headings. Break the page into labelled sections so readers and crawlers can scan it.',
	});
	const canonical = $('link[rel="canonical"]').attr('href');
	add({
		id: 'canonical',
		group: 'Page basics',
		label: 'Canonical URL set',
		impact: 'low',
		status: canonical ? 'pass' : 'warn',
		detail: canonical ? `Canonical: ${canonical}` : 'No canonical link. Add one to avoid duplicate-URL confusion.',
		fix: canonical
			? undefined
			: {
					label: 'Add to <head>',
					language: 'html',
					code: `<link rel="canonical" href="${finalUrl.origin}${finalUrl.pathname}">`,
				},
	});
	add({
		id: 'lang',
		group: 'Page basics',
		label: 'Page language declared',
		impact: 'low',
		status: $('html').attr('lang') ? 'pass' : 'warn',
		detail: $('html').attr('lang')
			? `lang="${$('html').attr('lang')}"`
			: 'No lang attribute on <html>.',
		fix: $('html').attr('lang')
			? undefined
			: { label: 'Update your <html> tag', language: 'html', code: '<html lang="en">' },
	});
	add({
		id: 'viewport',
		group: 'Page basics',
		label: 'Mobile viewport set',
		impact: 'medium',
		status: $('meta[name="viewport"]').length ? 'pass' : 'fail',
		detail: $('meta[name="viewport"]').length
			? 'Viewport meta tag present.'
			: 'No viewport meta tag; the page may render badly on phones.',
		fix: $('meta[name="viewport"]').length
			? undefined
			: {
					label: 'Add to <head>',
					language: 'html',
					code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
				},
	});

	// ── Sharing ──
	const og = {
		title: $('meta[property="og:title"]').attr('content'),
		description: $('meta[property="og:description"]').attr('content'),
		image: $('meta[property="og:image"]').attr('content'),
	};
	const ogMissing = (Object.keys(og) as (keyof typeof og)[]).filter((k) => !og[k]);
	add({
		id: 'open-graph',
		group: 'Sharing',
		label: 'Open Graph tags (link previews)',
		impact: 'medium',
		status: ogMissing.length === 0 ? 'pass' : ogMissing.length === 3 ? 'fail' : 'warn',
		detail:
			ogMissing.length === 0
				? 'og:title, og:description and og:image are set.'
				: `Missing: ${ogMissing.map((k) => 'og:' + k).join(', ')}. Links to your site will look bare when shared.`,
		fix: ogMissing.length
			? {
					label: 'Add to <head>',
					language: 'html',
					code: [
						`<meta property="og:title" content=${attr(title || name)}>`,
						`<meta property="og:description" content=${attr(metaDesc || 'What you do and who it is for')}>`,
						`<meta property="og:image" content="${origin}/og-image.png">`,
						`<meta property="og:url" content="${finalUrl.origin}${finalUrl.pathname}">`,
					].join('\n'),
				}
			: undefined,
	});

	// ── Score ──
	const weight: Record<CheckImpact, number> = { high: 3, medium: 2, low: 1 };
	const value: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };
	const total = checks.reduce((a, c) => a + weight[c.impact], 0);
	const got = checks.reduce((a, c) => a + weight[c.impact] * value[c.status], 0);
	const counts = {
		pass: checks.filter((c) => c.status === 'pass').length,
		warn: checks.filter((c) => c.status === 'warn').length,
		fail: checks.filter((c) => c.status === 'fail').length,
	};

	return {
		url: rawUrl,
		finalUrl: page.finalUrl,
		score: Math.round((got / total) * 100),
		counts,
		checks,
	};
}
