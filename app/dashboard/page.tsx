'use client';

// app/dashboard/page.tsx
// The signed-in home. One card per tracked website with its latest scores,
// the change since the previous scan and the fixes left, plus the plan and
// what to do next. proxy.ts sends signed-in visitors of "/" here.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, SiteFooter, useAuth } from '@ariclear/components';
import { getTierLabel } from '@/lib/plans';
import { loadLastBrandCheck, type LastBrandCheck } from '@/lib/brand/lastCheck';
import { PLATFORMS } from '@/lib/brand/alignment';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('dashboard');

type Subscription = {
	tier: string;
	isPaid: boolean;
	isComp: boolean;
	isExpired: boolean;
	expiresAt: string | null;
	websites_limit: number;
	websites_used: number;
	canAddSite: boolean;
	can_scan: boolean;
	features: { rescan: boolean; trend: boolean };
};

type Scan = {
	id: string;
	domain: string;
	url: string;
	overall_score: number;
	human_score: number;
	ai_score: number;
	technical_score: number | null;
	created_at: string;
	issues: unknown[] | null;
	checklist: Array<{ id: string; checked: boolean }> | null;
};

type Site = {
	domain: string;
	latest: Scan;
	previous: Scan | null;
	scanCount: number;
};

function bySite(scans: Scan[]): Site[] {
	const groups = new Map<string, Scan[]>();
	for (const s of scans) {
		const list = groups.get(s.domain) ?? [];
		list.push(s);
		groups.set(s.domain, list);
	}
	return [...groups.entries()]
		.map(([domain, list]) => {
			const sorted = list.sort((a, b) => b.created_at.localeCompare(a.created_at));
			return { domain, latest: sorted[0], previous: sorted[1] ?? null, scanCount: sorted.length };
		})
		.sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));
}

function scoreTone(score: number) {
	if (score >= 70) return 'text-green-700';
	if (score >= 40) return 'text-amber-700';
	return 'text-red-700';
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string) {
	const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days} days ago`;
	return formatDate(iso);
}

function issuesLeft(scan: Scan) {
	const total = Array.isArray(scan.issues) ? scan.issues.length : 0;
	const done = (scan.checklist ?? []).filter((c) => c.checked).length;
	return { total, left: Math.max(0, total - done), done: Math.min(done, total) };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const [sub, setSub] = useState<Subscription | null>(null);
	const [scans, setScans] = useState<Scan[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		if (!loading && !user) router.push('/');
	}, [user, loading, router]);

	useEffect(() => {
		if (!user) return;
		let alive = true;
		(async () => {
			try {
				const [subRes, scansRes] = await Promise.all([
					fetch('/api/subscription'),
					fetch('/api/scans?limit=100'),
				]);
				if (!alive) return;
				if (subRes.ok) setSub(await subRes.json());
				if (scansRes.ok) setScans(((await scansRes.json()).scans ?? []) as Scan[]);
				if (!subRes.ok || !scansRes.ok) setLoadError(true);
			} catch (error) {
				log.warn('could not load dashboard data', { code: errorCode(error) });
				if (alive) setLoadError(true);
			} finally {
				if (alive) setLoadingData(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [user]);

	const sites = useMemo(() => bySite(scans), [scans]);

	if (loading || (user && loadingData)) {
		return (
			<div className='min-h-screen bg-cream-50'>
				<Navbar />
				<div className='mx-auto max-w-6xl px-4 py-16 text-center text-sm text-choco-500 sm:px-6 lg:px-8'>
					Loading your sites…
				</div>
			</div>
		);
	}
	if (!user) return null;

	const canRescan = !!sub?.features?.rescan;
	const planName = sub
		? sub.isExpired
			? 'Plan ended'
			: getTierLabel(sub.tier, sub.websites_limit)
		: '—';

	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />

			<main className='mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8'>
				{/* Header */}
				<div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
					<div>
						<h1 className='text-2xl font-bold text-choco-900 sm:text-3xl'>Your websites</h1>
						<p className='mt-1 text-sm text-choco-600'>
							How visitors and AI read your sites, and what to fix next.
						</p>
					</div>
					{sites.length > 0 && sub?.canAddSite && (
						<Link
							href='/scan'
							className='inline-flex items-center gap-1.5 rounded-full bg-choco-900 px-5 py-2 text-sm font-semibold text-cream-50 transition hover:bg-choco-800'>
							＋ Add a website
						</Link>
					)}
				</div>

				{loadError && (
					<p className='mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
						Some of your data could not be loaded. Refresh the page to try again.
					</p>
				)}

				{sub && <PlanNotice sub={sub} hasScans={sites.length > 0} />}

				{/* Summary */}
				{sub && (
					<div className='mb-8 grid gap-4 sm:grid-cols-3'>
						<SummaryTile label='Plan'>
							<p className='text-lg font-semibold text-choco-900'>{planName}</p>
							<p className='mt-0.5 text-xs text-choco-500'>
								{sub.isPaid && sub.expiresAt
									? `Active until ${formatDate(sub.expiresAt)}`
									: sub.isPaid && sub.isComp
										? 'Complimentary'
										: sub.isExpired
											? 'Your scans are still saved'
											: 'Free account'}
							</p>
						</SummaryTile>
						<SummaryTile label='Websites'>
							<p className='text-lg font-semibold text-choco-900'>
								{sub.websites_used}
								<span className='text-sm font-normal text-choco-500'> of {sub.websites_limit}</span>
							</p>
							<div className='mt-2 h-1.5 w-full rounded-full bg-choco-100'>
								<div
									className='h-1.5 rounded-full bg-choco-800'
									style={{ width: `${Math.min(100, (sub.websites_used / Math.max(1, sub.websites_limit)) * 100)}%` }}
								/>
							</div>
						</SummaryTile>
						<SummaryTile label='Fixes left'>
							<p className='text-lg font-semibold text-choco-900'>
								{sites.reduce((n, s) => n + issuesLeft(s.latest).left, 0)}
							</p>
							<p className='mt-0.5 text-xs text-choco-500'>across your latest scans</p>
						</SummaryTile>
					</div>
				)}

				{/* Sites */}
				{sites.length === 0 ? (
					<FirstScan />
				) : (
					<div className='grid gap-4 md:grid-cols-2'>
						{sites.map((site) => (
							<SiteCard key={site.domain} site={site} canRescan={canRescan} />
						))}
						{sub?.canAddSite && (
							<Link
								href='/scan'
								className='flex min-h-[180px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-choco-200 p-6 text-center text-choco-600 transition hover:border-choco-400 hover:text-choco-900'>
								<span className='text-2xl'>＋</span>
								<span className='mt-1 text-sm font-semibold'>Add a website</span>
								<span className='mt-1 text-xs text-choco-500'>
									{sub.websites_limit - sub.websites_used} of {sub.websites_limit} slots free
								</span>
							</Link>
						)}
					</div>
				)}

				{/* Brand alignment */}
				<BrandCard firstSiteUrl={sites[0]?.latest.url} />

				{sites.length > 0 && (
					<p className='mt-8 text-center text-sm text-choco-500'>
						Looking for an older report?{' '}
						<Link href='/history' className='font-medium text-choco-800 underline hover:text-choco-900'>
							See all scans in History
						</Link>
					</p>
				)}
			</main>

			<SiteFooter />
		</div>
	);
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function SummaryTile({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className='rounded-2xl border border-choco-100 bg-white p-4 shadow-soft'>
			<p className='mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>{label}</p>
			{children}
		</div>
	);
}

function PlanNotice({ sub, hasScans }: { sub: Subscription; hasScans: boolean }) {
	if (sub.isExpired) {
		return (
			<Notice
				text='Your plan has ended. Your scans and reports are still here. Renew to re-scan and keep tracking.'
				cta='Renew plan'
			/>
		);
	}
	if (!sub.isPaid && hasScans && !sub.can_scan) {
		return (
			<Notice
				text='You have used your free scan. Upgrade to re-scan after you make changes, test rewrites and track your score.'
				cta='See plans'
			/>
		);
	}
	return null;
}

function Notice({ text, cta }: { text: string; cta: string }) {
	return (
		<div className='mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3'>
			<p className='text-sm text-choco-800'>{text}</p>
			<Link
				href='/pricing'
				className='rounded-full bg-choco-900 px-4 py-1.5 text-xs font-semibold text-cream-50 transition hover:bg-choco-800'>
				{cta}
			</Link>
		</div>
	);
}

function SiteCard({ site, canRescan }: { site: Site; canRescan: boolean }) {
	const { latest, previous } = site;
	const delta = previous ? latest.overall_score - previous.overall_score : null;
	const issues = issuesLeft(latest);

	return (
		<div className='flex flex-col rounded-3xl border border-choco-100 bg-white p-5 shadow-soft'>
			<div className='flex items-start justify-between gap-3'>
				<div className='min-w-0'>
					<p className='truncate text-base font-semibold text-choco-900'>{site.domain}</p>
					<p className='mt-0.5 text-xs text-choco-500'>
						Scanned {timeAgo(latest.created_at)} · {site.scanCount} scan{site.scanCount === 1 ? '' : 's'}
					</p>
				</div>
				<div className='text-right'>
					<p className={`text-3xl font-bold leading-none ${scoreTone(latest.overall_score)}`}>
						{latest.overall_score}
					</p>
					{delta !== null && (
						<p
							className={`mt-1 text-xs font-medium ${
								delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-choco-400'
							}`}>
							{delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : ''}
							{delta === 0 ? 'no change' : delta} since last scan
						</p>
					)}
				</div>
			</div>

			<div className='mt-4 grid grid-cols-3 gap-2 text-center'>
				{[
					{ label: 'Clarity', value: latest.human_score },
					{ label: 'AI', value: latest.ai_score },
					{ label: 'Technical', value: latest.technical_score },
				].map((m) => (
					<div key={m.label} className='rounded-xl bg-cream-50 py-2'>
						<p className='text-[10px] font-semibold uppercase tracking-wide text-choco-500'>{m.label}</p>
						<p className={`text-sm font-semibold ${m.value == null ? 'text-choco-400' : scoreTone(m.value)}`}>
							{m.value ?? '—'}
						</p>
					</div>
				))}
			</div>

			{issues.total > 0 && (
				<div className='mt-4'>
					<div className='mb-1 flex justify-between text-xs text-choco-600'>
						<span>{issues.left === 0 ? 'All fixes done' : `${issues.left} fix${issues.left === 1 ? '' : 'es'} left`}</span>
						<span>
							{issues.done}/{issues.total}
						</span>
					</div>
					<div className='h-1.5 w-full rounded-full bg-choco-100'>
						<div
							className='h-1.5 rounded-full bg-green-600'
							style={{ width: `${(issues.done / issues.total) * 100}%` }}
						/>
					</div>
				</div>
			)}

			<div className='mt-5 flex gap-2'>
				<Link
					href={`/scan/${latest.id}`}
					className='flex-1 rounded-xl bg-choco-900 px-4 py-2 text-center text-sm font-semibold text-cream-50 transition hover:bg-choco-800'>
					Open report
				</Link>
				{canRescan ? (
					<Link
						href={`/scan?url=${encodeURIComponent(latest.url)}`}
						className='rounded-xl border border-choco-200 px-4 py-2 text-sm font-medium text-choco-800 transition hover:border-choco-400'>
						Re-scan
					</Link>
				) : (
					<Link
						href='/pricing'
						title='Re-scans are part of the paid plans'
						className='rounded-xl border border-choco-200 px-4 py-2 text-sm font-medium text-choco-500 transition hover:border-choco-400 hover:text-choco-800'>
						Re-scan 🔒
					</Link>
				)}
			</div>
		</div>
	);
}

function BrandCard({ firstSiteUrl }: { firstSiteUrl?: string }) {
	// The last check lives in this browser only. This card renders only after
	// the client has loaded the user, never on the server, so reading storage
	// here cannot cause a hydration mismatch.
	const [last] = useState<LastBrandCheck | null>(() =>
		typeof window === 'undefined' ? null : loadLastBrandCheck(),
	);

	const startHref = firstSiteUrl
		? `/brand-awareness?url=${encodeURIComponent(firstSiteUrl)}`
		: '/brand-awareness';

	return (
		<section className='mt-8'>
			<div className='mb-3 flex items-center gap-2'>
				<h2 className='text-lg font-semibold text-choco-900'>Brand alignment</h2>
				<span className='rounded-full bg-choco-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-50'>
					Beta
				</span>
			</div>
			{last ? (
				<div className='flex flex-wrap items-center gap-5 rounded-3xl border border-choco-100 bg-white p-5 shadow-soft'>
					<div className='text-center'>
						<p className={`text-4xl font-bold leading-none ${scoreTone(last.result.alignmentScore)}`}>
							{last.result.alignmentScore}
						</p>
						<p className='mt-1 text-[11px] text-choco-500'>alignment</p>
					</div>
					<div className='min-w-0 flex-1'>
						<p className='line-clamp-2 text-sm font-medium text-choco-900'>{last.result.verdict}</p>
						<div className='mt-2 flex flex-wrap gap-1.5'>
							{last.result.platforms.map((p) => (
								<span
									key={p.platform}
									className='rounded-full bg-cream-50 px-2 py-0.5 text-xs text-choco-700'>
									{PLATFORMS.find((d) => d.key === p.platform)?.label}{' '}
									<span className={`font-semibold ${p.status === 'checked' ? scoreTone(p.score) : 'text-choco-400'}`}>
										{p.status === 'checked' ? p.score : '—'}
									</span>
								</span>
							))}
						</div>
						<p className='mt-2 text-[11px] text-choco-400'>Checked {timeAgo(last.checkedAt)}</p>
					</div>
					<Link
						href='/brand-awareness'
						className='rounded-xl bg-choco-900 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-choco-800'>
						Open
					</Link>
				</div>
			) : (
				<div className='flex flex-wrap items-center gap-4 rounded-3xl border border-choco-100 bg-white p-5 shadow-soft'>
					<div className='flex -space-x-2' aria-hidden>
						{['bg-gradient-to-br from-fuchsia-500 to-orange-400', 'bg-[#0a66c2]', 'bg-black', 'bg-[#ff0000]'].map(
							(c) => (
								<span key={c} className={`h-9 w-9 rounded-xl ring-2 ring-white ${c}`} />
							),
						)}
					</div>
					<div className='min-w-0 flex-1'>
						<p className='text-sm font-semibold text-choco-900'>
							Do your social profiles say the same thing as your website?
						</p>
						<p className='mt-0.5 text-sm text-choco-600'>
							Paste your Instagram, LinkedIn and other bios. Get a score for each and a matching rewrite.
						</p>
					</div>
					<Link
						href={startHref}
						className='rounded-xl bg-choco-900 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-choco-800'>
						Check my brand
					</Link>
				</div>
			)}
		</section>
	);
}

function FirstScan() {
	const router = useRouter();
	const [url, setUrl] = useState('');

	const go = (e: React.FormEvent) => {
		e.preventDefault();
		const v = url.trim();
		router.push(v ? `/scan?url=${encodeURIComponent(v)}` : '/scan');
	};

	return (
		<div className='rounded-3xl border border-choco-100 bg-white p-8 text-center shadow-soft sm:p-12'>
			<p className='text-3xl'>🔍</p>
			<h2 className='mt-3 text-xl font-semibold text-choco-900'>Scan your first website</h2>
			<p className='mx-auto mt-2 max-w-md text-sm text-choco-600'>
				See what a first-time visitor and an AI assistant understand about your site, and get the
				exact fixes.
			</p>
			<form onSubmit={go} className='mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row'>
				<input
					type='text'
					inputMode='url'
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder='yourwebsite.com'
					aria-label='Website address'
					className='flex-1 rounded-full border border-choco-200 bg-cream-50 px-4 py-2.5 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400'
				/>
				<button
					type='submit'
					className='rounded-full bg-choco-900 px-6 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-choco-800'>
					Scan it
				</button>
			</form>
		</div>
	);
}
