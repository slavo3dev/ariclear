'use client';

// app/scan/[id]/TechnicalChecks.tsx
// Deterministic technical readiness checks with copy-paste fixes.

import { useCallback, useEffect, useState } from 'react';

type Status = 'pass' | 'warn' | 'fail';

type Check = {
	id: string;
	group: string;
	label: string;
	status: Status;
	impact: 'high' | 'medium' | 'low';
	detail: string;
	fix?: { label: string; language: string; code: string };
};

type Report = {
	finalUrl: string;
	score: number;
	counts: { pass: number; warn: number; fail: number };
	checks: Check[];
};

const STATUS_STYLE: Record<Status, { icon: string; cls: string }> = {
	pass: { icon: '✓', cls: 'bg-green-100 text-green-700' },
	warn: { icon: '!', cls: 'bg-amber-100 text-amber-700' },
	fail: { icon: '✕', cls: 'bg-red-100 text-red-700' },
};

const GROUP_ORDER = [
	'Crawlability',
	'AI crawlers',
	'Structured data',
	'Page basics',
	'Sharing',
];

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type='button'
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(text);
					setCopied(true);
					setTimeout(() => setCopied(false), 2000);
				} catch {
					/* clipboard unavailable */
				}
			}}
			className='rounded-lg bg-choco-700 px-2.5 py-1 text-[10px] font-semibold text-cream-50 transition hover:bg-choco-600'>
			{copied ? '✓ Copied' : 'Copy'}
		</button>
	);
}

export function TechnicalChecks({ scanId }: { scanId: string }) {
	const [report, setReport] = useState<Report | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/scans/${scanId}/technical`);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.error ?? 'Check failed');
			setReport(json.report as Report);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Check failed');
		} finally {
			setLoading(false);
		}
	}, [scanId]);

	useEffect(() => {
		load();
	}, [load]);

	const scoreColor = !report
		? ''
		: report.score >= 75
			? 'text-green-700'
			: report.score >= 50
				? 'text-amber-700'
				: 'text-red-700';

	return (
		<div className='rounded-3xl border border-choco-100 bg-white p-5 shadow-sm'>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>
						Technical readiness
					</p>
					<p className='mt-1 text-xs text-choco-600'>
						Measured directly from your site, not estimated. Fix
						items, then re-check.
					</p>
				</div>
				<button
					type='button'
					onClick={load}
					disabled={loading}
					className='shrink-0 rounded-xl border border-choco-200 bg-cream-50 px-3 py-1.5 text-xs font-medium text-choco-700 transition hover:bg-choco-100 disabled:opacity-50'>
					{loading ? 'Checking…' : 'Re-check'}
				</button>
			</div>

			{loading && !report && (
				<p className='mt-4 text-sm text-choco-500'>Checking your site…</p>
			)}

			{error && (
				<p className='mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700'>
					{error}
				</p>
			)}

			{report && (
				<div className={`mt-4 space-y-4 ${loading ? 'opacity-60' : ''}`}>
					<div className='flex items-center gap-4'>
						<p className={`text-4xl font-bold ${scoreColor}`}>
							{report.score}
							<span className='text-lg text-choco-300'>/100</span>
						</p>
						<div className='flex flex-wrap gap-1.5 text-[11px] font-medium'>
							<span className='rounded-full bg-green-100 px-2.5 py-1 text-green-700'>
								{report.counts.pass} passed
							</span>
							<span className='rounded-full bg-amber-100 px-2.5 py-1 text-amber-700'>
								{report.counts.warn} to improve
							</span>
							<span className='rounded-full bg-red-100 px-2.5 py-1 text-red-700'>
								{report.counts.fail} failing
							</span>
						</div>
					</div>

					{GROUP_ORDER.map((group) => {
						const items = report.checks.filter((c) => c.group === group);
						if (!items.length) return null;
						return (
							<div key={group}>
								<p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
									{group}
								</p>
								<div className='space-y-2'>
									{items.map((c) => {
										const st = STATUS_STYLE[c.status];
										const isOpen = open === c.id;
										return (
											<div
												key={c.id}
												className='rounded-2xl bg-cream-50 p-3 ring-1 ring-choco-100'>
												<div className='flex items-start gap-3'>
													<span
														className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${st.cls}`}>
														{st.icon}
													</span>
													<div className='min-w-0 flex-1'>
														<div className='flex flex-wrap items-center gap-2'>
															<p className='text-sm font-semibold text-choco-900'>
																{c.label}
															</p>
															{c.status !== 'pass' && (
																<span className='rounded-full bg-choco-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-choco-600'>
																	{c.impact} impact
																</span>
															)}
														</div>
														<p className='mt-1 text-xs text-choco-600'>
															{c.detail}
														</p>
														{c.fix && (
															<button
																type='button'
																onClick={() =>
																	setOpen(isOpen ? null : c.id)
																}
																className='mt-2 text-xs font-semibold text-choco-800 underline'>
																{isOpen ? 'Hide fix' : 'Show fix'}
															</button>
														)}
														{c.fix && isOpen && (
															<div className='relative mt-2'>
																<p className='mb-1 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
																	{c.fix.label}
																</p>
																<pre className='max-h-56 overflow-auto rounded-xl bg-choco-900 p-3 pr-16 text-[11px] leading-relaxed text-cream-100 whitespace-pre-wrap'>
																	{c.fix.code}
																</pre>
																<div className='absolute right-2 top-6'>
																	<CopyButton text={c.fix.code} />
																</div>
															</div>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
