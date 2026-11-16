'use client';

// app/history/ScoreTrend.tsx
// Small per-site trend: clarity, AI readability and technical score across
// saved scans, oldest to newest. Plain SVG, no chart library.

export type TrendPoint = {
	created_at: string;
	human_score: number;
	ai_score: number;
	technical_score: number | null;
};

const SERIES = [
	{ key: 'human_score', label: 'Clarity', color: '#b86a3f', dash: '' },
	{ key: 'ai_score', label: 'AI', color: '#2b1510', dash: '' },
	{ key: 'technical_score', label: 'Technical', color: '#5a8a5a', dash: '4 3' },
] as const;

const W = 280;
const H = 72;
const PAD = 6;

function fmt(iso: string) {
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ScoreTrend({ points }: { points: TrendPoint[] }) {
	// Oldest first, at most the last 12 scans.
	const data = [...points]
		.sort((a, b) => a.created_at.localeCompare(b.created_at))
		.slice(-12);
	if (data.length < 2) return null;

	const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (data.length - 1);
	const y = (v: number) => PAD + ((100 - v) * (H - 2 * PAD)) / 100;

	const first = data[0];
	const last = data[data.length - 1];

	const summary = SERIES.map((s) => {
		const a = first[s.key];
		const b = last[s.key];
		if (a == null || b == null) return null;
		return { ...s, from: a, to: b, delta: b - a };
	}).filter(Boolean) as Array<(typeof SERIES)[number] & { from: number; to: number; delta: number }>;

	const description = summary
		.map((s) => `${s.label} ${s.from} to ${s.to}`)
		.join(', ');

	return (
		<figure className='mt-3'>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className='h-[72px] w-full max-w-[320px]'
				role='img'
				aria-label={`Score trend from ${fmt(first.created_at)} to ${fmt(last.created_at)}: ${description}`}>
				{[25, 50, 75].map((g) => (
					<line
						key={g}
						x1={PAD}
						x2={W - PAD}
						y1={y(g)}
						y2={y(g)}
						stroke='#f0e4d8'
						strokeWidth={1}
					/>
				))}
				{SERIES.map((s) => {
					const pts = data
						.map((d, i) => (d[s.key] == null ? null : `${x(i)},${y(d[s.key] as number)}`))
						.filter(Boolean);
					if (pts.length < 2) return null;
					return (
						<polyline
							key={s.key}
							points={pts.join(' ')}
							fill='none'
							stroke={s.color}
							strokeWidth={2}
							strokeDasharray={s.dash || undefined}
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					);
				})}
			</svg>
			<figcaption className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-choco-600'>
				{summary.map((s) => (
					<span key={s.key} className='inline-flex items-center gap-1'>
						<span
							aria-hidden
							className='inline-block h-0.5 w-3'
							style={{ background: s.color }}
						/>
						{s.label} {s.from}→{s.to}
						<span
							className={
								s.delta > 0 ? 'text-green-700' : s.delta < 0 ? 'text-red-700' : 'text-choco-400'
							}>
							({s.delta > 0 ? '+' : ''}
							{s.delta})
						</span>
					</span>
				))}
				<span className='text-choco-400'>
					{fmt(first.created_at)} – {fmt(last.created_at)}
				</span>
			</figcaption>
		</figure>
	);
}
