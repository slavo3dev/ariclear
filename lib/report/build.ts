// lib/report/build.ts
// Turns either a fresh /api/analyze result or a saved `scans` row into the
// ScanReport shape used by the results screen and the PDF.

import type { Issue, ScanReport, Suggestion } from './types';

export type ActionStep = {
	title: string;
	impact: 'high' | 'medium' | 'low';
	effort: 'low' | 'medium' | 'high';
	details: string;
};

/** The parts of an /api/analyze response the report needs. */
export type AnalyzeReport = {
	human?: {
		clarityScore?: number;
		whatItSeemsLike?: string;
		oneSentenceValueProp?: string;
		bestGuessAudience?: string;
		confusions?: string[];
		topIssues?: { issue: string; whyItHurts: string; fix: string }[];
	};
	ai?: {
		aiSeoScore?: number;
		aiSummary?: string;
		indexerRead?: string;
		missingKeywords?: string[];
		structuredDataSuggestions?: string[];
	};
	copy?: {
		suggestedHeadline?: string;
		suggestedSubheadline?: string;
		suggestedCTA?: string;
	};
	plan?: { nextSteps?: ActionStep[] };
	prompts?: { aiSeoPrompt?: string };
};

/** The columns of a saved scan the report needs. */
export type SavedScanRow = {
	url: string;
	domain: string;
	created_at: string;
	human_score: number;
	ai_score: number;
	human_clarity_description: string | null;
	human_value_prop: string | null;
	human_audience: string | null;
	human_confusions: string[] | null;
	ai_comprehension: string | null;
	ai_indexer_read: string | null;
	ai_missing_keywords: string[] | null;
	suggested_headline: string | null;
	suggested_subheadline: string | null;
	suggested_cta: string | null;
	action_plan: ActionStep[] | null;
	ai_prompt: string | null;
	issues: { issue: string; whyItHurts: string; fix: string }[] | null;
	suggestions: string[] | null;
};

function categorizeIssue(text: string): Issue['category'] {
	const t = text.toLowerCase();
	const has = (...words: string[]) => words.some((w) => t.includes(w));
	if (
		has(
			'speed',
			'load',
			'performance',
			'slow',
			'fast',
			'image',
			'optimize',
			'cache',
			'seo',
			'keyword',
		)
	)
		return 'performance';
	if (
		has(
			'privacy',
			'gdpr',
			'cookie',
			'tracking',
			'data',
			'consent',
			'analytics',
		)
	)
		return 'privacy';
	if (has('security', 'ssl', 'https', 'encrypt', 'password', 'auth'))
		return 'security';
	return 'accessibility';
}

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

export function reportFromAnalyze(
	apiResult: AnalyzeReport,
	url: string,
	scannedAt: string = new Date().toISOString(),
): ScanReport {
	const humanScore = apiResult.human?.clarityScore ?? 0;
	const aiScore = apiResult.ai?.aiSeoScore ?? 0;

	const issues: Issue[] = (apiResult.human?.topIssues ?? []).map(
		(issue, idx) => ({
			id: `issue-${idx}`,
			category: categorizeIssue(`${issue.issue} ${issue.whyItHurts}`),
			severity: SEVERITIES[Math.min(idx, 3)],
			title: issue.issue,
			description: issue.whyItHurts,
			impact: issue.fix,
			fixed: false,
		}),
	);

	const suggestions: Suggestion[] = (apiResult.plan?.nextSteps ?? []).map(
		(step, idx) => ({
			id: `suggestion-${idx}`,
			title: step.title,
			description: step.details,
			priority: step.impact,
			estimatedTime:
				step.effort === 'low'
					? '1-2 hours'
					: step.effort === 'medium'
						? '2-4 hours'
						: '4-8 hours',
			resources: [],
		}),
	);

	(apiResult.ai?.structuredDataSuggestions ?? []).forEach(
		(suggestion, idx) => {
			suggestions.push({
				id: `ai-suggestion-${idx}`,
				title:
					suggestion.length > 50
						? suggestion.substring(0, 50) + '...'
						: suggestion,
				description: suggestion,
				priority: 'medium',
				estimatedTime: '2-3 hours',
				resources: [],
			});
		},
	);

	let domain = '';
	try {
		domain = new URL(url).hostname;
	} catch {
		domain = url;
	}

	return {
		score: Math.round((humanScore + aiScore) / 2),
		metadata: { scannedAt, url, domain },
		issues,
		suggestions,
		rawData: {
			humanClarity: {
				score: humanScore,
				whatItSeemsLike: apiResult.human?.whatItSeemsLike,
				oneSentenceValueProp: apiResult.human?.oneSentenceValueProp,
				bestGuessAudience: apiResult.human?.bestGuessAudience,
				confusions: apiResult.human?.confusions,
			},
			aiComprehension: {
				score: aiScore,
				aiSummary: apiResult.ai?.aiSummary,
				indexerRead: apiResult.ai?.indexerRead,
				missingKeywords: apiResult.ai?.missingKeywords,
			},
			suggestedCopy: {
				headline: apiResult.copy?.suggestedHeadline,
				subheadline: apiResult.copy?.suggestedSubheadline,
				cta: apiResult.copy?.suggestedCTA,
			},
			actionPlan: apiResult.plan?.nextSteps,
			prompt: apiResult.prompts?.aiSeoPrompt,
		},
	};
}

export function reportFromScan(scan: SavedScanRow): ScanReport {
	return reportFromAnalyze(
		{
			human: {
				clarityScore: scan.human_score,
				whatItSeemsLike: scan.human_clarity_description ?? undefined,
				oneSentenceValueProp: scan.human_value_prop ?? undefined,
				bestGuessAudience: scan.human_audience ?? undefined,
				confusions: scan.human_confusions ?? [],
				topIssues: (scan.issues ?? []).map((i) => ({
					issue: i.issue,
					whyItHurts: i.whyItHurts,
					fix: i.fix,
				})),
			},
			ai: {
				aiSeoScore: scan.ai_score,
				aiSummary: scan.ai_comprehension ?? undefined,
				indexerRead: scan.ai_indexer_read ?? undefined,
				missingKeywords: scan.ai_missing_keywords ?? [],
				structuredDataSuggestions: scan.suggestions ?? [],
			},
			copy: {
				suggestedHeadline: scan.suggested_headline ?? undefined,
				suggestedSubheadline: scan.suggested_subheadline ?? undefined,
				suggestedCTA: scan.suggested_cta ?? undefined,
			},
			plan: { nextSteps: scan.action_plan ?? [] },
			prompts: { aiSeoPrompt: scan.ai_prompt ?? undefined },
		},
		scan.url,
		scan.created_at,
	);
}
