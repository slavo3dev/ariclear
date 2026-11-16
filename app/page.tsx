import {
	Navbar,
	SiteFooter,
	HeroSection,
	HowItWorksSection,
	WhoItsForSection,
	PricingSection,
} from '@ariclear/components';
import type { Metadata } from 'next';
import { HomePageClient } from './HomePageClient';

export const metadata: Metadata = {
	alternates: { canonical: '/' },
};

export default function HomePage() {
	return (
		<div className='flex min-h-screen flex-col'>
			<Navbar />

			<main className='flex-1'>
				<HomePageClient />
				<HeroSection />
				<HowItWorksSection />
				<WhoItsForSection />
				<PricingSection />
			</main>

			<SiteFooter />
		</div>
	);
}
