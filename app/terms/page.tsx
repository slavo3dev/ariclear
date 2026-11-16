import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/site';
import Link from 'next/link';
import { LegalPage } from '@/app/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';
import { FREE_LIMITS, PAID_PLANS, PLAN_TERM_MONTHS } from '@/lib/entitlements';

export const metadata: Metadata = {
	title: 'Terms of Service — AriClear',
	description: 'The terms that apply when you use AriClear.',
	openGraph: pageOpenGraph(
		'Terms of Service — AriClear',
		'The terms that apply when you use AriClear.',
		'/terms',
	),
	alternates: { canonical: '/terms' },
};

export default function TermsPage() {
	return (
		<LegalPage title='Terms of Service'>
			<p>
				These terms apply when you use AriClear (&quot;the service&quot;),
				operated by {LEGAL.operator} (&quot;we&quot;, &quot;us&quot;). By
				creating an account or buying a plan you agree to them.
			</p>

			<h2>1. What AriClear does</h2>
			<p>
				AriClear reads a public web page you give it and reports how clearly
				it explains itself to a first-time visitor and to AI systems. Reports
				are produced by automated analysis, including large language models.
				They are opinions to help you improve your page, not guarantees of
				rankings, traffic, AI citations or sales.
			</p>

			<h2>2. Your account</h2>
			<ul>
				<li>You need an account to scan a website. Keep your password private.</li>
				<li>You must be at least 16 years old.</li>
				<li>One person per account. Do not share or resell access.</li>
			</ul>

			<h2>3. Free account</h2>
			<p>
				A free account includes {FREE_LIMITS.lifetimeScans} full scan of{' '}
				{FREE_LIMITS.websites} website, including the suggested rewrite. Re-scans,
				the rewrite tester, technical checks and PDF reports require a paid plan.
			</p>

			<h2>4. Paid plans</h2>
			<ul>
				<li>
					{PAID_PLANS.starter.label} (${PAID_PLANS.starter.priceUsd},{' '}
					{PAID_PLANS.starter.websites} website) and {PAID_PLANS.pro.label} ($
					{PAID_PLANS.pro.priceUsd}, {PAID_PLANS.pro.websites} websites) are
					one-time payments that each cover {PLAN_TERM_MONTHS} months.
				</li>
				<li>
					Plans do not renew automatically. When a plan ends your account
					returns to free and you keep read access to your saved scans.
				</li>
				<li>
					Buying the same plan again while it is active adds{' '}
					{PLAN_TERM_MONTHS} months to the end date. Upgrading starts a new{' '}
					{PLAN_TERM_MONTHS}-month term on the day you upgrade.
				</li>
				<li>
					Payments are processed by Stripe. Prices are in US dollars;
					taxes may apply.
				</li>
				<li>
					Refunds follow our <Link href='/refund'>refund policy</Link>.
				</li>
			</ul>

			<h2>5. Fair use</h2>
			<p>
				&quot;Unlimited&quot; scans means normal use for the websites on your
				plan. We rate-limit requests to keep the service fast for everyone and
				may suspend accounts that automate or abuse it.
			</p>

			<h2>6. What you may scan</h2>
			<p>
				Only scan pages you own or are allowed to analyse. Do not use AriClear
				to attack, overload or probe websites, or to break any law.
			</p>

			<h2>7. Your content</h2>
			<p>
				You keep all rights to your website and to the reports about it. You
				let us process the pages you submit to produce those reports. Our{' '}
				<Link href='/privacy'>privacy policy</Link> explains how we handle your
				data.
			</p>

			<h2>8. Availability and changes</h2>
			<p>
				We work to keep AriClear available but do not promise it will be
				uninterrupted. We may change features; if a change removes something
				central to a plan you paid for, contact us for a pro-rated refund.
			</p>

			<h2>9. Liability</h2>
			<p>
				The service is provided &quot;as is&quot;. To the extent the law
				allows, our total liability to you is limited to the amount you paid
				us in the 6 months before the claim, and we are not liable for indirect
				or consequential losses. Nothing here limits rights you have under
				consumer law that cannot be waived.
			</p>

			<h2>10. Ending your account</h2>
			<p>
				You can ask us to delete your account at any time by emailing{' '}
				<a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We
				may close accounts that break these terms.
			</p>

			<h2>11. Changes to these terms and governing law</h2>
			<p>
				We will post changes here and update the date above. These terms are
				governed by the laws of {LEGAL.governingLaw}.
			</p>

			<h2>12. Contact</h2>
			<p>
				<a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
			</p>
		</LegalPage>
	);
}
