// lib/video/uploadToCloudinary.ts
// Uploads audio buffer and image URLs to Cloudinary for permanent storage.
// Replicate URLs expire — Cloudinary URLs are permanent and CDN-served.

import { v2 as cloudinary } from 'cloudinary';

// ─── Configure ────────────────────────────────────────────────────────────────

function getCloudinary() {
	cloudinary.config({
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
		api_key: process.env.CLOUDINARY_API_KEY,
		api_secret: process.env.CLOUDINARY_API_SECRET,
	});
	return cloudinary;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CloudinaryUploadResult = {
	voiceoverUrl: string;
	sceneImageUrls: string[];
};

// ─── Upload audio buffer ──────────────────────────────────────────────────────

async function uploadAudio(
	audioBuffer: Buffer,
	scanId: string,
): Promise<string> {
	const cld = getCloudinary();

	return new Promise((resolve, reject) => {
		const uploadStream = cld.uploader.upload_stream(
			{
				resource_type: 'video',
				folder: 'ariclear/voiceovers',
				public_id: `scan-${scanId}`,
				format: 'mp3',
				overwrite: true,
			},
			(error, result) => {
				if (error) return reject(error);
				if (!result)
					return reject(
						new Error('Cloudinary returned no result for audio'),
					);
				resolve(result.secure_url);
			},
		);

		uploadStream.end(audioBuffer);
	});
}

// ─── Upload image from URL ────────────────────────────────────────────────────

async function uploadImage(
	imageUrl: string | URL | { toString: () => string },
	scanId: string,
	sceneIndex: number,
): Promise<string> {
	const cld = getCloudinary();

	// Convert to plain string — Replicate SDK v1.4+ returns FileOutput objects
	const urlString = imageUrl.toString();

	const result = await cld.uploader.upload(urlString, {
		resource_type: 'image',
		folder: 'ariclear/scene-images',
		public_id: `scan-${scanId}-scene-${sceneIndex}`,
		overwrite: true,
		transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
	});

	return result.secure_url;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function uploadToCloudinary(
	audioBuffer: Buffer,
	imageUrls: (string | URL | { toString: () => string })[],
	scanId: string,
): Promise<CloudinaryUploadResult> {
	console.log('[cloudinary] Starting uploads...');

	// Upload audio + all 4 images in parallel
	const [voiceoverUrl, ...sceneImageUrls] = await Promise.all([
		uploadAudio(audioBuffer, scanId),
		...imageUrls.map((url, i) => uploadImage(url, scanId, i)),
	]);

	console.log('[cloudinary] All uploads complete');
	console.log('[cloudinary] Voiceover:', voiceoverUrl);
	console.log('[cloudinary] Images:', sceneImageUrls);

	return { voiceoverUrl, sceneImageUrls };
}
