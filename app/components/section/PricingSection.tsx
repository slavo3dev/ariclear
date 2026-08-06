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
		priceCaption: null,
		monthlyEquiv: null,
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
		price: '$59',
		priceCaption: 'one payment every 6 months',
		monthlyEquiv: '$9.83',
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
		ctaSub: 'One simple payment covers 6 months · no auto-switching plans',
		tier: 'pro',
	},
];

export function PricingSection() {
	const router = useRouter();
	const { user, loading } = useAuth();

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

				{/* Cards */}
				<div className='mx-auto grid max-w-4xl gap-6 md:grid-cols-2'>
					{plans.map((plan) => {
						const isPopular = plan.id === 'pro';
						const isFree = plan.tier === 'free';

						const displayPrice = plan.price;
						const priceCaption = plan.priceCaption;

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
									<div className='flex items-baseline gap-3 flex-wrap'>
										<span
											className={`text-5xl font-bold tracking-tight ${
												isPopular
													? 'text-cream-50'
													: 'text-choco-900'
											}`}>
											{displayPrice}
										</span>
										{!isFree && (
											<span
												className={`text-base font-medium ${
													isPopular
														? 'text-white/50'
														: 'text-choco-400'
												}`}>
												(~{plan.monthlyEquiv}/mo)
											</span>
										)}
									</div>
									{priceCaption && (
										<p
											className={`text-sm mt-1 ${
												isPopular
													? 'text-white/60'
													: 'text-choco-500'
											}`}>
											{priceCaption}
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
						href='mailto:slavo@slavo.io'
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
