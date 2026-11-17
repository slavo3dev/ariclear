'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
	Navbar,
	SiteFooter,
	Button,
	useAuth,
	AuthModal,
	ScanResultsEnhanced,
	usePreorder,
} from '@ariclear/components';
import { getTierLabel } from '@/lib/plans';
import { httpReason, track } from '@/lib/analytics';
import { reportFromAnalyze } from '@/lib/report/build';
import { CUSTOM_PLAN, isLegion, PAID_PLANS, type PublicEntitlements } from '@/lib/entitlements';

type ErrorCode =
	| 'SCAN_LIMIT_REACHED'
	| 'FREE_SCAN_USED'
	| 'PLAN_EXPIRED'
	| 'UPGRADE_REQUIRED'
	| 'RATE_LIMIT'
	| 'FETCH_ERROR'
	| 'AI_ERROR';

// GET /api/scans/limit
type LimitStatus = PublicEntitlements & {
	limit: number;
	current: number;
	/** No scan is possible at all (free scan used, or plan ended). */
	limitReached: boolean;
};

type AnalyzeResponse = {
	human?: {
		clarityScore?: number;
		whatItSeemsLike?: string;
		oneSentenceValueProp?: string;
		bestGuessAudience?: string;
		confusions?: string[];
		topIssues?: { issue: string; whyItHurts: string; fix: string }[];
	};
	ai?: {
		aiSeoScore?: number;
		aiSummary?: string;
		indexerRead?: string;
		missingKeywords?: string[];
		structuredDataSuggestions?: string[];
	};
	copy?: {
		suggestedHeadline?: string;
		suggestedSubheadline?: string;
		suggestedCTA?: string;
	};
	plan?: {
		nextSteps?: {
			title: string;
			impact: 'high' | 'medium' | 'low';
			effort: 'low' | 'medium' | 'high';
			details: string;
		}[];
	};
	prompts?: {
		aiSeoPrompt?: string;
	};
	error?: string;
	errorCode?: ErrorCode;
	message?: string;
	requiresUpgrade?: boolean;
	/** Id of the saved scan (set by /api/analyze on success). */
	scanId?: string;
	limit?: number;
	current?: number;
	tier?: string;
};

function isValidHttpUrl(input: string) {
	try {
		const u = new URL(input);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

function LoadingDots({ step }: { step: number }) {
	return (
		<span className='inline-flex gap-1'>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className={[
						'inline-block h-1.5 w-1.5 rounded-full transition-all duration-300',
						step % 3 === i
							? 'bg-choco-300 scale-125'
							: 'bg-choco-600/60 scale-90',
					].join(' ')}
				/>
			))}
		</span>
	);
}

type OverlayStep = {
	label: string;
	/** Roughly how long the stage takes; the last stage waits for the answer. */
	ms: number;
	status: string;
	quote: { text: string; by: string };
};

/** GPT-only scan (every plan except Legion): about 10-20 seconds. */
const SINGLE_MODEL_STEPS: OverlayStep[] = [
	{
		label: 'Human scan',
		ms: 2200,
		status: 'Sniffing your hero message',
		quote: { text: 'The first battle is won or lost in the opening moment.', by: 'Samurai principle' },
	},
	{
		label: '10-second test',
		ms: 2200,
		status: 'Testing what humans understand in 10 seconds',
		quote: { text: 'If it is not clear, it is not yet true.', by: 'AriClear mantra' },
	},
	{
		label: 'AI read',
		ms: 2200,
		status: 'Reading headings like an AI indexer',
		quote: { text: 'To know the path ahead, ask those coming back.', by: 'Japanese proverb' },
	},
	{
		label: 'Keywords',
		ms: 2200,
		status: 'Identifying missing context and keywords',
		quote: { text: 'Victory comes from seeing what others do not.', by: 'Miyamoto Musashi (paraphrase)' },
	},
	{
		label: 'Plan',
		ms: 0,
		status: 'Forming a clear plan of action',
		quote: { text: 'Perceive that which cannot be seen with the eye.', by: 'Miyamoto Musashi' },
	},
];

/**
 * Legion two-model scan (lib/analysis/runScan -> combinedReport): GPT and
 * Claude review in parallel, then Claude writes the final report. 1-2 minutes.
 */
const TWO_MODEL_STEPS: OverlayStep[] = [
	{
		label: 'Reading',
		ms: 5000,
		status: 'Reading your page like a first-time visitor',
		quote: { text: 'The first battle is won or lost in the opening moment.', by: 'Samurai principle' },
	},
	{
		label: 'GPT review',
		ms: 20000,
		status: 'GPT is reviewing your clarity and AI-SEO',
		quote: { text: 'If it is not clear, it is not yet true.', by: 'AriClear mantra' },
	},
	{
		label: 'Claude review',
		ms: 30000,
		status: 'Claude is reviewing the same page on its own',
		quote: { text: 'To know the path ahead, ask those coming back.', by: 'Japanese proverb' },
	},
	{
		label: 'Comparing',
		ms: 15000,
		status: 'Comparing both reviews and checking them against your page',
		quote: { text: 'Victory comes from seeing what others do not.', by: 'Miyamoto Musashi (paraphrase)' },
	},
	{
		label: 'Report',
		ms: 0,
		status: 'Writing your report and action plan',
		quote: { text: 'Perceive that which cannot be seen with the eye.', by: 'Miyamoto Musashi' },
	},
];

function AriAnalyzingOverlay({ url, twoModel }: { url: string; twoModel: boolean }) {
	const steps = twoModel ? TWO_MODEL_STEPS : SINGLE_MODEL_STEPS;

	const [step, setStep] = useState(0);
	const [tick, setTick] = useState(0);

	useEffect(() => {
		if (step >= steps.length - 1) return;
		const t = window.setTimeout(() => setStep((v) => v + 1), steps[step].ms);
		return () => window.clearTimeout(t);
	}, [step, steps]);

	// Animates the dots independently of the (slow) stage changes.
	useEffect(() => {
		const t = window.setInterval(() => setTick((v) => v + 1), 700);
		return () => window.clearInterval(t);
	}, []);

	const current = steps[step];

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-choco-900/70 backdrop-blur-sm'>
			<div className='mx-4 w-full max-w-md rounded-3xl bg-choco-900 p-6 shadow-2xl ring-1 ring-choco-700'>
				<div className='flex flex-col items-center text-center'>
					<div className='relative flex h-28 w-28 items-center justify-center'>
						<div className='absolute inset-0 animate-pulse rounded-full bg-choco-800/40' />
						<div className='absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-choco-400/70 [animation-duration:2.6s]' />
						<div className='relative h-20 w-20 overflow-hidden rounded-2xl bg-choco-800 shadow-soft'>
							<Image
								src='/branding/arilogo-optimized.png'
								alt='AriClear'
								fill
								priority
								sizes='80px'
								className='object-contain p-2'
							/>
						</div>
					</div>

					<div className='mt-4 flex items-center gap-2 rounded-full bg-choco-800 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-choco-200'>
						Ari is sniffing <LoadingDots step={tick} />
					</div>

					<p className='mt-3 text-sm font-medium text-cream-50'>
						{current.status}
					</p>

					{url && (
						<p className='mt-1 max-w-full truncate text-[11px] text-choco-300'>
							{url}
						</p>
					)}

					<div className='mt-4 w-full'>
						<div className='flex gap-2'>
							{steps.map((_, i) => (
								<div
									key={i}
									className={[
										'h-2 flex-1 rounded-full transition-all',
										i < step
											? 'bg-choco-400'
											: i === step
												? 'bg-choco-700'
												: 'bg-choco-800',
									].join(' ')}
								/>
							))}
						</div>
						<div className='mt-2 flex justify-between text-[10px] text-choco-400'>
							<span>{current.label}</span>
							<span>
								{step + 1}/{steps.length}
							</span>
						</div>
					</div>

					<div className='mt-5 w-full rounded-2xl bg-choco-800/60 p-4 ring-1 ring-choco-700'>
						<p className='text-[12px] leading-relaxed text-cream-100'>
							&quot;{current.quote.text}&quot;
						</p>
						<p className='mt-2 text-[11px] text-choco-300'>
							— {current.quote.by}
						</p>
					</div>

					<p className='mt-3 text-[11px] text-choco-300'>
						{twoModel
							? 'Legion scan: two AI models review your page, so this takes 1–2 minutes. Keep this tab open.'
							: 'Calm analysis. No rushing. Clarity takes discipline.'}
					</p>
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────
// Limit banner
// ─────────────────────────────────────────────

function ScanLimitBanner({
	limitStatus,
	message,
	onUpgrade,
}: {
	limitStatus: LimitStatus;
	message?: string;
	onUpgrade: () => void;
}) {
	const title = limitStatus.isExpired
		? 'Your plan has ended'
		: 'You have used your free scan';
	const body =
		message ??
		(limitStatus.isExpired
			? 'Your saved scans are still here. Renew to scan again.'
			: 'Choose Gladiator or Centurion to re-scan, test rewrites, run technical checks and download PDF reports.');

	return (
		<div className='mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5'>
			<div className='flex items-start gap-3'>
				<span className='mt-0.5 shrink-0 text-xl'>🔒</span>
				<div className='flex-1'>
					<p className='text-sm font-semibold text-choco-900'>
						{title}
					</p>
					<p className='mt-1 text-sm text-choco-700'>{body}</p>
					<div className='mt-4 flex flex-col gap-2 sm:flex-row'>
						<Button
							type='button'
							onClick={onUpgrade}
							className='w-full sm:w-auto'>
							{limitStatus.isExpired ? 'Renew plan' : 'See plans'}
						</Button>
						<Link
							href='/history'
							className='inline-flex w-full items-center justify-center rounded-full border border-choco-300 bg-white px-4 py-2 text-sm font-medium text-choco-800 transition-colors hover:bg-choco-50 sm:w-auto'>
							View my scans
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────
// Error banners
// ─────────────────────────────────────────────

function RateLimitBanner() {
	return (
		<div className='mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-soft'>
			<div className='flex items-start gap-3'>
				<span className='mt-0.5 shrink-0 text-xl'>⏳</span>
				<div>
					<p className='text-sm font-semibold text-choco-900'>
						Too many requests
					</p>
					<p className='mt-1 text-sm text-choco-700'>
						You&apos;re scanning too fast. Please wait 60 seconds
						and try again.
					</p>
				</div>
			</div>
		</div>
	);
}

function SiteLimitBanner({ message, tier }: { message: string; tier?: string }) {
	const { open: openContact } = usePreorder();
	const isCenturion = tier === 'pro';
	return (
		<div className='mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-soft'>
			<div className='flex items-start gap-3'>
				<span className='mt-0.5 shrink-0 text-xl'>🌐</span>
				<div className='flex-1'>
					<p className='text-sm font-semibold text-choco-900'>
						Website limit reached
					</p>
					<p className='mt-1 text-sm text-choco-700'>{message}</p>
					<div className='mt-3'>
						{isCenturion ? (
							<Button
								type='button'
								onClick={() => openContact('legion')}
								className='rounded-xl bg-choco-900 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-choco-800'>
								Get a {CUSTOM_PLAN.label} quote for more sites
							</Button>
						) : (
							<Link
								href='/pricing'
								className='text-sm font-semibold text-choco-900 underline hover:text-choco-700'>
								See {PAID_PLANS.pro.label} ({PAID_PLANS.pro.websites} websites)
							</Link>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function GenericErrorBanner({ message }: { message: string }) {
	return (
		<div className='mt-6 rounded-2xl border border-choco-200 bg-white p-4 shadow-soft'>
			<div className='flex items-start gap-3'>
				<span className='mt-0.5 shrink-0 text-xl'>⚠️</span>
				<div>
					<p className='text-sm font-semibold text-choco-900'>
						Something went wrong
					</p>
					<p className='mt-1 text-sm text-choco-700'>{message}</p>
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function ScanPage() {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const goToPricing = () => router.push('/pricing');

	const [authOpen, setAuthOpen] = useState(false);
	const [targetUrl, setTargetUrl] = useState('');
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<AnalyzeResponse | null>(null);
	const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
	const [limitMessage, setLimitMessage] = useState<string | undefined>();
	const [limitLoading, setLimitLoading] = useState(false);

	const cleanedUrl = useMemo(() => targetUrl.trim(), [targetUrl]);
	const isAtLimit = limitStatus?.limitReached ?? false;

	const canAnalyze = useMemo(
		() =>
			!!cleanedUrl &&
			isValidHttpUrl(cleanedUrl) &&
			!loading &&
			!isAtLimit,
		[cleanedUrl, loading, isAtLimit],
	);

	const fetchLimitStatus = async () => {
		setLimitLoading(true);
		try {
			const res = await fetch('/api/scans/limit');
			if (res.ok) {
				const data = await res.json();
				setLimitStatus(data as LimitStatus);
			}
		} catch {
			// Non-critical
		} finally {
			setLimitLoading(false);
		}
	};

	// /scan?url=… (Re-scan and "Scan it" on the dashboard) prefills the form.
	useEffect(() => {
		const raw = new URLSearchParams(window.location.search).get('url')?.trim();
		if (!raw) return;
		const prefill = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
		queueMicrotask(() => setTargetUrl(prefill));
	}, []);

	useEffect(() => {
		if (authLoading) return;
		if (!user) {
			setTimeout(() => setAuthOpen(true), 0);
			return;
		}
		fetchLimitStatus();
	}, [authLoading, user]);

	const closeAuth = () => {
		setAuthOpen(false);
		if (!user) router.push('/');
	};

	const onAnalyze = async () => {
		if (!canAnalyze) return;
		setLoading(true);
		setResult(null);

		const twoModel = !!limitStatus?.isPaid && isLegion(limitStatus.tier, limitStatus.limit);
		const plan = !limitStatus?.isPaid ? 'free' : twoModel ? 'legion' : limitStatus.tier;
		track('scan_start', { plan, two_model: twoModel });

		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: cleanedUrl }),
			});

			const json = (await res.json()) as AnalyzeResponse;

			if (!res.ok) {
				track('scan_error', {
					plan,
					reason: json?.errorCode ? String(json.errorCode).toLowerCase() : httpReason(res.status),
				});
				if (res.status === 429) {
					setResult({
						error: json?.error || 'Rate limit reached.',
						errorCode: 'RATE_LIMIT',
					});
					return;
				}
				if (res.status === 403 && json?.requiresUpgrade) {
					if (json.errorCode === 'SCAN_LIMIT_REACHED') {
						// Sites are full, but existing sites can still be re-scanned.
						setResult({
							error: json.message ?? json.error,
							errorCode: 'SCAN_LIMIT_REACHED',
							tier: json.tier,
						});
						return;
					}
					setLimitMessage(json.message);
					await fetchLimitStatus();
					return;
				}
				setResult({ error: json?.error || 'Analysis failed.' });
				toast.error(json?.error || 'Analysis failed.');
				return;
			}

			setResult(json);
			track('scan_complete', {
				plan,
				two_model: twoModel,
				clarity_score: json.human?.clarityScore,
				ai_seo_score: json.ai?.aiSeoScore,
			});

			// /api/analyze saves the scan itself and returns its id.
			if (json.scanId) {
				toast.success('Scan saved!');
				router.push(`/scan/${json.scanId}`);
			} else {
				await fetchLimitStatus();
			}
		} catch {
			track('scan_error', { plan, reason: 'network' });
			setResult({ error: 'Network error. Please try again.' });
			toast.error('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied to clipboard!');
		} catch {
			toast.error('Failed to copy');
		}
	};

	const renderPostAnalyzeError = (r: AnalyzeResponse) => {
		if (r.errorCode === 'RATE_LIMIT') return <RateLimitBanner />;
		if (r.errorCode === 'SCAN_LIMIT_REACHED') {
			return <SiteLimitBanner message={r.error ?? ''} tier={r.tier} />;
		}
		return (
			<GenericErrorBanner
				message={r.error ?? 'Something went wrong. Please try again.'}
			/>
		);
	};

	return (
		<div className='flex min-h-screen flex-col'>
			<Navbar />
			<AuthModal
				open={authOpen}
				onClose={closeAuth}
				initialMode='login'
			/>
			{loading ? <AriAnalyzingOverlay
					url={cleanedUrl}
					twoModel={
						!!limitStatus?.isPaid && isLegion(limitStatus.tier, limitStatus.limit)
					}
				/> : null}

			<main className='flex-1 bg-cream-50'>
				<div className='mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8'>
					<h1 className='text-3xl font-semibold text-choco-900'>
						AriClear Demo
					</h1>
					<p className='mt-2 text-sm text-choco-700'>
						AriClear simulates a{' '}
						<span className='font-medium'>
							10-second human scan
						</span>{' '}
						and an{' '}
						<span className='font-medium'>AI/indexer read</span> of
						your homepage — then tells you exactly what to fix
						first.
					</p>

					{authLoading ? (
						<div className='mt-6 rounded-2xl border border-choco-100 bg-white/80 p-4 shadow-soft'>
							<p className='text-sm text-choco-700'>
								Checking your session…
							</p>
						</div>
					) : null}

					<div className='mt-6 rounded-2xl border border-choco-100 bg-white/80 p-4 shadow-soft'>
						<label className='text-xs font-medium uppercase tracking-[0.12em] text-choco-600'>
							Homepage URL
						</label>
						<div className='mt-2 flex flex-col gap-3 sm:flex-row'>
							<input
								value={targetUrl}
								onChange={(e) => setTargetUrl(e.target.value)}
								placeholder='https://example.com'
								inputMode='url'
								disabled={loading || isAtLimit}
								className='w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500 disabled:opacity-60'
								onKeyDown={(e) => {
									if (e.key === 'Enter') onAnalyze();
								}}
							/>
							<Button
								type='button'
								className='shrink-0 sm:px-6'
								disabled={
									!canAnalyze ||
									!user ||
									authLoading ||
									loading
								}
								onClick={onAnalyze}>
								{loading ? (
									<span className='inline-flex items-center gap-2'>
										Analyzing{' '}
										<span className='opacity-90'>•</span>
									</span>
								) : (
									'Analyze'
								)}
							</Button>
						</div>

						{!limitLoading && isAtLimit && limitStatus ? (
							<ScanLimitBanner
								limitStatus={limitStatus}
								message={limitMessage}
								onUpgrade={goToPricing}
							/>
						) : (
							<>
								{!cleanedUrl ? (
									<p className='mt-2 text-[11px] text-choco-500'>
										Tip: use your homepage URL (not a login
										page).
									</p>
								) : !isValidHttpUrl(cleanedUrl) ? (
									<p className='mt-2 text-[11px] text-red-700'>
										Please enter a valid URL starting with
										http:// or https://
									</p>
								) : (
									<div className='mt-2 space-y-1'>
										<p className='text-[11px] text-choco-500'>
											Demo mode: public pages only. Login
											walls may not work.
										</p>
										<p className='text-[11px] text-yellow-700 flex items-start gap-1'>
											<span>⚠️</span>
											<span>
												Some websites block automated
												scanning (banks, e-commerce,
												sites behind Cloudflare). Try
												scanning your own website or
												smaller business sites.
											</span>
										</p>
									</div>
								)}
								{!limitLoading && limitStatus && (
									<p className='mt-3 text-[11px] text-choco-400'>
										{getTierLabel(limitStatus.tier, limitStatus.limit)} ·{' '}
										{limitStatus.current} / {limitStatus.limit}{' '}
										website{limitStatus.limit !== 1 ? 's' : ''}{' '}
										used
										{!limitStatus.canAddSite &&
										limitStatus.domains.length > 0
											? ` · you can re-scan ${limitStatus.domains.join(', ')}`
											: ''}
										{!limitStatus.isPaid
											? ' · free account: 1 scan'
											: ''}
									</p>
								)}
							</>
						)}
					</div>

					{result &&
						!isAtLimit &&
						(result.error ? (
							renderPostAnalyzeError(result)
						) : (
							<ScanResultsEnhanced
								results={reportFromAnalyze(result, cleanedUrl)}
								onCopyPrompt={copyToClipboard}
								canDownloadPdf={limitStatus?.features.pdf ?? false}
								onUpgradeClick={goToPricing}
							/>
						))}
				</div>
			</main>

			<SiteFooter />
		</div>
	);
}
