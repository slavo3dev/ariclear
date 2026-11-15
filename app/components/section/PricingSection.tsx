'use client';

import {
	AuthModal,
	Button,
	usePreorder,
	useCheckout,
} from '@ariclear/components';
import { FREE_LIMITS, PAID_PLANS, type PaidTier } from '@/lib/entitlements';

const plans: {
	id: PaidTier;
	name: string;
	badge: string;
	price: string;
	priceCaption: string;
	monthlyEquiv: string;
	description: string;
	features: { text: string; included: boolean; highlight: boolean }[];
	cta: string;
	ctaSub: string;
	tier: PaidTier;
}[] = [
	{
		id: 'starter',
		name: PAID_PLANS.starter.label,
		badge: 'Get started',
		price: `$${PAID_PLANS.starter.priceUsd}`,
		priceCaption: 'one payment every 6 months',
		monthlyEquiv: '$6.50',
		description:
			'Know exactly what visitors and AI understand about your website, and how to fix it.',
		features: [
			{
				text: `${PAID_PLANS.starter.websites} website`,
				included: true,
				highlight: false,
			},
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
				text: 'Test-your-rewrite scoring',
				included: true,
				highlight: true,
			},
			{
				text: 'Technical readiness checks + copy-paste fixes',
				included: true,
				highlight: true,
			},
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
		ctaSub: 'One payment covers 6 months · no auto-renewal',
		tier: 'starter',
	},
	{
		id: 'pro',
		name: PAID_PLANS.pro.label,
		badge: 'Most popular',
		price: `$${PAID_PLANS.pro.priceUsd}`,
		priceCaption: 'one payment every 6 months',
		monthlyEquiv: '$16.50',
		description:
			'For founders and teams actively improving their messaging.',
		features: [
			{
				text: `${PAID_PLANS.pro.websites} websites`,
				included: true,
				highlight: false,
			},
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
				text: 'Test-your-rewrite scoring',
				included: true,
				highlight: true,
			},
			{
				text: 'Technical readiness checks + copy-paste fixes',
				included: true,
				highlight: true,
			},
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
		ctaSub: 'One payment covers 6 months · no auto-renewal',
		tier: 'pro',
	},
];

export function PricingSection() {
	const { start, pending, authOpen, closeAuth } = useCheckout();
	const { open: openContact } = usePreorder();

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
										onClick={() => start(plan.tier)}
										disabled={pending !== null}
										className={`w-full justify-center font-semibold py-3 rounded-xl transition-all duration-200 ${
											isStarter
												? 'bg-choco-900 text-cream-50 hover:bg-choco-800'
												: isPopular
													? 'bg-amber-400 text-choco-900 hover:bg-amber-300 shadow-lg hover:shadow-xl'
													: 'bg-choco-900 text-cream-50 hover:bg-choco-800'
										}`}>
										{pending === plan.tier
											? 'Opening checkout…'
											: plan.cta}
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
				<div className='mt-12 rounded-2xl bg-cream-50 border border-choco-100 p-6 text-center space-y-2'>
					<p className='text-sm text-choco-700'>
						<span className='font-semibold text-choco-900'>
							Free account:
						</span>{' '}
						{FREE_LIMITS.lifetimeScans} full scan of{' '}
						{FREE_LIMITS.websites} website, with human and AI scores
						and a suggested rewrite. No credit card.
					</p>
					<p className='text-sm text-choco-700'>
						<span className='font-semibold text-choco-900'>
							Paid plans
						</span>{' '}
						add re-scans, the rewrite tester, technical checks and
						PDF reports. One payment, no subscription.{' '}
						<a
							href='/refund'
							className='underline hover:text-choco-900'>
							Refund policy
						</a>
						.
					</p>
				</div>

				{/* Trust line */}
				<p className='text-center text-sm text-choco-500 mt-8'>
					Questions before you buy?{' '}
					<button
						type='button'
						onClick={openContact}
						className='font-semibold text-choco-800 underline hover:text-choco-600 transition-colors'>
						Talk to us
					</button>{' '}
					— we reply fast.
				</p>
			</div>

			<AuthModal open={authOpen} onClose={closeAuth} initialMode='signup' />

		</section>
	);
}
