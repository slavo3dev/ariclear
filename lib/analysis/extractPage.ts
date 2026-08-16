// lib/analysis/extractPage.ts
// Shared HTML -> content extraction used by the scan, the technical checks
// and the rewrite tester, so all three read a page the same way.

import * as cheerio from 'cheerio';

export type ExtractedPage = {
	title: string;
	metaDescription: string;
	h1: string;
	h2s: string[];
	bodySnippet: string;
};

export function extractPageContent(html: string): ExtractedPage {
	const $ = cheerio.load(html);

	const title = $('title').first().text().trim();
	const metaDescription =
		$('meta[name="description"]').attr('content')?.trim() || '';

	const h1 = $('h1').first().text().trim();
	const h2s = $('h2')
		.slice(0, 6)
		.map((_, el) => $(el).text().trim())
		.get()
		.filter(Boolean);

	$('script, style, noscript, svg, img').remove();

	const bodyTextRaw = $('body').text().replace(/\s+/g, ' ').trim();
	const bodySnippet = bodyTextRaw.slice(0, 5000);

	return { title, metaDescription, h1, h2s, bodySnippet };
}
