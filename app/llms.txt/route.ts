// GET /llms.txt
// Plain-text summary for AI assistants (llmstxt.org convention). Built from
// the same plan constants as the pricing page, so it stays accurate.

import { FREE_LIMITS, PAID_PLANS, PLAN_TERM_MONTHS } from '@/lib/entitlements';
import { LEGAL } from '@/lib/legal';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
	const plans = Object.values(PAID_PLANS)
		.map(
			(p) =>
				`- ${p.label}: $${p.priceUsd} one-time for ${PLAN_TERM_MONTHS} months, ${p.websites} website${p.websites > 1 ? 's' : ''}, unlimited re-scans, rewrite tester, technical checks, PDF report. No auto-renewal.`,
		)
		.join('\n');

	const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} reads a website's homepage twice: as a first-time human visitor with five seconds, and as an AI assistant or search crawler trying to classify the business. It returns a Human clarity score, an AI readability score, the specific problems behind each, a rewritten headline, subheadline and call to action, and a prioritised action plan.

## Who it is for
Founders, small businesses, marketers and agencies who want visitors and AI tools (ChatGPT, Perplexity, Google AI answers) to understand what their site offers.

## Plans
- Free: a free account includes ${FREE_LIMITS.lifetimeScans} full scan of ${FREE_LIMITS.websites} website. A shorter demo on the homepage needs no account.
${plans}

## Pages
- [Home and free demo](${SITE_URL}/)
- [Run a full scan](${SITE_URL}/scan)
- [Pricing](${SITE_URL}/#pricing)
- [Terms of Service](${SITE_URL}/terms)
- [Privacy Policy](${SITE_URL}/privacy)
- [Refund Policy](${SITE_URL}/refund)

## Contact
${LEGAL.contactEmail}
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}
