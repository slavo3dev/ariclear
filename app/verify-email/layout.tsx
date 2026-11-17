import type { Metadata } from 'next';

// Reached from an auth email link: never indexed.
export const metadata: Metadata = {
	title: 'Verify your email — AriClear',
	robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
	return children;
}
