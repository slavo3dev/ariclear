import type { Metadata } from 'next';

// Signed-in area: never indexed (proxy.ts also requires a session).
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
	return children;
}
