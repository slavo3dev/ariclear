// lib/analysis/extractPage.ts
// The one HTML -> content extractor. Used by the scan, the demo scan, the
// technical checks, the rewrite tester and brand awareness, so every feature
// reads a page the same way.
//
// Text is read the way a visitor sees it:
//   * words in neighbouring elements stay separated ("Pricing Docs", not
//     "PricingDocs"),
//   * hidden elements (hidden, aria-hidden, display:none) are skipped, so
//     responsive copies of the same heading are not read twice,
//   * repeated lines are kept once,
//   * the main content (<main>, when present and substantial) comes first;
//     navigation labels are listed separately instead of flooding the text.

import * as cheerio from 'cheerio';

/** The few DOM node fields we read (cheerio's nodes match this shape). */
type DomNode = {
	type: string;
	data?: string;
	name?: string;
	attribs?: Record<string, string>;
	children?: DomNode[];
};

export type ExtractedPage = {
	title: string;
	metaDescription: string;
	ogDescription: string;
	h1: string;
	h2s: string[];
	/** Top navigation labels, at most 12. */
	nav: string[];
	bodySnippet: string;
};

/** Inline formatting tags: their text joins the surrounding text directly. */
const INLINE = new Set([
	'b', 'strong', 'i', 'em', 'u', 's', 'small', 'mark', 'sup', 'sub', 'abbr',
	'code', 'span', 'font', 'q', 'cite', 'time', 'data', 'wbr',
]);

const DROP = 'script, style, noscript, svg, img, template, iframe, canvas, video, audio, picture, object';

function isHidden(el: DomNode): boolean {
	const a = el.attribs ?? {};
	if ('hidden' in a || a['aria-hidden'] === 'true') return true;
	const style = (a.style ?? '').replace(/\s+/g, '').toLowerCase();
	return style.includes('display:none') || style.includes('visibility:hidden');
}

/** Visible text of a node, with line breaks between block-level elements. */
function visibleText(node: DomNode): string {
	if (node.type === 'text') return node.data ?? '';
	if (node.type !== 'tag' && node.type !== 'root') return '';
	if (node.type === 'tag' && isHidden(node)) return '';
	if (node.type === 'tag' && node.name === 'br') return '\n';
	const inner = (node.children ?? []).map(visibleText).join('');
	if (node.type === 'root' || INLINE.has(node.name ?? '')) return inner;
	return `\n${inner}\n`;
}

/** Collapse whitespace per line, drop empty and repeated lines. */
function cleanLines(text: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of text.split('\n')) {
		const line = raw.replace(/\s+/g, ' ').trim();
		if (!line) continue;
		const key = line.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(line);
	}
	return out;
}

const textOf = (node: DomNode | undefined) => (node ? cleanLines(visibleText(node)).join(' ') : '');

export function extractPageContent(
	html: string,
	opts: { maxBodyChars?: number } = {},
): ExtractedPage {
	const $ = cheerio.load(html);

	const title = $('title').first().text().replace(/\s+/g, ' ').trim();
	const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
	const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || '';

	$(DROP).remove();

	const visible = (sel: string) =>
		$(sel)
			.toArray()
			.filter((el) => !isHidden(el) && !$(el).parents().toArray().some((p) => isHidden(p)));

	const h1 = textOf(visible('h1')[0]);
	const h2s = [...new Set(visible('h2').map((el) => textOf(el)).filter(Boolean))].slice(0, 6);

	const navRoot = visible('nav, [role="navigation"]')[0];
	const nav = navRoot
		? [
				...new Set(
					$(navRoot)
						.find('a, button')
						.toArray()
						.filter((el) => !isHidden(el))
						.map((el) => textOf(el))
						.filter((t) => t && t.length <= 40),
				),
			].slice(0, 12)
		: [];

	// Prefer <main> when it holds the real content; otherwise the body
	// without navigation, footer and skip links.
	const main = visible('main, [role="main"]')[0];
	const mainText = main ? cleanLines(visibleText(main)).join('\n') : '';
	let bodyText = mainText;
	if (bodyText.length < 200) {
		$('nav, [role="navigation"], footer, [role="contentinfo"], a[href^="#"]').remove();
		const body = $('body')[0] ?? $.root()[0];
		bodyText = cleanLines(visibleText(body)).join('\n');
	}
	const bodySnippet = bodyText.slice(0, opts.maxBodyChars ?? 5000);

	return { title, metaDescription, ogDescription, h1, h2s, nav, bodySnippet };
}

/** Plain-text rendering of an extracted page, for prompts. */
export function pageAsText(p: ExtractedPage): string {
	return [
		p.title && `PAGE TITLE: ${p.title}`,
		p.metaDescription && `META DESCRIPTION: ${p.metaDescription}`,
		p.ogDescription &&
			p.ogDescription !== p.metaDescription &&
			`OG DESCRIPTION: ${p.ogDescription}`,
		p.h1 && `H1: ${p.h1}`,
		p.h2s.length > 0 && `H2s: ${p.h2s.join(' | ')}`,
		p.nav.length > 0 && `NAVIGATION: ${p.nav.join(' | ')}`,
		`VISIBLE TEXT:\n${p.bodySnippet}`,
	]
		.filter(Boolean)
		.join('\n');
}

// ─── Pages we cannot score ──────────────────────────────────────────────────

const CHALLENGE_TITLE =
	/^(just a moment|attention required|client challenge|access denied|please wait|security check|verifying you are human|one more step|pardon our interruption|ddos-guard|are you a robot)/i;
const CHALLENGE_MARKUP =
	/(_cf_chl_opt|cf-browser-verification|cdn-cgi\/challenge-platform\/h\/|captcha-delivery\.com|_Incapsula_Resource|px-captcha|perimeterx|ak-challenge|sec-if-cpt-container)/i;
const CHALLENGE_TEXT =
	/(enable javascript and cookies to continue|checking your browser|checking if the site connection is secure|verify you are human|a required part of this site couldn.t load)/i;

/**
 * Why this page cannot be scored, or null if it can.
 * 'challenge': bot protection served a check page instead of the site.
 * 'empty': almost no readable text (e.g. a JavaScript-only app shell).
 */
export function unscorableReason(html: string, page: ExtractedPage): 'challenge' | 'empty' | null {
	const textLen = page.bodySnippet.length;
	// Real pages can carry challenge scripts too, so only a thin page counts.
	if (
		textLen < 1000 &&
		(CHALLENGE_TITLE.test(page.title) || CHALLENGE_MARKUP.test(html) || CHALLENGE_TEXT.test(page.bodySnippet))
	) {
		return 'challenge';
	}
	if (textLen < 50 && !page.h1 && !page.metaDescription) return 'empty';
	return null;
}
