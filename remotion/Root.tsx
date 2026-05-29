// remotion/Root.tsx
// Remotion entry point — registers all compositions.

import { Composition } from 'remotion';
import { ScanRecapComposition, ScanRecapProps } from './ScanRecapComposition';

export const RemotionRoot = () => {
	return (
		<>
			<Composition
				id='ScanRecap'
				component={ScanRecapComposition}
				durationInFrames={360} // 12s at 30fps
				fps={30}
				width={1080}
				height={1920} // 9:16 vertical (Reels/TikTok)
				defaultProps={
					{
						domain: 'example.com',
						clarityScore: 50,
						aiScore: 50,
						overallScore: 50,
						firstImpression:
							'This site appears to offer a product or service.',
						audience: 'General audience',
						topIssue: 'Messaging lacks clarity',
						actionTitle: 'Rewrite the headline',
						actionDetails:
							'Make your value proposition clear in the first 5 words.',
						suggestedHeadline: 'Your suggested headline goes here',
						suggestedCta: 'Learn more',
						voiceoverUrl: '',
						sceneImages: ['', '', '', ''],
						style: 'bold',
					} satisfies ScanRecapProps
				}
			/>
		</>
	);
};
