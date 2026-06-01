// remotion/ScanRecapComposition.tsx
// 15-second emotional story about how a visitor experiences a website.
// 5 scenes × 90 frames (3s each) = 450 frames at 30fps.
// All content driven by real scan data — no screenshots needed.

import {
	AbsoluteFill,
	Audio,
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
	sceneImages: string[]; // kept for API compat, not used
	style: 'bold' | 'clean' | 'warm' | 'urgent';
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAMES_PER_SCENE = 90; // 3s at 30fps
const TOTAL_SCENES = 5;

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
	bg: '#0d0804',
	bgMid: '#1c1008',
	choco: '#3c2a18',
	cream: '#f5ede3',
	creamDim: 'rgba(245,237,227,0.6)',
	creamFaint: 'rgba(245,237,227,0.2)',
	red: '#f87171',
	redDim: 'rgba(248,113,113,0.25)',
	redBorder: 'rgba(248,113,113,0.5)',
	green: '#4ade80',
	greenDim: 'rgba(74,222,128,0.15)',
	greenBorder: 'rgba(74,222,128,0.4)',
	white: '#ffffff',
	whiteFaint: 'rgba(255,255,255,0.08)',
	whiteDim: 'rgba(255,255,255,0.25)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 1) {
	return Math.min(Math.max(v, lo), hi);
}

function fadeIn(frame: number, start = 0, duration = 15) {
	return clamp(interpolate(frame, [start, start + duration], [0, 1]));
}

function slideUp(frame: number, start = 0, duration = 20) {
	return clamp(interpolate(frame, [start, start + duration], [40, 0]));
}

// function scoreColor(score: number) {
// 	if (score >= 75) return C.green;
// 	if (score >= 50) return '#fbbf24';
// 	return C.red;
// }

// ─── Typing effect ────────────────────────────────────────────────────────────

function useTyping(
	text: string,
	frame: number,
	startFrame = 0,
	charsPerFrame = 0.8,
) {
	const chars = Math.floor(Math.max(0, frame - startFrame) * charsPerFrame);
	return text.slice(0, chars);
}

// ─── Progress bars ────────────────────────────────────────────────────────────

function ProgressBars({
	scene,
	frameInScene,
}: {
	scene: number;
	frameInScene: number;
}) {
	return (
		<div
			style={{
				position: 'absolute',
				top: 56,
				left: 48,
				right: 48,
				display: 'flex',
				gap: 10,
				zIndex: 20,
			}}>
			{Array.from({ length: TOTAL_SCENES }).map((_, i) => (
				<div
					key={i}
					style={{
						flex: 1,
						height: 4,
						borderRadius: 2,
						background: 'rgba(255,255,255,0.15)',
						overflow: 'hidden',
					}}>
					<div
						style={{
							height: '100%',
							borderRadius: 2,
							background: 'rgba(255,255,255,0.85)',
							width:
								i < scene
									? '100%'
									: i === scene
										? `${(frameInScene / FRAMES_PER_SCENE) * 100}%`
										: '0%',
						}}
					/>
				</div>
			))}
		</div>
	);
}

// ─── Watermark ────────────────────────────────────────────────────────────────

function Watermark({ opacity = 0.3 }: { opacity?: number }) {
	return (
		<div
			style={{
				position: 'absolute',
				bottom: 56,
				right: 48,
				zIndex: 20,
				opacity,
			}}>
			<span
				style={{
					fontSize: 24,
					fontWeight: 800,
					color: C.cream,
					fontFamily: 'sans-serif',
					letterSpacing: '0.2em',
					textTransform: 'uppercase',
				}}>
				AriClear
			</span>
		</div>
	);
}

// ─── Scene 0: ARRIVAL ────────────────────────────────────────────────────────
// Domain types itself. "A visitor just landed..."  Cursor blinks.

function Scene0Arrival({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const { fps } = useVideoConfig();

	// "A visitor just landed on..." fades in at frame 10
	const labelOp = fadeIn(frame, 10, 20);

	// Domain types itself starting frame 20
	const domainTyped = useTyping(props.domain, frame, 20, 1.2);

	// Cursor blink — alternates every 15 frames
	const cursorVisible = Math.floor(frame / 15) % 2 === 0;

	// Tagline fades in at frame 55
	const tagOp = fadeIn(frame, 55, 20);
	const tagY = slideUp(frame, 55, 20);

	// Visitor dot animates in
	const dotScale = spring({
		frame: frame - 40,
		fps,
		config: { damping: 14, stiffness: 180 },
		durationInFrames: 30,
	});
	const dotOp = clamp(interpolate(frame, [40, 55], [0, 1]));

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at center, ${C.bgMid} 0%, ${C.bg} 100%)`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 0,
			}}>
			{/* Label */}
			<div style={{ opacity: labelOp, marginBottom: 32 }}>
				<span
					style={{
						fontSize: 28,
						fontWeight: 500,
						color: C.creamDim,
						fontFamily: 'sans-serif',
						letterSpacing: '0.08em',
					}}>
					A visitor just landed on...
				</span>
			</div>

			{/* Typing domain */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					minHeight: 100,
				}}>
				<span
					style={{
						fontSize: 88,
						fontWeight: 900,
						color: C.cream,
						fontFamily: 'sans-serif',
						letterSpacing: '-0.02em',
					}}>
					{domainTyped}
				</span>
				<span
					style={{
						fontSize: 88,
						fontWeight: 900,
						color: cursorVisible ? C.cream : 'transparent',
						fontFamily: 'sans-serif',
						marginLeft: 4,
						transition: 'color 0.05s',
					}}>
					|
				</span>
			</div>

			{/* Visitor dot */}
			<div
				style={{
					marginTop: 48,
					opacity: dotOp,
					transform: `scale(${dotScale})`,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 12,
				}}>
				<div
					style={{
						width: 64,
						height: 64,
						borderRadius: '50%',
						background: C.whiteFaint,
						border: `2px solid ${C.whiteDim}`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 36,
					}}>
					🧑‍💻
				</div>
				<span
					style={{
						fontSize: 22,
						color: C.creamDim,
						fontFamily: 'sans-serif',
					}}>
					Visitor arrived
				</span>
			</div>

			{/* Tagline */}
			<div
				style={{
					marginTop: 56,
					opacity: tagOp,
					transform: `translateY(${tagY}px)`,
				}}>
				<span
					style={{
						fontSize: 26,
						color: C.creamFaint,
						fontFamily: 'sans-serif',
						letterSpacing: '0.05em',
					}}>
					What do they see? What do they feel?
				</span>
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 1: CONFUSION ──────────────────────────────────────────────────────
// Screen shakes. Real headline quoted. Question marks rain in.

function Scene1Confusion({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const { fps } = useVideoConfig();

	// Shake — rapid oscillation for first 20 frames
	const shakeX =
		frame < 20
			? Math.sin(frame * 1.8) * interpolate(frame, [0, 20], [14, 0])
			: 0;
	const shakeY =
		frame < 20
			? Math.cos(frame * 2.1) * interpolate(frame, [0, 20], [8, 0])
			: 0;

	// "They read:" label
	const labelOp = fadeIn(frame, 18, 15);

	// Headline fades in at 25
	const headlineOp = fadeIn(frame, 25, 20);
	const headlineY = slideUp(frame, 25, 20);

	// Question marks — staggered
	const qMarks = ['?', '?', '?', '?', '?'];
	const qPositions = [
		{ x: 80, y: 200 },
		{ x: 900, y: 280 },
		{ x: 480, y: 160 },
		{ x: 180, y: 580 },
		{ x: 820, y: 500 },
	];

	// Confused score badge
	const scoreBadgeOp = fadeIn(frame, 55, 20);
	const scoreBadgeScale = spring({
		frame: frame - 55,
		fps,
		config: { damping: 12, stiffness: 200 },
		durationInFrames: 25,
	});

	const headline =
		props.firstImpression.length > 80
			? props.firstImpression.slice(0, 80) + '…'
			: props.firstImpression;

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at center, #1a0a0a 0%, ${C.bg} 100%)`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				transform: `translate(${shakeX}px, ${shakeY}px)`,
			}}>
			{/* Question marks */}
			{qMarks.map((q, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: qPositions[i].x,
						top: qPositions[i].y,
						opacity: clamp(
							interpolate(
								frame,
								[10 + i * 8, 28 + i * 8],
								[0, 0.35],
							),
						),
						fontSize: 72 + i * 12,
						color: C.red,
						fontFamily: 'sans-serif',
						fontWeight: 900,
						transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (10 + i * 5)}deg)`,
					}}>
					{q}
				</div>
			))}

			{/* "They read:" */}
			<div style={{ opacity: labelOp, marginBottom: 24 }}>
				<span
					style={{
						fontSize: 30,
						fontWeight: 600,
						color: C.creamDim,
						fontFamily: 'sans-serif',
						letterSpacing: '0.06em',
					}}>
					They read:
				</span>
			</div>

			{/* Quoted headline */}
			<div
				style={{
					opacity: headlineOp,
					transform: `translateY(${headlineY}px)`,
					maxWidth: 860,
					textAlign: 'center',
					padding: '0 60px',
					background: 'rgba(248,113,113,0.08)',
					border: `2px solid ${C.redBorder}`,
					borderRadius: 24,
					margin: '0 48px',
				}}>
				<span
					style={{
						fontSize: 52,
						fontWeight: 700,
						color: C.cream,
						fontFamily: 'sans-serif',
						lineHeight: 1.3,
						fontStyle: 'italic',
					}}>
					&ldquo;{headline}&rdquo;
				</span>
			</div>

			{/* Confused score */}
			<div
				style={{
					marginTop: 56,
					opacity: scoreBadgeOp,
					transform: `scale(${scoreBadgeScale})`,
					display: 'flex',
					alignItems: 'center',
					gap: 20,
				}}>
				<span style={{ fontSize: 48 }}>😕</span>
				<div
					style={{
						borderRadius: 999,
						padding: '14px 32px',
						background: C.redDim,
						border: `2px solid ${C.redBorder}`,
					}}>
					<span
						style={{
							fontSize: 32,
							fontWeight: 800,
							color: C.red,
							fontFamily: 'sans-serif',
						}}>
						Clarity: {props.clarityScore}/100
					</span>
				</div>
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 2: PROBLEM ────────────────────────────────────────────────────────
// Visitor walks away. Top issue slams in red. Score fills — stops red.

function Scene2Problem({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const { fps } = useVideoConfig();

	// Visitor walks away — moves right off screen
	const visitorX = interpolate(frame, [0, 45], [0, 600], {
		extrapolateRight: 'clamp',
	});
	const visitorOp = clamp(interpolate(frame, [35, 50], [1, 0]));

	// "They leave in 5 seconds" fades in
	const leaveOp = fadeIn(frame, 5, 20);

	// Issue card slams in at frame 30
	const issueScale = spring({
		frame: frame - 30,
		fps,
		config: { damping: 10, stiffness: 300, mass: 0.8 },
		durationInFrames: 20,
	});
	const issueOp = clamp(interpolate(frame, [30, 40], [0, 1]));

	// Score ring fills to clarityScore but stops — red
	const ringProgress = spring({
		frame: frame - 45,
		fps,
		config: { damping: 80, stiffness: 40 },
		durationInFrames: 40,
	});
	const r = 44;
	const circ = 2 * Math.PI * r;
	const fill = ringProgress * (props.clarityScore / 100) * circ;
	const ringOp = fadeIn(frame, 45, 15);

	const issue =
		props.topIssue.length > 70
			? props.topIssue.slice(0, 70) + '…'
			: props.topIssue;

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at 30% 50%, #1a0505 0%, ${C.bg} 100%)`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 40,
			}}>
			{/* Visitor walking away */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 24,
					opacity: visitorOp,
					transform: `translateX(${visitorX}px)`,
					alignSelf: 'flex-start',
					marginLeft: 80,
					marginBottom: -20,
				}}>
				<span style={{ fontSize: 60 }}>🧑‍💻</span>
				<div style={{ display: 'flex', gap: 8 }}>
					{['→', '→', '→'].map((a, i) => (
						<span
							key={i}
							style={{
								fontSize: 36,
								color: C.red,
								opacity: clamp(
									interpolate(
										frame,
										[i * 8, i * 8 + 15],
										[0, 0.8],
									),
								),
							}}>
							{a}
						</span>
					))}
				</div>
			</div>

			{/* "They leave in 5 seconds" */}
			<div style={{ opacity: leaveOp }}>
				<span
					style={{
						fontSize: 34,
						fontWeight: 600,
						color: C.creamDim,
						fontFamily: 'sans-serif',
					}}>
					They leave in 5 seconds.
				</span>
			</div>

			{/* Issue card */}
			<div
				style={{
					opacity: issueOp,
					transform: `scale(${issueScale})`,
					width: 860,
					borderRadius: 28,
					padding: 48,
					background: C.redDim,
					border: `2px solid ${C.redBorder}`,
					margin: '0 48px',
				}}>
				<div
					style={{
						fontSize: 24,
						fontWeight: 700,
						color: C.red,
						fontFamily: 'sans-serif',
						letterSpacing: '0.18em',
						textTransform: 'uppercase',
						marginBottom: 20,
					}}>
					⚠ Top issue
				</div>
				<div
					style={{
						fontSize: 50,
						fontWeight: 800,
						color: C.cream,
						fontFamily: 'sans-serif',
						lineHeight: 1.25,
					}}>
					{issue}
				</div>
			</div>

			{/* Score ring — fills red, stops */}
			<div
				style={{
					opacity: ringOp,
					display: 'flex',
					alignItems: 'center',
					gap: 24,
				}}>
				<div style={{ position: 'relative', width: 100, height: 100 }}>
					<svg
						style={{
							position: 'absolute',
							inset: 0,
							transform: 'rotate(-90deg)',
						}}
						viewBox='0 0 100 100'>
						<circle
							cx='50'
							cy='50'
							r={r}
							fill='none'
							stroke='rgba(255,255,255,0.1)'
							strokeWidth={8}
						/>
						<circle
							cx='50'
							cy='50'
							r={r}
							fill='none'
							stroke={C.red}
							strokeWidth={8}
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
								fontSize: 28,
								fontWeight: 900,
								color: C.red,
								fontFamily: 'sans-serif',
							}}>
							{props.clarityScore}
						</span>
					</div>
				</div>
				<span
					style={{
						fontSize: 28,
						color: C.red,
						fontFamily: 'sans-serif',
						fontWeight: 600,
					}}>
					Clarity stuck here
				</span>
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 3: CLARITY ────────────────────────────────────────────────────────
// Screen clears. New headline types in green. Score fills green.

function Scene3Clarity({
	props,
	frame,
}: {
	props: ScanRecapProps;
	frame: number;
}) {
	const { fps } = useVideoConfig();

	// "What if they understood immediately?" fades in
	const labelOp = fadeIn(frame, 0, 18);

	// Clear flash at start
	const flashOp = clamp(interpolate(frame, [0, 8], [0.4, 0]));

	// New headline types in
	const headlineTyped = useTyping(props.suggestedHeadline, frame, 20, 1.5);

	// Green glow pulses around headline
	const glowOp = clamp(interpolate(frame, [35, 55], [0, 1]));
	const glowScale = spring({
		frame: frame - 35,
		fps,
		config: { damping: 20, stiffness: 100 },
		durationInFrames: 30,
	});

	// Score ring fills to a better score (clarityScore + 30, max 95)
	const betterScore = Math.min(props.clarityScore + 30, 95);
	const ringProgress = spring({
		frame: frame - 50,
		fps,
		config: { damping: 60, stiffness: 50 },
		durationInFrames: 35,
	});
	const r = 44;
	const circ = 2 * Math.PI * r;
	const fill = ringProgress * (betterScore / 100) * circ;
	const ringOp = fadeIn(frame, 50, 15);

	// Visitor returns
	const returnOp = fadeIn(frame, 60, 20);
	const returnScale = spring({
		frame: frame - 60,
		fps,
		config: { damping: 14, stiffness: 180 },
		durationInFrames: 20,
	});

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at center, #051a0a 0%, ${C.bg} 100%)`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 40,
			}}>
			{/* Flash */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'rgba(74,222,128,0.15)',
					opacity: flashOp,
					pointerEvents: 'none',
				}}
			/>

			{/* Label */}
			<div style={{ opacity: labelOp }}>
				<span
					style={{
						fontSize: 30,
						fontWeight: 500,
						color: C.creamDim,
						fontFamily: 'sans-serif',
					}}>
					What if they understood immediately?
				</span>
			</div>

			{/* New headline */}
			<div
				style={{
					position: 'relative',
					maxWidth: 900,
					textAlign: 'center',
					padding: 48,
					margin: '0 48px',
					background: C.greenDim,
					border: `2px solid ${C.greenBorder}`,
					borderRadius: 28,
					boxShadow:
						glowOp > 0
							? `0 0 ${60 * glowOp}px rgba(74,222,128,0.3)`
							: 'none',
					transform: `scale(${glowScale})`,
				}}>
				<span
					style={{
						fontSize: 56,
						fontWeight: 900,
						color: C.green,
						fontFamily: 'sans-serif',
						lineHeight: 1.25,
					}}>
					&ldquo;{headlineTyped}
					<span
						style={{
							color: 'rgba(74,222,128,0.7)',
							animation: 'none',
						}}>
						|
					</span>
					&rdquo;
				</span>
			</div>

			{/* Score ring — fills green */}
			<div
				style={{
					opacity: ringOp,
					display: 'flex',
					alignItems: 'center',
					gap: 24,
				}}>
				<div style={{ position: 'relative', width: 100, height: 100 }}>
					<svg
						style={{
							position: 'absolute',
							inset: 0,
							transform: 'rotate(-90deg)',
						}}
						viewBox='0 0 100 100'>
						<circle
							cx='50'
							cy='50'
							r={r}
							fill='none'
							stroke='rgba(255,255,255,0.1)'
							strokeWidth={8}
						/>
						<circle
							cx='50'
							cy='50'
							r={r}
							fill='none'
							stroke={C.green}
							strokeWidth={8}
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
								fontSize: 28,
								fontWeight: 900,
								color: C.green,
								fontFamily: 'sans-serif',
							}}>
							{Math.round(betterScore * ringProgress)}
						</span>
					</div>
				</div>
				<span
					style={{
						fontSize: 28,
						color: C.green,
						fontFamily: 'sans-serif',
						fontWeight: 600,
					}}>
					Clarity unlocked ✓
				</span>
			</div>

			{/* Visitor returns */}
			<div
				style={{
					opacity: returnOp,
					transform: `scale(${returnScale})`,
					display: 'flex',
					alignItems: 'center',
					gap: 16,
				}}>
				<span style={{ fontSize: 50 }}>🧑‍💻</span>
				<span
					style={{
						fontSize: 28,
						color: C.creamDim,
						fontFamily: 'sans-serif',
					}}>
					They stay. They get it.
				</span>
				<span style={{ fontSize: 50 }}>✅</span>
			</div>
		</AbsoluteFill>
	);
}

// ─── Scene 4: CTA ─────────────────────────────────────────────────────────────
// AriClear brand moment. "Now they stay." CTA pulses.

function Scene4CTA({ props, frame }: { props: ScanRecapProps; frame: number }) {
	const { fps } = useVideoConfig();

	// "Now they stay. Now they convert." types in
	const line1 = useTyping('Now they stay.', frame, 5, 1.2);
	const line2 = useTyping('Now they convert.', frame, 30, 1.2);

	// CTA pill pulses
	const ctaOp = fadeIn(frame, 50, 20);
	const ctaScale = spring({
		frame: frame - 50,
		fps,
		config: { damping: 12, stiffness: 200 },
		durationInFrames: 20,
	});
	// Pulse: gentle scale oscillation
	const pulse = 1 + 0.03 * Math.sin((frame - 60) * 0.18);

	// Domain + ariclear
	const brandOp = fadeIn(frame, 65, 20);

	const cta = props.suggestedCta || 'Get your clarity score';

	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse at center, ${C.choco} 0%, ${C.bg} 100%)`,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 40,
			}}>
			{/* Main lines */}
			<div style={{ textAlign: 'center' }}>
				<div
					style={{
						fontSize: 72,
						fontWeight: 900,
						color: C.cream,
						fontFamily: 'sans-serif',
						lineHeight: 1.15,
						minHeight: 90,
					}}>
					{line1}
					{frame >= 5 && (
						<span style={{ color: 'rgba(245,237,227,0.4)' }}>
							|
						</span>
					)}
				</div>
				<div
					style={{
						fontSize: 72,
						fontWeight: 900,
						color: C.green,
						fontFamily: 'sans-serif',
						lineHeight: 1.15,
						minHeight: 90,
					}}>
					{line2}
					{frame >= 30 && (
						<span style={{ color: 'rgba(74,222,128,0.4)' }}>|</span>
					)}
				</div>
			</div>

			{/* CTA pill */}
			<div
				style={{
					opacity: ctaOp,
					transform: `scale(${ctaScale * pulse})`,
					borderRadius: 999,
					padding: '28px 64px',
					background: C.cream,
					cursor: 'pointer',
				}}>
				<span
					style={{
						fontSize: 40,
						fontWeight: 900,
						color: C.choco,
						fontFamily: 'sans-serif',
					}}>
					{cta} →
				</span>
			</div>

			{/* AriClear brand */}
			<div style={{ opacity: brandOp, textAlign: 'center' }}>
				<div
					style={{
						fontSize: 26,
						fontWeight: 800,
						color: C.creamFaint,
						fontFamily: 'sans-serif',
						letterSpacing: '0.25em',
						textTransform: 'uppercase',
						marginBottom: 8,
					}}>
					Powered by AriClear
				</div>
				<div
					style={{
						fontSize: 24,
						color: 'rgba(245,237,227,0.3)',
						fontFamily: 'sans-serif',
					}}>
					ariclear.com
				</div>
			</div>
		</AbsoluteFill>
	);
}

// ─── Main composition ─────────────────────────────────────────────────────────

export const ScanRecapComposition = (props: ScanRecapProps) => {
	const frame = useCurrentFrame();
	const frameInScene = frame % FRAMES_PER_SCENE;
	const sceneIndex = Math.min(
		Math.floor(frame / FRAMES_PER_SCENE),
		TOTAL_SCENES - 1,
	);

	return (
		<AbsoluteFill style={{ background: C.bg, fontFamily: 'sans-serif' }}>
			{props.voiceoverUrl && <Audio src={props.voiceoverUrl} />}

			<ProgressBars scene={sceneIndex} frameInScene={frameInScene} />

			{/* Scene 0 — Arrival */}
			<Sequence from={0} durationInFrames={FRAMES_PER_SCENE}>
				<Scene0Arrival props={props} frame={frameInScene} />
				<Watermark opacity={0.2} />
			</Sequence>

			{/* Scene 1 — Confusion */}
			<Sequence
				from={FRAMES_PER_SCENE}
				durationInFrames={FRAMES_PER_SCENE}>
				<Scene1Confusion props={props} frame={frameInScene} />
				<Watermark opacity={0.15} />
			</Sequence>

			{/* Scene 2 — Problem */}
			<Sequence
				from={FRAMES_PER_SCENE * 2}
				durationInFrames={FRAMES_PER_SCENE}>
				<Scene2Problem props={props} frame={frameInScene} />
				<Watermark opacity={0.15} />
			</Sequence>

			{/* Scene 3 — Clarity */}
			<Sequence
				from={FRAMES_PER_SCENE * 3}
				durationInFrames={FRAMES_PER_SCENE}>
				<Scene3Clarity props={props} frame={frameInScene} />
				<Watermark opacity={0.2} />
			</Sequence>

			{/* Scene 4 — CTA */}
			<Sequence
				from={FRAMES_PER_SCENE * 4}
				durationInFrames={FRAMES_PER_SCENE}>
				<Scene4CTA props={props} frame={frameInScene} />
				<Watermark opacity={0.4} />
			</Sequence>
		</AbsoluteFill>
	);
};
