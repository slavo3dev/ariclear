import {
	Navbar,
	SiteFooter,
	HeroSection,
	HowItWorksSection,
	WhoItsForSection,
	PricingSection,
} from '@ariclear/components';
import { HomePageClient } from './HomePageClient';

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
