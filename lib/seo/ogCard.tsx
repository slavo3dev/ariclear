// lib/seo/ogCard.tsx
// The shared 1200x630 social card (Open Graph and X/Twitter), rendered at
// build time with next/og.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_LOGO_PATH } from '@/lib/site';

export const OG_ALT = 'AriClear: see how humans and AI read your website';

export async function renderOgCard(size: { width: number; height: number }) {
	const logo = await readFile(join(process.cwd(), 'public', SITE_LOGO_PATH));
	const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

	const pill = (label: string, score: string, color: string) => (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				padding: '18px 28px',
				borderRadius: 999,
				background: '#ffffff',
				border: '2px solid #edd6c3',
			}}>
			<div style={{ fontSize: 30, color: '#703526' }}>{label}</div>
			<div style={{ fontSize: 40, fontWeight: 700, color }}>{score}</div>
		</div>
	);

	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '64px 72px',
					background: 'linear-gradient(160deg, #fefcf8 0%, #f8eee6 60%, #edd6c3 100%)',
					color: '#2b1510',
					fontFamily: 'sans-serif',
				}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={logoSrc} width={88} height={88} alt='' />
					<div style={{ fontSize: 44, fontWeight: 700 }}>AriClear</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
					<div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
						Do humans and AI understand your website?
					</div>
					<div style={{ fontSize: 32, color: '#964b2e' }}>
						Clarity and AI readability scores, with the exact fixes.
					</div>
				</div>

				<div style={{ display: 'flex', gap: 20 }}>
					{pill('Human', '5-second test', '#b86a3f')}
					{pill('AI', 'how it reads you', '#964b2e')}
				</div>
			</div>
		),
		size,
	);
}
