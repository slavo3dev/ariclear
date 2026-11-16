import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/site';
import { LegalPage } from '@/app/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';
import { PLAN_TERM_MONTHS } from '@/lib/entitlements';

export const metadata: Metadata = {
	title: 'Refund Policy — AriClear',
	description: 'How refunds work for AriClear plans.',
	openGraph: pageOpenGraph(
		'Refund Policy — AriClear',
		'How refunds work for AriClear plans.',
		'/refund',
	),
	alternates: { canonical: '/refund' },
};

export default function RefundPage() {
	return (
		<LegalPage title='Refund Policy'>
			<p>
				AriClear plans are one-time payments that cover {PLAN_TERM_MONTHS}{' '}
				months. They never renew automatically, so you will never be charged
				again without buying again.
			</p>

			<h2>{LEGAL.refundDays}-day refund</h2>
			<p>
				If AriClear isn&apos;t useful to you, email{' '}
				<a
					href={`mailto:${LEGAL.contactEmail}?subject=Refund%20request`}>
					{LEGAL.contactEmail}
				</a>{' '}
				within {LEGAL.refundDays} days of your purchase from the email address
				on your account, and we will refund the full amount. No questions
				asked.
			</p>

			<h2>After {LEGAL.refundDays} days</h2>
			<p>
				Payments are not refundable after {LEGAL.refundDays} days, except
				where the law requires it or where we remove something central to the
				plan you paid for.
			</p>

			<h2>How refunds are paid</h2>
			<ul>
				<li>Refunds go back to the original payment method through Stripe.</li>
				<li>
					Your bank usually shows them within 5 to 10 business days.
				</li>
				<li>
					When a refund is issued, your account returns to free. Your saved
					scans stay readable.
				</li>
			</ul>
		</LegalPage>
	);
}
