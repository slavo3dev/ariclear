import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, SiteFooter } from '@ariclear/components';

export const metadata: Metadata = {
	title: 'Checkout cancelled — AriClear',
	robots: { index: false, follow: false },
};

export default function BillingCancelPage() {
	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />
			<main className='mx-auto w-full max-w-xl flex-1 px-4 py-16'>
				<div className='rounded-3xl border border-choco-100 bg-white p-8 text-center shadow-sm'>
					<h1 className='text-2xl font-semibold text-choco-900'>
						Checkout cancelled
					</h1>
					<p className='mt-2 text-sm text-choco-700'>
						No payment was taken. Your account and saved scans are
						unchanged.
					</p>
					<div className='mt-6 flex flex-col justify-center gap-2 sm:flex-row'>
						<Link
							href='/pricing'
							className='rounded-full bg-choco-900 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-choco-800'>
							Back to pricing
						</Link>
						<a
							href='mailto:hello@ariclear.com?subject=Question%20about%20plans'
							className='rounded-full border border-choco-200 bg-cream-50 px-5 py-2.5 text-sm font-medium text-choco-800 hover:bg-choco-50'>
							Ask a question
						</a>
					</div>
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
