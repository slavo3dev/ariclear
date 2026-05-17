'use client';

// app/scan/[id]/ScanRecapVideo.tsx
// Phase A: Animated browser preview of scan results.
// Plays a 12-second looping video-like animation showing scores,
// first impression, problem/solution, and suggested headline.
// "Download" captures it as MP4 via MediaRecorder API.
// Phase B will swap the capture for a real Remotion render.

import { useRef, useState, useEffect, useCallback } from 'react';
import type { Scan } from './page';

// ─── Types ────────────────────────────────────────────────────────────────────

type SlideIndex = 0 | 1 | 2 | 3;

// ─── Constants ────────────────────────────────────────────────────────────────

const SLIDE_DURATION_MS = 3000; // 3s per slide × 4 = 12s total
const TOTAL_SLIDES = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDomain(url: string) {
	try {
		return new URL(url).hostname.replace('www.', '');
	} catch {
		return url;
	}
}

function scoreColor(score: number) {
	if (score >= 75) return '#4ade80'; // green
	if (score >= 50) return '#fbbf24'; // amber
	return '#f87171'; // red
}

function scoreLabel(score: number) {
	if (score >= 75) return 'Strong';
	if (score >= 50) return 'Average';
	return 'Needs work';
}

// ─── Animated score ring ──────────────────────────────────────────────────────

function ScoreRing({
	score,
	label,
	animate,
	size = 72,
}: {
	score: number;
	label: string;
	animate: boolean;
	size?: number;
}) {
	const r = size / 2 - 6;
	const circ = 2 * Math.PI * r;
	const fill = animate ? (score / 100) * circ : 0;

	return (
		<div className='flex flex-col items-center gap-2'>
			<div className='relative' style={{ width: size, height: size }}>
				<svg
					className='-rotate-90'
					viewBox={`0 0 ${size} ${size}`}
					style={{ width: size, height: size }}>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill='none'
						stroke='rgba(255,255,255,0.15)'
						strokeWidth='5'
					/>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill='none'
						stroke={scoreColor(score)}
						strokeWidth='5'
						strokeDasharray={`${fill} ${circ}`}
						strokeLinecap='round'
						style={{
							transition:
								'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)',
						}}
					/>
				</svg>
				<div className='absolute inset-0 flex items-center justify-center'>
					<span className='text-xl font-bold text-white'>
						{score}
					</span>
				</div>
			</div>
			<span className='text-[11px] font-semibold tracking-widest uppercase text-white/70'>
				{label}
			</span>
		</div>
	);
}

// ─── Individual slides ────────────────────────────────────────────────────────

function Slide0Scores({ scan, visible }: { scan: Scan; visible: boolean }) {
	const domain = getDomain(scan.url);
	return (
		<div className='absolute inset-0 flex flex-col items-center justify-center gap-6 px-8'>
			{/* Domain */}
			<div
				className='text-center'
				style={{
					opacity: visible ? 1 : 0,
					transform: visible ? 'translateY(0)' : 'translateY(16px)',
					transition: 'opacity 0.6s ease, transform 0.6s ease',
				}}>
				<p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50'>
					AriClear scan
				</p>
				<p className='mt-1 text-2xl font-bold text-white'>{domain}</p>
			</div>

			{/* Score rings */}
			<div
				className='flex items-center gap-8'
				style={{
					opacity: visible ? 1 : 0,
					transform: visible ? 'translateY(0)' : 'translateY(24px)',
					transition:
						'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
				}}>
				<ScoreRing
					score={scan.human_score}
					label='Clarity'
					animate={visible}
					size={80}
				/>
				<div className='flex flex-col items-center gap-1'>
					<div
						className='flex h-20 w-20 items-center justify-center rounded-full'
						style={{
							background: 'rgba(255,255,255,0.12)',
							border: '2px solid rgba(255,255,255,0.25)',
						}}>
						<span className='text-2xl font-bold text-white'>
							{scan.overall_score}
						</span>
					</div>
					<span className='text-[11px] font-semibold uppercase tracking-widest text-white/70'>
						Overall
					</span>
				</div>
				<ScoreRing
					score={scan.ai_score}
					label='AI-SEO'
					animate={visible}
					size={80}
				/>
			</div>

			{/* Score labels */}
			<div
				className='flex gap-4'
				style={{
					opacity: visible ? 1 : 0,
					transition: 'opacity 0.6s ease 0.5s',
				}}>
				{[
					{ score: scan.human_score, label: 'Clarity' },
					{ score: scan.ai_score, label: 'AI-SEO' },
				].map(({ score, label }) => (
					<span
						key={label}
						className='rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest'
						style={{
							background: scoreColor(score) + '33',
							color: scoreColor(score),
							border: `1px solid ${scoreColor(score)}55`,
						}}>
						{label}: {scoreLabel(score)}
					</span>
				))}
			</div>
		</div>
	);
}

function Slide1FirstImpression({
	scan,
	visible,
}: {
	scan: Scan;
	visible: boolean;
}) {
	const text =
		scan.human_clarity_description ??
		'Your website was scanned for clarity.';
	return (
		<div className='absolute inset-0 flex flex-col items-center justify-center gap-5 px-10'>
			<div
				style={{
					opacity: visible ? 1 : 0,
					transition: 'opacity 0.5s ease',
				}}>
				<span
					className='rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest'
					style={{
						background: 'rgba(255,255,255,0.1)',
						color: 'rgba(255,255,255,0.6)',
						border: '1px solid rgba(255,255,255,0.2)',
					}}>
					First impression
				</span>
			</div>
			<p
				className='text-center text-lg font-semibold leading-snug text-white'
				style={{
					opacity: visible ? 1 : 0,
					transform: visible ? 'translateY(0)' : 'translateY(20px)',
					transition:
						'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s',
				}}>
				&ldquo;{text}&rdquo;
			</p>
			{scan.human_audience && (
				<p
					className='text-center text-sm text-white/60'
					style={{
						opacity: visible ? 1 : 0,
						transition: 'opacity 0.6s ease 0.4s',
					}}>
					Audience: {scan.human_audience}
				</p>
			)}
		</div>
	);
}

function Slide2ProblemSolution({
	scan,
	visible,
}: {
	scan: Scan;
	visible: boolean;
}) {
	const problem = scan.human_confusions?.[0] ?? 'Messaging lacks clarity';
	const solution = scan.action_plan?.[0]?.title ?? 'Rewrite the headline';
	const details = scan.action_plan?.[0]?.details ?? '';

	return (
		<div className='absolute inset-0 flex flex-col items-center justify-center gap-4 px-8'>
			{/* Problem */}
			<div
				className='w-full rounded-2xl p-4'
				style={{
					background: 'rgba(248,113,113,0.15)',
					border: '1px solid rgba(248,113,113,0.35)',
					opacity: visible ? 1 : 0,
					transform: visible ? 'translateX(0)' : 'translateX(-24px)',
					transition:
						'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
				}}>
				<p className='text-[9px] font-bold uppercase tracking-[0.2em] text-red-300'>
					⚠ Problem
				</p>
				<p className='mt-1 text-sm font-semibold text-white'>
					{problem}
				</p>
			</div>

			{/* Arrow */}
			<div
				style={{
					opacity: visible ? 1 : 0,
					transition: 'opacity 0.4s ease 0.4s',
				}}>
				<span className='text-white/40 text-lg'>↓</span>
			</div>

			{/* Solution */}
			<div
				className='w-full rounded-2xl p-4'
				style={{
					background: 'rgba(74,222,128,0.12)',
					border: '1px solid rgba(74,222,128,0.3)',
					opacity: visible ? 1 : 0,
					transform: visible ? 'translateX(0)' : 'translateX(24px)',
					transition:
						'opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s',
				}}>
				<p className='text-[9px] font-bold uppercase tracking-[0.2em] text-green-300'>
					✓ Fix
				</p>
				<p className='mt-1 text-sm font-semibold text-white'>
					{solution}
				</p>
				{details && (
					<p className='mt-1 text-[11px] leading-relaxed text-white/60 line-clamp-2'>
						{details}
					</p>
				)}
			</div>
		</div>
	);
}

function Slide3Headline({ scan, visible }: { scan: Scan; visible: boolean }) {
	const domain = getDomain(scan.url);
	const headline =
		scan.suggested_headline ?? `Rewrite your headline for ${domain}`;
	const cta = scan.suggested_cta ?? 'Learn more';

	return (
		<div className='absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center'>
			<div
				style={{
					opacity: visible ? 1 : 0,
					transition: 'opacity 0.5s ease',
				}}>
				<span
					className='rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest'
					style={{
						background: 'rgba(255,255,255,0.1)',
						color: 'rgba(255,255,255,0.6)',
						border: '1px solid rgba(255,255,255,0.2)',
					}}>
					Suggested headline
				</span>
			</div>

			<p
				className='text-xl font-bold leading-tight text-white'
				style={{
					opacity: visible ? 1 : 0,
					transform: visible ? 'scale(1)' : 'scale(0.94)',
					transition:
						'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
				}}>
				&ldquo;{headline}&rdquo;
			</p>

			<div
				className='flex items-center gap-3'
				style={{
					opacity: visible ? 1 : 0,
					transition: 'opacity 0.6s ease 0.5s',
				}}>
				<span
					className='rounded-full px-4 py-2 text-sm font-semibold text-white'
					style={{
						background: 'rgba(255,255,255,0.18)',
						border: '1px solid rgba(255,255,255,0.3)',
					}}>
					{cta}
				</span>
				<span className='text-xs text-white/40'>→ {domain}</span>
			</div>

			{/* AriClear watermark */}
			<div
				className='absolute bottom-4 right-4'
				style={{
					opacity: visible ? 0.5 : 0,
					transition: 'opacity 0.6s ease 0.8s',
				}}>
				<span className='text-[10px] font-bold uppercase tracking-widest text-white/40'>
					AriClear
				</span>
			</div>
		</div>
	);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({
	currentSlide,
	progress,
}: {
	currentSlide: number;
	progress: number;
}) {
	return (
		<div className='flex gap-1.5 px-4 pt-3'>
			{Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
				<div
					key={i}
					className='h-0.5 flex-1 overflow-hidden rounded-full'
					style={{ background: 'rgba(255,255,255,0.2)' }}>
					<div
						className='h-full rounded-full'
						style={{
							background: 'rgba(255,255,255,0.9)',
							width:
								i < currentSlide
									? '100%'
									: i === currentSlide
										? `${progress}%`
										: '0%',
							transition:
								i === currentSlide ? 'none' : 'width 0.3s ease',
						}}
					/>
				</div>
			))}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScanRecapVideo({ scan }: { scan: Scan }) {
	const canvasRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [playing, setPlaying] = useState(false);
	const [currentSlide, setCurrentSlide] = useState<SlideIndex>(0);
	const [progress, setProgress] = useState(0);
	const [downloading, setDownloading] = useState(false);
	const [downloadError, setDownloadError] = useState<string | null>(null);

	// Auto-play on mount
	useEffect(() => {
		const t = setTimeout(() => setPlaying(true), 600);
		return () => clearTimeout(t);
	}, []);

	// Drive slide progression
	useEffect(() => {
		if (!playing) return;

		setCurrentSlide(0);
		setProgress(0);

		const TICK = 50; // ms per tick
		const steps = SLIDE_DURATION_MS / TICK;
		let tick = 0;
		let slide = 0;

		progressRef.current = setInterval(() => {
			tick++;
			setProgress(Math.min((tick / steps) * 100, 100));

			if (tick >= steps) {
				tick = 0;
				slide = (slide + 1) % TOTAL_SLIDES;
				setCurrentSlide(slide as SlideIndex);
				setProgress(0);
			}
		}, TICK);

		return () => {
			if (progressRef.current) clearInterval(progressRef.current);
		};
	}, [playing]);

	const handlePlayPause = useCallback(() => {
		setPlaying((v) => {
			if (!v) {
				setCurrentSlide(0);
				setProgress(0);
			}
			return !v;
		});
	}, []);

	// Download via MediaRecorder capturing the canvas div
	const handleDownload = useCallback(async () => {
		setDownloadError(null);

		if (!('MediaRecorder' in window)) {
			setDownloadError(
				"Your browser doesn't support video recording. Try Chrome or Edge.",
			);
			return;
		}

		const el = canvasRef.current;
		if (!el) return;

		setDownloading(true);

		try {
			// captureStream is not in standard TS lib but exists in Chrome/Edge
			const captureStream = (
				el as HTMLDivElement & {
					captureStream?: (fps: number) => MediaStream;
				}
			).captureStream;
			const stream: MediaStream | null = captureStream
				? captureStream.call(el, 30)
				: null;

			if (!stream) {
				// Fallback: canvas element required — guide user
				setDownloadError(
					"Direct download requires a canvas element. Use the 'Request rendered video' option below for a proper .mp4 file.",
				);
				setDownloading(false);
				return;
			}

			const recorder = new MediaRecorder(stream, {
				mimeType: 'video/webm;codecs=vp9',
			});
			const chunks: Blob[] = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunks.push(e.data);
			};
			recorder.onstop = () => {
				const blob = new Blob(chunks, { type: 'video/webm' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `ariclear-${getDomain(scan.url)}-recap.webm`;
				a.click();
				URL.revokeObjectURL(url);
				setDownloading(false);
			};

			// Record one full loop (12s)
			setPlaying(true);
			setCurrentSlide(0);
			setProgress(0);
			recorder.start();
			setTimeout(
				() => recorder.stop(),
				SLIDE_DURATION_MS * TOTAL_SLIDES + 500,
			);
		} catch {
			setDownloadError(
				"Recording failed. Use 'Request rendered video' below for a proper .mp4 file.",
			);
			setDownloading(false);
		}
	}, [scan.url]);

	const slideVisible = playing;

	return (
		<div className='overflow-hidden rounded-3xl border border-choco-100 bg-white shadow-sm'>
			{/* Section header */}
			<div className='flex items-center justify-between px-6 py-4 border-b border-choco-100'>
				<div className='flex items-center gap-3'>
					<span className='flex h-8 w-8 items-center justify-center rounded-xl bg-choco-900 text-sm'>
						📹
					</span>
					<div>
						<p className='text-sm font-semibold text-choco-900'>
							Scan recap video
						</p>
						<p className='text-[10px] text-choco-500'>
							How AriClear sees your website · 12s
						</p>
					</div>
				</div>
				<div className='flex items-center gap-2'>
					{/* Play/pause */}
					<button
						onClick={handlePlayPause}
						className='flex items-center gap-1.5 rounded-full border border-choco-200 bg-white px-3 py-1.5 text-xs font-medium text-choco-700 transition hover:border-choco-400'>
						{playing ? '⏸ Pause' : '▶ Play'}
					</button>
					{/* Download */}
					<button
						onClick={handleDownload}
						disabled={downloading}
						className='flex items-center gap-1.5 rounded-full bg-choco-900 px-3 py-1.5 text-xs font-semibold text-cream-50 transition hover:bg-choco-800 disabled:opacity-50'>
						{downloading ? (
							<>
								<span className='h-3 w-3 animate-spin rounded-full border border-cream-400 border-t-cream-50' />
								Recording…
							</>
						) : (
							'⬇ Download'
						)}
					</button>
				</div>
			</div>

			{/* Video canvas */}
			<div className='px-6 py-4'>
				<div
					ref={canvasRef}
					className='relative mx-auto overflow-hidden rounded-2xl'
					style={{
						width: '100%',
						maxWidth: 360,
						aspectRatio: '9/16',
						background:
							'linear-gradient(145deg, #1c1008 0%, #3c2a18 50%, #1c1008 100%)',
					}}>
					{/* Grain texture overlay */}
					<div
						className='pointer-events-none absolute inset-0 opacity-[0.04]'
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
							backgroundRepeat: 'repeat',
							backgroundSize: '128px',
						}}
					/>

					{/* Progress bars */}
					<ProgressBar
						currentSlide={currentSlide}
						progress={progress}
					/>

					{/* Slide label */}
					<div className='absolute left-4 top-7 flex items-center gap-2'>
						<div className='h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse' />
						<span className='text-[9px] font-bold uppercase tracking-[0.2em] text-white/50'>
							{
								[
									'Scores',
									'First impression',
									'Problem / Fix',
									'New headline',
								][currentSlide]
							}
						</span>
					</div>

					{/* Slides */}
					<div className='absolute inset-0 pt-10'>
						{currentSlide === 0 && (
							<Slide0Scores scan={scan} visible={slideVisible} />
						)}
						{currentSlide === 1 && (
							<Slide1FirstImpression
								scan={scan}
								visible={slideVisible}
							/>
						)}
						{currentSlide === 2 && (
							<Slide2ProblemSolution
								scan={scan}
								visible={slideVisible}
							/>
						)}
						{currentSlide === 3 && (
							<Slide3Headline
								scan={scan}
								visible={slideVisible}
							/>
						)}
					</div>

					{/* Paused overlay */}
					{!playing && (
						<div
							className='absolute inset-0 flex items-center justify-center'
							style={{ background: 'rgba(0,0,0,0.5)' }}>
							<button
								onClick={handlePlayPause}
								className='flex h-14 w-14 items-center justify-center rounded-full'
								style={{
									background: 'rgba(255,255,255,0.15)',
									border: '2px solid rgba(255,255,255,0.3)',
								}}>
								<span className='text-2xl text-white ml-1'>
									▶
								</span>
							</button>
						</div>
					)}
				</div>

				{/* Slide dots */}
				<div className='mt-3 flex justify-center gap-1.5'>
					{Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
						<div
							key={i}
							className='rounded-full transition-all duration-300'
							style={{
								width: currentSlide === i ? 16 : 6,
								height: 6,
								background:
									currentSlide === i ? '#3c2a18' : '#e5d5c5',
							}}
						/>
					))}
				</div>

				{/* Download error */}
				{downloadError && (
					<div className='mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-[11px] text-amber-800 ring-1 ring-amber-200'>
						⚠ {downloadError}
					</div>
				)}

				{/* Download note */}
				{!downloadError && (
					<p className='mt-3 text-center text-[10px] text-choco-400'>
						Download saves as .webm · Use Request rendered video
						below for a proper .mp4
					</p>
				)}
			</div>
		</div>
	);
}
