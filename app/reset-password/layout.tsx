import type { Metadata } from 'next';

// Reached from an auth email link: never indexed.
export const metadata: Metadata = {
	title: 'Reset your password — AriClear',
	robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
	return children;
}
