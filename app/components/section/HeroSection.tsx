'use client';

import { FormEvent, useState } from 'react';
import { Button, HeroPreviewCard, AuthModal } from '@ariclear/components';
import { preorderRequest } from '@ariclear/helpers';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoResult = {
	domain: string;
	overallScore: number;
	humanScore: number;
	aiScore: number;
	verdict: string;
	topIssues: string[];
	hiddenIssueCount: number;
};

type ScanState = 'idle' | 'loading' | 'result' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
	try {
		const u = new URL(url.startsWith('http') ? url : `https://${url}`);
		return u.hostname.includes('.');
	} catch {
		return false;
	}
}

function normalizeUrl(raw: string): string {
	const t = raw.trim();
	return t.startsWith('http') ? t : `https://${t}`;
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
	score,
	label,
	size = 72,
	blurred = false,
}: {
	score: number;
	label: string;
	size?: number;
	blurred?: boolean;
}) {
	const r = (size - 10) / 2;
	const circ = 2 * Math.PI * r;
	const fill = blurred ? 0 : (score / 100) * circ;
	const color = score >= 70 ? '#5a8a5a' : score >= 45 ? '#c8832a' : '#b84c4c';

	return (
		<div className='flex flex-col items-center gap-1'>
			<div className='relative' style={{ width: size, height: size }}>
				<svg
					width={size}
					height={size}
					viewBox={`0 0 ${size} ${size}`}
					style={{ transform: 'rotate(-90deg)' }}>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill='none'
						stroke='#e8ddd0'
						strokeWidth={5}
					/>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill='none'
						stroke={blurred ? '#c8b89a' : color}
						strokeWidth={5}
						strokeDasharray={circ}
						strokeDashoffset={circ - fill}
						strokeLinecap='round'
						style={{ transition: 'stroke-dashoffset 1s ease' }}
					/>
				</svg>
				<div
					className='absolute inset-0 flex items-center justify-center'
					style={blurred ? { filter: 'blur(5px)' } : {}}>
					<span
						className='font-bold tabular-nums'
						style={{
							fontSize: size * 0.22,
							color: blurred ? '#c8b89a' : color,
						}}>
						{blurred ? '??' : score}
					</span>
				</div>
			</div>
			<span className='text-[11px] font-medium uppercase tracking-widest text-choco-500'>
				{label}
			</span>
		</div>
	);
}

// ─── Teaser Result ────────────────────────────────────────────────────────────

function TeaserResult({
	result,
	onSignUp,
}: {
	result: DemoResult;
	onSignUp: () => void;
}) {
	const overallColor =
		result.overallScore >= 70
			? '#5a8a5a'
			: result.overallScore >= 45
				? '#c8832a'
				: '#b84c4c';

	return (
		<div
			className='mt-4 overflow-hidden rounded-2xl border border-choco-100 bg-white shadow-soft'
			style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
			{/* Header */}
			<div className='flex items-center justify-between border-b border-choco-100 bg-cream-50 px-4 py-2.5'>
				<div className='flex items-center gap-2'>
					<span className='h-1.5 w-1.5 rounded-full bg-green-500' />
					<span className='text-[11px] font-semibold uppercase tracking-widest text-choco-500'>
						Preview · {result.domain}
					</span>
				</div>
				<span className='rounded-full border border-choco-100 bg-cream-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-choco-600'>
					Demo only
				</span>
			</div>

			{/* Scores */}
			<div className='flex items-center justify-around px-6 py-5'>
				<ScoreRing
					score={result.overallScore}
					label='Overall'
					size={80}
				/>
				<ScoreRing
					score={result.humanScore}
					label='Clarity'
					size={64}
				/>
				<ScoreRing
					score={result.aiScore}
					label='AI-SEO'
					size={64}
					blurred
				/>
			</div>

			{/* Verdict */}
			<div className='mx-4 mb-3 rounded-xl border border-choco-100 bg-cream-50 px-4 py-2.5'>
				<div className='flex items-center gap-2'>
					<span style={{ color: overallColor }}>
						{result.overallScore >= 70
							? '✓'
							: result.overallScore >= 45
								? '⚠'
								: '✕'}
					</span>
					<p className='text-sm font-semibold text-choco-900'>
						{result.overallScore >= 70
							? 'Solid foundation — room to grow'
							: result.overallScore >= 45
								? 'Needs work — visitors are confused'
								: 'Critical issues — you are losing leads'}
					</p>
				</div>
			</div>

			{/* Issues */}
			<div className='mx-4 mb-3 space-y-2'>
				<p className='text-[11px] font-semibold uppercase tracking-widest text-choco-400'>
					Top Issues Found
				</p>
				{result.topIssues.map((issue, i) => (
					<div
						key={i}
						className='flex items-start gap-2 rounded-xl border border-choco-100 bg-cream-50 px-3 py-2.5'>
						<span className='mt-0.5 text-xs text-red-500'>✕</span>
						<p className='text-xs text-choco-800'>{issue}</p>
					</div>
				))}

				{/* Blurred hidden issues */}
				{result.hiddenIssueCount > 0 && (
					<div className='relative overflow-hidden rounded-xl border border-choco-100'>
						<div
							className='flex items-start gap-2 px-3 py-2.5'
							style={{ filter: 'blur(4px)', userSelect: 'none' }}>
							<span className='mt-0.5 text-xs text-red-500'>
								✕
							</span>
							<p className='text-xs text-choco-800'>
								Your hero copy is buried — most visitors never
								read it before leaving.
							</p>
						</div>
						<div className='absolute inset-0 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]'>
							<p className='text-[11px] font-semibold text-choco-600'>
								+ {result.hiddenIssueCount} more hidden
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Blurred full report teaser */}
			<div className='relative mx-4 mb-4 overflow-hidden rounded-xl border border-choco-100'>
				<div
					style={{
						filter: 'blur(5px)',
						userSelect: 'none',
						pointerEvents: 'none',
					}}
					className='space-y-2 p-4'>
					<div className='h-2.5 w-3/4 rounded bg-choco-100' />
					<div className='h-2.5 w-1/2 rounded bg-choco-100' />
					<div className='h-2.5 w-2/3 rounded bg-choco-100' />
					<div className='mt-2 h-2.5 w-full rounded bg-choco-100' />
					<div className='h-2.5 w-4/5 rounded bg-choco-100' />
				</div>
				<div className='absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 backdrop-blur-[2px]'>
					<p className='text-xs font-semibold text-choco-700'>
						AI-SEO Score · Rewrites · Action Plan
					</p>
					<p className='text-[11px] text-choco-400'>
						Sign up free to unlock the full report
					</p>
				</div>
			</div>

			{/* CTA */}
			<div className='border-t border-choco-100 px-4 pb-4 pt-4'>
				<Button className='w-full' onClick={onSignUp}>
					Get the Full Report — Free →
				</Button>
				<p className='mt-2 text-center text-[11px] text-choco-400'>
					No credit card · Full AI-SEO score · PDF export
				</p>
			</div>
		</div>
	);
}

// ─── Inline Demo Scanner ──────────────────────────────────────────────────────

function InlineDemoScanner({ onSignUp }: { onSignUp: () => void }) {
	const [scanUrl, setScanUrl] = useState('');
	const [scanState, setScanState] = useState<ScanState>('idle');
	const [result, setResult] = useState<DemoResult | null>(null);
	const [errorMsg, setErrorMsg] = useState('');

	const handleScan = async () => {
		const normalized = normalizeUrl(scanUrl);
		if (!isValidUrl(normalized)) {
			setErrorMsg('Enter a valid URL, e.g. https://yoursite.com');
			setScanState('error');
			return;
		}

		setScanState('loading');
		setErrorMsg('');
		setResult(null);

		try {
			const res = await fetch('/api/demo-scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: normalized }),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				setErrorMsg(
					res.status === 429
						? 'Too many scans — try again in a minute.'
						: body?.errorCode === 'FETCH_ERROR'
							? "Couldn't reach that URL. Try your homepage."
							: 'Something went wrong. Try a different URL.',
				);
				setScanState('error');
				return;
			}

			const data: DemoResult = await res.json();
			setResult(data);
			setScanState('result');
		} catch {
			setErrorMsg('Network error. Check your connection.');
			setScanState('error');
		}
	};

	const isLoading = scanState === 'loading';

	return (
		<div className='pt-4'>
			<div className='flex items-center gap-3 pb-3'>
				<div className='h-px flex-1 bg-choco-100' />
				<span className='text-[11px] font-medium uppercase tracking-widest text-choco-400'>
					or try it right now
				</span>
				<div className='h-px flex-1 bg-choco-100' />
			</div>

			<div className='rounded-2xl border border-choco-100 bg-white/80 p-2 shadow-soft backdrop-blur'>
				<div className='flex items-center gap-2'>
					<input
						type='url'
						value={scanUrl}
						onChange={(e) => {
							setScanUrl(e.target.value);
							if (scanState === 'error') {
								setScanState('idle');
								setErrorMsg('');
							}
						}}
						onKeyDown={(e) => e.key === 'Enter' && handleScan()}
						placeholder='https://yoursite.com'
						disabled={isLoading}
						className='flex-1 rounded-xl border-0 bg-transparent px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:outline-none disabled:opacity-60'
					/>
					<Button
						type='button'
						onClick={handleScan}
						disabled={isLoading || !scanUrl.trim()}
						className='shrink-0'>
						{isLoading ? (
							<span className='flex items-center gap-2'>
								<span
									className='inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white'
									style={{
										animation: 'spin 0.7s linear infinite',
									}}
								/>
								Scanning…
							</span>
						) : (
							'Scan free →'
						)}
					</Button>
				</div>
			</div>

			{scanState === 'error' && errorMsg && (
				<p className='mt-2 text-center text-xs text-red-600'>
					⚠ {errorMsg}
				</p>
			)}

			{isLoading && (
				<p className='mt-2 text-center text-[11px] text-choco-400'>
					Fetching your page and running analysis — usually under 20s
				</p>
			)}

			{scanState === 'result' && result && (
				<TeaserResult result={result} onSignUp={onSignUp} />
			)}
		</div>
	);
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

export function HeroSection() {
	const [email, setEmail] = useState('');
	const [url, setUrl] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [authOpen, setAuthOpen] = useState(false);

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
		<>
			<style>{`
				@keyframes fadeSlideUp {
					from { opacity: 0; transform: translateY(14px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
			`}</style>

			<section className='bg-gradient-to-b from-cream-50 to-cream-100'>
				<div className='mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-start lg:py-20 lg:px-8'>
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
								{
									stat: '8s',
									label: 'avg. human attention span',
								},
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
							AriClear critiques your homepage like a brutally
							honest first-time visitor — then like an AI indexer.
							You get a clarity score, specific line-by-line
							fixes, and rewritten copy that works for both humans
							and ChatGPT.
						</p>

						{/* Waitlist form */}
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
										onChange={(e) =>
											setEmail(e.target.value)
										}
										placeholder='you@startup.com'
										className='flex-1 rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500'
									/>
									<Button
										type='submit'
										className='shrink-0 sm:px-6'
										disabled={loading}>
										{loading
											? 'Saving...'
											: 'Reserve my spot'}
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
									No credit card. You&apos;ll be first when
									your alpha invite is ready.
								</p>

								{submitted && (
									<p className='text-xs font-medium text-choco-700'>
										✅ You&apos;re in. Ari will reach out
										once the private alpha is ready.
									</p>
								)}
							</form>

							{/* Inline demo scanner — lives below the form */}
							<div className='w-full max-w-xl'>
								<InlineDemoScanner
									onSignUp={() => setAuthOpen(true)}
								/>
							</div>
						</div>
					</div>

					{/* Right: preview card */}
					<HeroPreviewCard />
				</div>
			</section>

			<AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
		</>
	);
}
