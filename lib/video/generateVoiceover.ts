// lib/video/generateVoiceover.ts
// Takes the 4-scene narration strings from Gemini,
// combines them with timed pauses, and generates a single
// MP3 audio file via Google Cloud Text-to-Speech.
// Returns a Buffer ready to upload to Cloudinary.

import textToSpeech from '@google-cloud/text-to-speech';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceoverInput = {
	scenes: {
		id: number;
		narration: string;
	}[];
	style: 'bold' | 'clean' | 'warm' | 'urgent';
};

// ─── Voice map per style ──────────────────────────────────────────────────────

const VOICE_MAP: Record<
	VoiceoverInput['style'],
	{ name: string; pitch: number; speakingRate: number }
> = {
	bold: { name: 'en-US-Neural2-D', pitch: -2, speakingRate: 1.1 },
	clean: { name: 'en-US-Neural2-F', pitch: 0, speakingRate: 0.95 },
	warm: { name: 'en-US-Neural2-A', pitch: 1, speakingRate: 0.9 },
	urgent: { name: 'en-US-Neural2-D', pitch: -4, speakingRate: 1.15 },
};

// ─── SSML builder ─────────────────────────────────────────────────────────────

function buildSSML(scenes: VoiceoverInput['scenes']): string {
	const parts = scenes.map((scene, i) => {
		const leadIn = i === 0 ? '' : '<break time="200ms"/>';
		const trailOut = i < scenes.length - 1 ? '<break time="1s"/>' : '';
		return `${leadIn}${scene.narration}${trailOut}`;
	});
	return `<speak>${parts.join('')}</speak>`;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateVoiceover(
	input: VoiceoverInput,
): Promise<Buffer> {
	const credentialsPath = process.env.GOOGLE_TTS_CREDENTIALS_PATH;
	if (!credentialsPath) {
		throw new Error('GOOGLE_TTS_CREDENTIALS_PATH is not set');
	}

	const client = new textToSpeech.TextToSpeechClient({
		keyFilename: path.resolve(process.cwd(), credentialsPath),
	});

	const voice = VOICE_MAP[input.style];
	const ssml = buildSSML(input.scenes);

	const [response] = await client.synthesizeSpeech({
		input: { ssml },
		voice: {
			languageCode: 'en-US',
			name: voice.name,
		},
		audioConfig: {
			audioEncoding: 'MP3',
			pitch: voice.pitch,
			speakingRate: voice.speakingRate,
			effectsProfileId: ['headphone-class-device'],
		},
	});

	if (!response.audioContent) {
		throw new Error('Google TTS returned no audio content');
	}

	return Buffer.from(response.audioContent as Uint8Array);
}
