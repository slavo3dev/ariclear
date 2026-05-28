// app/api/video/render/route.ts
// Orchestrates the full video pipeline.
// Remotion is invoked via CLI child process to avoid
// webpack/esbuild conflicts with Next.js Turbopack.

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { supabaseAriClearServer } from '@ariclear/lib/supabase/auth/server';
import { generateVideoScript } from '@/lib/video/generateScript';
import { generateVoiceover } from '@/lib/video/generateVoiceover';
import { generateSceneImages } from '@/lib/video/generateImages';
import { uploadToCloudinary } from '@/lib/video/uploadToCloudinary';
import { v2 as cloudinary } from 'cloudinary';

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoJobStyle = 'bold' | 'clean' | 'warm' | 'urgent';
type VideoJobFormat = 'reels' | 'story' | 'square' | 'landscape';

type VideoJob = {
	id: string;
	scan_id: string;
	url: string;
	style: VideoJobStyle;
	format: VideoJobFormat;
	user_id: string;
};

type Scan = {
	id: string;
	domain: string;
	url: string;
	human_score: number;
	ai_score: number;
	overall_score: number;
	human_clarity_description: string | null;
	human_audience: string | null;
	human_confusions: string[];
	action_plan: { title: string; details: string }[];
	suggested_headline: string | null;
	suggested_cta: string | null;
};

// ─── Format dimensions ────────────────────────────────────────────────────────

const FORMAT_DIMS: Record<VideoJobFormat, { width: number; height: number }> = {
	reels: { width: 1080, height: 1920 },
	story: { width: 1080, height: 1920 },
	square: { width: 1080, height: 1080 },
	landscape: { width: 1920, height: 1080 },
};

// ─── Render via Remotion CLI ──────────────────────────────────────────────────

async function renderWithCLI(
	props: Record<string, unknown>,
	format: VideoJobFormat,
	jobId: string,
): Promise<string> {
	const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ariclear-'));
	const outFile = path.join(outDir, `${jobId}.mp4`);
	const dims = FORMAT_DIMS[format];

	// Write props to a temp JSON file so we can pass them to CLI
	const propsFile = path.join(outDir, 'props.json');
	await fs.writeFile(propsFile, JSON.stringify(props));

	const remotionBin = path.resolve(
		process.cwd(),
		'node_modules/.bin/remotion',
	);

	console.log('[render] Starting Remotion CLI render...');

	await execFileAsync(
		remotionBin,
		[
			'render',
			'remotion/index.ts',
			'ScanRecap',
			outFile,
			`--props=${propsFile}`,
			`--width=${dims.width}`,
			`--height=${dims.height}`,
			'--codec=h264',
			'--log=verbose',
		],
		{
			cwd: process.cwd(),
			timeout: 300000, // 5 min timeout
			env: {
				...process.env,
				NODE_ENV: 'production',
			},
		},
	);

	console.log('[render] Remotion CLI render complete:', outFile);
	return outFile;
}

// ─── Upload rendered video to Cloudinary ─────────────────────────────────────

async function uploadRenderedVideo(
	filePath: string,
	jobId: string,
): Promise<string> {
	cloudinary.config({
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
		api_key: process.env.CLOUDINARY_API_KEY,
		api_secret: process.env.CLOUDINARY_API_SECRET,
	});

	console.log('[render] Uploading rendered video to Cloudinary...');

	const result = await cloudinary.uploader.upload(filePath, {
		resource_type: 'video',
		folder: 'ariclear/rendered-videos',
		public_id: `job-${jobId}`,
		overwrite: true,
	});

	// Clean up temp files
	await fs.unlink(filePath).catch(() => {});
	await fs.rmdir(path.dirname(filePath)).catch(() => {});

	console.log('[render] Video uploaded:', result.secure_url);
	return result.secure_url;
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
	const supabase = await supabaseAriClearServer();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as { job_id: string };
	const { job_id } = body;

	if (!job_id) {
		return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });
	}

	// Load job
	const { data: job, error: jobError } = await supabase
		.from('video_jobs')
		.select('*')
		.eq('id', job_id)
		.eq('user_id', user.id)
		.single();

	if (jobError || !job) {
		return NextResponse.json({ error: 'Job not found' }, { status: 404 });
	}

	// Mark as rendering
	await supabase
		.from('video_jobs')
		.update({ status: 'rendering' })
		.eq('id', job_id);

	try {
		// Load scan
		const { data: scan, error: scanError } = await supabase
			.from('scans')
			.select('*')
			.eq('id', (job as VideoJob).scan_id)
			.single();

		if (scanError || !scan) throw new Error('Scan not found');

		const typedScan = scan as Scan;
		const typedJob = job as VideoJob;

		// ── 1: Gemini script ──
		console.log('[pipeline] Step 1: Generating script...');
		const script = await generateVideoScript({
			domain: typedScan.domain,
			clarityScore: typedScan.human_score,
			aiScore: typedScan.ai_score,
			overallScore: typedScan.overall_score,
			firstImpression: typedScan.human_clarity_description ?? '',
			audience: typedScan.human_audience ?? '',
			topIssue: typedScan.human_confusions?.[0] ?? '',
			actionTitle: typedScan.action_plan?.[0]?.title ?? '',
			actionDetails: typedScan.action_plan?.[0]?.details ?? '',
			suggestedHeadline: typedScan.suggested_headline ?? '',
			suggestedCta: typedScan.suggested_cta ?? '',
			style: typedJob.style,
		});

		// ── 2: TTS voiceover ──
		console.log('[pipeline] Step 2: Generating voiceover...');
		const audio = await generateVoiceover({
			scenes: script.scenes,
			style: typedJob.style,
		});

		// ── 3: Replicate images ──
		console.log('[pipeline] Step 3: Generating scene images...');
		const replicateUrls = await generateSceneImages({
			imagePrompts: script.scenes.map((s) => s.imagePrompt),
			style: typedJob.style,
			format: typedJob.format,
		});

		// ── 4: Cloudinary upload ──
		console.log('[pipeline] Step 4: Uploading to Cloudinary...');
		const { voiceoverUrl, sceneImageUrls } = await uploadToCloudinary(
			audio,
			replicateUrls,
			job_id,
		);

		// ── 5: Build Remotion props ──
		const remotionProps = {
			domain: typedScan.domain,
			clarityScore: typedScan.human_score,
			aiScore: typedScan.ai_score,
			overallScore: typedScan.overall_score,
			firstImpression: typedScan.human_clarity_description ?? '',
			audience: typedScan.human_audience ?? '',
			topIssue: typedScan.human_confusions?.[0] ?? '',
			actionTitle: typedScan.action_plan?.[0]?.title ?? '',
			actionDetails: typedScan.action_plan?.[0]?.details ?? '',
			suggestedHeadline: typedScan.suggested_headline ?? '',
			suggestedCta: typedScan.suggested_cta ?? '',
			voiceoverUrl,
			sceneImages: sceneImageUrls,
			style: typedJob.style,
		};

		// ── 6: Remotion CLI render ──
		console.log('[pipeline] Step 5: Rendering with Remotion CLI...');
		const renderedFilePath = await renderWithCLI(
			remotionProps,
			typedJob.format,
			job_id,
		);

		// ── 7: Upload rendered video ──
		console.log('[pipeline] Step 6: Uploading rendered video...');
		const videoUrl = await uploadRenderedVideo(renderedFilePath, job_id);

		// ── 8: Save to Supabase ──
		await supabase
			.from('video_jobs')
			.update({
				status: 'done',
				cloudinary_url: videoUrl,
				updated_at: new Date().toISOString(),
			})
			.eq('id', job_id);

		console.log('[pipeline] Complete!', videoUrl);

		return NextResponse.json({
			success: true,
			video_url: videoUrl,
			job_id,
		});
	} catch (err) {
		console.error('[pipeline] Error:', err);

		await supabase
			.from('video_jobs')
			.update({
				status: 'failed',
				error_message:
					err instanceof Error ? err.message : 'Unknown error',
				updated_at: new Date().toISOString(),
			})
			.eq('id', job_id);

		return NextResponse.json(
			{ error: err instanceof Error ? err.message : 'Render failed' },
			{ status: 500 },
		);
	}
}
