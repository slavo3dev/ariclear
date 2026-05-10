'use client';

import { FormEvent, useState } from 'react';
import { Button, HeroPreviewCard } from '@ariclear/components';
import { preorderRequest } from '@ariclear/helpers';
import { toast } from 'react-hot-toast';

export function HeroSection() {
	const [email, setEmail] = useState('');
	const [url, setUrl] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	const handlePreorder = async (e: FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setLoading(true);
		setSubmitted(false);

		try {
			await preorderRequest({ email, url });
			setTimeout(() => {
				setLoading(false);
				setSubmitted(true);
				setEmail('');
				setUrl('');
				toast.success("You're in! Check your email soon.");
			}, 800);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Something went wrong';
			if (message === 'EMAIL_EXISTS') {
				toast("You're already on the waitlist 👀", { icon: 'ℹ️' });
			} else {
				toast.error('Something went wrong. Please try again.');
			}
			setLoading(false);
		}
	};

	return (
		<section className='bg-gradient-to-b from-cream-50 to-cream-100'>
			<div className='mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:py-20 lg:px-8'>
				{/* Left copy */}
				<div className='flex-1 space-y-6'>
					<p className='inline-flex items-center gap-2 rounded-full border border-choco-100 bg-cream-50 px-3 py-1 text-xs font-medium text-choco-700 shadow-sm'>
						<span className='h-2 w-2 rounded-full bg-green-500' />
						Early access · limited alpha
					</p>

					<h1 className='font-display text-4xl tracking-tight text-choco-900 sm:text-5xl lg:text-6xl'>
						Your website has 8 seconds.{' '}
						<span className='text-choco-500'>
							Most fail in the first two.
						</span>
					</h1>

					{/* Science stat pills */}
					<div className='flex flex-wrap gap-3'>
						{[
							{ stat: '8s', label: 'avg. human attention span' },
							{
								stat: '2 scores',
								label: 'human + AI clarity, one scan',
							},
							{
								stat: '55%',
								label: 'of visitors leave in under 15s',
							},
							{
								stat: '70%+',
								label: 'of AI answers skip uncited sites',
							},
						].map(({ stat, label }) => (
							<div
								key={stat}
								className='flex flex-col gap-0.5 rounded-xl border border-choco-100 bg-white/70 px-3 py-2'>
								<span className='text-base font-semibold text-choco-900'>
									{stat}
								</span>
								<span className='text-[11px] text-choco-500'>
									{label}
								</span>
							</div>
						))}
					</div>

					<p className='max-w-xl text-base leading-relaxed text-choco-700 sm:text-lg'>
						AriClear critiques your homepage like a brutally honest
						first-time visitor — then like an AI indexer. You get a
						clarity score, specific line-by-line fixes, and
						rewritten copy that works for both humans and ChatGPT.
					</p>

					{/* Pre-order / waitlist CTA */}
					<div id='preorder' className='pt-2'>
						<form
							onSubmit={handlePreorder}
							className='w-full max-w-xl space-y-3 rounded-2xl bg-white/80 p-4 shadow-soft ring-1 ring-choco-100 backdrop-blur'>
							<label
								htmlFor='email'
								className='block text-xs font-medium uppercase tracking-[0.12em] text-choco-600'>
								Request a 60-day trial
							</label>

							<div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
								<input
									id='email'
									type='email'
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder='you@startup.com'
									className='flex-1 rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500'
								/>
								<Button
									type='submit'
									className='shrink-0 sm:px-6'
									disabled={loading}>
									{loading ? 'Saving...' : 'Reserve my spot'}
								</Button>
							</div>

							<input
								type='url'
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder='Optional: drop your homepage URL for a preview critique'
								className='w-full rounded-full border border-dashed border-choco-200 bg-cream-50 px-4 py-2 text-xs text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500'
							/>

							<p className='text-[11px] text-choco-500'>
								No credit card. You&apos;ll be first when your
								alpha invite is ready.
							</p>

							{submitted && (
								<p className='text-xs font-medium text-choco-700'>
									✅ You&apos;re in. Ari will reach out once
									the private alpha is ready.
								</p>
							)}
						</form>
					</div>
				</div>

				{/* Right: preview card */}
				<HeroPreviewCard />
			</div>
		</section>
	);
}
