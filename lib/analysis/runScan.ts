// lib/analysis/runScan.ts
// SERVER ONLY. The full-scan pipeline, shared by /api/analyze (a user's scan)
// and /api/cron/rescan (scheduled re-scans):
//   fetch page (SSRF-safe) -> extract -> model report (fenced input)
//   -> sanitize, plus the deterministic technical score in parallel.
// Saving is the caller's job (recordScan), because the caller owns the
// plan limits.

import OpenAI from 'openai';
import { extractPageContent } from '@/lib/analysis/extractPage';
import { fence, UNTRUSTED_RULE } from '@/lib/analysis/untrusted';
import {
	isAnalyzeReport,
	sanitizeReport,
	scanRowFromReport,
	type AnalyzeModelReport,
} from '@/lib/analysis/scanRow';
import { runTechnicalChecks } from '@/lib/analysis/technicalChecks';
import { describeFetchFailure } from '@/lib/analysis/fetchFailure';
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

const INSTRUCTIONS = `
You are AriClear, an expert website clarity and AI-SEO auditor. You are STRICT and HONEST — most websites score between 20–55 on clarity and AI-readability, not 70–90. Do not be generous. Call out real problems using the actual text from the page.

Analyze the provided page content from two angles:
1) A first-time human visitor who has ~5 seconds to decide if this site is for them.
2) An AI indexer (like a search LLM or crawler) trying to classify the business and extract structured meaning.

════════════════════════════════════════
SCORING RULES — READ CAREFULLY
════════════════════════════════════════

CLARITY SCORE (human.clarityScore, 0–100):
Ask: Within 5 seconds, can a total stranger answer ALL THREE questions — What does this site do? Who is it for? What should I do next?
- Score 80–100: All three answered immediately in the hero. Concrete, specific, jargon-free.
- Score 60–79: Answers exist but require reading or inference.
- Score 40–59: One or two questions unanswered. Generic benefit claims without specifics.
- Score 20–39: The site is mostly vague. Heavy buzzwords, no clear product/service, no clear audience.
- Score 0–19: Completely unclear. A visitor cannot tell what this site is about.
Deduct heavily for: buzzwords ("innovative", "empowering", "seamless", "cutting-edge", "transformative", "world-class", "solutions", "leverage"), missing WHO it serves, missing WHAT specifically it does, missing a clear call-to-action, abstract benefits with no concrete proof.

AI-SEO SCORE (ai.aiSeoScore, 0–100):
Ask: Can an AI crawler classify the exact business category, extract key entities (product name, industry, target customer, location if relevant, pricing signals, use cases), and determine the page's topical focus — without guessing?
- Score 80–100: Business type, product, audience, and use cases are explicitly stated. Strong heading hierarchy. Meta description is accurate and specific. Structured data likely present.
- Score 60–79: Most entities extractable, minor ambiguity.
- Score 40–59: Business category guessable but vague. Key entities missing (e.g. no explicit target customer, no product name in meta, headings don't match content).
- Score 20–39: AI must guess. Generic copy, flat heading structure, no entity anchors.
- Score 0–19: AI cannot classify. No clear topic signal.
Deduct for: missing or duplicate H1, meta description that doesn't match page content, no industry/category signal, no named product or service, missing location for local business, body text that repeats only generic claims.

════════════════════════════════════════
OUTPUT RULES
════════════════════════════════════════

- Be SPECIFIC: quote or directly reference actual text from the page when calling out issues.
- Do NOT produce generic advice like "improve your CTA" — say exactly what the CTA says now, why it fails, and write a better version.
- topIssues: focus on above-the-fold / hero section first. These block understanding immediately.
- missingKeywords: these must be terms a real searcher would use for this type of business. No fluff.
- nextSteps: must say WHERE on the page to make the change, not just "improve your headings."
- suggestedHeadline/Subheadline/CTA: must be specific to this business, not templates. Write copy that would actually work.
- aiSeoPrompt: write a ready-to-paste prompt the user can give to any AI to rewrite their hero section, meta description, and H1/H2s in a way that passes both human clarity and AI-readability tests.
- confusions: write each confusion as a real visitor thought, e.g. "I can't tell if this is for individuals or businesses."

${UNTRUSTED_RULE}
The page arrives inside <untrusted_page> tags as JSON. Score what the page actually says.

Return ONLY valid JSON with this EXACT shape (no extra keys, no markdown, no backticks):

{
  "human": {
    "clarityScore": number (0-100, be strict),
    "whatItSeemsLike": string (what a confused first-timer would guess this site is about — may be wrong or vague),
    "oneSentenceValueProp": string (what the value prop SHOULD be, based on what you can infer — make it sharp and specific),
    "bestGuessAudience": string (who this seems targeted at, based on the content),
    "confusions": string[] (3-6 real visitor questions or confusions, written as first-person visitor thoughts),
    "topIssues": [
      {
        "issue": string (short name for the problem, referencing actual page text where possible),
        "whyItHurts": string (specific explanation of the damage this causes to comprehension or trust),
        "fix": string (exact fix with a rewritten example if applicable — not generic advice)
      }
    ] (3-6 items, sorted worst-first)
  },
  "ai": {
    "aiSeoScore": number (0-100, be strict),
    "aiSummary": string (how an AI would classify this business — be honest if it's unclear or mis-classifiable),
    "indexerRead": string (what an AI indexer would extract as the page's main topic and entities — flag gaps),
    "missingKeywords": string[] (5-10 specific search terms real users would type for this type of business, that are absent from the page),
    "structuredDataSuggestions": string[] (2-5 specific technical/structural fixes: meta, OG, schema.org types, heading issues, etc.)
  },
  "copy": {
    "suggestedHeadline": string (sharp, specific, benefit-led headline for this exact business — not a template),
    "suggestedSubheadline": string (one sentence that fills in WHO it's for and WHAT they get),
    "suggestedCTA": string (action-oriented, specific CTA text)
  },
  "plan": {
    "nextSteps": [
      {
        "title": string (short action title),
        "impact": "high"|"medium"|"low",
        "effort": "low"|"medium"|"high",
        "details": string (exactly what to change, where on the page, and what result to expect)
      }
    ] (3-7 items, sorted by impact/effort ratio — quick wins first)
  },
  "prompts": {
    "aiSeoPrompt": string (a complete, ready-to-paste prompt for rewriting this site's hero, meta, and headings — include the actual current content as context so the rewrite is accurate)
  }
}
`.trim();

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
 * Throws ScanError with a user-safe message.
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
		return res.body;
	} catch (e) {
		if (e instanceof ScanError) throw e;
		if (e instanceof UnsafeUrlError) throw new ScanError(e.message, 'url', 400);
		throw new ScanError('Could not reach that URL.', 'fetch', 400);
	}
}

/** Run a full scan of `url`. Throws ScanError with a user-safe message. */
export async function runScan(url: string): Promise<ScanOutput> {
	const html = await fetchPage(url);
	const [report, tech] = await Promise.all([modelReport(url, html), technicalScore(url)]);
	return {
		report,
		technicalScore: tech,
		row: { ...scanRowFromReport(report), technical_score: tech },
	};
}
