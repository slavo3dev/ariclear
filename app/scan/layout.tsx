import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/site';

export const metadata: Metadata = {
	title: 'Run a full website scan — AriClear',
	description:
		'Scan your homepage and get a Human clarity score, an AI readability score, the exact issues and rewritten copy. Free account includes one full scan.',
	alternates: { canonical: '/scan' },
	openGraph: pageOpenGraph(
		'Run a full website scan — AriClear',
		'See how first-time visitors and AI read your homepage, with the exact fixes.',
		'/scan',
	),
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
	return children;
}
