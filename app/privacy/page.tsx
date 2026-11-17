import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/site';
import { LegalPage } from '@/app/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
	title: 'Privacy Policy — AriClear',
	description: 'What data AriClear collects, why, and who processes it.',
	openGraph: pageOpenGraph(
		'Privacy Policy — AriClear',
		'What data AriClear collects, why, and who processes it.',
		'/privacy',
	),
	alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
	return (
		<LegalPage title='Privacy Policy'>
			<p>
				This policy explains what {LEGAL.operator} collects when you use
				AriClear, why, and what you can ask us to do with it.
			</p>

			<h2>What we collect</h2>
			<ul>
				<li>
					<strong>Account:</strong> your email address and a password
					(stored hashed by our authentication provider; we never see it).
				</li>
				<li>
					<strong>Scans:</strong> the web addresses you submit, the public
					page content we read from them, and the reports we generate.
				</li>
				<li>
					<strong>Purchases:</strong> which plan you bought, when, and the
					amount. Card details go directly to Stripe; we never receive them.
				</li>
				<li>
					<strong>Contact and waitlist forms:</strong> the email, phone
					number, website and notes you choose to send.
				</li>
				<li>
					<strong>Usage:</strong> pages visited and basic device
					information through Google Analytics, and technical logs needed
					to run and secure the service.
				</li>
			</ul>

			<h2>Why we use it</h2>
			<ul>
				<li>To run your account, produce your reports and keep your history.</li>
				<li>To take payment and apply your plan.</li>
				<li>To answer you when you contact us.</li>
				<li>To keep the service secure and to prevent abuse.</li>
				<li>To understand which features are used so we can improve them.</li>
			</ul>
			<p>We do not sell your personal data.</p>

			<h2>Who processes it for us</h2>
			<ul>
				<li>Supabase: database and sign-in.</li>
				<li>OpenAI: analyses the page content you submit to produce reports.</li>
				<li>
					Anthropic (Claude): analyses page content for Legion scans, and the website and profile
					text you submit for the brand alignment check.
				</li>
				<li>Stripe: payments and receipts.</li>
				<li>Vercel: hosting.</li>
				<li>Google Analytics: usage statistics.</li>
			</ul>
			<p>
				These providers may process data outside your country under their
				own safeguards.
			</p>

			<h2>Cookies</h2>
			<p>
				We use cookies to keep you signed in, and Google Analytics cookies
				to measure usage.
			</p>

			<h2>How long we keep it</h2>
			<p>
				We keep your account and scans while your account exists. Purchase
				records are kept as long as tax and accounting rules require. Ask us
				and we will delete your account and scans.
			</p>

			<h2>Your rights</h2>
			<p>
				You can ask for a copy of your data, a correction, or deletion by
				emailing{' '}
				<a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We
				answer within 30 days. Depending on where you live you may also
				complain to your data protection authority.
			</p>

			<h2>Contact</h2>
			<p>
				<a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
			</p>
		</LegalPage>
	);
}
