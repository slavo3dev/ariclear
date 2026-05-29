// lib/video/generateVoiceover.ts
// Takes the 4-scene narration strings from Gemini,
// combines them with timed pauses, and generates a single
// MP3 audio file via Google Cloud Text-to-Speech.
// Returns a Buffer ready to upload to Cloudinary.

import textToSpeech from '@google-cloud/text-to-speech';

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
	bold: { name: 'en-US-Neural2-D', pitch: -2, speakingRate: 1.1 }, // deep male, fast
	clean: { name: 'en-US-Neural2-F', pitch: 0, speakingRate: 0.95 }, // clear female, calm
	warm: { name: 'en-US-Neural2-A', pitch: 1, speakingRate: 0.9 }, // warm male, relaxed
	urgent: { name: 'en-US-Neural2-D', pitch: -4, speakingRate: 1.15 }, // deep male, urgent
};

// ─── SSML builder ─────────────────────────────────────────────────────────────
// Each scene is 3s. We add a pause between scenes so narration
// lands at the right time relative to the visual.

function buildSSML(scenes: VoiceoverInput['scenes']): string {
	const parts = scenes.map((scene, i) => {
		// First scene starts immediately, others get a short lead-in pause
		const leadIn = i === 0 ? '' : '<break time="200ms"/>';
		// Pause after each narration to fill the remaining scene time
		const trailOut = i < scenes.length - 1 ? '<break time="1s"/>' : '';
		return `${leadIn}${scene.narration}${trailOut}`;
	});

	return `<speak>${parts.join('')}</speak>`;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateVoiceover(
	input: VoiceoverInput,
): Promise<Buffer> {
	const credentialsEnv = process.env.GOOGLE_TTS_CREDENTIALS;
	if (!credentialsEnv) throw new Error('GOOGLE_TTS_CREDENTIALS is not set');

	// Parse the JSON credentials stored as a string in env
	const credentials = JSON.parse(credentialsEnv);

	const client = new textToSpeech.TextToSpeechClient({ credentials });

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
