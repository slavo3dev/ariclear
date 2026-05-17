'use client';

// app/scan/[id]/VideoCreatorPanel.tsx
// Social video creator — custom prompt + style + format + scan data toggle.

import { useState, useCallback } from 'react';
import type { Scan } from './page';

// ─── Types ────────────────────────────────────────────────────────────────────

type SceneType = 'hook' | 'problem' | 'solution' | 'cta';

type Scene = {
	id: number;
	type: SceneType;
	duration: string;
	text: string;
	visual: string;
};

type VideoStyle = {
	id: string;
	emoji: string;
	label: string;
	description: string;
};

type VideoFormat = {
	id: string;
	icon: string;
	label: string;
	ratio: string;
	platforms: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLES: VideoStyle[] = [
	{
		id: 'bold',
		emoji: '⚡',
		label: 'Bold & Direct',
		description: 'High contrast, punchy text',
	},
	{
		id: 'clean',
		emoji: '✦',
		label: 'Clean & Minimal',
		description: 'Light, elegant typography',
	},
	{
		id: 'warm',
		emoji: '☕',
		label: 'Warm & Trusted',
		description: 'Choco palette, brand-safe',
	},
	{
		id: 'urgent',
		emoji: '🔥',
		label: 'Problem-led',
		description: 'Pain first, fix second',
	},
];

const FORMATS: VideoFormat[] = [
	{
		id: 'reels',
		icon: '📱',
		label: 'Reels / TikTok',
		ratio: '9:16',
		platforms: 'Instagram · TikTok · YouTube Shorts',
	},
	{
		id: 'story',
		icon: '⭕',
		label: 'Story',
		ratio: '9:16',
		platforms: 'Instagram · Facebook',
	},
	{
		id: 'square',
		icon: '◻',
		label: 'Square Post',
		ratio: '1:1',
		platforms: 'Instagram · LinkedIn',
	},
	{
		id: 'landscape',
		icon: '🖥',
		label: 'Landscape',
		ratio: '16:9',
		platforms: 'LinkedIn · Twitter/X',
	},
];

const SCENE_LABELS: Record<SceneType, { label: string; classes: string }> = {
	hook: { label: 'HOOK', classes: 'bg-choco-900 text-cream-50' },
	problem: { label: 'PROBLEM', classes: 'bg-red-100 text-red-700' },
	solution: { label: 'SOLUTION', classes: 'bg-green-100 text-green-700' },
	cta: { label: 'CTA', classes: 'bg-choco-100 text-choco-900' },
};

// ─── Script builders ──────────────────────────────────────────────────────────

function buildFromScan(scan: Scan, style: string): Scene[] {
	const domain = (() => {
		try {
			return new URL(scan.url).hostname.replace('www.', '');
		} catch {
			return scan.url;
		}
	})();
	const headline = scan.suggested_headline ?? `What does ${domain} do?`;
	const subhead = scan.suggested_subheadline ?? '';
	const cta = scan.suggested_cta ?? 'Learn more';
	const aiSummary = scan.ai_comprehension ?? '';
	const topIssue = scan.human_confusions?.[0] ?? 'unclear messaging';
	const audience = scan.human_audience ?? 'your audience';
	const clarity = scan.human_score;
	const scoreLabel =
		clarity >= 75 ? 'strong' : clarity >= 50 ? 'average' : 'needs work';

	if (style === 'urgent')
		return [
			{
				id: 1,
				type: 'hook',
				duration: '0–3s',
				visual: `"${domain}" animates in word by word on dark bg`,
				text: `❓ Can visitors understand ${domain} in 5 seconds?`,
			},
			{
				id: 2,
				type: 'problem',
				duration: '3–6s',
				visual: 'Red warning icon, clarity score fills slowly',
				text: `Clarity: ${clarity}/100\nTop issue: "${topIssue}"`,
			},
			{
				id: 3,
				type: 'solution',
				duration: '6–10s',
				visual: 'Before/after headline swap, smooth crossfade',
				text: `New headline:\n"${headline}"`,
			},
			{
				id: 4,
				type: 'cta',
				duration: '10–12s',
				visual: 'Domain centred, CTA button pulses in',
				text: `${cta}\n→ ${domain}`,
			},
		];
	if (style === 'bold')
		return [
			{
				id: 1,
				type: 'hook',
				duration: '0–3s',
				visual: 'White text slams onto black, word by word',
				text: `"${headline}"`,
			},
			{
				id: 2,
				type: 'problem',
				duration: '3–6s',
				visual: 'Score ring fills to show clarity number',
				text: `Clarity: ${clarity}/100 (${scoreLabel})\nFor: ${audience}`,
			},
			{
				id: 3,
				type: 'solution',
				duration: '6–10s',
				visual: 'Site mockup with suggested headline overlaid',
				text:
					subhead.length > 10
						? `"${subhead}"`
						: aiSummary.slice(0, 90),
			},
			{
				id: 4,
				type: 'cta',
				duration: '10–12s',
				visual: 'Full-screen brand colour, CTA centred',
				text: `${cta}\n${domain}`,
			},
		];
	if (style === 'clean')
		return [
			{
				id: 1,
				type: 'hook',
				duration: '0–3s',
				visual: 'Minimal white frame, domain fades in',
				text: `${domain} — here's how the world sees you.`,
			},
			{
				id: 2,
				type: 'problem',
				duration: '3–7s',
				visual: 'Soft score card slides in from right',
				text:
					aiSummary.length > 20
						? aiSummary.slice(0, 100)
						: `Clarity score: ${clarity}/100`,
			},
			{
				id: 3,
				type: 'solution',
				duration: '7–10s',
				visual: 'Suggested headline in large elegant type',
				text: `"${headline}"`,
			},
			{
				id: 4,
				type: 'cta',
				duration: '10–12s',
				visual: 'Logo + tagline + subtle URL',
				text: `${cta} · ${domain}`,
			},
		];
	return [
		{
			id: 1,
			type: 'hook',
			duration: '0–3s',
			visual: 'Warm choco palette, domain eases in',
			text: `This is how visitors see ${domain}.`,
		},
		{
			id: 2,
			type: 'problem',
			duration: '3–6s',
			visual: 'Score card on warm brown background',
			text: `Clarity: ${clarity}/100\nAudience: ${audience}`,
		},
		{
			id: 3,
			type: 'solution',
			duration: '6–10s',
			visual: 'Suggested headline in cream on choco',
			text: `"${headline}"`,
		},
		{
			id: 4,
			type: 'cta',
			duration: '10–12s',
			visual: 'AriClear branding + domain CTA',
			text: `${cta} → ${domain}`,
		},
	];
}

function buildFromPrompt(
	prompt: string,
	scan: Scan | null,
	includeScan: boolean,
	style: string,
): Scene[] {
	const domain = scan
		? (() => {
				try {
					return new URL(scan.url).hostname.replace('www.', '');
				} catch {
					return scan.url;
				}
			})()
		: '';
	const scanLine =
		includeScan && scan
			? `\nSite clarity: ${scan.human_score}/100 · AI-SEO: ${scan.ai_score}/100`
			: '';
	const cta =
		includeScan && scan?.suggested_cta ? scan.suggested_cta : 'Learn more';

	const visualMap: Record<string, string[]> = {
		bold: [
			'Bold text explodes onto dark bg',
			'Score/stat card slams in',
			'Key message in giant type',
			'CTA button with domain',
		],
		clean: [
			'Minimal white frame, text fades in',
			'Soft card slides from right',
			'Elegant centred headline',
			'Logo + subtle URL',
		],
		warm: [
			'Warm choco bg, text eases in',
			'Score card warm tones',
			'Cream text on dark bg',
			'Brand colours + CTA',
		],
		urgent: [
			'Dark bg, urgent red accent',
			'Problem statement flashes in',
			'Solution card sweeps in',
			'Pulsing CTA button',
		],
	};
	const visuals = visualMap[style] ?? visualMap.bold;

	return [
		{
			id: 1,
			type: 'hook',
			duration: '0–3s',
			visual: visuals[0],
			text: prompt.slice(0, 80),
		},
		{
			id: 2,
			type: 'problem',
			duration: '3–6s',
			visual: visuals[1],
			text:
				(includeScan && scan?.human_confusions?.[0]
					? `"${scan.human_confusions[0]}"`
					: prompt.slice(80, 160)) + scanLine,
		},
		{
			id: 3,
			type: 'solution',
			duration: '6–10s',
			visual: visuals[2],
			text:
				includeScan && scan?.suggested_headline
					? `"${scan.suggested_headline}"`
					: prompt.slice(0, 120),
		},
		{
			id: 4,
			type: 'cta',
			duration: '10–12s',
			visual: visuals[3],
			text: `${cta}${domain ? `\n→ ${domain}` : ''}`,
		},
	];
}

// ─── Scene card ───────────────────────────────────────────────────────────────

function SceneCard({ scene }: { scene: Scene }) {
	const tag = SCENE_LABELS[scene.type];
	return (
		<div className='rounded-2xl border border-choco-100 bg-white p-4 shadow-sm'>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-2'>
					<span className='flex h-6 w-6 items-center justify-center rounded-full bg-choco-900 text-[10px] font-bold text-cream-50'>
						{scene.id}
					</span>
					<span
						className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest ${tag.classes}`}>
						{tag.label}
					</span>
				</div>
				<span className='text-[10px] text-choco-400'>
					{scene.duration}
				</span>
			</div>
			<p className='mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-choco-900'>
				{scene.text}
			</p>
			<div className='mt-3 rounded-xl bg-cream-50 px-3 py-2 ring-1 ring-choco-100'>
				<p className='text-[9px] font-semibold uppercase tracking-[0.1em] text-choco-500'>
					Visual direction
				</p>
				<p className='mt-0.5 text-[11px] text-choco-700'>
					{scene.visual}
				</p>
			</div>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoCreatorPanel({ scan }: { scan: Scan }) {
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<'scan' | 'custom'>('scan');
	const [customPrompt, setCustomPrompt] = useState('');
	const [includeScan, setIncludeScan] = useState(true);
	const [style, setStyle] = useState('bold');
	const [format, setFormat] = useState('reels');
	const [copied, setCopied] = useState(false);
	const [requesting, setRequesting] = useState(false);
	const [requestDone, setRequestDone] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);

	const script =
		mode === 'scan'
			? buildFromScan(scan, style)
			: buildFromPrompt(customPrompt, scan, includeScan, style);

	const scriptText = script
		.map(
			(s) =>
				`[Scene ${s.id} — ${s.duration} | ${s.type.toUpperCase()}]\n${s.text}\nVisual: ${s.visual}`,
		)
		.join('\n\n');

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(scriptText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [scriptText]);

	const handleRequestRender = useCallback(async () => {
		if (mode === 'custom' && !customPrompt.trim()) return;
		setRequesting(true);
		setRequestError(null);
		try {
			const res = await fetch('/api/video/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					scan_id: scan.id,
					url: scan.url,
					style,
					format,
					script,
					mode,
					custom_prompt: mode === 'custom' ? customPrompt : null,
				}),
			});
			if (!res.ok) {
				const json = await res.json();
				setRequestError(
					json.error ?? 'Request failed. Please try again.',
				);
				return;
			}
			setRequestDone(true);
		} catch {
			setRequestError('Network error. Please try again.');
		} finally {
			setRequesting(false);
		}
	}, [scan.id, scan.url, style, format, script, mode, customPrompt]);

	const selectedFormat = FORMATS.find((f) => f.id === format);
	const canRequest = mode === 'scan' || customPrompt.trim().length > 0;

	return (
		<div className='overflow-hidden rounded-3xl border border-choco-100 bg-white shadow-sm'>
			{/* Collapsed header */}
			<button
				onClick={() => setOpen((v) => !v)}
				className='flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-cream-50'
				aria-expanded={open}>
				<div className='flex items-center gap-3'>
					<span className='flex h-10 w-10 items-center justify-center rounded-2xl bg-choco-900 text-xl'>
						🎬
					</span>
					<div>
						<p className='text-sm font-semibold text-choco-900'>
							Create a social video
						</p>
						<p className='mt-0.5 text-xs text-choco-500'>
							From your scan or a custom prompt · 5–12s ·
							Instagram, TikTok, LinkedIn
						</p>
					</div>
				</div>
				<span
					className='text-choco-400 transition-transform duration-200'
					style={{
						transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
					}}>
					▾
				</span>
			</button>

			{/* Expanded */}
			{open && (
				<div className='space-y-6 border-t border-choco-100 px-6 pb-6 pt-5'>
					{/* Mode toggle */}
					<div>
						<p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-choco-500'>
							Video source
						</p>
						<div className='mt-3 flex gap-2'>
							<button
								onClick={() => setMode('scan')}
								className={`flex-1 rounded-2xl border py-2.5 text-sm font-medium transition-all ${
									mode === 'scan'
										? 'border-choco-900 bg-choco-900 text-cream-50'
										: 'border-choco-100 bg-white text-choco-700 hover:border-choco-300'
								}`}>
								📊 From this scan
							</button>
							<button
								onClick={() => setMode('custom')}
								className={`flex-1 rounded-2xl border py-2.5 text-sm font-medium transition-all ${
									mode === 'custom'
										? 'border-choco-900 bg-choco-900 text-cream-50'
										: 'border-choco-100 bg-white text-choco-700 hover:border-choco-300'
								}`}>
								✍️ Custom prompt
							</button>
						</div>
					</div>

					{/* Custom prompt */}
					{mode === 'custom' && (
						<div className='space-y-3'>
							<div>
								<label className='text-[11px] font-semibold uppercase tracking-[0.1em] text-choco-500'>
									Your video idea
								</label>
								<textarea
									value={customPrompt}
									onChange={(e) =>
										setCustomPrompt(e.target.value)
									}
									placeholder='e.g. Show how our mentorship program transforms beginners into developers in 90 days...'
									rows={3}
									className='mt-2 w-full rounded-2xl border border-choco-200 bg-cream-50 px-4 py-3 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-700 focus:outline-none focus:ring-2 focus:ring-choco-200 resize-none'
								/>
								<p className='mt-1 text-[10px] text-choco-400'>
									Describe what you want the video to say.
									Keep it to 1–2 sentences for best results.
								</p>
							</div>

							{/* Include scan data toggle */}
							<label className='flex cursor-pointer items-center gap-3 rounded-2xl bg-cream-50 px-4 py-3 ring-1 ring-choco-100'>
								<div
									onClick={() => setIncludeScan((v) => !v)}
									className={`relative h-5 w-9 rounded-full transition-colors ${
										includeScan
											? 'bg-choco-900'
											: 'bg-choco-200'
									}`}>
									<span
										className='absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform'
										style={{
											transform: includeScan
												? 'translateX(16px)'
												: 'translateX(2px)',
										}}
									/>
								</div>
								<div>
									<p className='text-xs font-semibold text-choco-900'>
										Include scan data
									</p>
									<p className='text-[10px] text-choco-500'>
										Adds your scores, top issue, and
										suggested headline to the script
									</p>
								</div>
							</label>
						</div>
					)}

					{/* Style picker */}
					<div>
						<p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-choco-500'>
							Video style
						</p>
						<div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>
							{STYLES.map((s) => (
								<button
									key={s.id}
									onClick={() => setStyle(s.id)}
									className={`rounded-2xl border p-3 text-left transition-all ${
										style === s.id
											? 'border-choco-900 bg-choco-900 text-cream-50 shadow-md'
											: 'border-choco-100 bg-white text-choco-900 hover:border-choco-300'
									}`}>
									<span className='text-lg'>{s.emoji}</span>
									<p className='mt-1.5 text-xs font-semibold'>
										{s.label}
									</p>
									<p
										className={`mt-0.5 text-[10px] ${style === s.id ? 'text-cream-300' : 'text-choco-500'}`}>
										{s.description}
									</p>
								</button>
							))}
						</div>
					</div>

					{/* Format picker */}
					<div>
						<p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-choco-500'>
							Format
						</p>
						<div className='mt-3 flex flex-wrap gap-2'>
							{FORMATS.map((f) => (
								<button
									key={f.id}
									onClick={() => setFormat(f.id)}
									className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
										format === f.id
											? 'border-choco-900 bg-choco-900 text-cream-50'
											: 'border-choco-200 bg-white text-choco-700 hover:border-choco-400'
									}`}>
									<span>{f.icon}</span>
									<span>{f.label}</span>
									<span
										className={`text-[9px] ${format === f.id ? 'text-cream-300' : 'text-choco-400'}`}>
										{f.ratio}
									</span>
								</button>
							))}
						</div>
						{selectedFormat && (
							<p className='mt-1.5 text-[10px] text-choco-400'>
								{selectedFormat.platforms}
							</p>
						)}
					</div>

					{/* Script preview */}
					<div>
						<div className='flex items-center justify-between'>
							<p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-choco-500'>
								{mode === 'scan'
									? 'Auto-generated script'
									: 'Generated script'}
							</p>
							<span className='rounded-full bg-cream-50 px-2 py-0.5 text-[10px] text-choco-600 ring-1 ring-choco-100'>
								~12s total
							</span>
						</div>

						{mode === 'custom' && !customPrompt.trim() ? (
							<div className='mt-3 rounded-2xl border-2 border-dashed border-choco-100 py-8 text-center'>
								<p className='text-xs text-choco-400'>
									Enter your video idea above to generate a
									script
								</p>
							</div>
						) : (
							<div className='mt-3 grid gap-3 sm:grid-cols-2'>
								{script.map((scene) => (
									<SceneCard key={scene.id} scene={scene} />
								))}
							</div>
						)}
					</div>

					{/* Info strip */}
					<div className='rounded-2xl bg-cream-50 px-4 py-3 text-[11px] text-choco-600 ring-1 ring-choco-100'>
						<span className='font-semibold text-choco-900'>
							How to use:{' '}
						</span>
						Copy the script into CapCut, Canva, or Adobe Express —
						or request a rendered .mp4 and we will deliver within
						24h.
					</div>

					{/* Error */}
					{requestError && (
						<div className='rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200'>
							⚠ {requestError}
						</div>
					)}

					{/* Actions */}
					<div className='flex flex-col gap-3 sm:flex-row'>
						<button
							onClick={handleCopy}
							disabled={mode === 'custom' && !customPrompt.trim()}
							className='flex flex-1 items-center justify-center gap-2 rounded-full border border-choco-200 bg-white px-5 py-2.5 text-sm font-medium text-choco-900 transition-all hover:border-choco-400 hover:bg-cream-50 disabled:opacity-40'>
							{copied ? '✓ Copied' : '📋 Copy script'}
						</button>

						{!requestDone ? (
							<button
								onClick={handleRequestRender}
								disabled={requesting || !canRequest}
								className='flex flex-1 items-center justify-center gap-2 rounded-full bg-choco-900 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-md transition-all hover:bg-choco-800 active:scale-95 disabled:opacity-40'>
								{requesting ? (
									<>
										<span className='h-4 w-4 animate-spin rounded-full border-2 border-cream-400 border-t-cream-50' />
										Requesting…
									</>
								) : (
									'🎬 Request rendered video'
								)}
							</button>
						) : (
							<div className='flex flex-1 items-center justify-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700 ring-1 ring-green-200'>
								✓ Request received — we will deliver within 24h
							</div>
						)}
					</div>

					<p className='text-center text-[10px] text-choco-400'>
						Script copy is free on all plans · Rendered .mp4
						delivery requires Pro or Expert
					</p>
				</div>
			)}
		</div>
	);
}
