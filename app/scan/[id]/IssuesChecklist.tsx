'use client';

// app/scan/[id]/IssuesChecklist.tsx
// The scan's issues, each with why it hurts and the fix, and a checkbox that
// is saved to the scan (PATCH /api/scans/[id]) so progress survives reloads.

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

export type ScanIssue = {
	id: string;
	issue: string;
	whyItHurts?: string;
	fix?: string;
};

export type ChecklistEntry = { id: string; label: string; checked: boolean };

export function IssuesChecklist({
	scanId,
	issues,
	checklist,
}: {
	scanId: string;
	issues: ScanIssue[];
	checklist: ChecklistEntry[];
}) {
	const [checked, setChecked] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(checklist.map((c) => [c.id, c.checked])),
	);
	const [open, setOpen] = useState<string | null>(issues[0]?.id ?? null);
	const saving = useRef(0);

	if (issues.length === 0) return null;

	const done = issues.filter((i) => checked[i.id]).length;
	const pct = Math.round((done / issues.length) * 100);

	const toggle = async (id: string) => {
		const next = !checked[id];
		setChecked((c) => ({ ...c, [id]: next }));
		const ticket = ++saving.current;
		try {
			const res = await fetch(`/api/scans/${scanId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ checklist: [{ id, checked: next }] }),
			});
			if (!res.ok) throw new Error();
		} catch {
			// Roll back only if no newer toggle has happened since.
			if (ticket === saving.current) {
				setChecked((c) => ({ ...c, [id]: !next }));
			}
			toast.error('Could not save. Please try again.');
		}
	};

	return (
		<div className='rounded-3xl border border-choco-100 bg-white p-5 shadow-sm'>
			<div className='flex items-center justify-between gap-3'>
				<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>
					Issues to fix
				</p>
				<p className='text-xs font-medium text-choco-600'>
					{done} of {issues.length} done
				</p>
			</div>
			<div className='mt-2 h-1.5 w-full rounded-full bg-choco-100'>
				<div
					className='h-1.5 rounded-full bg-green-600 transition-all'
					style={{ width: `${pct}%` }}
				/>
			</div>

			<ul className='mt-4 space-y-2'>
				{issues.map((issue) => {
					const isDone = !!checked[issue.id];
					const isOpen = open === issue.id;
					return (
						<li
							key={issue.id}
							className='rounded-2xl bg-cream-50 ring-1 ring-choco-100'>
							<div className='flex items-start gap-3 p-3'>
								<input
									type='checkbox'
									checked={isDone}
									onChange={() => toggle(issue.id)}
									aria-label={`Mark "${issue.issue}" as fixed`}
									className='mt-0.5 h-4 w-4 shrink-0 accent-choco-900'
								/>
								<button
									type='button'
									onClick={() => setOpen(isOpen ? null : issue.id)}
									aria-expanded={isOpen}
									className={`flex-1 text-left text-sm font-semibold ${
										isDone ? 'text-choco-400 line-through' : 'text-choco-900'
									}`}>
									{issue.issue}
								</button>
								<span aria-hidden className='text-xs text-choco-400'>
									{isOpen ? '▲' : '▼'}
								</span>
							</div>
							{isOpen && (issue.whyItHurts || issue.fix) && (
								<div className='space-y-2 border-t border-choco-100 px-3 pb-3 pt-2 pl-10'>
									{issue.whyItHurts && (
										<p className='text-xs text-choco-700'>
											<span className='font-semibold text-choco-900'>
												Why it hurts:{' '}
											</span>
											{issue.whyItHurts}
										</p>
									)}
									{issue.fix && (
										<p className='text-xs text-choco-700'>
											<span className='font-semibold text-green-800'>Fix: </span>
											{issue.fix}
										</p>
									)}
								</div>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
