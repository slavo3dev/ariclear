'use client';

// app/scan/[id]/RewriteTester.tsx
// "Test your rewrite": score new hero copy against the live site before publishing.

import { useState } from 'react';

type Answers = { what: boolean; who: boolean; next: boolean };

type Result = {
	before: number;
	after: number;
	delta: number;
	baselineSource: 'live' | 'saved';
	beforeAnswers: Answers;
	afterAnswers: Answers;
	whatItSays: string;
	remainingIssues: string[];
	improved: { headline: string; subheadline: string; cta: string };
};

const inputClass =
	'w-full rounded-xl border border-choco-200 bg-cream-50 px-3 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500';
const labelClass =
	'mb-1 block text-[10px] font-semibold uppercase tracking-widest text-choco-500';

function AnswerRow({ label, ok }: { label: string; ok: boolean }) {
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
				ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
			}`}>
			{ok ? '✓' : '✕'} {label}
		</span>
	);
}

export function RewriteTester({
	scanId,
	initial,
}: {
	scanId: string;
	initial: { headline: string; subheadline: string; cta: string };
}) {
	const [headline, setHeadline] = useState(initial.headline);
	const [subheadline, setSubheadline] = useState(initial.subheadline);
	const [cta, setCta] = useState(initial.cta);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const [attempts, setAttempts] = useState<number[]>([]);

	const run = async () => {
		if (!headline.trim() || loading) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/scans/${scanId}/rewrite-test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ headline, subheadline, cta }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.error ?? 'Scoring failed');
			const r = json.result as Result;
			setResult(r);
			setAttempts((a) => [...a, r.after]);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Scoring failed');
		} finally {
			setLoading(false);
		}
	};

	const useImproved = () => {
		if (!result) return;
		setHeadline(result.improved.headline);
		setSubheadline(result.improved.subheadline);
		setCta(result.improved.cta);
		setResult(null);
	};

	const deltaClass =
		!result || result.delta === 0
			? 'text-choco-600'
			: result.delta > 0
				? 'text-green-700'
				: 'text-red-700';

	return (
		<div className='rounded-3xl border border-choco-100 bg-white p-5 shadow-sm'>
			<p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-choco-500'>
				Test your rewrite
			</p>
			<p className='mt-1 text-xs text-choco-600'>
				Edit the copy, score it against what your site says today, and
				publish only when the number goes up.
			</p>

			<div className='mt-4 space-y-3'>
				<div>
					<label className={labelClass}>Headline</label>
					<input
						className={inputClass}
						value={headline}
						maxLength={200}
						onChange={(e) => setHeadline(e.target.value)}
						placeholder='What you do, for whom'
					/>
				</div>
				<div>
					<label className={labelClass}>Subheadline</label>
					<textarea
						className={inputClass}
						rows={2}
						value={subheadline}
						maxLength={400}
						onChange={(e) => setSubheadline(e.target.value)}
						placeholder='One sentence: who it is for and what they get'
					/>
				</div>
				<div>
					<label className={labelClass}>Button / call to action</label>
					<input
						className={inputClass}
						value={cta}
						maxLength={80}
						onChange={(e) => setCta(e.target.value)}
						placeholder='e.g. Start free audit'
					/>
				</div>

				<button
					type='button'
					onClick={run}
					disabled={loading || !headline.trim()}
					className='w-full rounded-xl bg-choco-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-choco-800 disabled:cursor-not-allowed disabled:opacity-50'>
					{loading ? 'Scoring…' : 'Score my rewrite'}
				</button>

				{error && (
					<p className='rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700'>
						{error}
					</p>
				)}
			</div>

			{result && (
				<div className='mt-5 space-y-4 border-t border-choco-100 pt-5'>
					<div className='flex items-center justify-center gap-6'>
						<div className='text-center'>
							<p className='text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								Today
							</p>
							<p className='text-3xl font-bold text-choco-700'>
								{result.before}
							</p>
						</div>
						<span className='text-xl text-choco-300'>→</span>
						<div className='text-center'>
							<p className='text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								Your rewrite
							</p>
							<p className='text-3xl font-bold text-choco-900'>
								{result.after}
							</p>
						</div>
						<p className={`text-lg font-bold ${deltaClass}`}>
							{result.delta > 0 ? '+' : ''}
							{result.delta}
						</p>
					</div>

					<div className='grid gap-2 sm:grid-cols-2'>
						<div className='rounded-2xl bg-cream-50 p-3 ring-1 ring-choco-100'>
							<p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								Today a stranger gets
							</p>
							<div className='flex flex-wrap gap-1.5'>
								<AnswerRow label='What' ok={result.beforeAnswers.what} />
								<AnswerRow label='Who' ok={result.beforeAnswers.who} />
								<AnswerRow
									label='Next step'
									ok={result.beforeAnswers.next}
								/>
							</div>
						</div>
						<div className='rounded-2xl bg-cream-50 p-3 ring-1 ring-choco-100'>
							<p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								With your rewrite
							</p>
							<div className='flex flex-wrap gap-1.5'>
								<AnswerRow label='What' ok={result.afterAnswers.what} />
								<AnswerRow label='Who' ok={result.afterAnswers.who} />
								<AnswerRow
									label='Next step'
									ok={result.afterAnswers.next}
								/>
							</div>
						</div>
					</div>

					<div className='rounded-2xl bg-cream-50 p-3 ring-1 ring-choco-100'>
						<p className='text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
							A stranger would think this is
						</p>
						<p className='mt-1 text-sm text-choco-900'>
							{result.whatItSays}
						</p>
					</div>

					{result.remainingIssues.length > 0 && (
						<div>
							<p className='mb-2 text-[10px] font-semibold uppercase tracking-widest text-choco-500'>
								Still weak
							</p>
							<ul className='space-y-1.5'>
								{result.remainingIssues.map((issue, i) => (
									<li
										key={i}
										className='flex items-start gap-2 text-sm text-choco-700'>
										<span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400' />
										{issue}
									</li>
								))}
							</ul>
						</div>
					)}

					<div className='rounded-2xl bg-choco-900 p-4'>
						<p className='text-[10px] font-semibold uppercase tracking-widest text-cream-400'>
							Tighter version
						</p>
						<p className='mt-1 text-base font-bold text-cream-50'>
							{result.improved.headline}
						</p>
						<p className='mt-1 text-sm text-cream-100'>
							{result.improved.subheadline}
						</p>
						<p className='mt-2 text-xs font-semibold text-amber-300'>
							CTA: {result.improved.cta}
						</p>
						<button
							type='button'
							onClick={useImproved}
							className='mt-3 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-semibold text-choco-900 transition hover:bg-amber-300'>
							Use this and test again
						</button>
					</div>

					{attempts.length > 1 && (
						<p className='text-xs text-choco-500'>
							Your attempts: {attempts.join(' → ')}
						</p>
					)}

					<p className='text-[11px] text-choco-400'>
						{result.baselineSource === 'live'
							? 'Both versions were scored together on first-screen copy only, so the comparison is fair. This is not your full scan score.'
							: 'Your live page could not be read, so "Today" uses your saved clarity score. Compare with care.'}
					</p>
				</div>
			)}
		</div>
	);
}
