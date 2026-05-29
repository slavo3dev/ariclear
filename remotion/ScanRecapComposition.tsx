// remotion/ScanRecapComposition.tsx
// The actual video template. 4 scenes × 90 frames (3s) = 360 frames (12s) at 30fps.

import {
	AbsoluteFill,
	Audio,
	Img,
	interpolate,
	Sequence,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScanRecapProps = {
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
	voiceoverUrl: string;
	sceneImages: string[];
	style: 'bold' | 'clean' | 'warm' | 'urgent';
};

// ─── Style themes ─────────────────────────────────────────────────────────────

const THEMES = {
	bold: {
		bg: '#0a0a0a',
		accent: '#ffffff',
		text: '#ffffff',
		muted: 'rgba(255,255,255,0.5)',
		card: 'rgba(255,255,255,0.08)',
		border: 'rgba(255,255,255,0.15)',
		badge: '#ffffff',
		badgeText: '#0a0a0a',
	},
	clean: {
		bg: '#f8f5f0',
		accent: '#3c2a18',
		text: '#1a1008',
		muted: 'rgba(60,42,24,0.5)',
		card: 'rgba(60,42,24,0.06)',
		border: 'rgba(60,42,24,0.12)',
		badge: '#3c2a18',
		badgeText: '#f8f5f0',
	},
	warm: {
		bg: '#3c2a18',
		accent: '#f5ede3',
		text: '#f5ede3',
		muted: 'rgba(245,237,227,0.55)',
		card: 'rgba(245,237,227,0.1)',
		border: 'rgba(245,237,227,0.2)',
		badge: '#f5ede3',
		badgeText: '#3c2a18',
	},
	urgent: {
		bg: '#1a0a0a',
		accent: '#f87171',
		text: '#ffffff',
		muted: 'rgba(255,255,255,0.5)',
		card: 'rgba(248,113,113,0.1)',
		border: 'rgba(248,113,113,0.25)',
		badge: '#f87171',
		badgeText: '#ffffff',
	},
};

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(score: number) {
	if (score >= 75) return '#4ade80';
	if (score >= 50) return '#fbbf24';
	return '#f87171';
}

// ─── Animated score ring ──────────────────────────────────────────────────────

function ScoreRing({
	score,
	label,
	size,
	frame,
	delay = 0,
}: {
	score: number;
	label: string;
	size: number;
	frame: number;
	delay?: number;
}) {
	const { fps } = useVideoConfig();
	const r = size / 2 - 12;
	const circ = 2 * Math.PI * r;

	const progress = spring({
		frame: frame - delay,
		fps,
		config: { damping: 80, stiffness: 60, mass: 1 },
		durationInFrames: 45,
	});

	const fill = progress * (score / 100) * circ;
	const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const translateY = interpolate(frame - delay, [0, 20], [30, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
				opacity,
				transform: `translateY(${translateY}px)`,
			}}>
			<div style={{ position: 'relative', width: size, height: size }}>
				<svg
					style={{
						position: 'absolute',
						inset: 0,
						transform: 'rotate(-90deg)',
					}}
					viewBox={`0 0 ${size} ${size}`}>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill='none'
						stroke='rgba(255,255,255,0.12)'
						strokeWidth={10}
					/>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill='none'
						stroke={scoreColor(score)}
						strokeWidth={10}
						strokeDasharray={`${fill} ${circ}`}
						strokeLinecap='round'
					/>
				</svg>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}>
					<span
						style={{
							fontSize: size * 0.28,
							fontWeight: 800,
							color: '#ffffff',
							fontFamily: 'sans-serif',
						}}>
						{score}
					</span>
				</div>
			</div>
			<span
				style={{
					fontSize: 28,
					fontWeight: 600,
					color: 'rgba(255,255,255,0.65)',
					fontFamily: 'sans-serif',
					letterSpacing: '0.12em',
					textTransform: 'uppercase',
				}}>
				{label}
			</span>
		</div>
	);
}

// ─── Scene background ─────────────────────────────────────────────────────────

function SceneBg({
	imageUrl,
	theme,
}: {
	imageUrl: string;
	theme: typeof THEMES.bold;
}) {
	return (
		<AbsoluteFill>
			{imageUrl ? (
				<>
					<Img
						src={imageUrl}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'cover',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background:
								'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.75) 100%)',
						}}
					/>
				</>
			) : (
				<div
					style={{
						width: '100%',
						height: '100%',
						background: theme.bg,
					}}
				/>
			)}
		</AbsoluteFill>
	);
}

// ─── Progress bars ────────────────────────────────────────────────────────────

function ProgressBars({
	currentScene,
	frameInScene,
	framesPerScene,
}: {
	currentScene: number;
	frameInScene: number;
	framesPerScene: number;
}) {
	return (
		<div
			style={{
				position: 'absolute',
				top: 60,
				left: 48,
				right: 48,
				display: 'flex',
				gap: 12,
				zIndex: 10,
			}}>
			{[0, 1, 2, 3].map((i) => (
				<div
					key={i}
					style={{
						flex: 1,
						height: 6,
						borderRadius: 3,
						background: 'rgba(255,255,255,0.2)',
						overflow: 'hidden',
					}}>
					<div
						style={{
							height: '100%',
							borderRadius: 3,
							background: 'rgba(255,255,255,0.9)',
							width:
								i < currentScene
									? '100%'
									: i === currentScene
										? `${(frameInScene / framesPerScene) * 100}%`
										: '0%',
						}}
					/>
				</div>
			))}
		</div>
	);
}

// ─── AriClear watermark ───────────────────────────────────────────────────────

function Watermark() {
	return (
		<div
			style={{ position: 'absolute', bottom: 60, right: 48, zIndex: 10 }}>
			<span
				style={{
					fontSize: 28,
					fontWeight: 800,
					color: 'rgba(255,255,255,0.35)',
					fontFamily: 'sans-serif',
					letterSpacing: '0.2em',
					textTransform: 'uppercase',
				}}>
				AriClear
			</span>
		</div>
	);
}

// ─── Scene 0: Scores ─────────────────────────────────────────────────────────

function Scene0Scores({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const domainOpacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const domainTranslate = interpolate(frame, [0, 20], [40, 0], {
		extrapolateRight: 'clamp',
	});
	const labelOpacity = interpolate(frame, [20, 40], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 64,
				paddingTop: 120,
			}}>
			<div
				style={{
					textAlign: 'center',
					opacity: domainOpacity,
					transform: `translateY(${domainTranslate}px)`,
				}}>
				<div
					style={{
						fontSize: 28,
						fontWeight: 600,
						color: 'rgba(255,255,255,0.55)',
						fontFamily: 'sans-serif',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
						marginBottom: 16,
					}}>
					AriClear scan
				</div>
				<div
					style={{
						fontSize: 72,
						fontWeight: 900,
						color: '#ffffff',
						fontFamily: 'sans-serif',
					}}>
					{props.domain}
				</div>
			</div>

			<div style={{ display: 'flex', alignItems: 'center', gap: 80 }}>
				<ScoreRing
					score={props.clarityScore}
					label='Clarity'
					size={200}
					frame={frame}
					delay={10}
				/>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 12,
						opacity: interpolate(frame, [15, 35], [0, 1], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						}),
					}}>
					<div
						style={{
							width: 220,
							height: 220,
							borderRadius: '50%',
							background: 'rgba(255,255,255,0.1)',
							border: '3px solid rgba(255,255,255,0.3)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}>
						<span
							style={{
								fontSize: 72,
								fontWeight: 900,
								color: '#ffffff',
								fontFamily: 'sans-serif',
							}}>
							{props.overallScore}
						</span>
					</div>
					<span
						style={{
							fontSize: 28,
							fontWeight: 600,
							color: 'rgba(255,255,255,0.65)',
							fontFamily: 'sans-serif',
							letterSpacing: '0.12em',
							textTransform: 'uppercase',
						}}>
						Overall
					</span>
				</div>
				<ScoreRing
					score={props.aiScore}
					label='AI-SEO'
					size={200}
					frame={frame}
					delay={20}
				/>
			</div>

			<div style={{ display: 'flex', gap: 24, opacity: labelOpacity }}>
				{[
					{ score: props.clarityScore, label: 'Clarity' },
					{ score: props.aiScore, label: 'AI-SEO' },
				].map(({ score, label }) => (
					<div
						key={label}
						style={{
							borderRadius: 999,
							padding: '16px 32px',
							background: scoreColor(score) + '33',
							border: `2px solid ${scoreColor(score)}66`,
						}}>
						<span
							style={{
								fontSize: 28,
								fontWeight: 700,
								color: scoreColor(score),
								fontFamily: 'sans-serif',
							}}>
							{label}:{' '}
							{score >= 75
								? 'Strong'
								: score >= 50
									? 'Average'
									: 'Needs work'}
						</span>
					</div>
				))}
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 1: First impression ────────────────────────────────────────────────

function Scene1Impression({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const tagOpacity = interpolate(frame, [0, 15], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const textOpacity = interpolate(frame, [10, 30], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const textTranslate = interpolate(frame, [10, 30], [40, 0], {
		extrapolateRight: 'clamp',
	});
	const audOpacity = interpolate(frame, [30, 50], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 48,
				padding: '0 80px',
			}}>
			<div
				style={{
					opacity: tagOpacity,
					borderRadius: 999,
					padding: '14px 32px',
					background: 'rgba(255,255,255,0.1)',
					border: '2px solid rgba(255,255,255,0.2)',
				}}>
				<span
					style={{
						fontSize: 26,
						fontWeight: 700,
						color: 'rgba(255,255,255,0.7)',
						fontFamily: 'sans-serif',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
					}}>
					First impression
				</span>
			</div>
			<div
				style={{
					opacity: textOpacity,
					transform: `translateY(${textTranslate}px)`,
					textAlign: 'center',
				}}>
				<span
					style={{
						fontSize: 56,
						fontWeight: 700,
						color: '#ffffff',
						fontFamily: 'sans-serif',
						lineHeight: 1.35,
					}}>
					&ldquo;{props.firstImpression}&rdquo;
				</span>
			</div>
			<div style={{ opacity: audOpacity, textAlign: 'center' }}>
				<span
					style={{
						fontSize: 34,
						color: 'rgba(255,255,255,0.55)',
						fontFamily: 'sans-serif',
					}}>
					Audience: {props.audience}
				</span>
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 2: Problem / Solution ──────────────────────────────────────────────

function Scene2ProblemSolution({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const problemOpacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const problemTranslate = interpolate(frame, [0, 20], [-60, 0], {
		extrapolateRight: 'clamp',
	});
	const arrowOpacity = interpolate(frame, [20, 35], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const solutionOpacity = interpolate(frame, [30, 50], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const solutionTranslate = interpolate(frame, [30, 50], [60, 0], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 40,
				padding: '0 80px',
			}}>
			<div
				style={{
					width: '100%',
					borderRadius: 32,
					padding: 48,
					background: 'rgba(248,113,113,0.15)',
					border: '2px solid rgba(248,113,113,0.4)',
					opacity: problemOpacity,
					transform: `translateX(${problemTranslate}px)`,
				}}>
				<div
					style={{
						fontSize: 26,
						fontWeight: 700,
						color: '#fca5a5',
						fontFamily: 'sans-serif',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
						marginBottom: 20,
					}}>
					⚠ Problem
				</div>
				<div
					style={{
						fontSize: 46,
						fontWeight: 700,
						color: '#ffffff',
						fontFamily: 'sans-serif',
						lineHeight: 1.3,
					}}>
					{props.topIssue}
				</div>
			</div>
			<div
				style={{
					opacity: arrowOpacity,
					fontSize: 56,
					color: 'rgba(255,255,255,0.4)',
				}}>
				↓
			</div>
			<div
				style={{
					width: '100%',
					borderRadius: 32,
					padding: 48,
					background: 'rgba(74,222,128,0.12)',
					border: '2px solid rgba(74,222,128,0.35)',
					opacity: solutionOpacity,
					transform: `translateX(${solutionTranslate}px)`,
				}}>
				<div
					style={{
						fontSize: 26,
						fontWeight: 700,
						color: '#86efac',
						fontFamily: 'sans-serif',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
						marginBottom: 20,
					}}>
					✓ Fix
				</div>
				<div
					style={{
						fontSize: 46,
						fontWeight: 700,
						color: '#ffffff',
						fontFamily: 'sans-serif',
						lineHeight: 1.3,
					}}>
					{props.actionTitle}
				</div>
				{props.actionDetails && (
					<div
						style={{
							fontSize: 32,
							color: 'rgba(255,255,255,0.6)',
							fontFamily: 'sans-serif',
							lineHeight: 1.5,
							marginTop: 20,
						}}>
						{props.actionDetails.slice(0, 120)}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 3: Suggested headline + CTA ───────────────────────────────────────

function Scene3Headline({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const { fps } = useVideoConfig();

	const tagOpacity = interpolate(frame, [0, 15], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const headlineScale = spring({
		frame,
		fps,
		config: { damping: 80, stiffness: 60 },
		durationInFrames: 40,
	});
	const headlineOpacity = interpolate(frame, [5, 25], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const ctaOpacity = interpolate(frame, [40, 60], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const watermarkOp = interpolate(frame, [60, 80], [0, 1], {
		extrapolateRight: 'clamp',
	});

	const scale = interpolate(headlineScale, [0, 1], [0.92, 1]);

	return (
		<AbsoluteFill
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 56,
				padding: '0 80px',
				textAlign: 'center',
			}}>
			<div
				style={{
					opacity: tagOpacity,
					borderRadius: 999,
					padding: '14px 32px',
					background: 'rgba(255,255,255,0.1)',
					border: '2px solid rgba(255,255,255,0.2)',
				}}>
				<span
					style={{
						fontSize: 26,
						fontWeight: 700,
						color: 'rgba(255,255,255,0.7)',
						fontFamily: 'sans-serif',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
					}}>
					Suggested headline
				</span>
			</div>
			<div
				style={{
					opacity: headlineOpacity,
					transform: `scale(${scale})`,
				}}>
				<span
					style={{
						fontSize: 64,
						fontWeight: 900,
						color: '#ffffff',
						fontFamily: 'sans-serif',
						lineHeight: 1.25,
					}}>
					&ldquo;{props.suggestedHeadline}&rdquo;
				</span>
			</div>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 32,
					opacity: ctaOpacity,
				}}>
				<div
					style={{
						borderRadius: 999,
						padding: '20px 48px',
						background: 'rgba(255,255,255,0.15)',
						border: '2px solid rgba(255,255,255,0.3)',
					}}>
					<span
						style={{
							fontSize: 36,
							fontWeight: 700,
							color: '#ffffff',
							fontFamily: 'sans-serif',
						}}>
						{props.suggestedCta}
					</span>
				</div>
				<span
					style={{
						fontSize: 32,
						color: 'rgba(255,255,255,0.45)',
						fontFamily: 'sans-serif',
					}}>
					→ {props.domain}
				</span>
			</div>
			<div
				style={{
					opacity: watermarkOp,
					borderRadius: 999,
					padding: '12px 28px',
					background: 'rgba(255,255,255,0.06)',
					border: '1px solid rgba(255,255,255,0.12)',
				}}>
				<span
					style={{
						fontSize: 24,
						fontWeight: 800,
						color: 'rgba(255,255,255,0.4)',
						fontFamily: 'sans-serif',
						letterSpacing: '0.25em',
						textTransform: 'uppercase',
					}}>
					Powered by AriClear
				</span>
			</div>
		</AbsoluteFill>
	);
}

// ─── Main composition ─────────────────────────────────────────────────────────

export const ScanRecapComposition = (props: ScanRecapProps) => {
	const frame = useCurrentFrame();
	const FRAMES_PER_SCENE = 90;
	const frameInScene = frame % FRAMES_PER_SCENE;
	const sceneIndex = Math.min(Math.floor(frame / FRAMES_PER_SCENE), 3);
	const theme = THEMES[props.style];

	return (
		<AbsoluteFill
			style={{ background: theme.bg, fontFamily: 'sans-serif' }}>
			{props.voiceoverUrl && <Audio src={props.voiceoverUrl} />}

			<Sequence from={0} durationInFrames={FRAMES_PER_SCENE}>
				<SceneBg imageUrl={props.sceneImages[0]} theme={theme} />
				<ProgressBars
					currentScene={0}
					frameInScene={frameInScene}
					framesPerScene={FRAMES_PER_SCENE}
				/>
				<Scene0Scores props={props} frame={frameInScene} />
				<Watermark />
			</Sequence>

			<Sequence
				from={FRAMES_PER_SCENE}
				durationInFrames={FRAMES_PER_SCENE}>
				<SceneBg imageUrl={props.sceneImages[1]} theme={theme} />
				<ProgressBars
					currentScene={1}
					frameInScene={frameInScene}
					framesPerScene={FRAMES_PER_SCENE}
				/>
				<Scene1Impression props={props} frame={frameInScene} />
				<Watermark />
			</Sequence>

			<Sequence
				from={FRAMES_PER_SCENE * 2}
				durationInFrames={FRAMES_PER_SCENE}>
				<SceneBg imageUrl={props.sceneImages[2]} theme={theme} />
				<ProgressBars
					currentScene={2}
					frameInScene={frameInScene}
					framesPerScene={FRAMES_PER_SCENE}
				/>
				<Scene2ProblemSolution props={props} frame={frameInScene} />
				<Watermark />
			</Sequence>

			<Sequence
				from={FRAMES_PER_SCENE * 3}
				durationInFrames={FRAMES_PER_SCENE}>
				<SceneBg imageUrl={props.sceneImages[3]} theme={theme} />
				<ProgressBars
					currentScene={3}
					frameInScene={frameInScene}
					framesPerScene={FRAMES_PER_SCENE}
				/>
				<Scene3Headline props={props} frame={frameInScene} />
				<Watermark />
			</Sequence>
		</AbsoluteFill>
	);
};
