// lib/video/generateScript.ts
// Uses Gemini to generate voiceover narration for each of the 4 video scenes.
// Returns structured JSON with narration text + image prompts per scene.

import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoScript = {
	scenes: {
		id: number;
		narration: string; // spoken voiceover text (max ~15 words per scene)
		imagePrompt: string; // Replicate image generation prompt
	}[];
	totalDuration: number; // always 12
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

// ─── Style tone map ───────────────────────────────────────────────────────────

const STYLE_TONE: Record<ScanData['style'], string> = {
	bold: 'punchy, direct, confident — short sentences, strong verbs',
	clean: 'calm, professional, elegant — clear and precise',
	warm: 'friendly, approachable, human — conversational and encouraging',
	urgent: 'urgent, problem-focused — highlights pain then relief',
};

const STYLE_IMAGE_MOOD: Record<ScanData['style'], string> = {
	bold: 'high contrast, dramatic lighting, dark background, bold typography aesthetic, cinematic',
	clean: 'minimal, clean white space, soft natural light, elegant, modern design aesthetic',
	warm: 'warm tones, coffee browns and creams, cozy atmosphere, soft bokeh, inviting',
	urgent: 'dramatic red accents, dark moody background, tension and resolution visual narrative',
};

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

	const tone = STYLE_TONE[scan.style];
	const imageMood = STYLE_IMAGE_MOOD[scan.style];

	const prompt = `
You are a video script writer for AriClear, a website clarity analysis tool.
Generate a 4-scene video script for a 12-second social media video about a website scan result.

SCAN DATA:
- Domain: ${scan.domain}
- Clarity Score: ${scan.clarityScore}/100
- AI-SEO Score: ${scan.aiScore}/100
- Overall Score: ${scan.overallScore}/100
- First Impression: "${scan.firstImpression}"
- Target Audience: "${scan.audience}"
- Top Issue: "${scan.topIssue}"
- Fix: "${scan.actionTitle}"
- Suggested Headline: "${scan.suggestedHeadline}"
- CTA: "${scan.suggestedCta}"

STYLE: ${scan.style} — tone is ${tone}

RULES:
- Each scene is exactly 3 seconds
- Narration must be MAX 12 words per scene (spoken at natural pace)
- Image prompts must be photorealistic, no text in images, no logos
- Image mood: ${imageMood}
- Scene 1 is about the scores
- Scene 2 is about the first impression and audience
- Scene 3 is about the top issue and fix
- Scene 4 is about the new headline and CTA

Respond ONLY with this exact JSON structure, no markdown, no explanation:
{
  "scenes": [
    {
      "id": 1,
      "narration": "max 12 word voiceover text for scores scene",
      "imagePrompt": "detailed photorealistic image generation prompt for scores scene background"
    },
    {
      "id": 2,
      "narration": "max 12 word voiceover text for first impression scene",
      "imagePrompt": "detailed photorealistic image generation prompt for first impression scene background"
    },
    {
      "id": 3,
      "narration": "max 12 word voiceover text for problem and solution scene",
      "imagePrompt": "detailed photorealistic image generation prompt for problem solution scene background"
    },
    {
      "id": 4,
      "narration": "max 12 word voiceover text for headline and CTA scene",
      "imagePrompt": "detailed photorealistic image generation prompt for headline CTA scene background"
    }
  ],
  "totalDuration": 12
}
`;

	const result = await model.generateContent(prompt);
	const text = result.response.text();

	// Strip any accidental markdown fences
	const clean = text.replace(/```json|```/g, '').trim();
	const parsed = JSON.parse(clean) as VideoScript;

	// Validate structure
	if (!parsed.scenes || parsed.scenes.length !== 4) {
		throw new Error('Gemini returned invalid script structure');
	}

	return parsed;
}
