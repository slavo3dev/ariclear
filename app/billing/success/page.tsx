import type { Metadata } from 'next';
import { Navbar, SiteFooter } from '@ariclear/components';
import { PlanActivation } from './PlanActivation';

export const metadata: Metadata = {
	title: 'Payment received — AriClear',
	robots: { index: false, follow: false },
};

export default function BillingSuccessPage() {
	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />
			<main className='mx-auto w-full max-w-xl flex-1 px-4 py-16'>
				<PlanActivation />
			</main>
			<SiteFooter />
		</div>
	);
}
