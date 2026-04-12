'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, PreorderForm, useAuth, AuthModal } from '@ariclear/components';

const plans = [
	{
		id: 'free',
		name: 'Starter',
		badge: 'Free forever',
		price: 'Free',
		priceSub: null,
		yearlyPrice: null,
		description:
			'Run your first clarity scan and see what visitors actually understand.',
		features: [
			{ text: '1 website', included: true, highlight: false },
			{
				text: 'Unlimited clarity scans',
				included: true,
				highlight: false,
			},
			{
				text: 'Clarity score & breakdown',
				included: true,
				highlight: false,
			},
			{
				text: 'Headline & value proposition feedback',
				included: true,
				highlight: false,
			},
			{ text: 'CTA clarity analysis', included: true, highlight: false },
			{
				text: 'Basic PDF clarity report',
				included: true,
				highlight: false,
			},
			{
				text: 'Scan history & archive',
				included: false,
				highlight: false,
			},
			{ text: 'Brand Awareness tool', included: false, highlight: false },
			{
				text: 'Website uptime monitoring',
				included: false,
				highlight: false,
			},
			{ text: 'Expert sessions', included: false, highlight: false },
		],
		cta: 'Start for free',
		ctaSub: 'No credit card required',
		tier: 'free',
	},
	{
		id: 'pro',
		name: 'Pro',
		badge: 'Most popular',
		price: '$149',
		priceSub: 'per year · ~$12.50/mo',
		monthlyPrice: '$17',
		description:
			'For founders and teams actively improving their messaging.',
		features: [
			{ text: '3 websites', included: true, highlight: false },
			{
				text: 'Unlimited clarity scans',
				included: true,
				highlight: false,
			},
			{
				text: 'Full clarity score & breakdown',
				included: true,
				highlight: false,
			},
			{
				text: 'Headline & value proposition feedback',
				included: true,
				highlight: false,
			},
			{ text: 'CTA clarity analysis', included: true, highlight: false },
			{
				text: 'Full PDF reports + save & archive',
				included: true,
				highlight: false,
			},
			{
				text: 'Scan history & progress tracking',
				included: true,
				highlight: false,
			},
			{ text: 'Brand Awareness tool', included: true, highlight: false },
			{
				text: 'Website uptime monitoring',
				included: true,
				highlight: false,
			},
			{
				text: '3× 30-min expert sessions / month',
				included: true,
				highlight: true,
			},
		],
		cta: 'Get Pro',
		ctaSub: 'Best for active founders & small businesses',
		tier: 'pro',
	},
	{
		id: 'expert',
		name: 'Expert',
		badge: 'For agencies & teams',
		price: '$499',
		priceSub: 'per year · ~$41/mo',
		monthlyPrice: '$55',
		description:
			'More sites, more sessions — for agencies and serious teams.',
		features: [
			{ text: '6 websites', included: true, highlight: false },
			{
				text: 'Unlimited clarity scans',
				included: true,
				highlight: false,
			},
			{
				text: 'Full clarity score & breakdown',
				included: true,
				highlight: false,
			},
			{
				text: 'Headline & value proposition feedback',
				included: true,
				highlight: false,
			},
			{ text: 'CTA clarity analysis', included: true, highlight: false },
			{
				text: 'Full PDF reports + save & archive',
				included: true,
				highlight: false,
			},
			{
				text: 'Scan history & progress tracking',
				included: true,
				highlight: false,
			},
			{ text: 'Brand Awareness tool', included: true, highlight: false },
			{
				text: 'Website uptime monitoring',
				included: true,
				highlight: false,
			},
			{
				text: '6× 30-min expert sessions / month',
				included: true,
				highlight: true,
			},
		],
		cta: 'Get Expert',
		ctaSub: 'Best for agencies, redesigns & client work',
		tier: 'expert',
	},
];

type BillingCycle = 'yearly' | 'monthly';

export function PricingSection() {
	const router = useRouter();
	const { user, loading } = useAuth();

	const [billing, setBilling] = useState<BillingCycle>('yearly');
	const [showPreorderModal, setShowPreorderModal] = useState(false);
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [selectedTier, setSelectedTier] = useState<string | null>(null);

	const handleSelect = (plan: (typeof plans)[0]) => {
		if (plan.tier === 'free') {
			if (loading) return;
			if (user) {
				router.push('/dashboard');
			} else {
				setShowAuthModal(true);
			}
		} else {
			setSelectedTier(plan.tier);
			setShowPreorderModal(true);
		}
	};

	const getDisplayPrice = (plan: (typeof plans)[0]) => {
		if (plan.tier === 'free') return 'Free';
		if (billing === 'monthly' && plan.monthlyPrice)
			return plan.monthlyPrice;
		return plan.price;
	};

	const getPriceSub = (plan: (typeof plans)[0]) => {
		if (plan.tier === 'free') return null;
		if (billing === 'monthly') return 'per month · billed monthly';
		return plan.priceSub;
	};

	return (
		<section className='py-24 bg-white' id='pricing'>
			<div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
				{/* Header */}
				<div className='text-center mb-12'>
					<p className='text-xs font-bold uppercase tracking-[0.2em] text-choco-500 mb-3'>
						Pricing
					</p>
					<h2 className='text-4xl font-bold text-choco-900 sm:text-5xl mb-4 tracking-tight'>
						Simple pricing. Clear value.
					</h2>
					<p className='text-lg text-choco-600 max-w-xl mx-auto'>
						Start free and see what your website is actually saying
						to humans and AI. Upgrade when you are ready to fix it
						seriously.
					</p>
				</div>

				{/* Billing toggle */}
				<div className='flex items-center justify-center gap-3 mb-12'>
					<button
						onClick={() => setBilling('monthly')}
						className={`text-sm font-medium transition-colors ${
							billing === 'monthly'
								? 'text-choco-900'
								: 'text-choco-400'
						}`}>
						Monthly
					</button>
					<button
						onClick={() =>
							setBilling(
								billing === 'yearly' ? 'monthly' : 'yearly',
							)
						}
						className='relative w-12 h-6 rounded-full bg-choco-900 transition-colors focus:outline-none'
						aria-label='Toggle billing cycle'>
						<span
							className={`absolute top-1 w-4 h-4 rounded-full bg-amber-400 shadow transition-transform duration-200 ${
								billing === 'yearly'
									? 'translate-x-7'
									: 'translate-x-1'
							}`}
						/>
					</button>
					<button
						onClick={() => setBilling('yearly')}
						className={`text-sm font-medium transition-colors ${
							billing === 'yearly'
								? 'text-choco-900'
								: 'text-choco-400'
						}`}>
						Yearly
						<span className='ml-2 inline-block rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5'>
							Save ~15%
						</span>
					</button>
				</div>

				{/* Cards */}
				<div className='grid gap-6 lg:grid-cols-3'>
					{plans.map((plan) => {
						const isPopular = plan.id === 'pro';
						const isFree = plan.tier === 'free';

						return (
							<div
								key={plan.id}
								className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
									isFree
										? 'bg-cream-50 border-2 border-choco-100'
										: isPopular
											? 'bg-choco-900 border-2 border-choco-900 shadow-2xl'
											: 'bg-cream-50 border-2 border-amber-300'
								}`}>
								{/* Badge */}
								<div className='mb-6'>
									<span
										className={`inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
											isFree
												? 'bg-choco-100 text-choco-700'
												: isPopular
													? 'bg-amber-400 text-choco-900'
													: 'bg-amber-100 text-amber-800'
										}`}>
										{plan.badge}
									</span>
								</div>

								{/* Name + description */}
								<h3
									className={`text-2xl font-bold mb-2 ${
										isPopular
											? 'text-cream-50'
											: 'text-choco-900'
									}`}>
									{plan.name}
								</h3>
								<p
									className={`text-sm mb-8 ${
										isPopular
											? 'text-white/70'
											: 'text-choco-600'
									}`}>
									{plan.description}
								</p>

								{/* Price */}
								<div className='mb-8'>
									<div className='flex items-baseline gap-2'>
										<span
											className={`text-5xl font-bold tracking-tight ${
												isPopular
													? 'text-cream-50'
													: 'text-choco-900'
											}`}>
											{getDisplayPrice(plan)}
										</span>
										{getPriceSub(plan) && (
											<span
												className={`text-sm ${
													isPopular
														? 'text-white/60'
														: 'text-choco-500'
												}`}>
												{getPriceSub(plan)}
											</span>
										)}
									</div>
									{billing === 'yearly' && !isFree && (
										<p
											className={`text-xs mt-1 ${isPopular ? 'text-white/50' : 'text-choco-400'}`}>
											Billed annually
										</p>
									)}
								</div>

								{/* Features */}
								<ul className='mb-10 flex-1 space-y-3'>
									{plan.features.map((f, i) => (
										<li
											key={i}
											className='flex items-start gap-3 text-sm'>
											<span
												className={`mt-0.5 shrink-0 text-base font-bold ${
													f.included
														? isPopular
															? 'text-amber-400'
															: 'text-green-600'
														: isPopular
															? 'text-white/20'
															: 'text-choco-300'
												}`}>
												{f.included ? '✓' : '—'}
											</span>
											<span
												className={`${
													!f.included
														? isPopular
															? 'text-white/30'
															: 'text-choco-400'
														: f.highlight
															? isPopular
																? 'text-amber-300 font-semibold'
																: 'text-choco-900 font-semibold'
															: isPopular
																? 'text-white'
																: 'text-choco-700'
												}`}>
												{f.text}
											</span>
										</li>
									))}
								</ul>

								{/* CTA */}
								<div>
									<Button
										type='button'
										onClick={() => handleSelect(plan)}
										disabled={loading}
										className={`w-full justify-center font-semibold py-3 rounded-xl transition-all duration-200 ${
											isFree
												? 'bg-choco-900 text-cream-50 hover:bg-choco-800'
												: isPopular
													? 'bg-amber-400 text-choco-900 hover:bg-amber-300 shadow-lg hover:shadow-xl'
													: 'bg-choco-900 text-cream-50 hover:bg-choco-800'
										}`}>
										{plan.cta}
									</Button>
									<p
										className={`text-xs text-center mt-2 ${
											isPopular
												? 'text-white/50'
												: 'text-choco-400'
										}`}>
										{plan.ctaSub}
									</p>
								</div>
							</div>
						);
					})}
				</div>

				{/* Comparison note */}
				<div className='mt-12 rounded-2xl bg-cream-50 border border-choco-100 p-6 text-center'>
					<p className='text-sm text-choco-700'>
						<span className='font-semibold text-choco-900'>
							All plans
						</span>{' '}
						include unlimited scans, human clarity analysis, and
						AI-SEO scoring.{' '}
						<span className='font-semibold text-choco-900'>
							No per-scan fees. Ever.
						</span>
					</p>
				</div>

				{/* Trust line */}
				<p className='text-center text-sm text-choco-500 mt-8'>
					Questions?{' '}
					<a
						href='mailto:support@ariclear.com'
						className='font-semibold text-choco-800 underline hover:text-choco-600 transition-colors'>
						Email us
					</a>{' '}
					— we reply fast.
				</p>
			</div>

			{/* Auth Modal */}
			<AuthModal
				open={showAuthModal}
				onClose={() => setShowAuthModal(false)}
				initialMode='login'
			/>

			{/* Preorder Modal */}
			{showPreorderModal && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-choco-900/70 backdrop-blur-sm p-4'
					onClick={() => setShowPreorderModal(false)}>
					<div
						className='relative max-w-lg w-full'
						onClick={(e) => e.stopPropagation()}>
						<button
							onClick={() => setShowPreorderModal(false)}
							className='absolute -top-3 -right-3 bg-choco-900 text-cream-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-choco-800 transition-all duration-300 shadow-lg z-10'
							aria-label='Close modal'>
							✕
						</button>
						<PreorderForm
							tier={selectedTier}
							onSuccess={() => setShowPreorderModal(false)}
						/>
					</div>
				</div>
			)}
		</section>
	);
}
