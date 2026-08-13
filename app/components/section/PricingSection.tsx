'use client';

import { useState } from 'react';
import { Button, PreorderForm } from '@ariclear/components';

const plans = [
	{
		id: 'starter',
		name: 'Gladiator',
		badge: 'Get started',
		price: '$39',
		priceCaption: 'one payment every 6 months',
		monthlyEquiv: '$6.50',
		description:
			'Know exactly what visitors and AI understand about your website, and how to fix it.',
		features: [
			{ text: '1 website', included: true, highlight: false },
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
				text: 'Scan history & archive',
				included: true,
				highlight: false,
			},
			{
				text: 'Add-on: 30-min expert review',
				included: true,
				highlight: false,
			},
		],
		cta: 'Become a Gladiator',
		ctaSub: 'One payment covers 6 months',
		tier: 'starter',
	},
	{
		id: 'pro',
		name: 'Centurion',
		badge: 'Most popular',
		price: '$99',
		priceCaption: 'one payment every 6 months',
		monthlyEquiv: '$16.50',
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
				text: 'Scan history & archive',
				included: true,
				highlight: false,
			},
			{
				text: 'Add-on: 30-min expert review',
				included: true,
				highlight: false,
			},
			{
				text: 'Early access: AI visibility check (coming soon)',
				included: true,
				highlight: true,
			},
		],
		cta: 'Become a Centurion',
		ctaSub: 'One payment covers 6 months',
		tier: 'pro',
	},
];

export function PricingSection() {
	const [showPreorderModal, setShowPreorderModal] = useState(false);
	const [selectedTier, setSelectedTier] = useState<string | null>(null);

	const handleSelect = (plan: (typeof plans)[number]) => {
		setSelectedTier(plan.tier);
		setShowPreorderModal(true);
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
						Try the free demo scan above to see what your website is
						actually saying to humans and AI. Pick a plan when you
						are ready to fix it.
					</p>
				</div>

				{/* Cards */}
				<div className='mx-auto grid max-w-4xl gap-6 md:grid-cols-2'>
					{plans.map((plan) => {
						const isPopular = plan.id === 'pro';
						const isStarter = plan.tier === 'starter';

						const displayPrice = plan.price;
						const priceCaption = plan.priceCaption;

						return (
							<div
								key={plan.id}
								className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
									isStarter
										? 'bg-cream-50 border-2 border-choco-100'
										: isPopular
											? 'bg-choco-900 border-2 border-choco-900 shadow-2xl'
											: 'bg-cream-50 border-2 border-amber-300'
								}`}>
								{/* Badge */}
								<div className='mb-6'>
									<span
										className={`inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
											isStarter
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
										{plan.monthlyEquiv && (
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
										className={`w-full justify-center font-semibold py-3 rounded-xl transition-all duration-200 ${
											isStarter
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
