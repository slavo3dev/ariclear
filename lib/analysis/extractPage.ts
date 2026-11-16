// lib/analysis/extractPage.ts
// The one HTML -> content extractor. Used by the scan, the demo scan, the
// technical checks, the rewrite tester and brand awareness, so every feature
// reads a page the same way.

import * as cheerio from 'cheerio';

export type ExtractedPage = {
	title: string;
	metaDescription: string;
	ogDescription: string;
	h1: string;
	h2s: string[];
	bodySnippet: string;
};

export function extractPageContent(
	html: string,
	opts: { maxBodyChars?: number } = {},
): ExtractedPage {
	const $ = cheerio.load(html);

	const title = $('title').first().text().trim();
	const metaDescription =
		$('meta[name="description"]').attr('content')?.trim() || '';
	const ogDescription =
		$('meta[property="og:description"]').attr('content')?.trim() || '';

	const h1 = $('h1').first().text().trim();
	const h2s = $('h2')
		.slice(0, 6)
		.map((_, el) => $(el).text().trim())
		.get()
		.filter(Boolean);

	$('script, style, noscript, svg, img, template, iframe').remove();

	const bodyTextRaw = $('body').text().replace(/\s+/g, ' ').trim();
	const bodySnippet = bodyTextRaw.slice(0, opts.maxBodyChars ?? 5000);

	return { title, metaDescription, ogDescription, h1, h2s, bodySnippet };
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
		`VISIBLE TEXT:\n${p.bodySnippet}`,
	]
		.filter(Boolean)
		.join('\n');
}
