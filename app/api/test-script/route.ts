// app/api/test-script/route.ts
// DELETE THIS FILE after testing Steps 4b, 4c, 4d, 4e

import { NextResponse } from 'next/server';
import { generateVideoScript } from '@/lib/video/generateScript';
import { generateVoiceover } from '@/lib/video/generateVoiceover';
import { generateSceneImages } from '@/lib/video/generateImages';
import { uploadToCloudinary } from '@/lib/video/uploadToCloudinary';

export async function GET() {
	// Step 4b — Gemini script
	const script = await generateVideoScript({
		domain: 'slavo.io',
		clarityScore: 45,
		aiScore: 50,
		overallScore: 48,
		firstImpression:
			'A web development mentorship site that feels vague on specifics.',
		audience: 'Beginner developers and career switchers',
		topIssue: 'Vague value proposition',
		actionTitle: 'Rewrite the headline',
		actionDetails: 'Make your offering clear in the first 5 words',
		suggestedHeadline:
			'Transform Your Career with Structured Web Dev Mentorship',
		suggestedCta: 'Start Free Today',
		style: 'bold',
	});

	// Step 4c — Google TTS voiceover
	const audio = await generateVoiceover({
		scenes: script.scenes,
		style: 'bold',
	});

	// Step 4d — Replicate images
	const replicateUrls = await generateSceneImages({
		imagePrompts: script.scenes.map((s) => s.imagePrompt),
		style: 'bold',
		format: 'reels',
	});

	// Step 4e — Upload everything to Cloudinary
	const { voiceoverUrl, sceneImageUrls } = await uploadToCloudinary(
		audio,
		replicateUrls,
		'test-scan-001',
	);

	return NextResponse.json({
		script,
		voiceoverUrl,
		sceneImageUrls,
	});
}
