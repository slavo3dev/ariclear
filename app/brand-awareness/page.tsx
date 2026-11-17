'use client';

// app/brand-awareness/page.tsx
// Brand alignment (beta): paste your social bios, and see whether each one
// says the same thing as your website, with a matching rewrite for each.
// The check runs on /api/brand-awareness/analyze; the latest result is kept
// in this browser (lib/brand/lastCheck) and shown on the dashboard.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, SiteFooter, useAuth } from '@ariclear/components';
import {
	MAX_BIO,
	MAX_HANDLE,
	PLATFORMS,
	type BrandCheckResult,
	type PlatformInput,
	type PlatformKey,
	type PlatformResult,
} from '@/lib/brand/alignment';
import { clearLastBrandCheck, loadLastBrandCheck, saveLastBrandCheck } from '@/lib/brand/lastCheck';

type Inputs = Partial<Record<PlatformKey, PlatformInput>>;

const BADGE: Record<PlatformKey, { short: string; className: string }> = {
	instagram: { short: 'IG', className: 'bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white' },
	linkedin: { short: 'in', className: 'bg-[#0a66c2] text-white' },
	facebook: { short: 'f', className: 'bg-[#1877f2] text-white' },
	twitter: { short: 'X', className: 'bg-black text-white' },
	tiktok: { short: 'TT', className: 'bg-neutral-900 text-white' },
	youtube: { short: '▶', className: 'bg-[#ff0000] text-white' },
};

function scoreTone(score: number) {
	if (score >= 70) return 'text-green-700';
	if (score >= 40) return 'text-amber-600';
	return 'text-red-700';
}
function scoreBar(score: number) {
	if (score >= 70) return 'bg-green-600';
	if (score >= 40) return 'bg-amber-500';
	return 'bg-red-600';
}
function scoreWord(score: number) {
	if (score >= 85) return 'Strongly aligned';
	if (score >= 70) return 'Mostly aligned';
	if (score >= 40) return 'Partly aligned';
	return 'Out of sync';
}

function PlatformBadge({ platform, size = 'md' }: { platform: PlatformKey; size?: 'sm' | 'md' }) {
	const b = BADGE[platform];
	return (
		<span
			aria-hidden
			className={`inline-flex shrink-0 items-center justify-center rounded-xl font-bold ${b.className} ${
				size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs'
			}`}>
			{b.short}
		</span>
	);
}

export default function BrandAwarenessPage() {
	return (
		<Suspense fallback={null}>
			<BrandAwareness />
		</Suspense>
	);
}

function BrandAwareness() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const params = useSearchParams();

	const [websiteUrl, setWebsiteUrl] = useState('');
	const [businessName, setBusinessName] = useState('');
	const [inputs, setInputs] = useState<Inputs>({});
	const [open, setOpen] = useState<Set<PlatformKey>>(new Set(['instagram', 'linkedin']));
	const [mySites, setMySites] = useState<string[]>([]);

	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<BrandCheckResult | null>(null);
	const [checkedAt, setCheckedAt] = useState<string | null>(null);

	useEffect(() => {
		if (!loading && !user) router.push('/?signin=1&next=%2Fbrand-awareness');
	}, [user, loading, router]);

	// Restore the last check, then let ?url= override the website.
	useEffect(() => {
		const last = loadLastBrandCheck();
		if (last) {
			setWebsiteUrl(last.websiteUrl);
			setBusinessName(last.businessName);
			setInputs(last.platforms);
			setOpen(new Set(Object.keys(last.platforms) as PlatformKey[]));
			setResult(last.result);
			setCheckedAt(last.checkedAt);
		}
		const url = params.get('url');
		if (url && url !== last?.websiteUrl) {
			setWebsiteUrl(url);
			if (last) {
				setResult(null);
				setCheckedAt(null);
			}
		}
	}, [params]);

	// The user's scanned sites, offered as suggestions.
	useEffect(() => {
		if (!user) return;
		let alive = true;
		fetch('/api/scans?limit=100')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => {
				if (!alive || !d?.scans) return;
				const urls = [...new Set((d.scans as Array<{ url: string }>).map((s) => s.url))];
				setMySites(urls);
				setWebsiteUrl((v) => v || urls[0] || '');
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [user]);

	const filled = useMemo(
		() => PLATFORMS.filter((p) => inputs[p.key]?.handle?.trim() || inputs[p.key]?.bio?.trim()),
		[inputs],
	);

	const setField = (key: PlatformKey, field: 'handle' | 'bio', value: string) =>
		setInputs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

	const toggle = (key: PlatformKey) =>
		setOpen((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	async function run(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!websiteUrl.trim()) return setError('Enter your website address.');
		if (filled.length === 0) return setError('Add at least one profile: paste its bio (and handle).');

		setRunning(true);
		try {
			const res = await fetch('/api/brand-awareness/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ websiteUrl, businessName, platforms: inputs }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok || !body.result) {
				setError(body.error || 'The brand check failed. Please try again.');
				return;
			}
			setResult(body.result);
			setCheckedAt(body.checkedAt);
			saveLastBrandCheck({
				websiteUrl,
				businessName,
				platforms: inputs,
				result: body.result,
				checkedAt: body.checkedAt,
			});
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			setError('Could not reach AriClear. Check your connection and try again.');
		} finally {
			setRunning(false);
		}
	}

	function startOver() {
		clearLastBrandCheck();
		setResult(null);
		setCheckedAt(null);
		setInputs({});
		setOpen(new Set(['instagram', 'linkedin']));
	}

	if (loading || !user) {
		return (
			<div className='min-h-screen bg-cream-50'>
				<Navbar />
			</div>
		);
	}

	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />

			<main className='mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8'>
				{/* Header */}
				<div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
					<div>
						<div className='flex items-center gap-2'>
							<h1 className='text-2xl font-bold text-choco-900 sm:text-3xl'>Brand alignment</h1>
							<span className='rounded-full bg-choco-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-50'>
								Beta
							</span>
						</div>
						<p className='mt-1 max-w-2xl text-sm text-choco-600'>
							Do your Instagram, LinkedIn and other profiles say the same thing as your website? People
							and AI assistants trust a brand that tells one clear story everywhere.
						</p>
					</div>
					{result && (
						<button
							type='button'
							onClick={startOver}
							className='rounded-full border border-choco-200 px-4 py-2 text-sm font-medium text-choco-800 transition hover:border-choco-400'>
							Start a new check
						</button>
					)}
				</div>

				{result && checkedAt && (
					<Results result={result} checkedAt={checkedAt} websiteUrl={websiteUrl} />
				)}

				{/* Form */}
				<form
					onSubmit={run}
					className={`rounded-3xl border border-choco-100 bg-white p-5 shadow-soft sm:p-6 ${result ? 'mt-8' : ''}`}>
					<h2 className='text-lg font-semibold text-choco-900'>
						{result ? 'Update your profiles and check again' : '1. Your website'}
					</h2>

					<div className='mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]'>
						<label className='block'>
							<span className='mb-1 block text-xs font-semibold text-choco-700'>Website</span>
							<input
								type='text'
								inputMode='url'
								list='my-sites'
								value={websiteUrl}
								onChange={(e) => setWebsiteUrl(e.target.value)}
								placeholder='yourwebsite.com'
								className='w-full rounded-xl border border-choco-200 bg-cream-50 px-3 py-2.5 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400'
							/>
							<datalist id='my-sites'>
								{mySites.map((u) => (
									<option key={u} value={u} />
								))}
							</datalist>
						</label>
						<label className='block'>
							<span className='mb-1 block text-xs font-semibold text-choco-700'>
								Business name <span className='font-normal text-choco-400'>(optional)</span>
							</span>
							<input
								type='text'
								value={businessName}
								maxLength={200}
								onChange={(e) => setBusinessName(e.target.value)}
								placeholder='Acme Bakery'
								className='w-full rounded-xl border border-choco-200 bg-cream-50 px-3 py-2.5 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400'
							/>
						</label>
					</div>

					{!result && <h2 className='mt-8 text-lg font-semibold text-choco-900'>2. Your profiles</h2>}
					<p className='mt-1 text-sm text-choco-600'>
						Paste each profile&apos;s bio exactly as it is now. Most social networks block automated
						reading, so the check uses what you paste. A handle without a bio is checked for the name
						only.
					</p>

					<div className='mt-4 grid gap-3 md:grid-cols-2'>
						{PLATFORMS.map((p) => {
							const v = inputs[p.key] ?? {};
							const isOpen = open.has(p.key);
							const has = !!(v.handle?.trim() || v.bio?.trim());
							return (
								<div
									key={p.key}
									className={`rounded-2xl border p-3 transition ${
										has ? 'border-choco-300 bg-cream-50' : 'border-choco-100 bg-white'
									}`}>
									<button
										type='button'
										onClick={() => toggle(p.key)}
										aria-expanded={isOpen}
										className='flex w-full items-center gap-3 text-left'>
										<PlatformBadge platform={p.key} />
										<span className='flex-1'>
											<span className='block text-sm font-semibold text-choco-900'>{p.label}</span>
											<span className='block text-xs text-choco-500'>
												{has ? (v.bio?.trim() ? 'Bio added' : 'Handle only') : 'Not added'}
											</span>
										</span>
										<span className='text-choco-400'>{isOpen ? '−' : '+'}</span>
									</button>
									{isOpen && (
										<div className='mt-3 space-y-2'>
											<input
												type='text'
												value={v.handle ?? ''}
												maxLength={MAX_HANDLE}
												onChange={(e) => setField(p.key, 'handle', e.target.value)}
												placeholder='@handle or profile link'
												aria-label={`${p.label} handle`}
												className='w-full rounded-xl border border-choco-200 bg-white px-3 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400'
											/>
											<textarea
												value={v.bio ?? ''}
												maxLength={MAX_BIO}
												rows={3}
												onChange={(e) => setField(p.key, 'bio', e.target.value)}
												placeholder={`${p.bioLabel}: paste it here`}
												aria-label={`${p.label} ${p.bioLabel}`}
												className='w-full resize-y rounded-xl border border-choco-200 bg-white px-3 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400'
											/>
											<p className='flex justify-between text-[11px] text-choco-500'>
												<span>Where: {p.hint}</span>
												<span>{(v.bio ?? '').length} chars</span>
											</p>
										</div>
									)}
								</div>
							);
						})}
					</div>

					{error && (
						<p className='mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</p>
					)}

					<div className='mt-6 flex flex-wrap items-center gap-3'>
						<button
							type='submit'
							disabled={running}
							className='inline-flex items-center gap-2 rounded-full bg-choco-900 px-6 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-choco-800 disabled:opacity-60'>
							{running && (
								<span className='h-4 w-4 animate-spin rounded-full border-2 border-cream-50/40 border-t-cream-50' />
							)}
							{running ? 'Comparing your profiles with your website…' : 'Check alignment'}
						</button>
						<span className='text-xs text-choco-500'>
							{filled.length} profile{filled.length === 1 ? '' : 's'} added · takes about 15 seconds
						</span>
					</div>
				</form>
			</main>

			<SiteFooter />
		</div>
	);
}

// ─── Results ─────────────────────────────────────────────────────────────────

function Results({
	result,
	checkedAt,
	websiteUrl,
}: {
	result: BrandCheckResult;
	checkedAt: string;
	websiteUrl: string;
}) {
	const s = result.alignmentScore;
	return (
		<section className='space-y-6'>
			{/* Summary */}
			<div className='grid gap-4 lg:grid-cols-[1fr_2fr]'>
				<div className='flex flex-col items-center justify-center rounded-3xl border border-choco-100 bg-white p-6 text-center shadow-soft'>
					<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>Alignment score</p>
					<p className={`mt-2 text-6xl font-bold leading-none ${scoreTone(s)}`}>{s}</p>
					<p className='mt-2 text-sm font-semibold text-choco-800'>{scoreWord(s)}</p>
					<div className='mt-4 flex flex-wrap justify-center gap-1.5'>
						{result.platforms.map((p) => (
							<span
								key={p.platform}
								className='inline-flex items-center gap-1 rounded-full bg-cream-50 px-2 py-1 text-xs'>
								<PlatformBadge platform={p.platform} size='sm' />
								<span className={`font-semibold ${p.status === 'checked' ? scoreTone(p.score) : 'text-choco-400'}`}>
									{p.status === 'checked' ? p.score : 'name'}
								</span>
							</span>
						))}
					</div>
					<p className='mt-4 text-[11px] text-choco-400'>
						Checked {new Date(checkedAt).toLocaleString()} · {hostOf(websiteUrl)}
					</p>
				</div>

				<div className='rounded-3xl border border-choco-100 bg-white p-6 shadow-soft'>
					<p className='text-base font-semibold text-choco-900'>{result.verdict}</p>
					<div className='mt-4 grid gap-3 sm:grid-cols-2'>
						<Fact label='Your website says' value={result.website.oneLiner} />
						<Fact label='For' value={result.website.audience} />
						<Fact label='Offer' value={result.website.offer} />
						<Fact label='Tone' value={result.website.tone} />
					</div>
					<div
						className={`mt-4 flex items-start gap-2 rounded-2xl px-3 py-2 text-sm ${
							result.nameConsistency.consistent ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'
						}`}>
						<span aria-hidden>{result.nameConsistency.consistent ? '✓' : '!'}</span>
						<span>
							<span className='font-semibold'>
								{result.nameConsistency.consistent ? 'Same name everywhere. ' : 'Name differs across profiles. '}
							</span>
							{result.nameConsistency.note}
						</span>
					</div>
				</div>
			</div>

			{/* Top fixes */}
			{result.topFixes.length > 0 && (
				<div className='rounded-3xl border border-choco-100 bg-white p-6 shadow-soft'>
					<h2 className='text-lg font-semibold text-choco-900'>Fix these first</h2>
					<ol className='mt-4 grid gap-3 md:grid-cols-3'>
						{result.topFixes.map((f, i) => (
							<li key={i} className='rounded-2xl bg-cream-50 p-4'>
								<p className='text-xs font-semibold uppercase tracking-wide text-choco-500'>
									{i + 1} · {f.platform}
								</p>
								<p className='mt-1 text-sm font-semibold text-choco-900'>{f.title}</p>
								<p className='mt-1 text-sm text-choco-700'>{f.details}</p>
							</li>
						))}
					</ol>
				</div>
			)}

			{/* Per platform */}
			<div className='grid gap-4 md:grid-cols-2'>
				{result.platforms.map((p) => (
					<PlatformCard key={p.platform} p={p} />
				))}
			</div>
		</section>
	);
}

function Fact({ label, value }: { label: string; value: string }) {
	if (!value) return null;
	return (
		<div className='rounded-2xl bg-cream-50 p-3'>
			<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>{label}</p>
			<p className='mt-1 text-sm text-choco-800'>{value}</p>
		</div>
	);
}

function PlatformCard({ p }: { p: PlatformResult }) {
	const def = PLATFORMS.find((d) => d.key === p.platform)!;
	const [copied, setCopied] = useState(false);
	const checked = p.status === 'checked';

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(p.suggestedBio);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard blocked: the text is still selectable.
		}
	};

	return (
		<div className='flex flex-col rounded-3xl border border-choco-100 bg-white p-5 shadow-soft'>
			<div className='flex items-center gap-3'>
				<PlatformBadge platform={p.platform} />
				<div className='flex-1'>
					<p className='text-base font-semibold text-choco-900'>{def.label}</p>
					<p className='text-xs text-choco-500'>{checked ? scoreWord(p.score) : 'Name checked only'}</p>
				</div>
				<p className={`text-3xl font-bold ${checked ? scoreTone(p.score) : 'text-choco-300'}`}>
					{checked ? p.score : '—'}
				</p>
			</div>
			{checked && (
				<div className='mt-3 h-1.5 w-full rounded-full bg-choco-100'>
					<div className={`h-1.5 rounded-full ${scoreBar(p.score)}`} style={{ width: `${p.score}%` }} />
				</div>
			)}

			<p className='mt-4 text-sm text-choco-700'>{p.whatItSays}</p>

			{p.matches.length > 0 && (
				<ul className='mt-3 space-y-1'>
					{p.matches.map((m, i) => (
						<li key={i} className='flex gap-2 text-sm text-choco-800'>
							<span className='text-green-700' aria-hidden>
								✓
							</span>
							{m}
						</li>
					))}
				</ul>
			)}
			{p.gaps.length > 0 && (
				<ul className='mt-2 space-y-1'>
					{p.gaps.map((g, i) => (
						<li key={i} className='flex gap-2 text-sm text-choco-800'>
							<span className='text-red-700' aria-hidden>
								✗
							</span>
							{g}
						</li>
					))}
				</ul>
			)}

			{p.suggestedBio && (
				<div className='mt-4 rounded-2xl border border-dashed border-choco-200 bg-cream-50 p-3'>
					<div className='mb-1 flex items-center justify-between'>
						<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>
							Suggested {def.bioLabel.toLowerCase()}
						</p>
						<button
							type='button'
							onClick={copy}
							className='rounded-full bg-choco-900 px-3 py-1 text-[11px] font-semibold text-cream-50 transition hover:bg-choco-800'>
							{copied ? 'Copied ✓' : 'Copy'}
						</button>
					</div>
					<p className='whitespace-pre-wrap text-sm text-choco-900'>{p.suggestedBio}</p>
					<p className='mt-1 text-right text-[11px] text-choco-400'>
						{p.suggestedBio.length}/{def.bioMax}
					</p>
				</div>
			)}
		</div>
	);
}

function hostOf(url: string) {
	try {
		return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}
