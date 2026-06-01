// remotion/Root.tsx
import { Composition } from 'remotion';
import { ScanRecapComposition, ScanRecapProps } from './ScanRecapComposition';

export const RemotionRoot = () => {
	return (
		<>
			<Composition
				id='ScanRecap'
				component={ScanRecapComposition}
				durationInFrames={450} // 15s at 30fps (5 scenes × 3s)
				fps={30}
				width={1080}
				height={1920}
				defaultProps={
					{
						domain: 'slavo.io',
						clarityScore: 45,
						aiScore: 50,
						overallScore: 48,
						firstImpression:
							'This site is about web development mentorship but is vague on specifics.',
						audience: 'Beginner developers and career switchers',
						topIssue:
							"Vague value proposition — visitors don't know what you do",
						actionTitle: 'Rewrite the headline',
						actionDetails:
							'Make your offering clear in the first 5 words.',
						suggestedHeadline:
							'Transform Your Career with Structured Web Dev Mentorship',
						suggestedCta: 'Start Free Today',
						voiceoverUrl: '',
						sceneImages: ['', '', '', ''],
						style: 'bold',
					} satisfies ScanRecapProps
				}
			/>
		</>
	);
};
