// app/pricing/page.tsx
// Plans and prices on their own page. Signed-in users land on the dashboard
// instead of the marketing home, so the app links here to upgrade; the home
// page still shows the same section at /#pricing.

import type { Metadata } from 'next';
import { Navbar, SiteFooter, PricingSection } from '@ariclear/components';
import { pageOpenGraph } from '@/lib/site';

const TITLE = 'Pricing — AriClear';
const DESCRIPTION =
	'Gladiator for 1 website, Centurion for 3, Legion for agencies and teams. One payment covers 6 months, no subscription.';

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	openGraph: pageOpenGraph(TITLE, DESCRIPTION, '/pricing'),
	alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
	return (
		<div className='flex min-h-screen flex-col'>
			<Navbar />
			<main className='flex-1'>
				<PricingSection />
			</main>
			<SiteFooter />
		</div>
	);
}
