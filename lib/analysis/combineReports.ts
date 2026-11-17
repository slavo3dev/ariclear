// lib/analysis/combineReports.ts
// Pure helpers for the two-model scan (lib/analysis/runScan -> combinedReport).
// The final scores are decided here, in code, not by a model: the average of
// the two independent reviews. That keeps them predictable and explainable,
// and averaging two models smooths out one model's run-to-run wobble.

import { clampScore, type AnalyzeModelReport } from '@/lib/analysis/scanRow';

export type ReviewScores = { clarity: number; ai: number };

/** A gap this large on either score is logged so it can be looked at. */
export const DISAGREE_AT = 20;

export function scoresOf(r: AnalyzeModelReport): ReviewScores {
	return { clarity: r.human.clarityScore, ai: r.ai.aiSeoScore };
}

/** Average of two reviews, rounded and clamped to 0-100. */
export function averageScores(a: ReviewScores, b: ReviewScores): ReviewScores {
	return {
		clarity: clampScore((a.clarity + b.clarity) / 2),
		ai: clampScore((a.ai + b.ai) / 2),
	};
}

/** Largest gap between the two reviews on either score. */
export function scoreGap(a: ReviewScores, b: ReviewScores): number {
	return Math.max(Math.abs(a.clarity - b.clarity), Math.abs(a.ai - b.ai));
}

/** The report with its scores replaced by `scores` (the text is unchanged). */
export function withScores(r: AnalyzeModelReport, scores: ReviewScores): AnalyzeModelReport {
	return {
		...r,
		human: { ...r.human, clarityScore: scores.clarity },
		ai: { ...r.ai, aiSeoScore: scores.ai },
	};
}
