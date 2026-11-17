// lib/analysis/runScan.ts
// SERVER ONLY. The full-scan pipeline, shared by /api/analyze (a user's scan)
// and /api/cron/rescan (scheduled re-scans):
//   fetch page (SSRF-safe) -> extract -> report -> sanitize, plus the
//   deterministic technical score in parallel.
// The report is the two-model report (combinedReport: GPT and Claude review
// independently, scores averaged, Claude merges the text), or GPT alone when
// SCAN_MODE=single or no Anthropic key is set. The homepage demo does not use
// this file and stays on GPT alone.
// Saving is the caller's job (recordScan), because the caller owns the
// plan limits.

import OpenAI from 'openai';
import { extractPageContent, unscorableReason } from '@/lib/analysis/extractPage';
import { fence } from '@/lib/analysis/untrusted';
import { INSTRUCTIONS } from '@/lib/analysis/reportPrompt';
import {
	claudeConfigured,
	claudeErrorCode,
	claudeReview,
	mergeReviews,
} from '@/lib/analysis/claudeScan';
import {
	averageScores,
	DISAGREE_AT,
	scoreGap,
	scoresOf,
	withScores,
	type ReviewScores,
} from '@/lib/analysis/combineReports';
import {
	isAnalyzeReport,
	sanitizeReport,
	scanRowFromReport,
	type AnalyzeModelReport,
} from '@/lib/analysis/scanRow';
import { runTechnicalChecks } from '@/lib/analysis/technicalChecks';
import { describeFetchFailure, describeUnscorablePage } from '@/lib/analysis/fetchFailure';
import { safeFetch, UnsafeUrlError } from '@/lib/security/safeFetch';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('run-scan');

let openai: OpenAI | null = null;
function client(): OpenAI {
	openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	return openai;
}

/** A failure with a message that is safe to show the user. */
export class ScanError extends Error {
	readonly kind: 'url' | 'fetch' | 'model' | 'rate_limited';
	readonly status: number;
	constructor(message: string, kind: ScanError['kind'], status: number) {
		super(message);
		this.name = 'ScanError';
		this.kind = kind;
		this.status = status;
	}
}

export type ScanOutput = {
	report: AnalyzeModelReport;
	/** 0-100, or null if the technical checks could not run. */
	technicalScore: number | null;
	/** Row for record_scan(): report columns plus technical_score. */
	row: Record<string, unknown>;
};



/**
 * Score already-fetched HTML with the model. Exported for the eval
 * (scripts/eval/run.ts), which scores the same HTML several times.
 */
export async function modelReport(url: string, html: string): Promise<AnalyzeModelReport> {
	const extracted = extractPageContent(html);
	let completion;
	try {
		completion = await client().chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: INSTRUCTIONS },
				{
					role: 'user',
					content: `URL: ${url}\n\n${fence('page', JSON.stringify(extracted, null, 2))}`,
				},
			],
			response_format: { type: 'json_object' },
			temperature: 0.15,
		});
	} catch (err) {
		const e = err as { status?: number; code?: string };
		if (e?.status === 429 || e?.code === 'rate_limit_exceeded') {
			throw new ScanError('Rate limit reached. Please wait a moment and try again.', 'rate_limited', 429);
		}
		log.error('model call failed', { code: errorCode(err) });
		throw new ScanError('Server error while analyzing the URL.', 'model', 500);
	}

	const outputText = completion.choices[0]?.message?.content?.trim();
	if (!outputText) throw new ScanError('Empty AI response.', 'model', 500);

	let parsed: unknown;
	try {
		parsed = JSON.parse(outputText);
	} catch {
		log.error('model returned invalid JSON');
		throw new ScanError('AI returned invalid JSON.', 'model', 500);
	}
	if (!isAnalyzeReport(parsed)) {
		log.error('model returned an unexpected shape');
		throw new ScanError('AI returned unexpected response shape.', 'model', 500);
	}
	return sanitizeReport(parsed);
}

async function technicalScore(url: string): Promise<number | null> {
	try {
		return (await runTechnicalChecks(url)).score;
	} catch (err) {
		log.warn('technical checks failed', { code: errorCode(err) });
		return null;
	}
}

/**
 * Fetch a page the way a scan does (SSRF-safe, same User-Agent).
 * Throws ScanError with a user-safe message, also when the page loaded but
 * cannot be scored (a bot-check page, or no readable text), so such a page
 * is never scored, saved or counted against the plan.
 */
export async function fetchPage(url: string): Promise<string> {
	try {
		const res = await safeFetch(url, {
			headers: {
				'User-Agent': 'AriClearBot/0.1 (+https://ariclear.com)',
				Accept: 'text/html',
			},
		});
		if (!res.ok) {
			throw new ScanError(describeFetchFailure(res.status).message, 'fetch', 400);
		}
		const reason = unscorableReason(res.body, extractPageContent(res.body));
		if (reason) {
			throw new ScanError(describeUnscorablePage(reason).message, 'fetch', 422);
		}
		return res.body;
	} catch (e) {
		if (e instanceof ScanError) throw e;
		if (e instanceof UnsafeUrlError) throw new ScanError(e.message, 'url', 400);
		throw new ScanError('Could not reach that URL.', 'fetch', 400);
	}
}

export type CombinedResult = {
	/** The report the user sees. */
	report: AnalyzeModelReport;
	/** Each reviewer's own scores (missing if that reviewer failed). */
	reviews: { gpt?: ReviewScores; claude?: ReviewScores };
	/** True when Claude merged both reviews into the final text. */
	merged: boolean;
};

/**
 * The two-model report. Exported for the eval.
 *   1. GPT and Claude review the same page independently, in parallel.
 *   2. Final scores = the average of the two (decided in code).
 *   3. Claude writes the final text from both reviews and the page.
 * Fallbacks, so a scan never fails because of one model:
 *   one review fails  -> the other review alone;
 *   the merge fails   -> Claude's review text with the averaged scores.
 * Only if both reviews fail does the scan fail (with GPT's error).
 */
export async function combinedReport(url: string, html: string): Promise<CombinedResult> {
	const page = extractPageContent(html);
	const [gpt, claude] = await Promise.allSettled([modelReport(url, html), claudeReview(url, page)]);

	if (gpt.status === 'fulfilled' && claude.status === 'rejected') {
		log.warn('claude review failed, using gpt only', { code: claudeErrorCode(claude.reason) });
		return { report: gpt.value, reviews: { gpt: scoresOf(gpt.value) }, merged: false };
	}
	if (gpt.status === 'rejected' && claude.status === 'fulfilled') {
		log.warn('gpt review failed, using claude only', { code: errorCode(gpt.reason) });
		return { report: claude.value, reviews: { claude: scoresOf(claude.value) }, merged: false };
	}
	if (gpt.status === 'rejected' || claude.status === 'rejected') {
		const claudeCode = claude.status === 'rejected' ? claudeErrorCode(claude.reason) : undefined;
		log.warn('both reviews failed', { claude: claudeCode });
		throw gpt.status === 'rejected' ? gpt.reason : new ScanError('Server error while analyzing the URL.', 'model', 500);
	}

	const a = gpt.value;
	const b = claude.value;
	const reviews = { gpt: scoresOf(a), claude: scoresOf(b) };
	const final = averageScores(reviews.gpt, reviews.claude);
	const gap = scoreGap(reviews.gpt, reviews.claude);
	// Scores only: nothing that identifies the user or the site.
	if (gap >= DISAGREE_AT) {
		log.warn('reviewers disagree', {
			gap,
			gptClarity: reviews.gpt.clarity,
			gptAi: reviews.gpt.ai,
			claudeClarity: reviews.claude.clarity,
			claudeAi: reviews.claude.ai,
		});
	}

	let text = b;
	let merged = false;
	try {
		text = await mergeReviews(url, page, a, b, final);
		merged = true;
	} catch (err) {
		log.warn('merge failed, using claude review text', { code: claudeErrorCode(err) });
	}
	return { report: withScores(text, final), reviews, merged };
}

/**
 * Which pipeline a scan uses. SCAN_MODE=single turns the two-model scan off
 * (GPT only) without a deploy; so does a missing ANTHROPIC_API_KEY.
 */
function twoModelScanEnabled(): boolean {
	return process.env.SCAN_MODE !== 'single' && claudeConfigured();
}

/** Run a full scan of `url`. Throws ScanError with a user-safe message. */
export async function runScan(url: string): Promise<ScanOutput> {
	const html = await fetchPage(url);
	const reportFor = async () =>
		twoModelScanEnabled() ? (await combinedReport(url, html)).report : modelReport(url, html);
	const [report, tech] = await Promise.all([reportFor(), technicalScore(url)]);
	return {
		report,
		technicalScore: tech,
		row: { ...scanRowFromReport(report), technical_score: tech },
	};
}
