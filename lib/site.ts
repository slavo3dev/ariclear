// lib/site.ts
// One place for the public site's identity: URL, name, descriptions.
// Used by metadata, Open Graph, JSON-LD, sitemap, robots and llms.txt.

import { FREE_LIMITS, PAID_PLANS, PLAN_TERM_MONTHS } from '@/lib/entitlements';
import { LEGAL } from '@/lib/legal';

/**
 * Canonical origin, no trailing slash. NEXT_PUBLIC_APP_URL wins; otherwise
 * NEXT_PUBLIC_SITE_URL (already set in Vercel for auth emails); otherwise
 * the production domain.
 */
export const SITE_URL = (
	process.env.NEXT_PUBLIC_APP_URL ||
	process.env.NEXT_PUBLIC_SITE_URL ||
	'https://www.ariclear.com'
).replace(/\/$/, '');

export const SITE_NAME = 'AriClear';

export const SITE_TITLE = 'AriClear — Do humans and AI understand your website?';

export const SITE_DESCRIPTION =
	'AriClear analyzes your homepage like a first-time visitor and like an AI model, showing whether humans and AI understand what your website does.';

export const SITE_LOGO_PATH = '/branding/arilogo-optimized.png';

/**
 * Open Graph fields for a page. A page that sets its own openGraph replaces
 * the root one, so the shared card image (app/opengraph-image.tsx) is
 * attached here explicitly.
 */
export function pageOpenGraph(title: string, description: string, path: string) {
	return {
		type: 'website' as const,
		siteName: SITE_NAME,
		locale: 'en_US',
		title,
		description,
		url: path,
		images: [
			{
				url: '/opengraph-image',
				width: 1200,
				height: 630,
				alt: 'AriClear: see how humans and AI read your website',
			},
		],
	};
}

/** Public, indexable pages (sitemap). Signed-in areas are not listed. */
export const PUBLIC_PAGES: Array<{
	path: string;
	priority: number;
	changeFrequency: 'weekly' | 'monthly' | 'yearly';
}> = [
	{ path: '/', priority: 1, changeFrequency: 'weekly' },
	{ path: '/scan', priority: 0.8, changeFrequency: 'monthly' },
	{ path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
	{ path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
	{ path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
	{ path: '/refund', priority: 0.2, changeFrequency: 'yearly' },
];

/**
 * Schema.org graph for the site, rendered on every page by the root layout:
 * the organisation and the product, with offers taken from the same plan
 * constants the checkout uses, so structured-data prices never drift from
 * the real ones.
 */
export function siteJsonLd(): Record<string, unknown> {
	const orgId = `${SITE_URL}/#organization`;
	const freeOffer = {
		'@type': 'Offer',
		name: 'Free',
		price: '0',
		priceCurrency: 'USD',
		description: `${FREE_LIMITS.lifetimeScans} full scan of ${FREE_LIMITS.websites} website with a free account.`,
		availability: 'https://schema.org/InStock',
		url: `${SITE_URL}/scan`,
	};
	const paidOffers = Object.values(PAID_PLANS).map((p) => ({
		'@type': 'Offer',
		name: p.label,
		price: String(p.priceUsd),
		priceCurrency: 'USD',
		description: `${PLAN_TERM_MONTHS} months of AriClear for ${p.websites} website${p.websites > 1 ? 's' : ''}. One payment, no auto-renewal.`,
		availability: 'https://schema.org/InStock',
		url: `${SITE_URL}/pricing`,
	}));

	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Organization',
				'@id': orgId,
				name: SITE_NAME,
				url: SITE_URL,
				logo: `${SITE_URL}${SITE_LOGO_PATH}`,
				email: LEGAL.contactEmail,
				contactPoint: {
					'@type': 'ContactPoint',
					contactType: 'customer support',
					email: LEGAL.contactEmail,
				},
			},
			{
				'@type': 'WebSite',
				'@id': `${SITE_URL}/#website`,
				name: SITE_NAME,
				url: SITE_URL,
				publisher: { '@id': orgId },
			},
			{
				'@type': 'SoftwareApplication',
				'@id': `${SITE_URL}/#app`,
				name: SITE_NAME,
				applicationCategory: 'BusinessApplication',
				operatingSystem: 'Web',
				url: SITE_URL,
				description: SITE_DESCRIPTION,
				publisher: { '@id': orgId },
				offers: [freeOffer, ...paidOffers],
			},
		],
	};
}

/** JSON for a <script type="application/ld+json">, safe against "</script>". */
export function jsonLdScript(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}
