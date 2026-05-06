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
				<HeroSection />
				<HowItWorksSection />
				<WhoItsForSection />
				<HomePageClient />
				<PricingSection />
			</main>

			<SiteFooter />
		</div>
	);
}
