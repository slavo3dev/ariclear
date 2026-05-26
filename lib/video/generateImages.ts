// lib/video/generateImages.ts
// Generates 4 background images via Replicate (SDXL)
// using the image prompts from Gemini.
// Returns an array of 4 image URLs (Replicate CDN).

import Replicate from 'replicate';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageInput = {
	imagePrompts: string[]; // exactly 4 prompts from Gemini
	style: 'bold' | 'clean' | 'warm' | 'urgent';
	format: 'reels' | 'story' | 'square' | 'landscape';
};

// ─── Dimensions per format ────────────────────────────────────────────────────
// SDXL max dimension is 1024px — use closest valid aspect ratios

const DIMENSIONS: Record<
	ImageInput['format'],
	{ width: number; height: number }
> = {
	reels: { width: 768, height: 1344 }, // 9:16
	story: { width: 768, height: 1344 }, // 9:16
	square: { width: 1024, height: 1024 }, // 1:1
	landscape: { width: 1344, height: 768 }, // 16:9
};

// ─── Negative prompt per style ────────────────────────────────────────────────

const NEGATIVE_PROMPTS: Record<ImageInput['style'], string> = {
	bold: 'text, watermark, logo, signature, blurry, low quality, cartoon, illustration, painting',
	clean: 'text, watermark, logo, dark, moody, dramatic, cartoon, illustration, low quality',
	warm: 'text, watermark, logo, cold, blue tones, harsh lighting, cartoon, low quality',
	urgent: 'text, watermark, logo, bright, cheerful, cartoon, illustration, low quality',
};

// ─── Generate single image ────────────────────────────────────────────────────

async function generateSingleImage(
	client: Replicate,
	prompt: string,
	negativePrompt: string,
	width: number,
	height: number,
): Promise<string> {
	const output = await client.run(
		'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
		{
			input: {
				prompt,
				negative_prompt: negativePrompt,
				width,
				height,
				num_inference_steps: 30,
				guidance_scale: 7.5,
				scheduler: 'K_EULER',
				num_outputs: 1,
			},
		},
	);

	const outputs = output as { url?: () => string; toString?: () => string }[];
	if (!outputs || outputs.length === 0) {
		throw new Error('Replicate returned no images');
	}
	const first = outputs[0];
	// SDK v1.4+ returns FileOutput objects — extract the URL
	const url =
		typeof first.url === 'function'
			? first.url()
			: typeof first.toString === 'function'
				? first.toString()
				: String(first);

	if (!url || url === '[object Object]') {
		throw new Error('Could not extract URL from Replicate output');
	}
	return url;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateSceneImages(
	input: ImageInput,
): Promise<string[]> {
	const apiToken = process.env.REPLICATE_API_TOKEN;
	if (!apiToken) throw new Error('REPLICATE_API_TOKEN is not set');

	if (input.imagePrompts.length !== 4) {
		throw new Error('generateSceneImages requires exactly 4 prompts');
	}

	const client = new Replicate({ auth: apiToken });
	const dims = DIMENSIONS[input.format];
	const negativePrompt = NEGATIVE_PROMPTS[input.style];

	console.log(
		`[generateImages] Generating ${input.imagePrompts.length} images at ${dims.width}x${dims.height}`,
	);

	// Generate all 4 images in parallel
	const imageUrls: string[] = [];
	for (let i = 0; i < input.imagePrompts.length; i++) {
		const prompt = input.imagePrompts[i];
		console.log(
			`[generateImages] Scene ${i + 1}: ${prompt.slice(0, 60)}...`,
		);
		const url = await generateSingleImage(
			client,
			prompt,
			negativePrompt,
			dims.width,
			dims.height,
		);
		imageUrls.push(url);
		if (i < input.imagePrompts.length - 1) {
			console.log(`[generateImages] Waiting 11s before next image...`);
			await new Promise((r) => setTimeout(r, 11000));
		}
	}

	console.log(`[generateImages] Done — ${imageUrls.length} images generated`);
	return imageUrls;
}
