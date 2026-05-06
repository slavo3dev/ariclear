import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ─── Rate limiting (in-memory, per-IP) ───────────────────────────────────────
// For production, replace with Upstash Redis or similar.

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3; // max 3 demo scans
const RATE_LIMIT_WINDOW_MS = 60_000; // per 60 seconds

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return true;
	}

	if (entry.count >= RATE_LIMIT_MAX) return false;

	entry.count++;
	return true;
}

// ─── HTML extraction ──────────────────────────────────────────────────────────

function extractText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 4000); // keep token cost low for demo
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoResult = {
	domain: string;
	overallScore: number;
	humanScore: number;
	aiScore: number;
	verdict: string;
	topIssues: string[];
	hiddenIssueCount: number;
};

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are AriClear, a brutal and honest website clarity analyzer.

Analyze the given website content and return ONLY valid JSON — no preamble, no markdown fences.

Return this exact shape:
{
  "humanScore": <integer 0–100>,
  "aiScore": <integer 0–100>,
  "topIssues": ["<specific issue 1 quoting actual page text>", "<specific issue 2>"],
  "hiddenIssueCount": <integer 2–5>
}

Scoring rules:
- humanScore: 5-second test — can a stranger instantly understand what the business does and why they should care? Most sites score 25–60. Be strict.
- aiScore: Can an AI model clearly identify the business category, unique value prop, and target audience from the page? Most sites score 20–55.
- topIssues: 2 real, specific problems. Quote actual text from the page. No generic advice.
- hiddenIssueCount: How many ADDITIONAL real issues exist (not shown, gated behind signup). Min 2, max 5.

Do NOT be generous. Real scores rarely exceed 65 without exceptional copy.`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
	// Rate limit by IP
	const ip =
		req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		req.headers.get('x-real-ip') ??
		'unknown';

	if (!checkRateLimit(ip)) {
		return NextResponse.json(
			{ error: 'Too many requests', errorCode: 'RATE_LIMIT' },
			{ status: 429 },
		);
	}

	// Parse body
	let url: string;
	try {
		const body = await req.json();
		url = body?.url?.trim();
		if (!url) throw new Error('Missing url');
		new URL(url); // validate
	} catch {
		return NextResponse.json(
			{ error: 'Invalid URL', errorCode: 'INVALID_URL' },
			{ status: 400 },
		);
	}

	const domain = new URL(url).hostname.replace('www.', '');

	// Fetch page
	let html: string;
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		const fetchRes = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (compatible; AriClearBot/1.0; +https://ariclear.com)',
				Accept: 'text/html',
			},
		});

		clearTimeout(timeout);

		if (!fetchRes.ok) {
			return NextResponse.json(
				{ error: 'Could not fetch that URL', errorCode: 'FETCH_ERROR' },
				{ status: 422 },
			);
		}

		html = await fetchRes.text();
	} catch {
		return NextResponse.json(
			{ error: 'Could not reach that URL', errorCode: 'FETCH_ERROR' },
			{ status: 422 },
		);
	}

	const pageText = extractText(html);

	if (pageText.length < 50) {
		return NextResponse.json(
			{
				error: 'Not enough text content to analyze',
				errorCode: 'FETCH_ERROR',
			},
			{ status: 422 },
		);
	}

	// Call OpenAI
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

	let analysis: {
		humanScore: number;
		aiScore: number;
		topIssues: string[];
		hiddenIssueCount: number;
	};

	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			temperature: 0.15,
			max_tokens: 400,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{
					role: 'user',
					content: `Website: ${url}\n\nPage content:\n${pageText}`,
				},
			],
		});

		const raw = completion.choices[0]?.message?.content ?? '';
		const cleaned = raw.replace(/```json|```/g, '').trim();
		analysis = JSON.parse(cleaned);

		// Validate shape
		if (
			typeof analysis.humanScore !== 'number' ||
			typeof analysis.aiScore !== 'number' ||
			!Array.isArray(analysis.topIssues) ||
			typeof analysis.hiddenIssueCount !== 'number'
		) {
			throw new Error('Unexpected response shape');
		}
	} catch {
		return NextResponse.json(
			{ error: 'Analysis failed', errorCode: 'AI_ERROR' },
			{ status: 500 },
		);
	}

	// Clamp scores
	const humanScore = Math.min(
		100,
		Math.max(0, Math.round(analysis.humanScore)),
	);
	const aiScore = Math.min(100, Math.max(0, Math.round(analysis.aiScore)));
	const overallScore = Math.round((humanScore + aiScore) / 2);

	const result: DemoResult = {
		domain,
		overallScore,
		humanScore,
		aiScore,
		verdict:
			overallScore >= 70
				? 'Solid foundation — with room to grow'
				: overallScore >= 45
					? 'Needs work — visitors are confused'
					: "Critical issues — you're losing leads",
		topIssues: (analysis.topIssues ?? []).slice(0, 2),
		hiddenIssueCount: Math.min(
			5,
			Math.max(2, analysis.hiddenIssueCount ?? 3),
		),
	};

	return NextResponse.json(result);
}
