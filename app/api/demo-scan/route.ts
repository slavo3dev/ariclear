// POST /api/demo-scan
// Free, no-account teaser scan on the homepage.
//
// Shows both readability scores at a high level: the Human and AI score, a
// verdict for each, one line on what a visitor thinks the site is, one line on
// how an AI assistant would describe it, and the 2 most important issues.
// The full report (all issues, rewrites, action plan, AI keywords, PDF) needs
// an account. The response contains ONLY what the demo card shows.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { safeFetch, UnsafeUrlError } from '@/lib/security/safeFetch';
import { clientIp, rateLimitAll } from '@/lib/security/rateLimit';
import { extractPageContent, pageAsText } from '@/lib/analysis/extractPage';
import { fence, UNTRUSTED_RULE } from '@/lib/analysis/untrusted';
import { clampScore } from '@/lib/analysis/scanRow';
import { createLogger, errorCode } from '@/lib/logger';
import { normalizeDomain } from '@/lib/domain';

export const runtime = 'nodejs';

const log = createLogger('demo-scan');

// Whole-site daily ceiling on demo model calls, on top of the per-IP limits.
const DEMO_DAILY_CAP = Number(process.env.DEMO_DAILY_CAP) || 1000;

// ─── Response shape (exactly what the demo card renders) ─────────────────────

export type DemoReadout = {
	score: number;
	verdict: string;
	/** One sentence. Human: what a visitor thinks this is. AI: how an AI describes it. */
	read: string;
};

export type DemoResult = {
	domain: string;
	overallScore: number;
	verdict: string;
	human: DemoReadout;
	ai: DemoReadout;
	topIssues: string[];
};

const humanVerdict = (s: number) =>
	s >= 70
		? 'Clear at a glance'
		: s >= 45
			? 'Visitors have to work it out'
			: "Visitors can't tell what you do";

const aiVerdict = (s: number) =>
	s >= 70
		? 'AI can classify your business'
		: s >= 45
			? 'AI has to guess parts of it'
			: "AI can't tell what you are";

const overallVerdict = (s: number) =>
	s >= 70
		? 'Solid foundation, with room to grow'
		: s >= 45
			? 'Needs work: visitors are confused'
			: "Critical issues: you're losing leads";

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are AriClear, a strict and honest website clarity analyzer.

You read one web page from two angles:
1) HUMAN: a first-time visitor with 5 seconds. Can they tell what this business does, who it is for, and what to do next?
2) AI: an AI assistant or search crawler. Can it classify the business category, the product or service, and the target customer without guessing?

${UNTRUSTED_RULE}

Return ONLY a JSON object with exactly these keys:
{
  "humanScore": integer 0-100 (most sites score 25-60; be strict),
  "aiScore": integer 0-100 (most sites score 20-55; be strict),
  "humanRead": string (ONE sentence, max 25 words: what a first-time visitor would think this site is, in their words; say so if it is unclear),
  "aiRead": string (ONE sentence, max 30 words: how an AI assistant would describe this business if asked about it; name the category it would pick, or say it cannot tell),
  "topIssues": [string, string] (exactly 2 specific problems, quoting real text from the page; no generic advice)
}

Do NOT be generous. Real scores rarely exceed 65 without exceptional copy.`;

type ModelOut = {
	humanScore: number;
	aiScore: number;
	humanRead: string;
	aiRead: string;
	topIssues: string[];
};

function isModelOut(o: unknown): o is ModelOut {
	const m = o as ModelOut;
	return (
		!!m &&
		typeof m.humanScore === 'number' &&
		typeof m.aiScore === 'number' &&
		typeof m.humanRead === 'string' &&
		typeof m.aiRead === 'string' &&
		Array.isArray(m.topIssues)
	);
}

const oneLine = (s: string, max: number) =>
	s.replace(/\s+/g, ' ').trim().slice(0, max);

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
	const ip = clientIp(req);
	const limit = await rateLimitAll([
		[`demo:min:${ip}`, 3, 60_000],
		[`demo:day:${ip}`, 15, 24 * 60 * 60_000],
		['demo:global:all', DEMO_DAILY_CAP, 24 * 60 * 60_000],
	]);
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many requests', errorCode: 'RATE_LIMIT' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	let url: string;
	try {
		const body = await req.json();
		url = String(body?.url ?? '').trim();
		const u = new URL(url);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
	} catch {
		return NextResponse.json(
			{ error: 'Invalid URL', errorCode: 'INVALID_URL' },
			{ status: 400 },
		);
	}

	const domain = normalizeDomain(url);

	let html: string;
	try {
		const fetchRes = await safeFetch(url, {
			timeoutMs: 10_000,
			maxBytes: 1_000_000,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (compatible; AriClearBot/1.0; +https://ariclear.com)',
				Accept: 'text/html',
			},
		});
		if (!fetchRes.ok) {
			return NextResponse.json(
				{ error: 'Could not fetch that URL', errorCode: 'FETCH_ERROR' },
				{ status: 422 },
			);
		}
		html = fetchRes.body;
	} catch (e) {
		if (e instanceof UnsafeUrlError) {
			return NextResponse.json(
				{ error: 'Invalid URL', errorCode: 'INVALID_URL' },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: 'Could not reach that URL', errorCode: 'FETCH_ERROR' },
			{ status: 422 },
		);
	}

	// Keep token cost low for the demo.
	const page = extractPageContent(html, { maxBodyChars: 4000 });
	if (page.bodySnippet.length < 50 && !page.title && !page.h1) {
		return NextResponse.json(
			{
				error: 'Not enough text content to analyze',
				errorCode: 'FETCH_ERROR',
			},
			{ status: 422 },
		);
	}

	let analysis: ModelOut;
	try {
		const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			temperature: 0.15,
			max_tokens: 500,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{
					role: 'user',
					content: `Website: ${url}\n\n${fence('page', pageAsText(page))}`,
				},
			],
		});

		const parsed: unknown = JSON.parse(
			completion.choices[0]?.message?.content ?? '',
		);
		if (!isModelOut(parsed)) throw new Error('unexpected_shape');
		analysis = parsed;
	} catch (err) {
		log.error('analysis failed', { code: errorCode(err) });
		return NextResponse.json(
			{ error: 'Analysis failed', errorCode: 'AI_ERROR' },
			{ status: 500 },
		);
	}

	const humanScore = clampScore(analysis.humanScore);
	const aiScore = clampScore(analysis.aiScore);
	const overallScore = Math.round((humanScore + aiScore) / 2);

	const result: DemoResult = {
		domain,
		overallScore,
		verdict: overallVerdict(overallScore),
		human: {
			score: humanScore,
			verdict: humanVerdict(humanScore),
			read: oneLine(analysis.humanRead, 240),
		},
		ai: {
			score: aiScore,
			verdict: aiVerdict(aiScore),
			read: oneLine(analysis.aiRead, 280),
		},
		topIssues: analysis.topIssues
			.filter((i): i is string => typeof i === 'string' && i.trim() !== '')
			.slice(0, 2)
			.map((i) => oneLine(i, 300)),
	};

	return NextResponse.json(result);
}
