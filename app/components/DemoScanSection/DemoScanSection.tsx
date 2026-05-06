'use client';

import { useState, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type DemoResult = {
	domain: string;
	overallScore: number;
	humanScore: number;
	aiScore: number;
	verdict: string; // short punchy verdict
	topIssues: string[]; // 2 real issues shown
	hiddenIssueCount: number; // how many more are hidden
};

type ScanState = 'idle' | 'loading' | 'result' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
	try {
		const u = new URL(url.startsWith('http') ? url : `https://${url}`);
		return u.hostname.includes('.');
	} catch {
		return false;
	}
}

function normalizeUrl(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function getDomain(url: string): string {
	try {
		return new URL(url).hostname.replace('www.', '');
	} catch {
		return url;
	}
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
	score,
	label,
	size = 80,
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
			<span className='text-[11px] font-medium uppercase tracking-widest text-[#8a7060]'>
				{label}
			</span>
		</div>
	);
}

// ─── Teaser Result Card ───────────────────────────────────────────────────────

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

	const verdict =
		result.overallScore >= 70
			? 'Solid foundation — with room to grow'
			: result.overallScore >= 45
				? 'Needs work — visitors are confused'
				: "Critical issues — you're losing leads";

	return (
		<div
			className='mt-6 overflow-hidden rounded-2xl border border-[#e0d4c4] bg-white shadow-[0_4px_24px_rgba(90,60,20,0.08)]'
			style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
			{/* Header bar */}
			<div
				className='flex items-center justify-between px-5 py-3'
				style={{
					background: '#faf6f0',
					borderBottom: '1px solid #e8ddd0',
				}}>
				<div className='flex items-center gap-2'>
					<div className='h-2 w-2 rounded-full bg-[#5a8a5a]' />
					<span className='text-[11px] font-semibold uppercase tracking-widest text-[#8a7060]'>
						Demo Report · {result.domain}
					</span>
				</div>
				<span
					className='rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider'
					style={{ background: '#f0e8d8', color: '#8a6040' }}>
					Preview Only
				</span>
			</div>

			{/* Score row */}
			<div className='flex items-center justify-around px-6 py-6'>
				<ScoreRing
					score={result.overallScore}
					label='Overall'
					size={88}
				/>
				<ScoreRing
					score={result.humanScore}
					label='Clarity'
					size={72}
				/>
				<ScoreRing
					score={result.aiScore}
					label='AI-SEO'
					size={72}
					blurred
				/>
			</div>

			{/* Verdict */}
			<div
				className='mx-5 mb-4 rounded-xl px-4 py-3'
				style={{ background: '#faf6f0', border: '1px solid #e8ddd0' }}>
				<div className='flex items-center gap-2'>
					<span style={{ color: overallColor, fontSize: 16 }}>
						{result.overallScore >= 70
							? '✓'
							: result.overallScore >= 45
								? '⚠'
								: '✕'}
					</span>
					<p className='text-sm font-semibold text-[#2c1e10]'>
						{verdict}
					</p>
				</div>
			</div>

			{/* Issues — 2 shown, rest blurred */}
			<div className='mx-5 mb-4 space-y-2'>
				<p className='text-[11px] font-semibold uppercase tracking-widest text-[#8a7060]'>
					Top Issues Found
				</p>

				{result.topIssues.map((issue, i) => (
					<div
						key={i}
						className='flex items-start gap-2.5 rounded-xl border border-[#eee0d0] bg-[#fffcf8] px-4 py-3'>
						<span className='mt-0.5 text-sm text-[#b84c4c]'>✕</span>
						<p className='text-sm text-[#3c2a18]'>{issue}</p>
					</div>
				))}

				{/* Blurred hidden issues */}
				{result.hiddenIssueCount > 0 && (
					<div
						className='relative overflow-hidden rounded-xl border border-[#eee0d0]'
						style={{ minHeight: 52 }}>
						<div
							className='flex items-start gap-2.5 px-4 py-3'
							style={{ filter: 'blur(4px)', userSelect: 'none' }}>
							<span className='mt-0.5 text-sm text-[#b84c4c]'>
								✕
							</span>
							<p className='text-sm text-[#3c2a18]'>
								Your hero copy is buried under navigation — most
								visitors never read it before leaving.
							</p>
						</div>
						<div className='absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]'>
							<p className='text-xs font-semibold text-[#8a6040]'>
								+ {result.hiddenIssueCount} more issue
								{result.hiddenIssueCount > 1 ? 's' : ''} hidden
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Blurred sections teaser */}
			<div
				className='mx-5 mb-5 overflow-hidden rounded-xl border border-[#e8ddd0]'
				style={{ position: 'relative' }}>
				{/* Fake content behind blur */}
				<div
					style={{
						filter: 'blur(6px)',
						userSelect: 'none',
						pointerEvents: 'none',
					}}>
					<div className='space-y-2 p-4'>
						<div className='h-3 w-3/4 rounded bg-[#e8ddd0]' />
						<div className='h-3 w-1/2 rounded bg-[#e8ddd0]' />
						<div className='h-3 w-2/3 rounded bg-[#e8ddd0]' />
						<div className='mt-3 h-3 w-full rounded bg-[#e8ddd0]' />
						<div className='h-3 w-4/5 rounded bg-[#e8ddd0]' />
					</div>
				</div>
				{/* Overlay */}
				<div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px]'>
					<p className='text-xs font-semibold text-[#5a3e28]'>
						AI-SEO Score · Rewrite Suggestions · Action Plan
					</p>
					<p className='text-[11px] text-[#8a7060]'>
						Sign up free to unlock the full report
					</p>
				</div>
			</div>

			{/* CTA */}
			<div
				className='px-5 pb-5'
				style={{
					borderTop: '1px solid #f0e8d8',
					paddingTop: '1.25rem',
				}}>
				<button
					onClick={onSignUp}
					className='group w-full rounded-xl py-3 text-sm font-bold text-white transition-all duration-150 active:scale-[0.98]'
					style={{
						background:
							'linear-gradient(135deg, #3c2a18 0%, #6b4226 100%)',
						boxShadow: '0 2px 12px rgba(60,42,24,0.25)',
					}}>
					Get the Full Report — Free
					<span className='ml-2 inline-block transition-transform duration-150 group-hover:translate-x-0.5'>
						→
					</span>
				</button>
				<p className='mt-2 text-center text-[11px] text-[#a09080]'>
					No credit card · Full AI-SEO score · Rewrite suggestions ·
					PDF export
				</p>
			</div>
		</div>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DemoScanSection({
	onSignUpClick,
}: {
	onSignUpClick?: () => void;
}) {
	const [url, setUrl] = useState('');
	const [state, setState] = useState<ScanState>('idle');
	const [result, setResult] = useState<DemoResult | null>(null);
	const [errorMsg, setErrorMsg] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSignUp = () => {
		if (onSignUpClick) {
			onSignUpClick();
		} else {
			// fallback: scroll to hero or open auth
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handleScan = async () => {
		const normalized = normalizeUrl(url);
		if (!isValidUrl(normalized)) {
			setErrorMsg('Please enter a valid URL, e.g. https://yoursite.com');
			return;
		}

		setState('loading');
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
				if (res.status === 429) {
					setErrorMsg('Too many scans — try again in a minute.');
				} else if (body?.errorCode === 'FETCH_ERROR') {
					setErrorMsg("Couldn't reach that URL. Try your homepage.");
				} else {
					setErrorMsg('Something went wrong. Try a different URL.');
				}
				setState('error');
				return;
			}

			const data: DemoResult = await res.json();
			setResult(data);
			setState('result');
		} catch {
			setErrorMsg('Network error. Check your connection and try again.');
			setState('error');
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleScan();
	};

	const isLoading = state === 'loading';

	return (
		<>
			<style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .demo-scan-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>

			<section
				className='relative overflow-hidden py-20'
				style={{
					background:
						'linear-gradient(180deg, #fdf8f2 0%, #f5ece0 50%, #fdf8f2 100%)',
				}}>
				{/* Background decoration */}
				<div
					aria-hidden
					className='pointer-events-none absolute inset-0'
					style={{
						backgroundImage:
							'radial-gradient(circle at 30% 40%, rgba(180,130,70,0.06) 0%, transparent 60%), radial-gradient(circle at 75% 70%, rgba(90,60,20,0.05) 0%, transparent 55%)',
					}}
				/>

				<div className='relative mx-auto max-w-xl px-4'>
					{/* Label */}
					<div className='mb-4 flex justify-center'>
						<span
							className='rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]'
							style={{
								background: '#f0e6d2',
								color: '#7a5030',
								border: '1px solid #ddd0bc',
							}}>
							Try it now — no account needed
						</span>
					</div>

					{/* Headline */}
					<h2
						className='mb-2 text-center text-3xl font-bold leading-tight tracking-tight'
						style={{ color: '#1e1208' }}>
						See how your website scores
						<br />
						<span style={{ color: '#8a5c30' }}>in 30 seconds</span>
					</h2>
					<p className='mb-8 text-center text-sm text-[#8a7060]'>
						Drop your URL below. We&apos;ll run a real analysis —
						instantly.
					</p>

					{/* Input */}
					<div
						className='rounded-2xl border border-[#ddd0bc] bg-white p-2 shadow-[0_2px_16px_rgba(90,60,20,0.08)]'
						style={{
							display: 'flex',
							gap: 8,
							alignItems: 'center',
						}}>
						<input
							ref={inputRef}
							type='url'
							value={url}
							onChange={(e) => {
								setUrl(e.target.value);
								if (state === 'error') {
									setState('idle');
									setErrorMsg('');
								}
							}}
							onKeyDown={handleKeyDown}
							placeholder='https://yoursite.com'
							disabled={isLoading}
							className='flex-1 rounded-xl border-0 bg-transparent px-4 py-2.5 text-sm text-[#2c1e10] placeholder:text-[#c0b0a0] focus:outline-none disabled:opacity-60'
						/>
						<button
							onClick={handleScan}
							disabled={isLoading || !url.trim()}
							className='shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 active:scale-95'
							style={{
								background: isLoading
									? '#8a6040'
									: 'linear-gradient(135deg, #3c2a18 0%, #6b4226 100%)',
								boxShadow: '0 2px 8px rgba(60,42,24,0.2)',
							}}>
							{isLoading ? (
								<span className='flex items-center gap-2'>
									<span className='demo-scan-spinner' />
									Scanning…
								</span>
							) : (
								'Scan Site →'
							)}
						</button>
					</div>

					{/* Inline error */}
					{state === 'error' && errorMsg && (
						<p
							className='mt-2 text-center text-xs text-[#b84c4c]'
							style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
							⚠ {errorMsg}
						</p>
					)}

					{/* Loading hint */}
					{isLoading && (
						<p
							className='mt-3 text-center text-[11px] text-[#a09080]'
							style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
							Fetching your page and running analysis — usually
							under 15s
						</p>
					)}

					{/* Result */}
					{state === 'result' && result && (
						<TeaserResult result={result} onSignUp={handleSignUp} />
					)}

					{/* Trust line */}
					{state === 'idle' && (
						<p className='mt-5 text-center text-[11px] text-[#b0a090]'>
							Works on any public website · No login required to
							preview
						</p>
					)}
				</div>
			</section>
		</>
	);
}
