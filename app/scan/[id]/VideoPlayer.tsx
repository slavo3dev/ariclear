'use client';

// app/scan/[id]/VideoPlayer.tsx
// Shows the rendered Cloudinary MP4 when ready.
// Polls /api/video/status/[jobId] every 5s while status is pending/rendering.
// Falls back to the CSS animation preview while waiting.

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoJobStatus = {
	id: string;
	status: 'pending' | 'rendering' | 'done' | 'failed';
	cloudinary_url: string | null;
	error_message: string | null;
};

type Props = {
	initialJob: VideoJobStatus | null;
	scanId: string;
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VideoJobStatus['status'] }) {
	const map = {
		pending: {
			label: 'Queued',
			classes: 'bg-amber-50 text-amber-700 ring-amber-200',
		},
		rendering: {
			label: 'Rendering',
			classes: 'bg-blue-50 text-blue-700 ring-blue-200',
		},
		done: {
			label: 'Ready',
			classes: 'bg-green-50 text-green-700 ring-green-200',
		},
		failed: {
			label: 'Failed',
			classes: 'bg-red-50 text-red-700 ring-red-200',
		},
	};
	const { label, classes } = map[status];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ring-1 ${classes}`}>
			{status === 'rendering' && (
				<span className='h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500' />
			)}
			{label}
		</span>
	);
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function VideoSkeleton({ status }: { status: 'pending' | 'rendering' }) {
	const messages = {
		pending: 'Video is queued — generating script and images…',
		rendering: 'Rendering your video — this takes 2–3 minutes…',
	};

	return (
		<div
			className='relative mx-auto overflow-hidden rounded-2xl'
			style={{
				maxWidth: 280,
				aspectRatio: '9/16',
				background:
					'linear-gradient(145deg, #1c1008 0%, #3c2a18 50%, #1c1008 100%)',
			}}>
			{/* Shimmer overlay */}
			<div
				className='absolute inset-0 animate-pulse'
				style={{ background: 'rgba(255,255,255,0.03)' }}
			/>

			{/* Centered content */}
			<div className='absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center'>
				<div className='h-10 w-10 animate-spin rounded-full border-2 border-choco-700 border-t-cream-200' />
				<p className='text-xs font-medium text-cream-200/60 leading-relaxed'>
					{messages[status]}
				</p>
				<div className='flex gap-1.5'>
					{[0, 1, 2, 3].map((i) => (
						<div
							key={i}
							className='h-1 flex-1 rounded-full'
							style={{
								width: 40,
								background: 'rgba(255,255,255,0.15)',
								animation: `pulse ${1 + i * 0.2}s ease-in-out infinite`,
							}}
						/>
					))}
				</div>
				<span className='text-[9px] font-bold uppercase tracking-[0.2em] text-white/20'>
					AriClear
				</span>
			</div>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoPlayer({ initialJob, scanId }: Props) {
	const [job, setJob] = useState<VideoJobStatus | null>(initialJob);
	const [polling, setPolling] = useState(
		initialJob?.status === 'pending' || initialJob?.status === 'rendering',
	);

	// Poll for status updates
	const jobId = job?.id;
	const pollStatus = useCallback(async () => {
		if (!jobId) return;
		try {
			const res = await fetch(`/api/video/status/${jobId}`);
			const data = (await res.json()) as { job: VideoJobStatus };
			if (data.job) {
				setJob(data.job);
				if (
					data.job.status === 'done' ||
					data.job.status === 'failed'
				) {
					setPolling(false);
				}
			}
		} catch {
			// Non-critical — keep polling
		}
	}, [jobId]);

	useEffect(() => {
		if (!polling) return;
		const interval = setInterval(pollStatus, 5000); // poll every 5s
		return () => clearInterval(interval);
	}, [polling, pollStatus]);

	// No job at all
	if (!job) {
		return (
			<div className='rounded-3xl border border-choco-100 bg-white p-6 text-center shadow-sm'>
				<span className='text-2xl'>🎬</span>
				<p className='mt-2 text-sm font-semibold text-choco-900'>
					No video job found
				</p>
				<p className='mt-1 text-xs text-choco-500'>
					Run a new scan to auto-generate your recap video.
				</p>
			</div>
		);
	}

	return (
		<div className='overflow-hidden rounded-3xl border border-choco-100 bg-white shadow-sm'>
			{/* Header */}
			<div className='flex items-center justify-between border-b border-choco-100 px-6 py-4'>
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
				<StatusBadge status={job.status} />
			</div>

			{/* Video area */}
			<div className='px-6 py-5'>
				{job.status === 'done' && job.cloudinary_url ? (
					<div className='flex flex-col items-center gap-4'>
						{/* Video player */}
						<div
							className='relative mx-auto overflow-hidden rounded-2xl shadow-lg'
							style={{ maxWidth: 280, width: '100%' }}>
							<video
								src={job.cloudinary_url}
								controls
								autoPlay
								loop
								playsInline
								className='w-full rounded-2xl'
								style={{
									aspectRatio: '9/16',
									background: '#1c1008',
								}}
							/>
						</div>

						{/* Actions */}
						<div className='flex w-full max-w-xs flex-col gap-2 sm:flex-row'>
							<a
								href={job.cloudinary_url}
								download
								target='_blank'
								rel='noopener noreferrer'
								className='flex flex-1 items-center justify-center gap-2 rounded-full bg-choco-900 px-4 py-2.5 text-xs font-semibold text-cream-50 shadow transition hover:bg-choco-800'>
								⬇ Download MP4
							</a>
							<button
								onClick={() =>
									navigator.clipboard.writeText(
										job.cloudinary_url!,
									)
								}
								className='flex flex-1 items-center justify-center gap-2 rounded-full border border-choco-200 bg-white px-4 py-2.5 text-xs font-medium text-choco-900 transition hover:border-choco-400'>
								🔗 Copy link
							</button>
						</div>

						<p className='text-center text-[10px] text-choco-400'>
							Share directly to Instagram, TikTok, or LinkedIn
						</p>
					</div>
				) : job.status === 'failed' ? (
					<div className='rounded-2xl bg-red-50 px-4 py-4 text-center ring-1 ring-red-200'>
						<p className='text-sm font-semibold text-red-700'>
							Video render failed
						</p>
						{job.error_message && (
							<p className='mt-1 text-xs text-red-600'>
								{job.error_message}
							</p>
						)}
						<p className='mt-2 text-xs text-choco-500'>
							Try requesting a new video from the Video Creator
							panel below.
						</p>
					</div>
				) : (
					<div className='flex flex-col items-center gap-3'>
						<VideoSkeleton
							status={job.status as 'pending' | 'rendering'}
						/>
						<p className='text-center text-[10px] text-choco-400'>
							Checking for updates every 5 seconds…
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
