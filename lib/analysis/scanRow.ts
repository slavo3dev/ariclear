// lib/analysis/scanRow.ts
// SERVER ONLY. Turns the validated model report from /api/analyze into the
// row stored in `scans`. Scores are clamped and every field is size-capped,
// so a misbehaving model can't write huge or out-of-range values.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnalyzeModelReport = {
	human: {
		clarityScore: number;
		whatItSeemsLike: string;
		oneSentenceValueProp: string;
		bestGuessAudience: string;
		confusions: unknown[];
		topIssues: unknown[];
	};
	ai: {
		aiSeoScore: number;
		aiSummary: string;
		indexerRead: string;
		missingKeywords: unknown[];
		structuredDataSuggestions: unknown[];
	};
	copy: {
		suggestedHeadline: string;
		suggestedSubheadline: string;
		suggestedCTA: string;
	};
	plan: { nextSteps: unknown[] };
	prompts: { aiSeoPrompt: string };
};

export function isAnalyzeReport(obj: any): obj is AnalyzeModelReport {
	return (
		obj &&
		typeof obj === 'object' &&
		obj.human &&
		typeof obj.human.clarityScore === 'number' &&
		typeof obj.human.whatItSeemsLike === 'string' &&
		typeof obj.human.oneSentenceValueProp === 'string' &&
		typeof obj.human.bestGuessAudience === 'string' &&
		Array.isArray(obj.human.confusions) &&
		Array.isArray(obj.human.topIssues) &&
		obj.ai &&
		typeof obj.ai.aiSeoScore === 'number' &&
		typeof obj.ai.aiSummary === 'string' &&
		typeof obj.ai.indexerRead === 'string' &&
		Array.isArray(obj.ai.missingKeywords) &&
		Array.isArray(obj.ai.structuredDataSuggestions) &&
		obj.copy &&
		typeof obj.copy.suggestedHeadline === 'string' &&
		typeof obj.copy.suggestedSubheadline === 'string' &&
		typeof obj.copy.suggestedCTA === 'string' &&
		obj.plan &&
		Array.isArray(obj.plan.nextSteps) &&
		obj.prompts &&
		typeof obj.prompts.aiSeoPrompt === 'string'
	);
}

export const clampScore = (n: unknown): number =>
	Math.min(100, Math.max(0, Math.round(typeof n === 'number' && Number.isFinite(n) ? n : 0)));

const str = (v: unknown, max: number): string =>
	typeof v === 'string' ? v.slice(0, max) : '';

const strList = (v: unknown, maxItems: number, maxLen: number): string[] =>
	Array.isArray(v)
		? v.filter((x): x is string => typeof x === 'string').slice(0, maxItems).map((s) => s.slice(0, maxLen))
		: [];

const LEVELS = ['high', 'medium', 'low'] as const;
const level = (v: unknown, fallback: (typeof LEVELS)[number]) =>
	LEVELS.includes(v as any) ? (v as (typeof LEVELS)[number]) : fallback;

/** A cleaned copy of the report: same shape, clamped and size-capped. */
export function sanitizeReport(r: AnalyzeModelReport): AnalyzeModelReport {
	const issues = (r.human.topIssues as any[])
		.filter((i) => i && typeof i === 'object')
		.slice(0, 8)
		.map((i) => ({
			issue: str(i.issue, 300),
			whyItHurts: str(i.whyItHurts, 1000),
			fix: str(i.fix, 1500),
		}))
		.filter((i) => i.issue);

	const steps = (r.plan.nextSteps as any[])
		.filter((s) => s && typeof s === 'object')
		.slice(0, 10)
		.map((s) => ({
			title: str(s.title, 200),
			impact: level(s.impact, 'medium'),
			effort: level(s.effort, 'medium'),
			details: str(s.details, 1500),
		}))
		.filter((s) => s.title);

	return {
		human: {
			clarityScore: clampScore(r.human.clarityScore),
			whatItSeemsLike: str(r.human.whatItSeemsLike, 1000),
			oneSentenceValueProp: str(r.human.oneSentenceValueProp, 500),
			bestGuessAudience: str(r.human.bestGuessAudience, 500),
			confusions: strList(r.human.confusions, 8, 500),
			topIssues: issues,
		},
		ai: {
			aiSeoScore: clampScore(r.ai.aiSeoScore),
			aiSummary: str(r.ai.aiSummary, 1500),
			indexerRead: str(r.ai.indexerRead, 1500),
			missingKeywords: strList(r.ai.missingKeywords, 15, 100),
			structuredDataSuggestions: strList(r.ai.structuredDataSuggestions, 8, 500),
		},
		copy: {
			suggestedHeadline: str(r.copy.suggestedHeadline, 300),
			suggestedSubheadline: str(r.copy.suggestedSubheadline, 500),
			suggestedCTA: str(r.copy.suggestedCTA, 100),
		},
		plan: { nextSteps: steps },
		prompts: { aiSeoPrompt: str(r.prompts.aiSeoPrompt, 8000) },
	};
}

/** The `scans` columns for a sanitized report (user_id/domain/url added in SQL). */
export function scanRowFromReport(r: AnalyzeModelReport): Record<string, unknown> {
	const humanScore = r.human.clarityScore;
	const aiScore = r.ai.aiSeoScore;
	const issues = r.human.topIssues as Array<{ issue: string; whyItHurts: string; fix: string }>;

	return {
		overall_score: Math.round((humanScore + aiScore) / 2),
		human_score: humanScore,
		ai_score: aiScore,
		human_clarity_description: r.human.whatItSeemsLike || null,
		human_value_prop: r.human.oneSentenceValueProp || null,
		human_audience: r.human.bestGuessAudience || null,
		human_confusions: r.human.confusions,
		ai_comprehension: r.ai.aiSummary || null,
		ai_indexer_read: r.ai.indexerRead || null,
		ai_missing_keywords: r.ai.missingKeywords,
		suggested_headline: r.copy.suggestedHeadline || null,
		suggested_subheadline: r.copy.suggestedSubheadline || null,
		suggested_cta: r.copy.suggestedCTA || null,
		action_plan: r.plan.nextSteps,
		ai_prompt: r.prompts.aiSeoPrompt || null,
		issues: issues.map((issue, idx) => ({
			id: `issue-${idx}`,
			issue: issue.issue,
			whyItHurts: issue.whyItHurts,
			fix: issue.fix,
		})),
		checklist: issues.map((issue, idx) => ({
			id: `issue-${idx}`,
			label: issue.issue,
			checked: false,
		})),
		suggestions: r.ai.structuredDataSuggestions,
	};
}
