import type { Metadata } from 'next';

// Signed-in area: never indexed (proxy.ts also requires a session).
export const metadata: Metadata = {
	title: 'Brand alignment — AriClear',
	robots: { index: false, follow: false },
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
	return children;
}
