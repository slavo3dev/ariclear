import { Navbar, SiteFooter } from '@ariclear/components';
import { LEGAL, LEGAL_REVIEWED } from '@/lib/legal';

export function LegalPage({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />
			<main className='mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6'>
				{!LEGAL_REVIEWED && (
					<p className='mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800'>
						Draft: this page is being finalised. Questions? Email{' '}
						<a className='underline' href={`mailto:${LEGAL.contactEmail}`}>
							{LEGAL.contactEmail}
						</a>
						.
					</p>
				)}
				<h1 className='text-3xl font-semibold text-choco-900'>{title}</h1>
				<p className='mt-1 text-xs text-choco-500'>
					Last updated: {LEGAL.lastUpdated}
				</p>
				<div className='mt-8 space-y-6 text-sm leading-relaxed text-choco-800 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-choco-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:underline'>
					{children}
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
