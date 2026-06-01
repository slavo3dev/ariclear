// lib/video/generateScript.ts
// Generates 5-scene voiceover narration for the emotional story video.
// Scene structure: Arrival → Confusion → Problem → Clarity → CTA

import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoScript = {
	scenes: {
		id: number;
		narration: string;
		imagePrompt: string; // kept for API compat, not used in new composition
	}[];
	totalDuration: number;
};

export type ScanData = {
	domain: string;
	clarityScore: number;
	aiScore: number;
	overallScore: number;
	firstImpression: string;
	audience: string;
	topIssue: string;
	actionTitle: string;
	actionDetails: string;
	suggestedHeadline: string;
	suggestedCta: string;
	style: 'bold' | 'clean' | 'warm' | 'urgent';
};

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
	fn: () => Promise<T>,
	maxAttempts = 3,
	delayMs = 2000,
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err: unknown) {
			lastError = err;
			const isRetryable =
				err instanceof Error &&
				(err.message.includes('503') ||
					err.message.includes('overloaded') ||
					err.message.includes('high demand'));
			if (isRetryable && attempt < maxAttempts) {
				console.log(
					`Gemini attempt ${attempt} failed — retrying in ${delayMs * attempt}ms`,
				);
				await new Promise((r) => setTimeout(r, delayMs * attempt));
				continue;
			}
			throw err;
		}
	}
	throw lastError;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateVideoScript(
	scan: ScanData,
): Promise<VideoScript> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash-lite',
		generationConfig: {
			temperature: 0.7,
			responseMimeType: 'application/json',
		},
	});

	const prompt = `
You are writing voiceover narration for a 15-second emotional story video about a website clarity scan.
The video has 5 scenes, 3 seconds each. Write short, punchy narration for each scene.

SCAN DATA:
- Domain: ${scan.domain}
- Clarity Score: ${scan.clarityScore}/100
- AI-SEO Score: ${scan.aiScore}/100
- First Impression: "${scan.firstImpression}"
- Target Audience: "${scan.audience}"
- Top Issue: "${scan.topIssue}"
- Fix: "${scan.actionTitle}"
- Suggested Headline: "${scan.suggestedHeadline}"
- CTA: "${scan.suggestedCta}"

SCENES:
- Scene 1 (ARRIVAL, 0-3s): Visitor just landed. Curious, hopeful. MAX 8 words.
- Scene 2 (CONFUSION, 3-6s): They read the headline. They're confused. MAX 8 words.
- Scene 3 (PROBLEM, 6-9s): They leave. Top issue revealed. MAX 8 words.
- Scene 4 (CLARITY, 9-12s): New headline. They get it instantly. MAX 8 words.
- Scene 5 (CTA, 12-15s): The transformation. Call to action. MAX 8 words.

RULES:
- MAX 8 words per scene narration — this is critical for timing
- Conversational, emotional tone — not salesy
- Use the real data — domain name, score, issue, headline
- imagePrompt: describe a simple abstract background (dark, cinematic, no text)

Respond ONLY with this JSON, no markdown:
{
  "scenes": [
    { "id": 1, "narration": "8 words max for arrival scene", "imagePrompt": "abstract dark background description" },
    { "id": 2, "narration": "8 words max for confusion scene", "imagePrompt": "abstract dark background description" },
    { "id": 3, "narration": "8 words max for problem scene", "imagePrompt": "abstract dark background description" },
    { "id": 4, "narration": "8 words max for clarity scene", "imagePrompt": "abstract dark background description" },
    { "id": 5, "narration": "8 words max for CTA scene", "imagePrompt": "abstract dark background description" }
  ],
  "totalDuration": 15
}
`;

	const result = await withRetry(() => model.generateContent(prompt));
	const text = result.response.text();
	const clean = text.replace(/```json|```/g, '').trim();
	const parsed = JSON.parse(clean) as VideoScript;

	if (!parsed.scenes || parsed.scenes.length !== 5) {
		throw new Error(
			'Gemini returned invalid script structure — expected 5 scenes',
		);
	}

	return parsed;
}
