/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Button } from '@ariclear/components';
import { toast } from 'react-hot-toast';

const CALENDLY_URL = 'https://calendly.com/slavo3/30min';

const TIER_CONFIG = {
	pro: {
		label: 'Pro Plan',
		websites: '3',
		maxWebsites: 3,
		badge: 'Pro · 3 Websites · 3 Expert Sessions/mo',
		headline: 'Get started with Pro',
		description:
			"3 websites, unlimited scans, Brand Awareness tool, and 3 live expert sessions per month. We'll reach out within 24 hours.",
	},
	expert: {
		label: 'Expert Plan',
		websites: '6',
		maxWebsites: 6,
		badge: 'Expert · 6 Websites · 6 Expert Sessions/mo',
		headline: 'Get started with Expert',
		description:
			'6 websites, unlimited scans, Brand Awareness tool, and 6 live expert sessions per month. Ideal for agencies and client work.',
	},
} as const;

type Tier = keyof typeof TIER_CONFIG;

function normalizeUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

const inputClass =
	'w-full rounded-full border border-choco-700 bg-choco-800 px-3 py-1.5 text-sm text-cream-50 placeholder:text-choco-500 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400';

const labelClass =
	'text-[10px] font-semibold uppercase tracking-[0.12em] text-choco-300';

export function PreorderForm({
	onSuccess,
	tier,
}: {
	onSuccess?: () => void;
	tier?: string | null;
}) {
	const config = TIER_CONFIG[(tier as Tier) ?? 'pro'] ?? TIER_CONFIG.pro;
	const resolvedTier = (tier as Tier) ?? 'pro';

	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [url, setUrl] = useState('');
	const [websites, setWebsites] = useState<string>(config.websites);
	const [notes, setNotes] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	const handlePreorder: FormEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		if (!email) return;

		setLoading(true);
		setSubmitted(false);

		try {
			const res = await fetch('/api/plan-request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					phone: phone.trim() || undefined,
					plan: resolvedTier,
					websites: Number(websites),
					url: normalizeUrl(url) || undefined,
					notes: notes.trim() || undefined,
					sourceUrl: window.location.href,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				if (res.status === 409 || data?.error?.includes('duplicate')) {
					toast("You've already requested access 👀", { icon: 'ℹ️' });
					onSuccess?.();
					return;
				}
				throw new Error(data?.error ?? 'Something went wrong');
			}

			setTimeout(() => {
				setLoading(false);
				setSubmitted(true);
				setEmail('');
				setPhone('');
				setUrl('');
				setNotes('');
				toast.success(
					"Request submitted! We'll reach out within 24 hours.",
				);
				onSuccess?.();
			}, 800);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Something went wrong. Please try again.',
			);
			setLoading(false);
		}
	};

	return (
		<form
			onSubmit={handlePreorder}
			className='w-full max-w-lg space-y-3 rounded-2xl bg-choco-900 p-4 sm:p-6 shadow-xl ring-1 ring-choco-700'>
			{/* Header */}
			<div className='space-y-1'>
				<p className='inline-flex items-center gap-2 rounded-full bg-choco-800 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-choco-200'>
					<span className='h-1.5 w-1.5 rounded-full bg-amber-400' />
					{config.badge}
				</p>
				<h2 className='text-lg font-semibold text-cream-50 sm:text-xl'>
					{config.headline}
				</h2>
				<p className='text-[11px] leading-relaxed text-choco-300'>
					{config.description}
				</p>
			</div>

			{/* Email + Phone — side by side on sm+ */}
			<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
				<div className='space-y-1'>
					<label htmlFor='email' className={labelClass}>
						Work email
					</label>
					<input
						id='email'
						type='email'
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder='you@company.com'
						className={inputClass}
					/>
				</div>

				<div className='space-y-1'>
					<label htmlFor='phone' className={labelClass}>
						Phone{' '}
						<span className='normal-case text-choco-500 font-normal'>
							(optional)
						</span>
					</label>
					<input
						id='phone'
						type='tel'
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						placeholder='+1 555 000 0000'
						className={inputClass}
					/>
				</div>
			</div>

			{/* Websites + URL — side by side on sm+ */}
			<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
				<div className='space-y-1'>
					<label htmlFor='websites' className={labelClass}>
						Websites to track
					</label>
					<select
						id='websites'
						value={websites}
						onChange={(e) => setWebsites(e.target.value)}
						className={inputClass}>
						{Array.from(
							{ length: config.maxWebsites },
							(_, i) => i + 1,
						).map((n) => (
							<option key={n} value={String(n)}>
								{n} website{n > 1 ? 's' : ''}
							</option>
						))}
					</select>
				</div>

				<div className='space-y-1'>
					<label htmlFor='homepage' className={labelClass}>
						Website URL{' '}
						<span className='normal-case text-choco-500 font-normal'>
							(optional)
						</span>
					</label>
					<input
						id='homepage'
						type='text'
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						onBlur={(e) => {
							const normalized = normalizeUrl(e.target.value);
							if (normalized) setUrl(normalized);
						}}
						placeholder='yourwebsite.com'
						className={inputClass}
					/>
				</div>
			</div>

			{/* Notes */}
			<div className='space-y-1'>
				<label htmlFor='notes' className={labelClass}>
					Anything else?{' '}
					<span className='normal-case text-choco-500 font-normal'>
						(optional)
					</span>
				</label>
				<textarea
					id='notes'
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder='Tell us about your project, goals, or questions...'
					rows={2}
					className='w-full rounded-2xl border border-choco-700 bg-choco-800 px-3 py-2 text-xs text-cream-50 placeholder:text-choco-500 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400 resize-none'
				/>
			</div>

			{/* CTA */}
			<Button
				type='submit'
				className='w-full justify-center'
				disabled={loading}>
				{loading ? 'Submitting...' : `Request ${config.label} access`}
			</Button>

			{/* Calendly */}
			<div className='flex items-center gap-2'>
				<div className='flex-1 h-px bg-choco-700' />
				<span className='text-[10px] text-choco-500'>or</span>
				<div className='flex-1 h-px bg-choco-700' />
			</div>
			<a
				href={CALENDLY_URL}
				target='_blank'
				rel='noopener noreferrer'
				className='flex items-center justify-center gap-2 w-full rounded-full border border-choco-600 py-2 text-sm font-medium text-choco-200 hover:border-choco-400 hover:text-cream-50 transition-colors'>
				<span>📅</span>
				Book a 30-min call instead
			</a>

			{/* Submitted */}
			{submitted && (
				<div className='rounded-xl bg-green-900/30 border border-green-700 px-3 py-2.5 text-[11px] text-cream-100'>
					<p className='font-medium mb-0.5'>✅ Request submitted!</p>
					<p className='text-choco-200'>
						We'll reach out within 24 hours to set up your{' '}
						{config.label} with {websites} website
						{websites !== '1' ? 's' : ''}.
					</p>
				</div>
			)}

			<p className='text-[10px] text-choco-400 text-center'>
				No credit card required to get started.
			</p>
		</form>
	);
}
