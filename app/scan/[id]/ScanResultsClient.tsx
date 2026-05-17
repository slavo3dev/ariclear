'use client';

// app/scan/[id]/ScanResultsClient.tsx

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Scan, ActionStep } from './page';
import { ScanRecapVideo } from './ScanRecapVideo';
import { VideoCreatorPanel } from './VideoCreatorPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreBadge(score: number) {
	if (score >= 75)
		return { label: 'Strong', classes: 'bg-green-100 text-green-700' };
	if (score >= 50)
		return { label: 'Average', classes: 'bg-amber-100 text-amber-700' };
	return { label: 'Needs work', classes: 'bg-red-100 text-red-700' };
}

function impactColor(impact: ActionStep['impact']) {
	return impact === 'high'
		? 'bg-red-400'
		: impact === 'medium'
			? 'bg-amber-400'
			: 'bg-green-400';
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number; label: string }) {
	const r = 28;
	const dim = r * 2 + 8;
	const circ = 2 * Math.PI * r;
	const fill = (score / 100) * circ;
	const badge = scoreBadge(score);

	return (
		<div className='flex flex-col items-center gap-1.5'>
			<div
				className='relative flex items-center justify-center'
				style={{ width: dim, height: dim }}>
				<svg
					className='absolute inset-0 -rotate-90'
					viewBox={`0 0 ${dim} ${dim}`}>
					<circle
						cx={dim / 2}
						cy={dim / 2}
						r={r}
						fill='none'
						stroke='#f5ede3'
						strokeWidth='5'
					/>
					<circle
						cx={dim / 2}
						cy={dim / 2}
						r={r}
						fill='none'
						stroke='#3c2a18'
						strokeWidth='5'
						strokeDasharray={`${fill} ${circ}`}
						strokeLinecap='round'
					/>
				</svg>
				<span className='relative text-lg font-bold text-choco-900'>
					{score}
				</span>
			</div>
			<div className='text-center'>
				<p className='text-xs font-semibold text-choco-900'>{label}</p>
				<span
					className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.classes}`}>
					{badge.label}
				</span>
			</div>
		</div>
	);
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className='rounded-3xl border border-choco-100 bg-white p-5 shadow-sm'>
			<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>
				{title}
			</p>
			<div className='mt-4'>{children}</div>
		</div>
	);
}

function Infobox({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className='rounded-2xl bg-cream-50 p-3 ring-1 ring-choco-100'>
			<p className='text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
				{label}
			</p>
			<div className='mt-1 text-sm text-choco-900'>{children}</div>
		</div>
	);
}

function Tag({ children }: { children: React.ReactNode }) {
	return (
		<span className='inline-block rounded-full bg-cream-50 px-3 py-1 text-[11px] text-choco-700 ring-1 ring-choco-100'>
			{children}
		</span>
	);
}

// ─── Main client component ────────────────────────────────────────────────────

export function ScanResultsClient({ scan }: { scan: Scan }) {
	const router = useRouter();
	const [promptCopied, setPromptCopied] = useState(false);

	const handleCopyPrompt = useCallback(async () => {
		if (!scan.ai_prompt) return;
		await navigator.clipboard.writeText(scan.ai_prompt);
		setPromptCopied(true);
		setTimeout(() => setPromptCopied(false), 2000);
	}, [scan.ai_prompt]);

	return (
		<div className='space-y-5'>
			{/* Back */}
			<button
				onClick={() => router.push('/scan')}
				className='flex items-center gap-1.5 text-xs font-medium text-choco-500 transition hover:text-choco-900'>
				← New scan
			</button>

			{/* ── SCAN RECAP VIDEO — auto-plays, shows how AriClear sees the site ── */}
			<ScanRecapVideo scan={scan} />

			{/* Header */}
			<div className='rounded-3xl border border-choco-100 bg-white p-5 shadow-sm'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
					<div className='min-w-0'>
						<p className='text-[11px] font-medium uppercase tracking-[0.1em] text-choco-500'>
							Scan complete · {formatDate(scan.created_at)}
						</p>
						<p className='mt-1 truncate text-xl font-bold text-choco-900'>
							{scan.domain}
						</p>
						<p className='mt-0.5 truncate text-xs text-choco-400'>
							{scan.url}
						</p>
					</div>
					<div className='flex shrink-0 items-center gap-5'>
						<ScoreRing score={scan.human_score} label='Clarity' />
						<ScoreRing score={scan.ai_score} label='AI-SEO' />
						<div className='flex flex-col items-center gap-1.5'>
							<div className='flex h-16 w-16 items-center justify-center rounded-full bg-choco-900'>
								<span className='text-xl font-bold text-cream-50'>
									{scan.overall_score}
								</span>
							</div>
							<p className='text-xs font-semibold text-choco-900'>
								Overall
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Human clarity */}
			<Section title='Human Clarity'>
				<div className='space-y-3'>
					{scan.human_clarity_description?.trim() && (
						<Infobox label='First impression'>
							{scan.human_clarity_description}
						</Infobox>
					)}
					{scan.human_value_prop?.trim() && (
						<Infobox label='Value prop (as understood)'>
							{scan.human_value_prop}
						</Infobox>
					)}
					{scan.human_audience?.trim() && (
						<p className='text-xs text-choco-600'>
							<span className='font-semibold text-choco-900'>
								Best-guess audience:{' '}
							</span>
							{scan.human_audience}
						</p>
					)}
					{scan.human_confusions?.length > 0 && (
						<div>
							<p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								Points of confusion
							</p>
							<ul className='space-y-1.5'>
								{scan.human_confusions.map((c, i) => (
									<li
										key={i}
										className='flex items-start gap-2 text-sm text-choco-700'>
										<span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400' />
										{c}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</Section>

			{/* AI comprehension */}
			<Section title='AI Comprehension'>
				<div className='space-y-3'>
					{scan.ai_comprehension?.trim() && (
						<Infobox label='How AI summarises your site'>
							{scan.ai_comprehension}
						</Infobox>
					)}
					{scan.ai_indexer_read?.trim() && (
						<Infobox label='What an AI indexer reads'>
							{scan.ai_indexer_read}
						</Infobox>
					)}
					{scan.ai_missing_keywords?.length > 0 && (
						<div>
							<p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								Missing keywords
							</p>
							<div className='flex flex-wrap gap-2'>
								{scan.ai_missing_keywords.map((k) => (
									<Tag key={k}>{k}</Tag>
								))}
							</div>
						</div>
					)}
				</div>
			</Section>

			{/* Suggested copy */}
			{(scan.suggested_headline ||
				scan.suggested_subheadline ||
				scan.suggested_cta) && (
				<Section title='Suggested Copy'>
					<div className='space-y-3'>
						{scan.suggested_headline?.trim() && (
							<div className='rounded-2xl bg-choco-900 p-4'>
								<p className='text-[10px] font-semibold uppercase tracking-widest text-cream-400'>
									Headline
								</p>
								<p className='mt-1 text-base font-bold text-cream-50'>
									{scan.suggested_headline}
								</p>
							</div>
						)}
						{scan.suggested_subheadline?.trim() && (
							<Infobox label='Subheadline'>
								{scan.suggested_subheadline}
							</Infobox>
						)}
						{scan.suggested_cta?.trim() && (
							<div className='inline-flex items-center gap-2 rounded-full bg-choco-100 px-4 py-2'>
								<span className='text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
									CTA:
								</span>
								<span className='text-sm font-semibold text-choco-900'>
									{scan.suggested_cta}
								</span>
							</div>
						)}
					</div>
				</Section>
			)}

			{/* Action plan */}
			{scan.action_plan?.length > 0 && (
				<Section title='Action Plan'>
					<div className='space-y-3'>
						{scan.action_plan.map((step, i) => (
							<div
								key={i}
								className='flex gap-3 rounded-2xl bg-cream-50 p-4 ring-1 ring-choco-100'>
								<div className='flex flex-col items-center gap-1.5 pt-0.5'>
									<span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-choco-900 text-[10px] font-bold text-cream-50'>
										{i + 1}
									</span>
									<span
										className={`h-1.5 w-1.5 rounded-full ${impactColor(step.impact)}`}
									/>
								</div>
								<div className='min-w-0 flex-1'>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='text-sm font-semibold text-choco-900'>
											{step.title}
										</p>
										<span className='rounded-full bg-choco-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-choco-600'>
											{step.impact} impact
										</span>
									</div>
									<p className='mt-1 text-xs text-choco-600'>
										{step.details}
									</p>
								</div>
							</div>
						))}
					</div>
				</Section>
			)}

			{/* AI prompt */}
			{scan.ai_prompt?.trim() && (
				<Section title='Copy-paste AI Prompt'>
					<div className='relative'>
						<pre className='max-h-44 overflow-y-auto rounded-2xl bg-choco-900 p-4 text-[11px] leading-relaxed text-cream-100 whitespace-pre-wrap'>
							{scan.ai_prompt}
						</pre>
						<button
							onClick={handleCopyPrompt}
							className='absolute right-3 top-3 rounded-xl bg-choco-700 px-3 py-1.5 text-[10px] font-semibold text-cream-50 transition hover:bg-choco-600'>
							{promptCopied ? '✓ Copied' : 'Copy'}
						</button>
					</div>
				</Section>
			)}

			{/* ── VIDEO CREATOR — custom social video with prompt + style + format ── */}
			<VideoCreatorPanel scan={scan} />
		</div>
	);
}
