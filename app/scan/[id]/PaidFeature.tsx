'use client';

// app/scan/[id]/PaidFeature.tsx
// Locked card for paid features, and the PDF button for saved scans.
// These are UX only: every paid action is also refused by its API route.

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import type { ChecklistItem, ScanReport } from '@/lib/report/types';

export function LockedFeature({
	title,
	description,
	isExpired,
}: {
	title: string;
	description: string;
	isExpired: boolean;
}) {
	return (
		<div className='rounded-3xl border border-dashed border-choco-200 bg-white/70 p-5'>
			<div className='flex items-start gap-3'>
				<span className='text-xl'>🔒</span>
				<div className='flex-1'>
					<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>
						{title}
					</p>
					<p className='mt-1 text-xs text-choco-600'>{description}</p>
					<Link
						href='/pricing'
						className='mt-3 inline-block rounded-full bg-choco-900 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-choco-800'>
						{isExpired ? 'Renew your plan' : 'Unlock with Gladiator or Centurion'}
					</Link>
				</div>
			</div>
		</div>
	);
}

export function PdfDownloadButton({
	scanId,
	allowed,
}: {
	scanId: string;
	allowed: boolean;
}) {
	const [loading, setLoading] = useState(false);

	const download = async () => {
		if (loading) return;
		if (!allowed) {
			toast('The PDF report is part of Gladiator and Centurion.', {
				icon: '🔒',
			});
			return;
		}
		setLoading(true);
		const toastId = toast.loading('Generating PDF report...');
		try {
			const res = await fetch(`/api/scans/${scanId}/report`);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.message ?? json.error ?? 'Failed');
			const { downloadScanPdf } = await import('@/lib/report/pdf');
			await downloadScanPdf(
				json.report as ScanReport,
				json.checklist as ChecklistItem[],
			);
			toast.success('PDF report downloaded!', { id: toastId });
		} catch (e) {
			toast.error(
				e instanceof Error && e.message !== 'Failed'
					? e.message
					: 'Failed to generate PDF',
				{ id: toastId },
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			type='button'
			onClick={download}
			disabled={loading}
			className='inline-flex items-center gap-1.5 rounded-full border border-choco-200 bg-white px-3 py-1.5 text-xs font-medium text-choco-800 transition hover:bg-choco-50 disabled:opacity-50'>
			<span>{allowed ? '📄' : '🔒'}</span>
			{loading ? 'Preparing…' : 'Download PDF'}
		</button>
	);
}
